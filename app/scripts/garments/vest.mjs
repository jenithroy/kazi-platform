// The utility vest: a mesh fishing / photographer's vest with a V-neck, centre zip, solid shoulder
// yoke and four flap pockets, matching the vest in the collection photo. Built from a shape
// description, like the apron in models.mjs: a signed-distance field turned into a mesh by marching
// cubes (mesher.mjs). The mesh body itself is modelled as plain cloth (the 2D mockup can fake the
// open weave); everything else is real geometry: the pockets, flaps, tabs, D-ring, zip, snap strap,
// bound edges and the yoke are raised above the body, so they catch the light.
//
// Units are metres, front is +z, up is +y, the hem is at y = 0 and the middle of the vest at x = 0.
// Run `node scripts/garments/build.mjs vest` to regenerate public/models/vest.glb.
//
// How it is put together
//   * The body is a solid whose skin is the cloth: a superellipse tube (flat front and back, rounded
//     sides that meet in the side seams at x = ±HALF_WIDTH) cut off by the sloping shoulder line, with the
//     cut rounded off so the shoulders are soft folds. Taking the skin of a solid (a thin shell, the same
//     trick as the apron) gives the same cloth thickness everywhere, over the shoulders and round the seams.
//   * The armholes, hem, V-neck and back neckline are cut out of the field itself (so the cut edges are
//     closed and slightly rounded, like bound edges): the front view's outline is a polygon whose distance
//     is tabulated once; the V cuts the front sheet only and the back neckline the back sheet.
//   * Raised details are "pads": a height h(x, y) added to the outer face of the front (or back) sheet.
//     Pads have soft edges, which makes them read as stitched-on patches rather than boxes.

import { noise3, sdPolygon, sdRoundRect, smax, smoothstep } from "./sdf.mjs";

// --- measurements, read off the collection photo (straightened; 0.0009 m per pixel) ----------

const T = 0.0038; // half the cloth's thickness
const HALF_WIDTH = 0.287; // side seams at the underarm (the vest flares a little towards the hem, see halfWidth)
const HALF_DEPTH = 0.112; // the front and back sheets are this far from the middle at the chest
const SUPER = 2.4; // superellipse exponent: > 2 makes the chest boxier than an ellipse
const SHOULDER_ROUND = 0.07; // blend width of the rounding where the front and back meet over the shoulder
const NECK_Y = 0.685; // top of the shoulder line at the neck
const NECK_HALF = 0.066; // half the neck opening at the shoulder line
const SHOULDER_SLOPE = 0.469; // the shoulder line falls this much per metre outwards (about 25 degrees)
const V_APEX = 0.389; // where the V of the neck ends and the zip begins

/** Half the width at height y: straight side seams that flare about 1.4 cm each side towards the hem. */
const halfWidth = (y) => HALF_WIDTH + 0.014 * (1 - smoothstep(0, 0.335, y));

/** Height of the shoulder line at distance ax from the middle. */
const shoulderY = (ax) => NECK_Y - SHOULDER_SLOPE * Math.max(0, ax - NECK_HALF);
const SHOULDER_COS = 1 / Math.sqrt(1 + SHOULDER_SLOPE * SHOULDER_SLOPE);

/**
 * Signed distance (first order, negative inside) to the solid body of the vest: a superellipse tube
 * that is flat at the front and back, rounded at the sides, a little slimmer towards the hem, cut off
 * by the shoulder line with the edge rounded. The cloth is the skin of this solid.
 */
function body(x, y, z) {
  const depth = HALF_DEPTH * (0.9 + 0.1 * smoothstep(0, 0.3, y));
  const half = halfWidth(y);
  const u = Math.abs(x) / half;
  const v = Math.abs(z) / depth;
  const F = Math.pow(u, SUPER) + Math.pow(v, SUPER);
  const grad = Math.hypot((SUPER * Math.pow(u, SUPER - 1)) / half, (SUPER * Math.pow(v, SUPER - 1)) / depth);
  const tube = (F - 1) / Math.max(grad, 2);
  const top = (y - shoulderY(Math.abs(x))) * SHOULDER_COS;
  return smax(tube, top, SHOULDER_ROUND);
}

/** The armhole, from the underarm (outside the side seam) up to the shoulder tip, right-hand side. */
const ARMHOLE = [
  [0.33, 0.326], [0.305, 0.33], [0.289, 0.335], [0.264, 0.348], [0.24, 0.366], [0.222, 0.39], [0.208, 0.42],
  [0.198, 0.452], [0.192, 0.485], [0.194, 0.515], [0.202, 0.543], [0.213, 0.572], [0.222, 0.596], [0.2262, 0.61],
];

/** A smooth curve through the points (Catmull-Rom), `n` samples per span, so a rim cut along it is not
 *  faceted. (This matters beyond looks: along the bare 14-point polyline the mesh reduction in build.mjs
 *  tore a few tiny holes at one of the corners; with the smooth outline the reduced mesh stays watertight.) */
function smoothCurve(points, n = 6) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(i + 2, points.length - 1)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Outline of the vest seen from the front: everything outside it is cut away. */
function outlinePolygon() {
  const right = [...smoothCurve(ARMHOLE), [0.2262, 0.7], [0.2262, 0.8]];
  const left = right.map(([x, y]) => [-x, y]).reverse();
  return [[-0.33, 0], [0.33, 0], ...right, ...left];
}

/** A tabulated signed distance to the outline (positive inside), looked up bilinearly: a polygon with
 *  a few dozen edges is too slow to evaluate at every grid point. */
function outlineDistance() {
  const poly = outlinePolygon();
  const cell = 0.0015;
  const x0 = -0.36, y0 = -0.04;
  const nx = Math.ceil(0.72 / cell) + 1, ny = Math.ceil(0.86 / cell) + 1;
  const table = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) table[i + nx * j] = -sdPolygon(x0 + i * cell, y0 + j * cell, poly);
  return (x, y) => {
    const fx = Math.min(Math.max((x - x0) / cell, 0), nx - 1.001);
    const fy = Math.min(Math.max((y - y0) / cell, 0), ny - 1.001);
    const i = Math.floor(fx), j = Math.floor(fy);
    const tx = fx - i, ty = fy - j;
    const a = table[i + nx * j], b = table[i + 1 + nx * j], c = table[i + nx * (j + 1)], d = table[i + 1 + nx * (j + 1)];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

// The V of the neck (a triangle that reaches above the vest) and the shallow back neckline.
const V_TOP = 0.75;
const V_HALF_TOP = (NECK_HALF * (V_TOP - V_APEX)) / (NECK_Y - V_APEX);
const V_NECK = [[0, V_APEX], [-V_HALF_TOP, V_TOP], [V_HALF_TOP, V_TOP]];
const BACK_HALF = 0.0675;
const backNeckY = (x) => NECK_Y - 0.012 * (1 - (x / BACK_HALF) ** 2);
const BACK_NECK = [
  [-BACK_HALF, 0.8],
  ...[-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => [t * BACK_HALF, backNeckY(t * BACK_HALF)]),
  [BACK_HALF, 0.8],
];

// --- raised details (measured off the photo; the two sides differ a little, as the garment does) ---

// Each pocket: cx = middle, top = top edge of the flap (and of the pocket), w x h = the pocket body,
// r = its lower corner radius, fw x fh = the flap (a little wider than the body, rounded lower corners).
const POCKETS = [
  { cx: -0.115, top: 0.483, w: 0.092, h: 0.146, r: 0.02, fw: 0.098, fh: 0.041, fr: 0.011, tab: 0.022 }, // chest, with the D-ring
  { cx: 0.114, top: 0.488, w: 0.121, h: 0.152, r: 0.022, fw: 0.126, fh: 0.041, fr: 0.012, tab: 0.029 }, // chest
  { cx: -0.15, top: 0.248, w: 0.191, h: 0.234, r: 0.03, fw: 0.1985, fh: 0.064, fr: 0.018, tab: 0.03 }, // lower
  { cx: 0.1437, top: 0.2535, w: 0.201, h: 0.237, r: 0.03, fw: 0.203, fh: 0.0595, fr: 0.018, tab: 0.03, meshBelow: 0.12 }, // lower, mesh pocket
];
const POCKET_PAD = 0.009; // how far a pocket body stands off the vest
const FLAP_PAD = 0.016; // ... and its flap
const TAB_PAD = 0.0205; // ... and the tab hanging from the flap

const sstep = (d, e) => smoothstep(e, -e, d); // 1 inside (d < -e), 0 outside, a soft edge between

/** Height of the raised details on the front sheet at (x, y). */
function frontDetails(x, y) {
  let pad = 0;

  for (const p of POCKETS) {
    // quick reject: outside this pocket's neighbourhood
    if (Math.abs(x - p.cx) > p.fw / 2 + 0.02 || y > p.top + 0.02 || y < p.top - p.h - 0.02) continue;
    const bodyY = p.top - p.h / 2;
    // (the lower right pocket's lower part is open mesh, thinner than its solid upper part)
    const thick = p.meshBelow === undefined ? 1 : 0.62 + 0.38 * smoothstep(p.meshBelow - 0.004, p.meshBelow + 0.004, y);
    pad = Math.max(pad, POCKET_PAD * thick * sstep(sdRoundRect(x - p.cx, y - bodyY, p.w / 2, p.h / 2, p.r), 0.003));
    // the flap: square along the top, rounded at the bottom (the box reaches above `top` and is cut flat there)
    const flapBox = sdRoundRect(x - p.cx, y - (p.top - p.fh / 2 + 0.02), p.fw / 2, p.fh / 2 + 0.02, p.fr);
    pad = Math.max(pad, FLAP_PAD * sstep(Math.max(flapBox, y - p.top), 0.0025));
    // the tab (a small loop) hanging from the middle of the flap's lower edge
    const tabY = p.top - p.fh - 0.008;
    pad = Math.max(pad, TAB_PAD * sstep(sdRoundRect(x - p.cx, y - tabY, p.tab / 2, 0.012, 0.004), 0.0025));
  }

  // D-ring on the left chest pocket: a small rounded-rectangle ring
  const ringX = -0.0754, ringY = 0.398;
  if (Math.abs(x - ringX) < 0.022 && Math.abs(y - ringY) < 0.024) {
    const outer = sdRoundRect(x - ringX, y - ringY, 0.014, 0.0165, 0.004);
    const inner = sdRoundRect(x - ringX, y - ringY, 0.0065, 0.0085, 0.002);
    pad = Math.max(pad, 0.0145 * sstep(Math.max(outer, -inner), 0.0014));
  }

  // zip: the tape from the foot of the V down to the hem, and the slider at the top
  if (Math.abs(x) < 0.02) {
    pad = Math.max(pad, 0.0035 * sstep(sdRoundRect(x, y - V_APEX / 2, 0.011, V_APEX / 2 + 0.003, 0.004), 0.0028));
    pad = Math.max(pad, 0.0085 * sstep(sdRoundRect(x, y - (V_APEX + 0.02), 0.0085, 0.0185, 0.004), 0.0022));
  }

  // the snap strap across the zip, and its button
  if (y > 0.17 && y < 0.225 && x > -0.06 && x < 0.06) {
    pad = Math.max(pad, 0.0048 * sstep(sdRoundRect(x + 0.002, y - 0.1967, 0.0385, 0.0165, 0.004), 0.0025));
    pad = Math.max(pad, 0.0095 * sstep(Math.hypot(x + 0.026, y - 0.195) - 0.0085, 0.002));
  }

  // the solid strip across the top of the mesh pocket at the lower right
  if (x > 0.05 && x < 0.25 && y > 0.1 && y < 0.17) {
    pad = Math.max(pad, 0.0125 * sstep(sdRoundRect(x - 0.149, y - 0.136, 0.0955, 0.016, 0.003), 0.0022));
  }
  return pad;
}

/** The solid yoke across the shoulders stands a little proud of the mesh body. Its lower edge runs
 *  parallel to the shoulder line, about 9 cm below it, so it slopes down towards the armholes. */
const yokeSeamY = (ax) => NECK_Y - 0.093 - 0.45 * Math.max(0, ax - 0.07);
const YOKE_PAD = 0.0018;
const BINDING_PAD = 0.0022; // the tape that binds the armholes, neck and hem
const BINDING_WIDTH = [0.01, 0.016];

export function vest({ step = 0.0042 } = {}) {
  const outline = outlineDistance();

  /** Signed distance to the V of the neck (positive in the cloth) and to the back neckline. */
  const vDistance = (x, y) => sdPolygon(x, y, V_NECK) - 0.0035;
  const backNeckDistance = (x, y) => sdPolygon(x, y, BACK_NECK);

  /** Height of everything raised on the back sheet (yoke and bound edges only) and on the front. */
  function commonPad(x, y, edge) {
    const ax = Math.abs(x);
    const yoke = YOKE_PAD * sstep(yokeSeamY(ax) - y, 0.003);
    const binding = BINDING_PAD * (1 - smoothstep(BINDING_WIDTH[0], BINDING_WIDTH[1], edge));
    return Math.max(yoke, binding);
  }
  function frontPad(x, y) {
    const edge = Math.min(outline(x, y), Math.abs(x) < 0.1 && y > 0.37 ? vDistance(x, y) : 1);
    return Math.max(commonPad(x, y, edge), frontDetails(x, y));
  }
  function backPad(x, y) {
    const edge = Math.min(outline(x, y), Math.abs(x) < 0.1 && y > 0.6 ? backNeckDistance(x, y) : 1);
    return commonPad(x, y, edge);
  }

  function field(x, y, z) {
    const ax = Math.abs(x);
    if (ax > HALF_WIDTH + 0.06 || y > 0.71 || y < -0.02) return 0.05;

    // the cloth hangs a little unevenly: a slow ripple moves the whole body in z
    const ripple = 0.0016 * noise3(x * 9, y * 9, 0.3) + 0.0009 * noise3(x * 22 + 5, y * 22, 2.2);
    const zz = z - ripple;
    const solid = body(x, y, zz);
    if (Math.abs(solid) > 0.045) return Math.abs(solid) - 0.04; // nowhere near the cloth

    // raised details: the front sheet carries the front's, the back sheet the back's
    const w = smoothstep(-0.01, 0.01, zz);
    const pad = w * frontPad(x, y) + (1 - w) * backPad(x, y);
    // a pad adds to the outer face only, so the skin's middle moves out by half the pad
    const d = Math.abs(solid - pad / 2) - (T + pad / 2);

    // cut the armholes and the hem (the outline), the V (front sheet) and the back neckline (back sheet)
    let keep = outline(x, y);
    if (ax < 0.1 && y > 0.37) {
      const v = vDistance(x, y);
      const n = backNeckDistance(x, y);
      keep = Math.min(keep, zz > 0.003 ? v : zz < -0.003 ? n : Math.min(v, n));
    }
    return smax(d, -keep, 0.0025);
  }

  return {
    id: "vest",
    field,
    clips: [],
    scale: 1,
    bounds: { min: [-0.34, -0.014, -0.165], max: [0.34, 0.7, 0.165], step },
    // The marching-cubes mesh is much denser than a web page needs. The cloth is 8 mm thick, so keep
    // the reduction's error well under that or the two faces of a sheet would be merged.
    simplify: { triangles: 90000, error: 0.004 },
  };
}
