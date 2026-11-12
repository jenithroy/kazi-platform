// Derives the long-sleeve tee from the T-shirt model: node scripts/garments/derive-long-sleeve.mjs
//
// The collection's long-sleeve tee is the same boxy, drop-shoulder tee as the T-shirt with long
// sleeves, plain hemmed cuffs and a plain hem. The T-shirt model (public/models/tshirt.glb, made
// for this site) already has the body, collar and hem right, so this script lengthens its sleeves
// instead of importing someone else's sweatshirt.
//
// The tee is cloth-simulation output: every panel is a double-walled shell, the seams between
// panels are open, and each cuff is a stack of separate band layers. There is no clean boundary
// loop to extrude, so the mesh is deformed instead, which cannot tear and carries every layer along:
//
//   1. Read the tee, stand it up (the file's node rotates it) and label its connected panels.
//   2. For each sleeve pick the panels that lie wholly inside the sleeve and reach the cuff (the
//      sleeve tube and the cuff band layers) and measure the cuff: its centre and axis.
//   3. Refine the sleeve's long edges (by splitting them where they will be stretched) so the
//      lengthened sleeve is as smooth as the original.
//   4. Warp every vertex of those panels along the sleeve axis: nothing moves near the shoulder,
//      the middle of the sleeve is stretched out, and the cuff band is carried to the new end
//      unchanged. Along the way the sleeve tapers towards the wrist, turns from the way the short
//      sleeve points to a relaxed hanging direction (down, a little out, a little forward; the same
//      on both sides), picks up soft lengthwise folds, and is eased so that both cuffs end as mirror
//      images at the height set by OPTIONS.cuffLowest.
//   5. Carry the normals through the warp, drop the tee's textures (customers choose the colour),
//      and write public/models/long-sleeve.glb.
//   6. Check it: how much of the front and back can take artwork (compared with the T-shirt) and how
//      far the sleeves hang from the torso.
//
// The body, collar and hem are untouched, so the long sleeve stands on the same floor and prints
// exactly like the T-shirt. The sleeves are the only change. Needs no browser.
// Like the T-shirt it is double-walled cloth, so the viewer's `dimInside` should stay off for it.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { finishMesh } from "./mesher.mjs";
import { writeGlb } from "./glb.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..", "..");
const SOURCE = join(appDir, "public", "models", "tshirt.glb");
const OUTPUT = join(appDir, "public", "models", "long-sleeve.glb");

const OPTIONS = {
  cuffLowest: -0.33, // the lowest point of each cuff (the hem is at y = -0.356); sets how long the sleeves are
  splayDegrees: 7, // by the cuff the sleeve hangs this far out from vertical (the same on both sides)
  forwardDegrees: 5, // ... and this far forward, as a relaxed arm hangs
  cuffScale: 0.68, // cuff radius as a fraction of the sleeve's own radius
  stretchFrom: 0.119, // the stretched part of the sleeve is this long (metres) in the original
  maxEdge: 0.03, // after stretching, no stretched edge in the sleeve is longer than this
  folds: 0.003, // amplitude (metres) of the soft lengthwise folds in the stretched sleeve
};

// --- small vector helpers --------------------------------------------------------------------------
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// --- 1. read the T-shirt -----------------------------------------------------------------------------
function readGlb(file) {
  const buf = readFileSync(file);
  const jsonLength = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8"));
  const bin = buf.subarray(20 + jsonLength + 8);
  const read = (index) => {
    const a = json.accessors[index];
    const view = json.bufferViews[a.bufferView];
    const start = bin.byteOffset + (view.byteOffset || 0) + (a.byteOffset || 0);
    const count = a.count * { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
    const Type = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType];
    return new Type(bin.buffer.slice(start, start + count * Type.BYTES_PER_ELEMENT));
  };
  const primitive = json.meshes[0].primitives[0];
  return {
    positions: read(primitive.attributes.POSITION),
    normals: read(primitive.attributes.NORMAL),
    indices: read(primitive.indices),
    rotation: json.nodes[0].rotation, // a quarter turn about x: Blender's z-up becomes y-up
  };
}

const tee = readGlb(SOURCE);
if (Math.abs(tee.rotation[0] - Math.SQRT1_2) > 1e-3 || tee.rotation[1] || tee.rotation[2]) {
  throw new Error("tshirt.glb's node rotation is not the quarter turn about x this script expects");
}
const vertexCount = tee.positions.length / 3;
// (x, y, z) -> (x, -z, y), for positions and normals alike
const P = new Float64Array(vertexCount * 3);
const N = new Float64Array(vertexCount * 3);
for (let i = 0; i < vertexCount; i++) {
  P[i * 3] = tee.positions[i * 3]; P[i * 3 + 1] = -tee.positions[i * 3 + 2]; P[i * 3 + 2] = tee.positions[i * 3 + 1];
  N[i * 3] = tee.normals[i * 3]; N[i * 3 + 1] = -tee.normals[i * 3 + 2]; N[i * 3 + 2] = tee.normals[i * 3 + 1];
}
let triangles = [];
for (let t = 0; t < tee.indices.length; t += 3) triangles.push([tee.indices[t], tee.indices[t + 1], tee.indices[t + 2]]);

// Connected panels: vertices at the same place count as one, then triangles join them.
const cell = 1e-5;
const welded = new Map();
const weldOf = new Int32Array(vertexCount);
for (let i = 0; i < vertexCount; i++) {
  const key = `${Math.round(P[i * 3] / cell)},${Math.round(P[i * 3 + 1] / cell)},${Math.round(P[i * 3 + 2] / cell)}`;
  if (!welded.has(key)) welded.set(key, welded.size);
  weldOf[i] = welded.get(key);
}
const parent = Int32Array.from({ length: welded.size }, (_, i) => i);
const find = (x) => {
  while (parent[x] !== x) x = parent[x] = parent[parent[x]];
  return x;
};
for (const [a, b, c] of triangles) {
  parent[find(weldOf[a])] = find(weldOf[b]);
  parent[find(weldOf[b])] = find(weldOf[c]);
}
const panelOf = new Int32Array(vertexCount);
const panelIds = new Map();
for (let i = 0; i < vertexCount; i++) {
  const root = find(weldOf[i]);
  if (!panelIds.has(root)) panelIds.set(root, panelIds.size);
  panelOf[i] = panelIds.get(root);
}

// --- 2. find each sleeve and measure its cuff --------------------------------------------------------
// A first guess at the right sleeve's axis (measured on this model): the cuff ends about here,
// pointing down and out. It only has to be good enough to pick the right panels; the real frame is
// measured from them below.
const GUESS = { centre: [0.2505, 0.0234, -0.0151], axis: norm([0.445, -0.891, 0.091]) };

/** The sleeve on one side (sign +1 = the +x side): its panels, cuff frame and the zone to deform. */
function findSleeve(sign) {
  const stats = new Map();
  for (let i = 0; i < vertexCount; i++) {
    const rel = sub([sign * P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], GUESS.centre);
    const s = dot(rel, GUESS.axis);
    const r = Math.hypot(...sub(rel, mul(GUESS.axis, s)));
    const o = stats.get(panelOf[i]) ?? { xMin: Infinity, sMin: Infinity, sMax: -Infinity, rMax: 0 };
    o.xMin = Math.min(o.xMin, sign * P[i * 3]);
    o.sMin = Math.min(o.sMin, s);
    o.sMax = Math.max(o.sMax, s);
    o.rMax = Math.max(o.rMax, r);
    stats.set(panelOf[i], o);
  }
  // Whole panels that lie inside the sleeve (not the torso, which also has vertices out here) and
  // reach the cuff. The sleeve tube, the cuff band layers and a few stitch strips qualify.
  const panels = new Set();
  const bandPanels = new Set();
  for (const [id, o] of stats) {
    if (o.xMin >= 0.15 && o.rMax <= 0.125 && o.sMin >= -0.25 && o.sMax >= -0.03) {
      panels.add(id);
      if (o.sMin >= -0.03) bandPanels.add(id);
    }
  }
  const members = [];
  for (let i = 0; i < vertexCount; i++) if (panels.has(panelOf[i])) members.push(i);

  // The cuff: the centre and the axis (the normal of the ring) of the band's vertices.
  const end = members.filter((i) => dot(sub([sign * P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], GUESS.centre), GUESS.axis) >= -0.025);
  const centre = [0, 0, 0];
  for (const i of end) for (let k = 0; k < 3; k++) centre[k] += (k === 0 ? sign * P[i * 3] : P[i * 3 + k]) / end.length;
  const axis = ringNormal(end, sign, centre);
  if (dot(axis, GUESS.axis) < 0) for (let k = 0; k < 3; k++) axis[k] = -axis[k];

  const e1 = norm(sub([0, 0, 1], mul(axis, axis[2]))); // across the sleeve, front to back
  const e2 = cross(axis, e1); // across the sleeve, towards the body and down
  let sBandMin = Infinity;
  let sMax = -Infinity;
  for (const i of members) {
    const s = dot(sub([sign * P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], centre), axis);
    sMax = Math.max(sMax, s);
    if (bandPanels.has(panelOf[i])) sBandMin = Math.min(sBandMin, s);
  }
  return { sign, panels, members, centre, axis, e1, e2, sBandMin, sMax };
}

/** The direction in which a roughly flat ring of points varies least (smallest principal axis). */
function ringNormal(indices, sign, centre) {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const i of indices) {
    const d = sub([sign * P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], centre);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a][b] += (d[a] * d[b]) / indices.length;
  }
  // power iteration on (trace * I - C) finds the smallest eigenvector of C
  const trace = C[0][0] + C[1][1] + C[2][2];
  let v = norm([0.445, -0.891, 0.091]);
  for (let it = 0; it < 200; it++) {
    const w = [0, 1, 2].map((a) => trace * v[a] - (C[a][0] * v[0] + C[a][1] * v[1] + C[a][2] * v[2]));
    v = norm(w);
  }
  return v;
}

// --- the warp ------------------------------------------------------------------------------------------
/**
 * Builds the position warp for one sleeve. Coordinates are measured along the sleeve axis (s, 0 at
 * the cuff's centre) and across it (q). Nothing moves for s < sa. From sa to sb the sleeve is
 * stretched (the stretch eases in and out, so the shape stays smooth); beyond sb (the cuff band and
 * the end of the tube) everything is carried along rigidly. The sleeve's new axis is a curve
 * that starts along the old one and swings towards the body; the cross-section is scaled about it
 * to taper the sleeve and turned to follow the curve.
 */
function makeWarp(sleeve, extend, drift = [0, 0, 0]) {
  const { centre, axis, e1, e2, sign } = sleeve;
  const sb = sleeve.sBandMin - 0.014;
  const sa = sb - OPTIONS.stretchFrom;
  const sEnd = sleeve.sMax;

  // stretch profile: peak factor kp over the middle of [sa, sb], easing in and out
  const bump = (t) => smooth(0, 0.3, t) * (1 - smooth(0.7, 1, t));
  const STEPS = 600;
  let bumpArea = 0;
  for (let k = 0; k < STEPS; k++) bumpArea += bump((k + 0.5) / STEPS) / STEPS;
  const peak = 1 + extend / (OPTIONS.stretchFrom * bumpArea);
  // sigma(s): arc length along the new axis, as a table over [sa, sb]
  const sigmaTable = new Float64Array(STEPS + 1);
  for (let k = 0; k < STEPS; k++) {
    const t = (k + 0.5) / STEPS;
    sigmaTable[k + 1] = sigmaTable[k] + (1 + (peak - 1) * bump(t)) * ((sb - sa) / STEPS);
  }
  const sigmaOf = (s) => {
    if (s <= sa) return s;
    if (s >= sb) return sa + sigmaTable[STEPS] + (s - sb);
    const f = ((s - sa) / (sb - sa)) * STEPS;
    const k = Math.floor(f);
    return sa + sigmaTable[k] + (sigmaTable[k + 1] - sigmaTable[k]) * (f - k);
  };
  const sigmaEnd = sigmaOf(sEnd);

  // The new axis starts along the old one and turns towards a hanging direction that is the same on
  // both sides (mirrored): down, a little out and a little forward. The cross-section turns with it.
  const hang = norm([Math.tan((OPTIONS.splayDegrees * Math.PI) / 180), -1, Math.tan((OPTIONS.forwardDegrees * Math.PI) / 180)]);
  const turn = norm(cross(axis, hang));
  const turnAngle = Math.acos(Math.min(1, Math.max(-1, dot(axis, hang))));
  const tau = (sigma) => (sigma - sa) / (sigmaEnd - sa);
  const weightAt = (sigma) => smooth(0.18, 1, tau(sigma));
  /** Rotates a vector about `turn` by the fraction of the way to the hanging direction at sigma (Rodrigues). */
  const turned = (v, sigma) => {
    const angle = turnAngle * weightAt(sigma);
    const c = Math.cos(angle), s = Math.sin(angle);
    return add(add(mul(v, c), mul(cross(turn, v), s)), mul(turn, dot(turn, v) * (1 - c)));
  };
  const frameAt = (sigma) => ({ t: turned(axis, sigma), n1: turned(e1, sigma), n2: turned(e2, sigma) });
  const D_SIGMA = 0.0005;
  const pathLength = Math.ceil((sigmaEnd - sa) / D_SIGMA) + 2;
  const path = new Array(pathLength);
  let at = add(centre, mul(axis, sa));
  for (let j = 0; j < pathLength; j++) {
    path[j] = at;
    at = add(at, mul(turned(axis, sa + (j + 0.5) * D_SIGMA), D_SIGMA));
  }
  const pathAt = (sigma) => {
    const f = (sigma - sa) / D_SIGMA;
    const j = Math.min(pathLength - 2, Math.max(0, Math.floor(f)));
    return add(path[j], mul(sub(path[j + 1], path[j]), f - j));
  };

  function warp(p) {
    const m = [sign * p[0], p[1], p[2]];
    const rel = sub(m, centre);
    const s = dot(rel, axis);
    if (s <= sa) return p;
    const q = sub(rel, mul(axis, s));
    const qa = dot(q, e1);
    const qb = dot(q, e2);
    const sigma = sigmaOf(s);
    const frame = frameAt(sigma);
    const scale = 1 - (1 - OPTIONS.cuffScale) * smooth(0.04, 0.82, tau(sigma));
    const across = add(mul(frame.n1, qa * scale), mul(frame.n2, qb * scale));

    // Soft lengthwise folds, wandering as they run down and gathering towards the cuff. They fade
    // out at both ends of the stretched part, so the shoulder and the cuff band are untouched.
    const t = (s - sa) / (sb - sa);
    const window = smooth(0.08, 0.35, t) * (1 - smooth(0.82, 0.98, t));
    let fold = 0;
    if (window > 0) {
      const angle = Math.atan2(qb, qa);
      const wander1 = 1.3 * Math.sin(5.5 * sigma + 0.7) + 0.6 * Math.sin(13 * sigma);
      const wander2 = 1.1 * Math.sin(7.3 * sigma + 2.1);
      const pattern = 0.65 * Math.sin(3 * angle + wander1) + 0.35 * Math.sin(5 * angle + 1.9 + wander2);
      fold = OPTIONS.folds * (0.35 + 0.65 * smooth(0.3, 0.9, tau(sigma))) * window * pattern;
    }
    const reach = Math.hypot(qa, qb) || 1;
    // `drift` eases the whole sleeve sideways as it goes, so the two cuffs end mirror images of
    // each other (the T-shirt's own sleeves are slightly different, as real cloth is)
    const shift = mul(drift, smooth(0.15, 1, tau(sigma)));
    const out = add(add(add(pathAt(sigma), across), shift), mul(across, fold / (reach * scale)));
    return [sign * out[0], out[1], out[2]];
  }
  return { warp, sa, sb, peak, sigmaEnd, pathAt, end: add(pathAt(sigmaEnd), drift) };
}

// --- 3. build, refine and warp both sleeves -------------------------------------------------------------
const sleeves = [findSleeve(1), findSleeve(-1)];
const sleeveOf = new Int8Array(vertexCount);
for (const sleeve of sleeves) for (const i of sleeve.members) sleeveOf[i] = sleeve.sign;

/** The lowest point of a sleeve's cuff (its band and the end of the tube) once it is lengthened by `extend`. */
function cuffBottom(sleeve, extend) {
  const w = makeWarp(sleeve, extend);
  let lowest = Infinity;
  for (const i of sleeve.members) {
    const s = dot(sub([sleeve.sign * P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], sleeve.centre), sleeve.axis);
    if (s >= w.sb) lowest = Math.min(lowest, w.warp([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]])[1]);
  }
  return lowest;
}
/** How much longer a sleeve has to be for its cuff to end at OPTIONS.cuffLowest (bisection: longer is lower). */
function lengthFor(sleeve) {
  let lo = 0.05;
  let hi = 0.8;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (cuffBottom(sleeve, mid) > OPTIONS.cuffLowest) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Each sleeve's length from the cuff height; then the cuff positions (sideways and front to back) are
// pulled to the average of the two sides, mirrored, so the garment is symmetric.
const lengths = new Map(sleeves.map((s) => [s.sign, lengthFor(s)]));
const ends = sleeves.map((s) => {
  const w = makeWarp(s, lengths.get(s.sign));
  return w.pathAt(w.sigmaEnd);
});
const meanEnd = [0, 1, 2].map((k) => (ends[0][k] + ends[1][k]) / 2);
const warps = new Map();
sleeves.forEach((s, n) => {
  const extend = lengths.get(s.sign);
  const w = makeWarp(s, extend, [meanEnd[0] - ends[n][0], 0, meanEnd[2] - ends[n][2]]);
  warps.set(s.sign, w);
  console.log(
    `${s.sign > 0 ? "right" : "left "} sleeve: ${s.panels.size} panels, ${s.members.length} vertices; cuff at ` +
      `${[s.centre[0] * s.sign, s.centre[1], s.centre[2]].map((v) => v.toFixed(3))}, axis ${s.axis.map((v) => v.toFixed(2))}; ` +
      `lengthened by ${extend.toFixed(3)} (stretch s ${w.sa.toFixed(3)}..${w.sb.toFixed(3)}, peak x${w.peak.toFixed(1)})`,
  );
});

// Position arrays grow while the sleeves are refined, so keep them as plain arrays from here on.
const pos = Array.from(P);
const nor = Array.from(N);
const side = Array.from(sleeveOf);
const warpedOf = (i) => {
  const w = warps.get(side[i]);
  return w ? w.warp([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]) : [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
};

// Split every edge of the sleeve triangles that would be longer than maxEdge once warped. Midpoints
// are shared between the triangles on either side of an edge, so the mesh stays watertight; a
// triangle with one, two or three split edges becomes two, three or four triangles.
const KEY = 4194304;
for (let pass = 0; pass < 12; pass++) {
  const warped = new Map();
  const at = (i) => warped.get(i) ?? (warped.set(i, warpedOf(i)), warped.get(i));
  const marked = new Set();
  for (const [a, b, c] of triangles) {
    if (!side[a] || side[a] !== side[b] || side[a] !== side[c]) continue;
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const key = u < v ? u * KEY + v : v * KEY + u;
      if (marked.has(key)) continue;
      // only edges the warp has stretched (the rigid cuff band keeps its own, finer, mesh)
      const stretched = Math.hypot(...sub(at(u), at(v)));
      const original = Math.hypot(pos[u * 3] - pos[v * 3], pos[u * 3 + 1] - pos[v * 3 + 1], pos[u * 3 + 2] - pos[v * 3 + 2]);
      if (stretched > OPTIONS.maxEdge && stretched > 1.5 * original) marked.add(key);
    }
  }
  console.log(`  refine pass ${pass + 1}: ${marked.size} edges to split, ${triangles.length} triangles`);
  if (!marked.size) break;
  const mids = new Map();
  const mid = (u, v) => {
    const key = u < v ? u * KEY + v : v * KEY + u;
    if (!mids.has(key)) {
      const id = pos.length / 3;
      for (let k = 0; k < 3; k++) pos.push((pos[u * 3 + k] + pos[v * 3 + k]) / 2);
      const n = norm([0, 1, 2].map((k) => nor[u * 3 + k] + nor[v * 3 + k]));
      nor.push(n[0], n[1], n[2]);
      side.push(side[u]);
      mids.set(key, id);
    }
    return mids.get(key);
  };
  const isMarked = (u, v) => marked.has(u < v ? u * KEY + v : v * KEY + u);
  const next = [];
  for (const [a, b, c] of triangles) {
    const ab = isMarked(a, b);
    const bc = isMarked(b, c);
    const ca = isMarked(c, a);
    const count = ab + bc + ca;
    if (!count) { next.push([a, b, c]); continue; }
    if (count === 3) {
      const mab = mid(a, b), mbc = mid(b, c), mca = mid(c, a);
      next.push([a, mab, mca], [b, mbc, mab], [c, mca, mbc], [mab, mbc, mca]);
    } else if (count === 1) {
      // rotate so the split edge is (x, y) with z opposite
      const [x, y, z] = ab ? [a, b, c] : bc ? [b, c, a] : [c, a, b];
      const m = mid(x, y);
      next.push([x, m, z], [m, y, z]);
    } else {
      // two split edges share the vertex x; their midpoints are m1 (on x-y) and m2 (on x-z)
      const [x, y, z] = !ab ? [c, a, b] : !bc ? [a, b, c] : [b, c, a];
      const m1 = mid(x, y), m2 = mid(z, x);
      next.push([x, m1, m2]);
      // the quad m1, y, z, m2 along its shorter diagonal
      const dYm2 = Math.hypot(...sub(at(y), at(m2)));
      const dZm1 = Math.hypot(...sub(at(z), at(m1)));
      if (dYm2 <= dZm1) next.push([m1, y, m2], [y, z, m2]);
      else next.push([m1, y, z], [m1, z, m2]);
    }
  }
  triangles = next;
}

// Warp the sleeve vertices; normals go through the inverse transpose of the warp's Jacobian.
const outPos = new Float32Array(pos.length);
const outNor = new Float32Array(nor.length);
const H = 1e-4;
for (let i = 0; i < pos.length / 3; i++) {
  const w = warps.get(side[i]);
  const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const n = [nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]];
  if (!w) {
    for (let k = 0; k < 3; k++) { outPos[i * 3 + k] = p[k]; outNor[i * 3 + k] = n[k]; }
    continue;
  }
  const q = w.warp(p);
  // columns of the Jacobian by central differences
  const J = [0, 1, 2].map((c) => {
    const hi = [...p]; hi[c] += H;
    const lo = [...p]; lo[c] -= H;
    return mul(sub(w.warp(hi), w.warp(lo)), 1 / (2 * H));
  });
  // n' ~ J^-T n = (J^-1)^T n; with columns J0, J1, J2 this is the cofactor direction
  const cof = [cross(J[1], J[2]), cross(J[2], J[0]), cross(J[0], J[1])];
  const det = dot(J[0], cross(J[1], J[2]));
  const transformed = norm(add(add(mul(cof[0], n[0]), mul(cof[1], n[1])), mul(cof[2], n[2])));
  const m = det < 0 ? mul(transformed, -1) : transformed;
  for (let k = 0; k < 3; k++) { outPos[i * 3 + k] = q[k]; outNor[i * 3 + k] = m[k]; }
}

// --- 4. write it -----------------------------------------------------------------------------------------
const indices = new Uint32Array(triangles.length * 3);
triangles.forEach(([a, b, c], t) => { indices[t * 3] = a; indices[t * 3 + 1] = b; indices[t * 3 + 2] = c; });
const mesh = finishMesh({ positions: outPos, normals: outNor, indices });

const glb = writeGlb(mesh, {
  name: "long-sleeve",
  copyright: "Derived from the Kazi T-shirt model (public/models/tshirt.glb) by lengthening its sleeves; see scripts/garments/derive-long-sleeve.mjs.",
});
writeFileSync(OUTPUT, glb);
const size = mesh.max.map((m, c) => (m - mesh.min[c]).toFixed(3)).join(" x ");
console.log(`long-sleeve: ${mesh.indices.length / 3} triangles, ${mesh.positions.length / 3} vertices, ${(glb.length / 1024).toFixed(0)} KB, ${size} (w x h x d)`);
console.log(`  min ${mesh.min.map((v) => v.toFixed(3))}  max ${mesh.max.map((v) => v.toFixed(3))}`);

// --- 5. checks ---------------------------------------------------------------------------------------------
// The viewer prints artwork onto the triangles in a box in front of (or behind) the garment whose
// vertex normals face the camera (dot >= 0.35, see filterDecalGeometryByNormal in GarmentViewer).
// This measures how much of what you can see from the front (or the back) can take artwork, for
// the new model and for the T-shirt it came from; they should be about the same. (The cloth is
// double-walled, so a plain "do the normals point outwards" average would read near zero.)
function printableShare(positions, normals, index) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], positions[i + k]); hi[k] = Math.max(hi[k], positions[i + k]); }
  const CELL = 0.004;
  const W = Math.ceil((hi[0] - lo[0]) / CELL) + 2;
  const H = Math.ceil((hi[1] - lo[1]) / CELL) + 2;
  const midZ = (lo[2] + hi[2]) / 2;
  const reach = 0.42 * ((hi[2] - lo[2]) / 2); // the viewer's default decalReach
  return [1, -1].map((dir) => {
    const seen = new Uint8Array(W * H);
    const printed = new Uint8Array(W * H);
    for (let t = 0; t < index.length; t += 3) {
      const v = [index[t], index[t + 1], index[t + 2]];
      if (Math.max(...v.map((i) => dir * (positions[i * 3 + 2] - midZ))) < -reach) continue; // not in this side's box
      const faces = (normals[v[0] * 3 + 2] + normals[v[1] * 3 + 2] + normals[v[2] * 3 + 2]) * dir;
      const avg = [0, 1, 2].map((k) => normals[v[0] * 3 + k] + normals[v[1] * 3 + k] + normals[v[2] * 3 + k]);
      const keep = faces / (Math.hypot(...avg) || 1) >= 0.35;
      const xy = v.map((i) => [(positions[i * 3] - lo[0]) / CELL, (positions[i * 3 + 1] - lo[1]) / CELL]);
      const area = (xy[1][0] - xy[0][0]) * (xy[2][1] - xy[0][1]) - (xy[2][0] - xy[0][0]) * (xy[1][1] - xy[0][1]);
      if (Math.abs(area) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(xy[0][0], xy[1][0], xy[2][0])));
      const x1 = Math.min(W - 1, Math.ceil(Math.max(xy[0][0], xy[1][0], xy[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(xy[0][1], xy[1][1], xy[2][1])));
      const y1 = Math.min(H - 1, Math.ceil(Math.max(xy[0][1], xy[1][1], xy[2][1])));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((xy[1][0] - px) * (xy[2][1] - py) - (xy[2][0] - px) * (xy[1][1] - py)) / area;
          const w1 = ((xy[2][0] - px) * (xy[0][1] - py) - (xy[0][0] - px) * (xy[2][1] - py)) / area;
          if (w0 < 0 || w1 < 0 || w0 + w1 > 1) continue;
          seen[x + W * y] = 1;
          if (keep) printed[x + W * y] = 1;
        }
      }
    }
    const total = seen.reduce((a, b) => a + b, 0);
    return printed.reduce((a, b) => a + b, 0) / Math.max(total, 1);
  });
}
const [teeFront, teeBack] = printableShare(P, N, tee.indices);
const [newFront, newBack] = printableShare(mesh.positions, mesh.normals, mesh.indices);
console.log(
  `  artwork can land on ${(newFront * 100).toFixed(1)}% of the front and ${(newBack * 100).toFixed(1)}% of the back ` +
    `(the T-shirt: ${(teeFront * 100).toFixed(1)}% and ${(teeBack * 100).toFixed(1)}%)`,
);

// Below the armpit the lengthened sleeve hangs beside the torso: how close does it come? (The
// torso's side is at x ~ 0.19; the original sleeve ended level with the armpit, so only the new
// part of the sleeve is measured.)
for (const sleeve of sleeves) {
  // (outPos and side share their numbering; `mesh` has been renumbered by finishMesh)
  const torsoSide = new Map(); // y (rounded to 1 cm) -> furthest-out torso vertex
  for (let i = 0; i < outPos.length / 3; i++) {
    if (side[i]) continue;
    const x = sleeve.sign * outPos[i * 3];
    if (x < 0.1 || x > 0.25 || Math.abs(outPos[i * 3 + 2]) > 0.08) continue;
    const key = Math.round(outPos[i * 3 + 1] / 0.01);
    torsoSide.set(key, Math.max(torsoSide.get(key) ?? -Infinity, x));
  }
  let clearance = Infinity;
  let at = 0;
  for (let i = 0; i < outPos.length / 3; i++) {
    if (side[i] !== sleeve.sign || outPos[i * 3 + 1] > -0.02) continue;
    const x = sleeve.sign * outPos[i * 3];
    const edge = torsoSide.get(Math.round(outPos[i * 3 + 1] / 0.01));
    if (edge !== undefined && x - edge < clearance) { clearance = x - edge; at = outPos[i * 3 + 1]; }
  }
  const end = warps.get(sleeve.sign).end;
  console.log(
    `  ${sleeve.sign > 0 ? "right" : "left "} sleeve: cuff centre ${[sleeve.sign * end[0], end[1], end[2]].map((v) => v.toFixed(3))}, ` +
      `closest to the torso below the armpit ${(clearance * 100).toFixed(1)} cm (at y ${at.toFixed(2)})`,
  );
}
console.log(`wrote ${OUTPUT}`);
