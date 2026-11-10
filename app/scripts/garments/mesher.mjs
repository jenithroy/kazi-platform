// Turns a signed-distance function into a triangle mesh, then trims it into a garment.
//
//   polygonise()    marching cubes over a grid, with smooth normals taken from the field itself
//   clipByField()   removes the part of the mesh where a field is negative, cutting triangles
//                   exactly along the zero line (this is how necks, hems, cuffs and armholes are
//                   opened up, so their rims are clean curves, not a staircase of triangles)
//   finishMesh()    drops unused vertices and adds planar UVs (used by the pattern fill)
//
// Garments are modelled as solid shapes and only their skin is kept, so a garment is a hollow
// surface with open ends — the same kind of mesh the original tee and hoodie models are.

import { edgeTable, triTable } from "three/examples/jsm/objects/MarchingCubes.js";

// Cube corners and edges in the numbering the (Bourke) lookup tables use.
const CORNERS = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];
// For each of the 12 edges: the lower corner's offset and the axis it runs along.
const EDGE_BASE = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [0, 0, 1],
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
];
const EDGE_AXIS = [0, 1, 0, 1, 0, 1, 0, 1, 2, 2, 2, 2];

/**
 * Marching cubes. `field(x, y, z)` is negative inside. Returns indexed triangles whose normals
 * point out of the solid.
 */
export function polygonise(field, { min, max, step }) {
  const nx = Math.ceil((max[0] - min[0]) / step) + 1;
  const ny = Math.ceil((max[1] - min[1]) / step) + 1;
  const nz = Math.ceil((max[2] - min[2]) / step) + 1;
  const stride = [1, nx, nx * ny];

  const values = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        values[i + nx * (j + ny * k)] = field(min[0] + i * step, min[1] + j * step, min[2] + k * step);
      }
    }
  }

  const edgeVertex = new Int32Array(nx * ny * nz * 3).fill(-1);
  const positions = [];
  const indices = [];

  function vertexOnEdge(i, j, k, e) {
    const [bx, by, bz] = EDGE_BASE[e];
    const axis = EDGE_AXIS[e];
    const ci = i + bx;
    const cj = j + by;
    const ck = k + bz;
    const cell = ci + nx * (cj + ny * ck);
    const key = cell * 3 + axis;
    const cached = edgeVertex[key];
    if (cached >= 0) return cached;

    const fa = values[cell];
    const fb = values[cell + stride[axis]];
    const t = fa / (fa - fb);
    const p = [min[0] + ci * step, min[1] + cj * step, min[2] + ck * step];
    p[axis] += t * step;
    const index = positions.length / 3;
    positions.push(p[0], p[1], p[2]);
    edgeVertex[key] = index;
    return index;
  }

  const cell = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let cubeIndex = 0;
        for (let c = 0; c < 8; c++) {
          const [dx, dy, dz] = CORNERS[c];
          const v = values[i + dx + nx * (j + dy + ny * (k + dz))];
          cell[c] = v;
          if (v < 0) cubeIndex |= 1 << c;
        }
        const edges = edgeTable[cubeIndex];
        if (edges === 0) continue;

        const local = new Int32Array(12);
        for (let e = 0; e < 12; e++) if (edges & (1 << e)) local[e] = vertexOnEdge(i, j, k, e);

        const row = cubeIndex << 4;
        for (let t = 0; triTable[row + t] !== -1; t += 3) {
          indices.push(local[triTable[row + t]], local[triTable[row + t + 1]], local[triTable[row + t + 2]]);
        }
      }
    }
  }

  const pos = Float32Array.from(positions);
  const idx = Uint32Array.from(indices);

  // Smooth normals straight from the field's gradient (central differences).
  const normals = new Float32Array(pos.length);
  const e = step * 0.35;
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v];
    const y = pos[v + 1];
    const z = pos[v + 2];
    const gx = field(x + e, y, z) - field(x - e, y, z);
    const gy = field(x, y + e, z) - field(x, y - e, z);
    const gz = field(x, y, z + e) - field(x, y, z - e);
    const len = Math.hypot(gx, gy, gz) || 1;
    normals[v] = gx / len;
    normals[v + 1] = gy / len;
    normals[v + 2] = gz / len;
  }

  // Make the triangle winding agree with the normals (the lookup tables' convention is easy to
  // get backwards, so measure it instead of assuming).
  let agree = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3;
    const b = idx[t + 1] * 3;
    const c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a];
    const uy = pos[b + 1] - pos[a + 1];
    const uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a];
    const vy = pos[c + 1] - pos[a + 1];
    const vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    agree += Math.sign(fx * normals[a] + fy * normals[a + 1] + fz * normals[a + 2]);
  }
  if (agree < 0) {
    for (let t = 0; t < idx.length; t += 3) {
      const tmp = idx[t + 1];
      idx[t + 1] = idx[t + 2];
      idx[t + 2] = tmp;
    }
  }

  return { positions: pos, normals, indices: idx };
}

/**
 * Keeps the part of the mesh where `field >= 0` and discards the rest, splitting the triangles
 * that straddle the zero line. Crossing points are shared between neighbouring triangles, so
 * the cut edge stays watertight.
 */
export function clipByField(mesh, field) {
  const { positions, normals, indices } = mesh;
  const vertexCount = positions.length / 3;
  const d = new Float32Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) d[v] = field(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);

  const outPos = Array.from(positions);
  const outNor = Array.from(normals);
  const outIdx = [];
  const crossings = new Map();

  function crossing(a, b) {
    // Always interpolate from the lower index so both triangles sharing an edge agree.
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    const key = lo * vertexCount + hi;
    const hit = crossings.get(key);
    if (hit !== undefined) return hit;
    const t = d[lo] / (d[lo] - d[hi]);
    const index = outPos.length / 3;
    for (let c = 0; c < 3; c++) outPos.push(positions[lo * 3 + c] + (positions[hi * 3 + c] - positions[lo * 3 + c]) * t);
    const nx = normals[lo * 3] + (normals[hi * 3] - normals[lo * 3]) * t;
    const ny = normals[lo * 3 + 1] + (normals[hi * 3 + 1] - normals[lo * 3 + 1]) * t;
    const nz = normals[lo * 3 + 2] + (normals[hi * 3 + 2] - normals[lo * 3 + 2]) * t;
    const len = Math.hypot(nx, ny, nz) || 1;
    outNor.push(nx / len, ny / len, nz / len);
    crossings.set(key, index);
    return index;
  }

  for (let t = 0; t < indices.length; t += 3) {
    const tri = [indices[t], indices[t + 1], indices[t + 2]];
    const inside = tri.map((v) => d[v] >= 0);
    const count = inside[0] + inside[1] + inside[2];
    if (count === 3) outIdx.push(tri[0], tri[1], tri[2]);
    else if (count === 0) continue;
    else {
      // Walk the triangle's edges, keeping inside vertices and adding crossings (Sutherland–Hodgman).
      const poly = [];
      for (let e = 0; e < 3; e++) {
        const a = tri[e];
        const b = tri[(e + 1) % 3];
        const ina = inside[e];
        const inb = inside[(e + 1) % 3];
        if (ina) poly.push(a);
        if (ina !== inb) poly.push(crossing(a, b));
      }
      for (let p = 1; p < poly.length - 1; p++) outIdx.push(poly[0], poly[p], poly[p + 1]);
    }
  }

  return {
    positions: Float32Array.from(outPos),
    normals: Float32Array.from(outNor),
    indices: Uint32Array.from(outIdx),
  };
}

/** Drops vertices no triangle uses and adds planar (x, y) UVs fitted to the mesh's bounds. */
export function finishMesh(mesh) {
  const { positions, normals, indices } = mesh;
  const remap = new Int32Array(positions.length / 3).fill(-1);
  const pos = [];
  const nor = [];
  const idx = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    if (remap[v] < 0) {
      remap[v] = pos.length / 3;
      pos.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
      nor.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
    }
    idx[i] = remap[v];
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < pos.length; v += 3) {
    for (let c = 0; c < 3; c++) {
      min[c] = Math.min(min[c], pos[v + c]);
      max[c] = Math.max(max[c], pos[v + c]);
    }
  }
  const uvs = new Float32Array((pos.length / 3) * 2);
  for (let v = 0; v < pos.length / 3; v++) {
    uvs[v * 2] = (pos[v * 3] - min[0]) / (max[0] - min[0]);
    uvs[v * 2 + 1] = (pos[v * 3 + 1] - min[1]) / (max[1] - min[1]);
  }

  return { positions: Float32Array.from(pos), normals: Float32Array.from(nor), uvs, indices: idx, min, max };
}

/** Ambient occlusion per vertex, estimated by sampling the solid's field along the normal. */
export function bakeOcclusion(mesh, field) {
  const { positions, normals } = mesh;
  const ao = new Float32Array(positions.length / 3);
  for (let v = 0; v < ao.length; v++) {
    const x = positions[v * 3];
    const y = positions[v * 3 + 1];
    const z = positions[v * 3 + 2];
    const nx = normals[v * 3];
    const ny = normals[v * 3 + 1];
    const nz = normals[v * 3 + 2];
    let occ = 0;
    let weight = 1;
    for (let s = 1; s <= 5; s++) {
      const h = 0.006 + (0.1 * s) / 5;
      const dist = field(x + nx * h, y + ny * h, z + nz * h);
      occ += (h - dist) * weight;
      weight *= 0.9;
    }
    ao[v] = Math.min(1, Math.max(0.45, 1 - 1.5 * occ));
  }
  return ao;
}
