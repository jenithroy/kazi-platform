// Cuts the garments out of the collection photographs, ready for convert-photos.mjs:
//   node scripts/garments/cutout.mjs [id ...] [--preview <dir>]
//
// The collection page's product photographs (public/images/collections/white-label) show each white garment lying on
// grey concrete, tilted. (They used to carry the Kazi logo, which step 3 paints out; on 2026-11-12 they were replaced
// by logo-free versions of the same shots. The garments sit in the same places, so the settings below should still
// apply, but this script was not re-run on the new files: check the result before trusting it, and the old photographs
// are in git history, commit 1a4f6d8.) The Atelier needs what the tee and hoodie already have: a straight,
// blank flat-lay of the garment on a transparent background, from the front and from the back
// (scripts/garments/photos/<id>-front.png and <id>-back.png). For each garment this script
//
//   1. turns the photograph upright (`rotate`),
//   2. cuts the garment out of the concrete (white on grey: bright pixels, grown into the darker folds that touch
//      them), keeping real holes (the neck loop of the apron, the handle opening of the tote, the open weave of
//      the vest, where the floor shows through) and filling only specks,
//   3. paints the green logo out (a push-pull fill from the cloth around it), so the Atelier's customers start
//      from a blank garment,
//   4. optionally rebuilds the garment symmetrical from its better half (`mirror`): a pair of trousers or a
//      T-shirt lying on the floor is never quite straight or even, and the editor wants a flat-lay,
//   5. writes the front, and the back made from it (a mirror image of the front, with the parts that are only on the
//      front painted out where the garment has any: see BACKS).
//
// Nothing is invented: every pixel of the cloth is the photograph's. What the photographs do not show (the back of
// the vest, the back neckline of the tee) is approximated from what they do. Real photographs of the backs
// would replace the approximations: put them in scripts/garments/photos as <id>-back.png and skip them here.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..", "..");
const photoDir = join(appDir, "public", "images", "collections", "white-label");
const outDir = join(here, "photos");

// Per garment: the photograph, how far to turn it (degrees, clockwise; negative turns it back), the brightness a pixel
// must have to be garment (`seed`: certainly cloth; `low`: cloth if it touches certain cloth), whether the weave
// has real holes, the largest hole to fill, and whether to build it from one half.
const JOBS = {
  // the tote is photographed obliquely: its four corners (top left, top right, bottom right, bottom left in the photograph)
  // are mapped to a rectangle (`quad`) instead of just being turned
  tote: { file: "tote.webp", quad: [[285, 535], [962, 760], [702, 1225], [112, 940]], seed: 195, low: 160, fillHoles: 15000 },
  apron: { file: "apron.webp", rotate: -20, seed: 190, low: 150, fillHoles: 600, backErase: [[0.29, 0.465, 0.71, 0.705]] },
  vest: { file: "vest.webp", rotate: -10, shearY: 0.113, seed: 190, low: 150, fillHoles: 0, erode: 0, back: "vest" },
  sweatpants: { file: "pants.webp", rotate: -41, seed: 205, low: 172, fillHoles: 8000, holeLum: 125, logoReach: 14 },
  "long-sleeve": { file: "long-sleeve.webp", rotate: -26, seed: 205, low: 172, fillHoles: 600, mirror: "right", mirrorFrom: 0.2, blueTag: true },
};

// ---- small image helpers (plain typed arrays) -----------------------------------------------------------------

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Separable box max (dilate) or min (erode) of a 0/1 mask with the given radius. */
function morph(mask, W, H, r, grow) {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = grow ? 0 : 1;
      for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++) {
        if (grow) { if (mask[y * W + k]) { v = 1; break; } } else if (!mask[y * W + k]) { v = 0; break; }
      }
      tmp[y * W + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = grow ? 0 : 1;
      for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) {
        if (grow) { if (tmp[k * W + x]) { v = 1; break; } } else if (!tmp[k * W + x]) { v = 0; break; }
      }
      out[y * W + x] = v;
    }
  }
  return out;
}

/** Keeps only the largest 4-connected piece of a 0/1 mask. */
function largestPiece(m, W, H) {
  const label = new Int32Array(W * H);
  const sizes = [0];
  const stack = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!m[s] || label[s]) continue;
    const id = sizes.length;
    let size = 0, top = 0;
    stack[top++] = s; label[s] = id;
    while (top) {
      const p = stack[--top]; size++;
      const x = p % W, y = (p - x) / W;
      if (x > 0 && m[p - 1] && !label[p - 1]) { label[p - 1] = id; stack[top++] = p - 1; }
      if (x < W - 1 && m[p + 1] && !label[p + 1]) { label[p + 1] = id; stack[top++] = p + 1; }
      if (y > 0 && m[p - W] && !label[p - W]) { label[p - W] = id; stack[top++] = p - W; }
      if (y < H - 1 && m[p + W] && !label[p + W]) { label[p + W] = id; stack[top++] = p + W; }
    }
    sizes.push(size);
  }
  let best = 1;
  for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[best]) best = i;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = label[i] === best ? 1 : 0;
  return out;
}

/**
 * Fills background holes of at most `maxArea` pixels (a hole is background that does not reach the border) that are bright
 * enough to be cloth in shadow (mean brightness `minLum` or more, from `lum`); a darker hole is the floor showing through
 * (the gap under an arm, between the legs) and stays open.
 */
function fillSmallHoles(m, W, H, maxArea, lum, minLum) {
  const out = Uint8Array.from(m);
  const seen = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  const border = new Uint8Array(W * H);
  // background connected to the border
  let top = 0;
  const seedB = (i) => { if (!m[i] && !border[i]) { border[i] = 1; stack[top++] = i; } };
  for (let x = 0; x < W; x++) { seedB(x); seedB((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seedB(y * W); seedB(y * W + W - 1); }
  while (top) {
    const p = stack[--top]; const x = p % W, y = (p - x) / W;
    if (x > 0) seedB(p - 1); if (x < W - 1) seedB(p + 1); if (y > 0) seedB(p - W); if (y < H - 1) seedB(p + W);
  }
  for (let s = 0; s < W * H; s++) {
    if (m[s] || border[s] || seen[s]) continue;
    const cells = [];
    top = 0; stack[top++] = s; seen[s] = 1;
    while (top) {
      const p = stack[--top]; cells.push(p); const x = p % W, y = (p - x) / W;
      const g = (q) => { if (!m[q] && !border[q] && !seen[q]) { seen[q] = 1; stack[top++] = q; } };
      if (x > 0) g(p - 1); if (x < W - 1) g(p + 1); if (y > 0) g(p - W); if (y < H - 1) g(p + W);
    }
    if (cells.length > maxArea) continue;
    let sum = 0;
    for (const p of cells) sum += lum[p];
    if (sum / cells.length >= minLum) for (const p of cells) out[p] = 1;
  }
  return out;
}

/**
 * Fills the pixels where `known` is 0 from the known ones around them (three channels): a push-pull pyramid (coarser and
 * coarser averages of the known pixels fill the gaps from the top down), then a few rounds of local averaging over the
 * filled pixels only, to take the blockiness out. The cloth around a logo is smooth, so the fill is too.
 */
function fillUnknown(rgb, known, W, H) {
  const levels = [];
  let level = { W, H, c: new Float32Array(W * H * 3), w: new Float32Array(W * H) };
  for (let p = 0; p < W * H; p++) {
    if (!known[p]) continue;
    level.w[p] = 1;
    level.c[p * 3] = rgb[p * 3]; level.c[p * 3 + 1] = rgb[p * 3 + 1]; level.c[p * 3 + 2] = rgb[p * 3 + 2];
  }
  levels.push(level);
  while (level.W > 1 || level.H > 1) {
    const nW = (level.W + 1) >> 1, nH = (level.H + 1) >> 1;
    const next = { W: nW, H: nH, c: new Float32Array(nW * nH * 3), w: new Float32Array(nW * nH) };
    for (let y = 0; y < level.H; y++) {
      for (let x = 0; x < level.W; x++) {
        const p = y * level.W + x, q = (y >> 1) * nW + (x >> 1);
        next.c[q * 3] += level.c[p * 3]; next.c[q * 3 + 1] += level.c[p * 3 + 1]; next.c[q * 3 + 2] += level.c[p * 3 + 2];
        next.w[q] += level.w[p];
      }
    }
    levels.push(next);
    level = next;
  }
  let coarser = null;
  for (let i = levels.length - 1; i >= 0; i--) {
    const lv = levels[i];
    const avg = new Float32Array(lv.W * lv.H * 3);
    for (let y = 0; y < lv.H; y++) {
      for (let x = 0; x < lv.W; x++) {
        const p = y * lv.W + x;
        if (lv.w[p] > 0) {
          avg[p * 3] = lv.c[p * 3] / lv.w[p]; avg[p * 3 + 1] = lv.c[p * 3 + 1] / lv.w[p]; avg[p * 3 + 2] = lv.c[p * 3 + 2] / lv.w[p];
        } else if (coarser) {
          // bilinear between the four nearest coarser pixels
          const fx = clamp((x + 0.5) / 2 - 0.5, 0, coarser.W - 1), fy = clamp((y + 0.5) / 2 - 0.5, 0, coarser.H - 1);
          const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(coarser.W - 1, x0 + 1), y1 = Math.min(coarser.H - 1, y0 + 1);
          const tx = fx - x0, ty = fy - y0;
          for (let c = 0; c < 3; c++) {
            const a = coarser.v[(y0 * coarser.W + x0) * 3 + c], b = coarser.v[(y0 * coarser.W + x1) * 3 + c];
            const d = coarser.v[(y1 * coarser.W + x0) * 3 + c], e = coarser.v[(y1 * coarser.W + x1) * 3 + c];
            avg[p * 3 + c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
          }
        }
      }
    }
    coarser = { W: lv.W, H: lv.H, v: avg };
  }
  const out = coarser.v;
  // smooth the filled pixels (the known ones stay as they are)
  const next = new Float32Array(out.length);
  for (let round = 0; round < 60; round++) {
    next.set(out);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x;
        if (known[p]) continue;
        for (let c = 0; c < 3; c++) next[p * 3 + c] = (out[(p - 1) * 3 + c] + out[(p + 1) * 3 + c] + out[(p - W) * 3 + c] + out[(p + W) * 3 + c]) / 4;
      }
    }
    out.set(next);
  }
  return out;
}

/** Soft edge: the mask, eroded a pixel (the edge pixels are part concrete) and blurred a little. */
async function softAlpha(mask, W, H, erodeBy = 1, sigma = 0.9) {
  const e = erodeBy ? morph(mask, W, H, erodeBy, false) : mask;
  const buf = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) buf[i] = e[i] ? 255 : 0;
  const { data, info } = await sharp(buf, { raw: { width: W, height: H, channels: 1 } }).blur(sigma).toColourspace("b-w").raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error(`expected one channel from the blur, got ${info.channels}`);
  return data;
}

/** Solves the 8x8 system of a homography taking the four points `from` to the four points `to` ([x, y] pairs). */
function homography(from, to) {
  const A = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i], [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u, u]);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map((row, i) => row[8] / row[i]);
}

/**
 * Looks at a photograph straight on: the quadrilateral `quad` in it (top left, top right, bottom right, bottom left)
 * becomes an upright rectangle, and everything around it is carried along (the canvas is that rectangle plus room
 * for what sticks out of it, such as handles).
 */
function squareUp(data, W, H, quad) {
  const top = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]);
  const bottom = Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1]);
  const left = Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]);
  const right = Math.hypot(quad[2][0] - quad[1][0], quad[2][1] - quad[1][1]);
  const rw = Math.round((top + bottom) / 2), rh = Math.round((left + right) / 2);
  const mx = Math.round(0.25 * rw), myTop = Math.round(0.8 * rh), myBottom = Math.round(0.2 * rh);
  const outW = rw + 2 * mx, outH = rh + myTop + myBottom;
  const dst = [[mx, myTop], [mx + rw, myTop], [mx + rw, myTop + rh], [mx, myTop + rh]];
  const h = homography(dst, quad); // output pixel -> photograph pixel
  const out = Buffer.alloc(outW * outH * 3);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const d = h[6] * x + h[7] * y + 1;
      const u = (h[0] * x + h[1] * y + h[2]) / d, v = (h[3] * x + h[4] * y + h[5]) / d;
      const o = (y * outW + x) * 3;
      if (u < 0 || v < 0 || u > W - 1 || v > H - 1) { out[o] = out[o + 1] = out[o + 2] = 120; continue; }
      const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
      const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
      for (let c = 0; c < 3; c++) {
        const a = data[(y0 * W + x0) * 3 + c], b = data[(y0 * W + x1) * 3 + c], cc = data[(y1 * W + x0) * 3 + c], dd = data[(y1 * W + x1) * 3 + c];
        out[o + c] = Math.round((a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + dd * fx) * fy);
      }
    }
  }
  return { data: out, width: outW, height: outH };
}

// ---- the work --------------------------------------------------------------------------------------------------

/** Photograph -> { rgb, alpha, width, height } straight and blank (no logo), or throws if nothing was found. */
export async function cutOut(id, job = JOBS[id]) {
  const grey = { r: 120, g: 120, b: 120 };
  let img = sharp(join(photoDir, job.file));
  if (job.rotate) img = img.rotate(job.rotate, { background: grey, kernel: "lanczos3" });
  if (job.shearY) {
    // photographed from a little to one side, a garment's horizontal lines slope: tilt them level (vertical lines stay vertical)
    const turned = await img.png().toBuffer();
    img = sharp(turned).affine([[1, 0], [-job.shearY, 1]], { background: grey, interpolator: sharp.interpolators.bicubic });
  }
  const loaded = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const flat = job.quad ? squareUp(loaded.data, loaded.info.width, loaded.info.height, job.quad) : { data: loaded.data, width: loaded.info.width, height: loaded.info.height };
  const data = flat.data;
  const W = flat.width, H = flat.height, N = W * H;
  const lum = new Float32Array(N);
  const green = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    green[i] = g - Math.max(r, b);
  }

  // the logo: green pixels (it is dark and saturated; the floor and the cloth are grey), a little grown for its soft edge
  const logoCore = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const blue = data[i * 3 + 2] - Math.max(data[i * 3], data[i * 3 + 1]);
    logoCore[i] = (green[i] > 3 && lum[i] < 228) || (job.blueTag && blue > 14 && lum[i] < 225) ? 1 : 0;
  }
  // its edge is soft and the embroidery casts a little shadow: everything close to it that is darker than the cloth goes too
  const near = morph(logoCore, W, H, job.logoReach ?? 9, true);
  const logo = morph(logoCore, W, H, 4, true);
  for (let i = 0; i < N; i++) if (near[i] && lum[i] < 200) logo[i] = 1;

  // the garment: bright seeds, grown into the darker cloth that touches them
  const mask = new Uint8Array(N);
  const stack = new Int32Array(N);
  let top = 0;
  for (let i = 0; i < N; i++) if (lum[i] >= job.seed) { mask[i] = 1; stack[top++] = i; }
  while (top) {
    const p = stack[--top]; const x = p % W, y = (p - x) / W;
    const push = (q) => { if (!mask[q] && (lum[q] >= job.low || logo[q])) { mask[q] = 1; stack[top++] = q; } };
    if (x > 0) push(p - 1); if (x < W - 1) push(p + 1); if (y > 0) push(p - W); if (y < H - 1) push(p + W);
  }
  let m = largestPiece(mask, W, H);
  // the logo lies on the cloth: whatever it covers is cloth
  const nearCloth = morph(m, W, H, 30, true);
  for (let i = 0; i < N; i++) if (logo[i] && nearCloth[i]) m[i] = 1;
  m = largestPiece(m, W, H);
  if (job.fillHoles) m = fillSmallHoles(m, W, H, job.fillHoles, lum, job.holeLum ?? 140);
  // trim hairs and specks on the outline
  m = morph(morph(m, W, H, 1, false), W, H, 1, true);

  // paint the logo out of the cloth
  const known = new Uint8Array(N);
  for (let i = 0; i < N; i++) known[i] = m[i] && !logo[i] ? 1 : 0;
  const rgbF = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) rgbF[i] = data[i];
  const filled = fillUnknown(rgbF, known, W, H);
  const rgb = Buffer.alloc(N * 3);
  for (let i = 0; i < N; i++) {
    const use = m[i] && logo[i];
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.round(clamp(use ? filled[i * 3 + c] : data[i * 3 + c], 0, 255));
  }
  const alpha = await softAlpha(m, W, H, job.erode ?? 1);
  return { rgb, alpha, width: W, height: H, mask: m };
}

/** The x of the garment's middle: the centre of the topmost slice of it (a collar, a waistband, a neck strap). */
export function findAxis(mask, W, H, band = 0.05) {
  let y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const limit = y0 + Math.max(4, Math.round(band * (y1 - y0)));
  let sum = 0, count = 0;
  for (let y = y0; y <= limit; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { sum += x; count++; }
  return sum / Math.max(count, 1);
}

/**
 * Refines the middle of a garment: the vertical line about which the top slice of its silhouette (collar and shoulders)
 * is most nearly its own mirror image, searched within `range` pixels of `axis`.
 */
export function refineAxis(mask, W, H, axis, range = 40) {
  let y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const rows = [];
  for (let y = y0; y <= y0 + 0.2 * (y1 - y0); y += 2) rows.push(y);
  const half = Math.round(0.22 * W);
  let best = axis, bestScore = Infinity;
  for (let a = Math.round(axis - range); a <= Math.round(axis + range); a++) {
    let score = 0;
    for (const y of rows) for (let d = 1; d <= half; d++) {
      const l = a - d, r = a + d;
      if (l < 0 || r >= W) continue;
      if (mask[y * W + l] !== mask[y * W + r]) score++;
    }
    if (score < bestScore) { bestScore = score; best = a; }
  }
  return best;
}

/**
 * Replaces everything farther than `from` pixels from the vertical line x = axis, on the side that is not `keep` ("left" |
 * "right"), by the mirror image of the other side. Used to give a garment photographed with one sleeve out and one sleeve
 * hanging two hanging sleeves, while the collar and the body, the parts that are right, stay as photographed. The seam is
 * blended over a few pixels.
 */
export function mirrorHalf(cut, axis, keep, from = 0) {
  const { rgb, alpha, width: W, height: H } = cut;
  const outRgb = Buffer.from(rgb);
  const outAlpha = Buffer.from(alpha);
  const blend = 7;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = keep === "right" ? axis - x : x - axis; // distance out on the side that is replaced
      if (d < from - blend) continue;
      const sx = Math.round(2 * axis - x);
      const o = y * W + x;
      const t = clamp((d - (from - blend)) / (2 * blend), 0, 1); // 0: as photographed, 1: the mirror image
      if (sx < 0 || sx >= W) { outAlpha[o] = Math.round(alpha[o] * (1 - t)); continue; }
      const m = y * W + sx;
      for (let c = 0; c < 3; c++) outRgb[o * 3 + c] = Math.round(rgb[o * 3 + c] * (1 - t) + rgb[m * 3 + c] * t);
      outAlpha[o] = Math.round(alpha[o] * (1 - t) + alpha[m] * t);
    }
  }
  return { ...cut, rgb: outRgb, alpha: outAlpha };
}

/** Trims to the garment (plus a margin) and returns an RGBA PNG buffer and its size. */
export async function toPng(cut, margin = 0.03) {
  const { rgb, alpha, width: W, height: H } = cut;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error("nothing was cut out");
  const pad = Math.round(margin * Math.max(x1 - x0, y1 - y0));
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = alpha[i]; }
  const sh = sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
  return { buffer: await sh.png().toBuffer(), width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * Paints rectangles (fractions of the picture: [x0, y0, x1, y1]) out of a cut-out PNG from the cloth around them; what is only
 * on one side of a garment (the apron's pocket) does not belong on its back.
 */
async function eraseRegions(png, rects) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const known = new Uint8Array(W * H);
  const rgb = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    known[i] = data[i * 4 + 3] > 200 ? 1 : 0;
    rgb[i * 3] = data[i * 4]; rgb[i * 3 + 1] = data[i * 4 + 1]; rgb[i * 3 + 2] = data[i * 4 + 2];
  }
  const inside = new Uint8Array(W * H);
  for (const [x0, y0, x1, y1] of rects) {
    for (let y = Math.round(y0 * H); y < Math.round(y1 * H); y++) for (let x = Math.round(x0 * W); x < Math.round(x1 * W); x++) inside[y * W + x] = 1;
  }
  for (let i = 0; i < W * H; i++) if (inside[i]) known[i] = 0;
  const filled = fillUnknown(rgb, known, W, H);
  const out = Buffer.from(data);
  for (let i = 0; i < W * H; i++) if (inside[i] && data[i * 4 + 3] > 0) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(clamp(filled[i * 3 + c], 0, 255));
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

/**
 * The back of the vest. The collection photograph shows only the front: a mesh body with a solid shoulder yoke, bound edges,
 * a zip, a strap and four flap pockets. The back has the yoke and the binding as photographed (the yoke across the top, the
 * binding round the armholes, the sides and the hem) and a plain mesh body: everything else is replaced by the same kind of
 * mesh, drawn as a regular diamond lattice of small holes that has the photograph's hole size and spacing (about 4 x 5 px every
 * 12 x 10 px at this size). It is an approximation of a view nobody photographed, and says so here.
 */
async function vestBack(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const solidish = new Uint8Array(N);
  for (let i = 0; i < N; i++) solidish[i] = data[i * 4 + 3] > 90 ? 1 : 0;
  const body = morph(morph(solidish, W, H, 6, true), W, H, 6, false); // the silhouette with the weave's holes closed
  // distance (in steps) from the outside, for the binding
  const dist = new Int16Array(N).fill(-1);
  const queue = new Int32Array(N);
  let head = 0, tail = 0;
  for (let i = 0; i < N; i++) if (!body[i]) { dist[i] = 0; queue[tail++] = i; }
  while (head < tail) {
    const p = queue[head++]; const x = p % W, y = (p - x) / W;
    const go = (q) => { if (dist[q] < 0) { dist[q] = dist[p] + 1; queue[tail++] = q; } };
    if (x > 0) go(p - 1); if (x < W - 1) go(p + 1); if (y > 0) go(p - W); if (y < H - 1) go(p + W);
  }
  const BIND = 15; // the binding is about this many pixels wide
  // the yoke: the solid cloth across the shoulders. Solid areas thicker than a thread of piping or a zip (opening by 7 px) that
  // are joined to the top of the vest, plus a margin for its seam
  const solid = new Uint8Array(N);
  {
    const box = new Float32Array(N);
    const r = 6;
    const tmp = new Float32Array(N);
    for (let y = 0; y < H; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += x >= 0 ? data[(y * W + x) * 4 + 3] : 0; for (let x = 0; x < W; x++) { tmp[y * W + x] = acc / (2 * r + 1) / 255; const add = x + r + 1, del = x - r; if (add < W) acc += data[(y * W + add) * 4 + 3]; if (del >= 0) acc -= data[(y * W + del) * 4 + 3]; } }
    for (let x = 0; x < W; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += y >= 0 ? tmp[y * W + x] : 0; for (let y = 0; y < H; y++) { box[y * W + x] = acc / (2 * r + 1); const add = y + r + 1, del = y - r; if (add < H) acc += tmp[add * W + x]; if (del >= 0) acc -= tmp[del * W + x]; } }
    for (let i = 0; i < N; i++) solid[i] = box[i] > 0.93 ? 1 : 0;
  }
  const thick = morph(morph(solid, W, H, 7, false), W, H, 7, true);
  const yokeSeed = new Uint8Array(N);
  { // flood from the top rows through the thick solid cloth
    const stack = new Int32Array(N); let top = 0;
    for (let x = 0; x < W; x++) for (let y = 0; y < Math.round(0.1 * H); y++) { const p = y * W + x; if (thick[p] && !yokeSeed[p]) { yokeSeed[p] = 1; stack[top++] = p; } }
    while (top) { const p = stack[--top]; const x = p % W, y = (p - x) / W;
      const g = (q) => { if (thick[q] && !yokeSeed[q]) { yokeSeed[q] = 1; stack[top++] = q; } };
      if (x > 0) g(p - 1); if (x < W - 1) g(p + 1); if (y > 0) g(p - W); if (y < H - 1) g(p + W); }
  }
  const yoke = morph(yokeSeed, W, H, 9, true);
  const rx = 1.85, ry = 3.0, lean = 0.2; // hole radii, px, and how far they lean (like the photograph's)
  const out = Buffer.from(data);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!body[p] || dist[p] <= BIND || yoke[p]) continue;
      // the diamond lattice: holes at (6(s - t), 5(s + t)) for whole s, t
      const s0 = x / 12 + y / 10, t0 = y / 10 - x / 12;
      let e = Infinity;
      for (const s of [Math.floor(s0), Math.ceil(s0)]) for (const t of [Math.floor(t0), Math.ceil(t0)]) {
        const dx = x - 6 * (s - t), dy = y - 5 * (s + t);
        e = Math.min(e, Math.hypot((dx + lean * dy) / rx, dy / ry));
      }
      const a = clamp((e - 0.65) / 0.7, 0, 1);
      const v = 236 * (1 - 0.14 * Math.exp(-Math.max(0, e - 1) * 1.2));
      out[p * 4] = out[p * 4 + 1] = out[p * 4 + 2] = Math.round(v);
      out[p * 4 + 3] = Math.round(255 * a * a * (3 - 2 * a));
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

// ---- command line ----------------------------------------------------------------------------------------------

if (process.argv[1] && process.argv[1].endsWith("cutout.mjs")) {
  const args = process.argv.slice(2);
  const pv = args.indexOf("--preview");
  const previewDir = pv >= 0 ? args[pv + 1] : null;
  const ids = args.filter((a, i) => !a.startsWith("--") && (pv < 0 || i !== pv + 1));
  mkdirSync(outDir, { recursive: true });
  if (previewDir) mkdirSync(previewDir, { recursive: true });
  for (const id of ids.length ? ids : Object.keys(JOBS)) {
    const job = JOBS[id];
    let cut = await cutOut(id);
    if (job.mirror) {
      const axis = refineAxis(cut.mask, cut.width, cut.height, findAxis(cut.mask, cut.width, cut.height));
      cut = mirrorHalf(cut, axis, job.mirror, Math.round((job.mirrorFrom ?? 0) * cut.width));
    }
    const { buffer, width, height } = await toPng(cut);
    const dir = previewDir ?? outDir;
    const PNG = { compressionLevel: 9, effort: 10 }; // these are stored in the repository
    await sharp(buffer).png(PNG).toFile(join(dir, `${id}-front.png`));
    // the back: a mirror image of the front, without what is only on the front
    let back = await sharp(buffer).flop().png().toBuffer();
    if (job.backErase) back = await eraseRegions(back, job.backErase);
    if (job.back === "vest") back = await vestBack(buffer);
    await sharp(back).png(PNG).toFile(join(dir, `${id}-back.png`));
    console.log(`${id}: ${width}x${height} -> ${dir}`);
  }
}
