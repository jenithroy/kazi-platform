// Signed-distance helpers for building garment shapes. A shape is just a function
// (x, y, z) => distance, negative inside. Everything works on plain numbers (no vector objects)
// because the mesher calls these about a million times per garment.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const mix = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Polynomial smooth minimum: a union whose seam is blended over a width of k. */
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
/** Smooth maximum: an intersection (or subtraction, with a negated operand) with a rounded seam. */
export const smax = (a, b, k) => -smin(-a, -b, k);

/** Signed distance to a closed 2D polygon given as [[x, y], ...] (Inigo Quilez). */
export function sdPolygon(x, y, pts) {
  let d = (x - pts[0][0]) ** 2 + (y - pts[0][1]) ** 2;
  let s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) {
    const ex = pts[j][0] - pts[i][0];
    const ey = pts[j][1] - pts[i][1];
    const wx = x - pts[i][0];
    const wy = y - pts[i][1];
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1);
    const bx = wx - ex * t;
    const by = wy - ey * t;
    d = Math.min(d, bx * bx + by * by);
    const c1 = y >= pts[i][1];
    const c2 = y < pts[j][1];
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

/** Signed distance to a rounded rectangle in 2D (half sizes hx, hy, corner radius r). */
export function sdRoundRect(x, y, hx, hy, r) {
  const qx = Math.abs(x) - hx + r;
  const qy = Math.abs(y) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Distance from (x, y) to the segment a-b in 2D. */
export function sdSegment2(x, y, ax, ay, bx, by) {
  const pax = x - ax;
  const pay = y - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h);
}

// --- cheap deterministic noise, for fabric wrinkles -------------------------------------------

function hash3(ix, iy, iz) {
  let h = (ix * 374761393 + iy * 668265263 + iz * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [-1, 1]. */
export function noise3(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
  const x00 = mix(c(0, 0, 0), c(1, 0, 0), ux);
  const x10 = mix(c(0, 1, 0), c(1, 1, 0), ux);
  const x01 = mix(c(0, 0, 1), c(1, 0, 1), ux);
  const x11 = mix(c(0, 1, 1), c(1, 1, 1), ux);
  return mix(mix(x00, x10, uy), mix(x01, x11, uy), uz) * 2 - 1;
}
