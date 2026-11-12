// RETIRED (Nov 2026): the Atelier's sweatpants are now a real, simulated-cloth model ("Baggy Pants FREE", see
// sources.json). This generated pair is no longer registered in models.mjs and nothing imports it; it is kept in case
// it is wanted again (add `sweatpants` back to GARMENT_BUILDERS, remove the "sweatpants" entry from sources.json,
// then run `node scripts/garments/build.mjs sweatpants`). The 2D pictures are photographs and do not depend on the model.
//
// The sweatpants: wide, straight-leg sweatpants in heavy fleece, matching the pair in the
// collection photo: a flat elastic waistband with the cloth gathered under it, two wide legs that
// stay wide to plain hemmed openings (no ribbed cuffs, no taper), a low crotch, slanted side
// pockets and the soft drape folds that stack a little near the hem.
//
// Built like the vest in vest.mjs: the pants are described as a solid (a signed-distance
// function, sdf.mjs), only the skin of it is kept (a thin cloth shell), and the waist and the
// two hems are opened by clipping (mesher.mjs). Units are roughly metres, front is +z, up is +y.

import { mix, noise3, smax, smin, smoothstep } from "./sdf.mjs";

const TAU = Math.PI * 2;

// Creases as [height, width, size]: where the cloth stacks above the hem, and where it bends at the thigh.
const HEM_CREASES = [[0.034, 0.009, 0.002], [0.066, 0.011, 0.0017], [0.104, 0.013, 0.0013], [0.15, 0.015, 0.001]];
const THIGH_CREASES = [[0.3, 0.014, 0.001], [0.355, 0.015, 0.0012], [0.415, 0.015, 0.001], [0.47, 0.015, 0.0008]];

/**
 * A smooth curve through [y, value] control points (cubic Hermite with Catmull-Rom slopes that are
 * flattened at turning points, so it never overshoots). Sampled into a table because the field
 * reads a handful of these millions of times; outside the points it holds the end value.
 */
function profile(nodes) {
  const n = nodes.length;
  const h = [];
  const d = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(nodes[i + 1][0] - nodes[i][0]);
    d.push((nodes[i + 1][1] - nodes[i][1]) / h[i]);
  }
  const m = nodes.map((_, i) => {
    if (i === 0) return d[0];
    if (i === n - 1) return d[n - 2];
    if (d[i - 1] * d[i] <= 0) return 0;
    return Math.sign(d[i]) * Math.min(Math.abs(d[i - 1] + d[i]) / 2, 3 * Math.min(Math.abs(d[i - 1]), Math.abs(d[i])));
  });
  const exact = (y) => {
    let i = 0;
    while (i < n - 2 && y > nodes[i + 1][0]) i++;
    const t = (y - nodes[i][0]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * nodes[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] +
      (-2 * t3 + 3 * t2) * nodes[i + 1][1] + (t3 - t2) * h[i] * m[i + 1]
    );
  };
  const y0 = nodes[0][0];
  const y1 = nodes[n - 1][0];
  const STEP = 0.001;
  const table = Float64Array.from({ length: Math.round((y1 - y0) / STEP) + 2 }, (_, k) => exact(Math.min(y0 + k * STEP, y1)));
  return (y) => {
    if (y <= y0) return table[0];
    if (y >= y1) return table[table.length - 1];
    const f = (y - y0) / STEP;
    const i = Math.floor(f);
    return table[i] + (table[i + 1] - table[i]) * (f - i);
  };
}

/** Signed distance (first order, negative inside) from (px, pz) to the ellipse with half axes a (x) and b (z). */
function sdEllipse(px, pz, a, b) {
  const qx = px / a;
  const qz = pz / b;
  const r = Math.hypot(qx, qz);
  if (r < 1e-9) return -Math.min(a, b);
  return ((r - 1) * r) / Math.hypot(qx / a, qz / b);
}

/**
 * The generator spec (see apron() in models.mjs). The finished pants are about 0.45 wide, 0.79 high and
 * 0.23 deep, ~80k triangles after simplification. The options exist for quick previews: `half` is half
 * the cloth's thickness and `step` the marching-cubes grid size; the defaults are the shipped quality
 * (a coarse `step: 0.0065` with `half: 0.0055` builds in a second but loses the stitching and the pocket).
 */
export function sweatpants({ half = 0.0035, step = 0.0038 } = {}) {
  const WAIST = 0.8; // top of the waistband (the opening is cut here)
  const BAND = 0.745; // bottom of the waistband
  const CROTCH = 0.45; // where the two legs part (the photo's are a low, relaxed fit: about 45% of the way down)

  // --- the legs: two wide, nearly straight tubes with a slight outward splay -----------------------
  // Profiles are by height y (0 = the hem). cx is the distance of a leg's axis from the middle,
  // a and b its half width and half depth (a slightly flattened ellipse, thigh a little fuller than the
  // calf), cz how far it sits behind the middle (the seat pushes the back out).
  const legCx = profile([[0, 0.128], [0.18, 0.12], [0.34, 0.109], [0.44, 0.097], [0.56, 0.088], [0.7, 0.08]]);
  const legA = profile([[0, 0.09], [0.12, 0.089], [0.26, 0.092], [0.36, 0.095], [0.44, 0.097], [0.5, 0.101], [0.6, 0.111], [0.7, 0.117]]);
  const legB = profile([[0, 0.08], [0.14, 0.079], [0.3, 0.082], [0.44, 0.092], [0.6, 0.1], [0.7, 0.102]]);
  const legCz = profile([[0, -0.002], [0.3, -0.004], [0.5, -0.009], [0.7, -0.013]]);

  // --- the seat and waist: one fuller tube that closes like a bowl at the crotch -----------------------
  // It is the same cloth as the legs seen from above the crotch: it fills the notch where the two thighs
  // meet, carries the pants up to the waistband and pinches in to the elastic there.
  const hipA = profile([
    [0.45, 0.012], [0.465, 0.07], [0.49, 0.12], [0.53, 0.16], [0.58, 0.19], [0.65, 0.204], [0.69, 0.2],
    [0.72, 0.19], [0.745, 0.178], [0.757, 0.169], [0.775, 0.164], [0.8, 0.164], [0.9, 0.164],
  ]);
  const hipB = profile([
    [0.45, 0.004], [0.465, 0.05], [0.49, 0.082], [0.53, 0.096], [0.58, 0.104], [0.65, 0.107], [0.69, 0.105],
    [0.72, 0.1], [0.745, 0.095], [0.757, 0.092], [0.775, 0.09], [0.9, 0.09],
  ]);
  const hipCz = profile([[0.45, -0.004], [0.5, -0.007], [0.63, -0.011], [0.75, -0.006], [0.9, -0.004]]);

  /**
   * Where a leg's axis is at height y: the profile plus a slow wander of a few millimetres, different for
   * each leg and dying out towards the seat, so the legs hang like cloth and not like two machined tubes.
   */
  const legAxis = (y, side) => {
    const calm = smoothstep(0.58, 0.28, y);
    return {
      cx: legCx(y) + (calm > 0 ? calm * 0.006 * noise3(y * 2.3 + 1.7 + 7.3 * side, 0.4, 0.2) : 0),
      cz: legCz(y) + (calm > 0 ? calm * 0.005 * noise3(y * 2.1 + 4.4 + 5.1 * side, 2.2, 0.9) : 0),
    };
  };

  /** The solid before any cloth detail: the signed distance, negative inside the pants. */
  function body(x, y, z) {
    const sx = x >= 0 ? 1 : -1;
    const ax = legA(y);
    const bz = legB(y);
    const right = legAxis(y, 1);
    const left = legAxis(y, -1);
    const dRight = sdEllipse(x - right.cx, z - right.cz, ax, bz);
    const dLeft = sdEllipse(x + left.cx, z - left.cz, ax, bz);
    // the legs end inside the seat, so they cannot poke out round the waistband
    const legs = smax(smin(dRight, dLeft, 0.016), y - 0.63, 0.05);
    const hip = smax(sdEllipse(x, z - hipCz(y), Math.max(hipA(y), 0.004), Math.max(hipB(y), 0.004)), CROTCH - 0.005 - y, 0.02);
    return { d: smin(legs, hip, 0.04), sx };
  }

  /** Where the hems are cut: not quite level, a little lower at the back where the cloth drapes longer. */
  const hemLine = (x, z) => 0.012 + 0.006 * noise3(6 * x + 2.1, 1.3, 6 * z + 0.7) - 0.007 * smoothstep(0, -0.09, z);

  // --- cloth detail --------------------------------------------------------------------------------
  /** Soft drape folds of a wide leg (x, z measured from the leg's own axis, outwards positive in u). */
  function legCloth(u, w, y, side, ax, bz) {
    const phi = Math.atan2(w / bz, u / ax); // 0 = outer seam, pi/2 = front, pi = inner seam, -pi/2 = back
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const o = side * 5.3;
    // long vertical folds that wander as they run down, stronger and closer together towards the hem
    const n1 = noise3(1.5 * c + o, 1.5 * s + 2.9, y * 2.6);
    const n2 = noise3(1.5 * c - 3.1, 1.5 * s + 7.7 + o, y * 4.1 + 3.3);
    const hem = smoothstep(0.34, 0.0, y);
    const folds =
      (0.0024 + 0.0046 * hem) *
      (0.5 * Math.sin(4 * phi + 3 * n1 + 0.8) + 0.32 * Math.sin(7 * phi + 4 * n2 + 2.1) + 0.18 * Math.sin(11 * phi + 5 * n1 - 1.3));
    // the hem stacks up a little: a few short horizontal creases in the last hand's width, uneven in
    // height and only part way round, so they read as cloth and not as rings
    let stack = 0;
    if (y < 0.22) {
      for (let k = 0; k < HEM_CREASES.length; k++) {
        const [y0, sigma, amp] = HEM_CREASES[k];
        const t = (y - y0 - 0.012 * noise3(c * 1.3 + o + k, s * 1.3 + 0.7 * k, 2.3 * k)) / sigma;
        const part = smoothstep(-0.3, 0.5, noise3(c * 1.8 + o + 3 * k, s * 1.8 - k, 4.1 + k));
        stack += amp * part * t * Math.exp(0.5 - 0.5 * t * t);
      }
    }
    // a broad soft bulge so the legs are never perfect tubes
    const bulge = 0.0036 * noise3(2.2 * c + o + 9, 2.2 * s, y * 3.1 + 5);
    // a few soft creases across the front of the thigh where the leg bends (the folds the photo shows)
    let thigh = 0;
    if (y > 0.24 && y < 0.52) {
      const front = smoothstep(-0.1, 0.9, s);
      for (let k = 0; k < THIGH_CREASES.length; k++) {
        const [y0, sigma, amp] = THIGH_CREASES[k];
        const t = (y - y0 - 0.014 * noise3(c * 1.1 + o + 7 * k, s * 1.1, 1.7 * k + 8)) / sigma;
        const part = smoothstep(-0.2, 0.6, noise3(c * 1.6 + o - 2 * k, s * 1.6 + k, 9.1 + 2 * k));
        thigh += amp * front * part * t * Math.exp(0.5 - 0.5 * t * t);
      }
    }
    // side seam and inseam: shallow grooves
    const outer = Math.exp(-((phi / 0.05) ** 2));
    const inner = Math.exp(-(((Math.PI - Math.abs(phi)) / 0.05) ** 2));
    return folds + stack + bulge + thigh - 0.0013 * (outer + inner);
  }

  /** Cloth detail of the seat and waist: gathers under the band, stitched channels, pocket slits, seat creases. */
  function hipCloth(x, y, z) {
    const a = Math.max(hipA(y), 0.05);
    const b = Math.max(hipB(y), 0.04);
    const px = x;
    const pz = z - hipCz(y);
    const phi = Math.atan2(pz / b, px / a);
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    // the elastic gathers the cloth into soft vertical pleats that fan out under the band
    const gather = smoothstep(0.63, 0.742, y) * (1 - smoothstep(0.744, 0.752, y));
    const pleats = 0.0034 * gather * Math.sin(19 * phi + 3 * noise3(c * 2 + 4.4, s * 2, y * 7)) * (0.75 + 0.25 * noise3(c * 3, s * 3 + 1.1, 2.5));
    // the band: three stitched channels (shallow ridges) and a faint wave where the elastic ruches it
    const band = smoothstep(0.742, 0.75, y);
    const ridges = 0.0016 * band * Math.cos(((y - 0.7525) * TAU) / 0.0165);
    const ruche = 0.0009 * band * Math.sin(23 * phi + 2 * noise3(c * 2, s * 2, 8.3));
    // broad soft bulges, and the creases across the seat and radiating from the crotch
    const bulge =
      (0.0052 * noise3(5 * x + 3.1, 5 * y, 5 * z + 1.7) + 0.0022 * noise3(11 * x - 4.2, 11 * y + 2.5, 11 * z)) * smoothstep(0.76, 0.62, y);
    const dy = y - CROTCH;
    const crotchReach = smoothstep(0.17, 0.0, Math.hypot(x, dy));
    const whiskers = 0.0028 * crotchReach * Math.sin(11 * Math.atan2(dy, x) + 2 * noise3(x * 9, y * 9, z * 9)) * smoothstep(0.015, 0.05, Math.abs(z - hipCz(y)) + 0.02);
    const seat = 0.003 * Math.exp(-(((y - 0.505) / 0.013) ** 2)) * smoothstep(0, -0.05, z) * (1 - Math.min(1, (x / 0.21) ** 2));

    // side seams, and the slanted pocket opening on the front of each hip (a groove, with the front
    // panel's edge standing a little proud of the pocket bag)
    const seam = -0.0014 * Math.exp(-((Math.atan2(pz / b, Math.abs(px) / a) / 0.05) ** 2));
    const ax = Math.abs(x);
    const P0x = 0.148;
    const P0y = 0.742;
    const dxs = 0.222 - P0x;
    const dys = 0.585 - P0y;
    const len = Math.hypot(dxs, dys);
    const tx = dxs / len;
    const ty = dys / len;
    const along = ((ax - P0x) * tx + (y - P0y) * ty) / len; // 0..1 along the slit
    const across = (ax - P0x) * ty * -1 + (y - P0y) * tx; // positive towards the middle of the front panel
    const onFront = smoothstep(-0.01, 0.045, z);
    const reach = smoothstep(-0.04, 0.02, along) * smoothstep(1.06, 0.97, along);
    const lip = 0.002 * smoothstep(0, 0.004, across) * smoothstep(0.026, 0.009, across);
    const groove = -0.0017 * smoothstep(0.009, 0, Math.abs(across + 0.001));
    const pocket = onFront * reach * (lip + groove);

    // the seam down the middle of the front (where the legs' panels join) and of the back
    const midSeam =
      -0.0012 * Math.exp(-((x / 0.0045) ** 2)) * smoothstep(0.5, 0.56, y) * (1 - smoothstep(0.745, 0.755, y)) *
      Math.max(smoothstep(0.02, 0.06, z), smoothstep(-0.02, -0.06, z));
    return pleats + ridges + ruche + bulge + whiskers + seat + seam + pocket + midSeam;
  }

  function field(x, y, z) {
    const { d, sx } = body(x, y, z);
    // far from the cloth nothing matters but the sign and a rough distance
    let t = half;
    const edge = Math.abs(d);
    if (edge < 0.035) {
      let delta;
      const wHip = smoothstep(0.47, 0.56, y);
      const legDelta = () => {
        const axis = legAxis(y, sx);
        return legCloth((x - sx * axis.cx) * sx, z - axis.cz, y, sx, legA(y), legB(y)) * smoothstep(0.58, 0.46, y);
      };
      if (wHip <= 0) delta = legDelta();
      else if (wHip >= 1) delta = hipCloth(x, y, z);
      else delta = mix(legDelta(), hipCloth(x, y, z), wHip);
      const live = smoothstep(0.035, 0.022, edge);
      const dd = d - delta * live;
      // turned hems and the elastic band are a little thicker than the cloth
      t += 0.0012 * smoothstep(0.045, 0.014, y) + 0.0014 * smoothstep(BAND, BAND + 0.01, y);
      return Math.abs(dd) - t;
    }
    return edge - t;
  }

  return {
    id: "sweatpants",
    field,
    // keep the part between the waist and the hems
    clips: [(x, y, z) => WAIST - y, (x, y, z) => y - hemLine(x, z)],
    scale: 1,
    bounds: { min: [-0.3, -0.04, -0.17], max: [0.3, 0.86, 0.15], step },
    simplify: { triangles: 80000, error: 0.004 },
  };
}
