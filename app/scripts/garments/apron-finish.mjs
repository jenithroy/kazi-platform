// The finishing step for the work apron ("postprocess" in sources.json, run by import-glb.mjs on the merged mesh).
//
// The imported model is a flat apron hanging straight: a bib, a neck strap and two long waist ties, cut from a sheet of
// cloth that is a few millimetres thick (a front wall facing +z and a back wall facing -z, which is what lets the
// viewer print on both sides). Two changes make it the apron in the collection photograph:
//
//   1. It is made a little wider (the photographed apron has a broad skirt), and its sides curve back, as if it
//      were being worn, so it has some form when the viewer turns it.
//   2. A patch pocket is added in the middle of the skirt: rounded at the bottom, stitched down its sides and
//      along its foot, open along the top. (The collection photograph used to carry the logo on that pocket.)
//
// The mesh is { positions, normals, indices } (Float32Array, Float32Array, Uint32Array), front toward +z, up toward +y.

const STRETCH = 1.3; // sideways, about the middle
const WRAP = 0.5; // the sides curve back by WRAP * x^2 (metres)

// The pocket, in metres from the middle of the apron: its centre height as a fraction of the apron's length from the
// top (the photograph's pocket sits at about 56%), half width and height, the corner radii, how wide the stitched
// border is (where the pocket settles onto the apron) and how far the free top edge stands off it.
const POCKET = { centreFromTop: 0.56, halfWidth: 0.1, halfHeight: 0.078, topRadius: 0.012, bottomRadius: 0.042, stitch: 0.011, lift: 0.0045, step: 0.0025 };

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Signed distance to a box with rounded corners (negative inside); the corners above the middle have `rt`, those below `rb`. */
function roundBox(x, y, hx, hy, rt, rb) {
  const r = y > 0 ? rt : rb;
  const qx = Math.abs(x) - hx + r;
  const qy = Math.abs(y) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** z of the front wall at (x, y), found by looking the point up in a grid of the triangles that face the front. */
function surfaceSampler(positions, normals, indices, cell = 0.006) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1]);
  }
  const w = Math.ceil((maxX - minX) / cell) + 1;
  const h = Math.ceil((maxY - minY) / cell) + 1;
  const grid = Array.from({ length: w * h }, () => []);
  for (let t = 0; t < indices.length; t += 3) {
    if (normals[indices[t] * 3 + 2] + normals[indices[t + 1] * 3 + 2] + normals[indices[t + 2] * 3 + 2] < 0.9) continue; // the back wall
    const xs = [0, 1, 2].map((k) => positions[indices[t + k] * 3]);
    const ys = [0, 1, 2].map((k) => positions[indices[t + k] * 3 + 1]);
    const x0 = Math.floor((Math.min(...xs) - minX) / cell), x1 = Math.floor((Math.max(...xs) - minX) / cell);
    const y0 = Math.floor((Math.min(...ys) - minY) / cell), y1 = Math.floor((Math.max(...ys) - minY) / cell);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) grid[gy * w + gx].push(t);
  }
  return (x, y) => {
    const gx = Math.floor((x - minX) / cell), gy = Math.floor((y - minY) / cell);
    if (gx < 0 || gy < 0 || gx >= w || gy >= h) return null;
    for (const t of grid[gy * w + gx]) {
      const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
      const d = (positions[b + 1] - positions[c + 1]) * (positions[a] - positions[c]) + (positions[c] - positions[b]) * (positions[a + 1] - positions[c + 1]);
      if (Math.abs(d) < 1e-14) continue;
      const l1 = ((positions[b + 1] - positions[c + 1]) * (x - positions[c]) + (positions[c] - positions[b]) * (y - positions[c + 1])) / d;
      const l2 = ((positions[c + 1] - positions[a + 1]) * (x - positions[c]) + (positions[a] - positions[c]) * (y - positions[c + 1])) / d;
      const l3 = 1 - l1 - l2;
      if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) return l1 * positions[a + 2] + l2 * positions[b + 2] + l3 * positions[c + 2];
    }
    return null;
  };
}

export default function finishApron(mesh) {
  const positions = Float32Array.from(mesh.positions);
  const normals = Float32Array.from(mesh.normals);
  const indices = Array.from(mesh.indices);

  // 1. wider, and the sides curve back (normals follow: n' = (nx / STRETCH + 2 k x nz, ny, nz), normalised)
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] *= STRETCH;
    const x = positions[i];
    positions[i + 2] -= WRAP * x * x;
    let nx = normals[i] / STRETCH, ny = normals[i + 1], nz = normals[i + 2];
    nx += 2 * WRAP * x * nz;
    const l = Math.hypot(nx, ny, nz) || 1;
    normals[i] = nx / l; normals[i + 1] = ny / l; normals[i + 2] = nz / l;
  }

  // 2. the patch pocket, built on the surface as it is now
  let top = -Infinity, bottom = Infinity;
  for (let i = 1; i < positions.length; i += 3) { top = Math.max(top, positions[i]); bottom = Math.min(bottom, positions[i]); }
  const p = POCKET;
  const cy = top - p.centreFromTop * (top - bottom);
  const surface = surfaceSampler(positions, normals, indices);
  const nx = Math.round((2 * p.halfWidth) / p.step) + 1, ny = Math.round((2 * p.halfHeight) / p.step) + 1;
  const outline = (x, y) => roundBox(x, y - cy, p.halfWidth, p.halfHeight, p.topRadius, p.bottomRadius);
  // distance to the stitched edges only (the sides and the foot): the same box with its top pushed far away
  const stitched = (x, y) => roundBox(x, y - (cy + 1), p.halfWidth, p.halfHeight + 1, p.topRadius, p.bottomRadius);
  const grid = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      let x = -p.halfWidth + (i * 2 * p.halfWidth) / (nx - 1);
      let y = cy - p.halfHeight + (j * 2 * p.halfHeight) / (ny - 1);
      // a grid vertex outside the rounded outline is moved onto it, so the pocket's edge is exactly the outline
      for (let pass = 0; pass < 3; pass++) {
        const d = outline(x, y);
        if (d <= 0) break;
        const e = 1e-4;
        const gx = (outline(x + e, y) - outline(x - e, y)) / (2 * e), gy = (outline(x, y + e) - outline(x, y - e)) / (2 * e);
        const gl = Math.hypot(gx, gy) || 1;
        x -= (d * gx) / gl; y -= (d * gy) / gl;
      }
      const base = surface(x, y);
      const lift = p.lift * smoothstep(0, p.stitch, -stitched(x, y));
      grid.push([x, y, (base ?? 0) + lift]);
    }
  }
  const pocketIndex = [];
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx;
      for (const tri of [[a, b, c], [a, c, d]]) {
        const [A, B, C] = tri.map((v) => grid[v]);
        const area = ((B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])) / 2; // in the xy plane
        if (area > 1e-9) pocketIndex.push(...tri); // vertices moved onto the same edge make no triangle
      }
    }
  }
  const baseCount = positions.length / 3;
  const pocketNormals = new Float32Array(grid.length * 3);
  for (let t = 0; t < pocketIndex.length; t += 3) {
    const [A, B, C] = [0, 1, 2].map((k) => grid[pocketIndex[t + k]]);
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; // area-weighted
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) pocketNormals[pocketIndex[t + k] * 3 + c] += n[c];
  }
  const merged = {
    positions: new Float32Array(positions.length + grid.length * 3),
    normals: new Float32Array(normals.length + grid.length * 3),
  };
  merged.positions.set(positions); merged.normals.set(normals);
  grid.forEach(([x, y, z], g) => {
    const l = Math.hypot(pocketNormals[g * 3], pocketNormals[g * 3 + 1], pocketNormals[g * 3 + 2]) || 1;
    merged.positions.set([x, y, z], (baseCount + g) * 3);
    merged.normals.set([pocketNormals[g * 3] / l, pocketNormals[g * 3 + 1] / l, pocketNormals[g * 3 + 2] / l], (baseCount + g) * 3);
  });
  const frontIndices = indices.concat(pocketIndex.map((v) => v + baseCount));

  // front to back, the garment is centred on z = 0 as every other model is
  const out = { positions: merged.positions, normals: merged.normals, indices: Uint32Array.from(frontIndices) };
  let zMin = Infinity, zMax = -Infinity;
  for (let i = 2; i < out.positions.length; i += 3) { zMin = Math.min(zMin, out.positions[i]); zMax = Math.max(zMax, out.positions[i]); }
  for (let i = 2; i < out.positions.length; i += 3) out.positions[i] -= (zMin + zMax) / 2;
  return out;
}
