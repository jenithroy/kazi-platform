// Turns a picture of a garment into the shading map the Atelier recolours it with.
//
// The editor draws the chosen colour inside the garment's silhouette and multiplies the shading map
// on top (components/Atelier/GarmentMockup2D.jsx). For the colour to come out as the swatch, and for
// the garment to look clean in every colour, the map has to be prepared:
//
//   - silhouette: the alpha is tightened (no semi-transparent halo from the original background),
//     stray specks are removed;
//   - exposure: the garment's flat fabric is mapped to exactly 1.0 (white), so multiplying by a colour
//     gives that colour; only creases and shadows are darker, and nothing is brighter than the fabric
//     (a bright thread or seam line would otherwise read as a "white stain" on a dark colour);
//   - thin bright lines (stitching highlights, thread) are removed with a grayscale opening, then the
//     map is softened a little;
//   - a faint dark rim follows the silhouette so that a white garment keeps a crisp edge on a pale page.
//
// Works on plain typed arrays so it can be used on photographs and on renders alike.

import sharp from "sharp";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Reads an image file as straight (non-premultiplied) RGBA. */
export async function loadRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Keeps the connected pieces of the silhouette that are at least `minShare` of the largest one. */
function keepMainParts(a, W, H, minShare) {
  const label = new Int32Array(W * H);
  const sizes = [0];
  const stack = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (label[s] || a[s] < 0.12) continue;
    const id = sizes.length;
    let size = 0;
    let top = 0;
    stack[top++] = s;
    label[s] = id;
    while (top) {
      const p = stack[--top];
      size++;
      const x = p % W;
      const y = (p - x) / W;
      if (x > 0 && !label[p - 1] && a[p - 1] >= 0.12) { label[p - 1] = id; stack[top++] = p - 1; }
      if (x < W - 1 && !label[p + 1] && a[p + 1] >= 0.12) { label[p + 1] = id; stack[top++] = p + 1; }
      if (y > 0 && !label[p - W] && a[p - W] >= 0.12) { label[p - W] = id; stack[top++] = p - W; }
      if (y < H - 1 && !label[p + W] && a[p + W] >= 0.12) { label[p + W] = id; stack[top++] = p + W; }
    }
    sizes.push(size);
  }
  const largest = Math.max(0, ...sizes);
  for (let i = 0; i < W * H; i++) if (label[i] && sizes[label[i]] < largest * minShare) a[i] = 0;
}

/** Distance (px) from every opaque pixel to the nearest transparent one (3-4 chamfer, two passes). */
function distanceInside(a, W, H) {
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = a[i] >= 0.5 ? 1e9 : 0;
  const diag = Math.SQRT2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - W] + 1);
        if (x > 0) v = Math.min(v, d[i - W - 1] + diag);
        if (x < W - 1) v = Math.min(v, d[i - W + 1] + diag);
      }
      d[i] = v;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < H - 1) {
        v = Math.min(v, d[i + W] + 1);
        if (x < W - 1) v = Math.min(v, d[i + W + 1] + diag);
        if (x > 0) v = Math.min(v, d[i + W - 1] + diag);
      }
      d[i] = v;
    }
  }
  return d;
}

/** Separable square min/max filter of radius r (erode/dilate). */
function morph(src, W, H, r, pick) {
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = src[y * W + x];
      for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++) v = pick(v, src[y * W + k]);
      tmp[y * W + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = tmp[y * W + x];
      for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) v = pick(v, tmp[k * W + x]);
      out[y * W + x] = v;
    }
  }
  return out;
}

/** Separable Gaussian blur. */
function gaussian(src, W, H, sigma) {
  if (!sigma) return src;
  const r = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const sum = kernel.reduce((s, v) => s + v, 0);
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = -r; k <= r; k++) v += src[y * W + clamp(x + k, 0, W - 1)] * kernel[k + r];
      tmp[y * W + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = -r; k <= r; k++) v += tmp[clamp(y + k, 0, H - 1) * W + x] * kernel[k + r];
      out[y * W + x] = v;
    }
  }
  return out;
}

/**
 * The slow-moving part of `values` inside `mask` (a Gaussian-weighted average that ignores everything
 * outside the garment). Worked out on a shrunken copy: it is only ever used for gentle gradients.
 */
function lowpass(values, mask, W, H, sigma) {
  const f = Math.max(1, Math.round(sigma / 10));
  const w = Math.ceil(W / f);
  const h = Math.ceil(H / f);
  let num = new Float32Array(w * h);
  let den = new Float32Array(w * h);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const j = Math.floor(y / f) * w + Math.floor(x / f);
      num[j] += values[i];
      den[j] += 1;
    }
  }
  num = gaussian(num, w, h, sigma / f);
  den = gaussian(den, w, h, sigma / f);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const fy = clamp((y + 0.5) / f - 0.5, 0, h - 1);
    const y0 = Math.floor(fy);
    const y1 = Math.min(h - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = clamp((x + 0.5) / f - 0.5, 0, w - 1);
      const x0 = Math.floor(fx);
      const x1 = Math.min(w - 1, x0 + 1);
      const tx = fx - x0;
      const at = (arr, xx, yy) => arr[yy * w + xx];
      const ratio = (xx, yy) => {
        const d = at(den, xx, yy);
        return d > 1e-4 ? at(num, xx, yy) / d : 1;
      };
      out[y * W + x] =
        ratio(x0, y0) * (1 - tx) * (1 - ty) + ratio(x1, y0) * tx * (1 - ty) + ratio(x0, y1) * (1 - tx) * ty + ratio(x1, y1) * tx * ty;
    }
  }
  return out;
}

/**
 * @param {{data: Uint8Array, width: number, height: number}} rgba  straight RGBA
 * @param {object} o
 *   tighten  [lo, hi]  smoothstep applied to the alpha (photographs: [0.3, 0.9]; renders: none)
 *   minShare           drop silhouette pieces smaller than this share of the biggest (default 0.02)
 *   baseP              the fabric's tone is this percentile of the garment's brightness (default 0.75)
 *   gain               how strongly shadows below the fabric tone show (1 = as photographed)
 *   flat               { sigma, amount } remove the slow lighting gradient (sigma in px, amount 0..1)
 *   depth, cavity      for renders: depth (Float32Array, metres from the camera, same size) and the occlusion
 *                      passes to apply to it, [{ sigma px, scale m, strength 0..1 }, ...]
 *   light              { gain, bias, ridge, ridgePass, blur, max } also make a highlight map: what is brighter than the
 *                      fabric by more than `bias` (times `gain`) plus, from the depth, the edges that stand proud
 *                      (times `ridge`). A matte fabric wants a bias: without one, everything a little brighter than
 *                      the median fabric tone lights up and a dark colour looks glossy.
 *   knee               { at, keep } soften the deepest shadows (tones below `at` keep `keep` of their depth)
 *   dead               width of a dead zone below the fabric tone that is flattened to it (default 0)
 *   open               radius of the opening that removes thin bright lines (px, default 0)
 *   blur               Gaussian softening of the map (px, default 0.6)
 *   rim                { strength, width } dark edge on the silhouette (defaults 0.1, 1.8 px)
 * @returns {{grey: Uint8Array, alpha: Uint8Array, width, height, box, base}}
 */
export function buildShade({ data, width: W, height: H }, o = {}) {
  const n = W * H;

  // 1. the silhouette
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = data[i * 4 + 3] / 255;
  if (o.tighten) for (let i = 0; i < n; i++) a[i] = smoothstep(o.tighten[0], o.tighten[1], a[i]);
  keepMainParts(a, W, H, o.minShare ?? 0.02);
  const dist = distanceInside(a, W, H);

  // 2. the garment's brightness, and the tone of its flat fabric (taken away from the edge)
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  const hist = new Uint32Array(1024);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (dist[i] > 4) {
      hist[Math.round(L[i] * 1023)]++;
      count++;
    }
  }
  let seen = 0;
  let base = 1;
  for (let v = 0; v < 1024; v++) {
    seen += hist[v];
    if (seen >= count * (o.baseP ?? 0.75)) {
      base = Math.max(v / 1023, 0.05);
      break;
    }
  }

  // 3. brightness relative to the flat fabric (1.0 = the fabric), with the lighting gradient taken out: a
  //    photograph is lit from one side, so one end of the garment is darker than the other, and a white
  //    garment would go grey towards its hem. What is left is the folds, which are what the shading is for.
  const rel = new Float32Array(n);
  for (let i = 0; i < n; i++) rel[i] = L[i] / base;
  const insideAll = new Uint8Array(n);
  for (let i = 0; i < n; i++) insideAll[i] = a[i] >= 0.5 ? 1 : 0;
  if (o.flat) {
    const slow = lowpass(rel, insideAll, W, H, o.flat.sigma);
    for (let i = 0; i < n; i++) if (insideAll[i]) rel[i] /= Math.pow(Math.max(slow[i], 0.4), o.flat.amount);
    // the correction moves the fabric's tone a little: put it back at exactly 1.0
    const h2 = new Uint32Array(2048);
    let c2 = 0;
    for (let i = 0; i < n; i++) {
      if (dist[i] > 4) {
        h2[Math.min(2047, Math.round(rel[i] * 1023))]++;
        c2++;
      }
    }
    let seen2 = 0;
    let tone = 1;
    for (let v = 0; v < 2048; v++) {
      seen2 += h2[v];
      if (seen2 >= c2 * (o.baseP ?? 0.75)) {
        tone = Math.max(v / 1023, 0.05);
        break;
      }
    }
    for (let i = 0; i < n; i++) rel[i] /= tone;
  }

  // 3a. shadows: fabric = 1.0, darker below it, nothing brighter than the fabric
  let s = new Float32Array(n);
  const gain = o.gain ?? 1;
  for (let i = 0; i < n; i++) s[i] = a[i] < 0.5 ? 1 : clamp(1 - gain * (1 - Math.min(1, rel[i])), 0, 1);

  // 3a'. the highlights: the part of the garment that is lit brighter than its flat fabric. Multiplying
  //     can only darken, so on a dark colour the folds, seams and pockets would vanish; a separate soft
  //     "light" map, laid over the colour with a screen blend, brings them back. Screen leaves white and
  //     pale colours untouched, so it cannot leave pale marks on them.
  const light = o.light ? new Float32Array(n) : null;
  if (light) {
    for (let i = 0; i < n; i++) if (a[i] >= 0.5) light[i] = clamp((rel[i] - 1 - (o.light.bias ?? 0)) * o.light.gain, 0, 1);
  }

  // 3b'. ambient occlusion from the depth of a render: where the cloth sits further from the camera than
  //     its surroundings (under a pocket flap, in a seam, in a fold, deep inside a neckline) it is darkened,
  //     and where it stands proud of them (the edge of a flap) it catches the light.
  //     Several passes at different scales: fine ones for seams and pocket edges, a wide one for openings.
  if (o.cavity && o.depth) {
    const inside = new Uint8Array(n);
    for (let i = 0; i < n; i++) inside[i] = a[i] >= 0.5 && dist[i] > 1.5 ? 1 : 0;
    o.cavity.forEach((pass, k) => {
      const slow = lowpass(o.depth, inside, W, H, pass.sigma);
      for (let i = 0; i < n; i++) {
        if (!inside[i]) continue;
        const c = clamp((o.depth[i] - slow[i]) / pass.scale, 0, 1);
        s[i] *= 1 - pass.strength * c;
        if (light && k === (o.light.ridgePass ?? 0)) light[i] += (o.light.ridge ?? 0) * clamp((slow[i] - o.depth[i]) / pass.scale, 0, 1);
      }
    });
  }

  // 3c. soft shoulder on the shadows: a crease should read as a crease, not as an ink stain, so the
  //     darkest tones are compressed (below `knee.at`, only `knee.keep` of the extra darkness is kept)
  if (o.knee) {
    for (let i = 0; i < n; i++) if (s[i] < o.knee.at) s[i] = o.knee.at - (o.knee.at - s[i]) * o.knee.keep;
  }

  // 3d. a dead zone just below the fabric tone: a variation of only a few percent (the faint unevenness of
  //     a smooth generated model) is not a fold, and on a white garment it reads as a smudge, so it is
  //     flattened to the fabric tone; real folds start from the edge of the zone and keep their depth
  if (o.dead) {
    for (let i = 0; i < n; i++) {
      if (s[i] >= 1 - o.dead) s[i] = 1;
      else s[i] = 1 - (1 - s[i] - o.dead) / (1 - o.dead);
    }
  }

  // 4. thin bright lines out, then a little softening
  if (o.open) s = morph(morph(s, W, H, o.open, Math.min), W, H, o.open, Math.max);
  s = gaussian(s, W, H, o.blur ?? 0.6);

  // 4b. the highlight map: softened, capped, and kept off the very edge
  let lightGrey = null;
  if (light) {
    const soft = gaussian(light, W, H, o.light.blur ?? 1.6);
    lightGrey = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      lightGrey[i] = Math.round(255 * Math.min(o.light.max ?? 0.7, soft[i]) * smoothstep(1, 4, dist[i]) * (a[i] >= 0.5 ? 1 : 0));
    }
  }

  // 5. a faint dark rim so a white garment keeps its outline on a pale page
  const rimStrength = o.rim?.strength ?? 0.1;
  const rimWidth = o.rim?.width ?? 1.8;
  const grey = new Uint8Array(n);
  const alpha = new Uint8Array(n);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < n; i++) {
    const value = a[i] < 0.5 ? s[i] : s[i] * (1 - rimStrength * Math.exp(-dist[i] / rimWidth));
    grey[i] = Math.round(255 * clamp(value, 0, 1));
    alpha[i] = a[i] < 0.02 ? 0 : Math.round(255 * a[i]);
    if (a[i] > 0.04) {
      const x = i % W;
      const y = (i - x) / W;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { grey, light: lightGrey, alpha, width: W, height: H, box: { x0, y0, x1, y1 }, base };
}

/** Writes the highlight map next to the shading map (same alpha, so nothing is lit outside the garment). */
export function writeLightPng(file, shade) {
  return writeShadePng(file, { ...shade, grey: shade.light });
}

/** Writes the map as a greyscale PNG with an alpha channel. */
export async function writeShadePng(file, { grey, alpha, width, height }) {
  const interleaved = Buffer.alloc(width * height * 2);
  for (let i = 0; i < width * height; i++) {
    interleaved[i * 2] = grey[i];
    interleaved[i * 2 + 1] = alpha[i];
  }
  await sharp(interleaved, { raw: { width, height, channels: 2 } }).png({ compressionLevel: 9 }).toFile(file);
}

/** The garment's own bounding box inside the picture, as fractions of its width and height. */
export function areaOf({ box, width, height }) {
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  return {
    x: +(box.x0 / width).toFixed(4),
    y: +(box.y0 / height).toFixed(4),
    width: +(bw / width).toFixed(4),
    height: +(bh / height).toFixed(4),
  };
}
