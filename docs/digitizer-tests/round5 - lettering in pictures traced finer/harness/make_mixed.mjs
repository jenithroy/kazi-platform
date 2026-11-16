// "Mixed backgrounds": the lettering pictures with the ground spoiled the way a real logo's is: a gradient, a drop shadow, a paper texture (noise + a little blur + JPEG).
// The ink alpha is taken from the lpics line pictures (navy on white); each variant is composited again, 10 px/mm, 1000 x 240.
// usage: node make_mixed.mjs     writes text/cache/lpicsm/<id>/{image.rgba, meta.json} and lpicsm/manifest.json   (ids mx_<variant>_<font>_<size>mm_<str>)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const SRC = path.join(HERE, "cache", "lpics"), DST = path.join(HERE, "cache", "lpicsm");
fs.mkdirSync(DST, { recursive: true });
const NAVY = [0x16, 0x28, 0x5e], W = 1000, H = 240;
const FONTS = ["sans", "serif", "times", "script", "mono", "black"], SIZES = [3, 4, 6], STRS = ["ave", "ham"];
let seed = 12345;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
const out = [];
for (const font of FONTS) for (const size of SIZES) for (const str of STRS) {
  const id0 = `line_${font}_${size}mm_${str}`;
  const meta0 = JSON.parse(fs.readFileSync(path.join(SRC, id0, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(SRC, id0, "image.rgba"));
  // ink alpha: how far a pixel is from white towards navy (by the red channel: white 255, navy 22)
  const alpha = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = Math.max(0, Math.min(1, (255 - raw[i * 4]) / (255 - NAVY[0])));
  const blur = async (arr, sigma) => {
    const g = Buffer.alloc(W * H); for (let i = 0; i < W * H; i++) g[i] = Math.round(arr[i] * 255);
    const b = await sharp(g, { raw: { width: W, height: H, channels: 1 } }).blur(sigma).toColourspace("b-w").raw().toBuffer({ resolveWithObject: true });
    const o = new Float32Array(W * H); for (let i = 0; i < W * H; i++) o[i] = b.data[i * b.info.channels] / 255; return o;
  };
  const variants = {
    gradient: async () => { const rgba = Buffer.alloc(W * H * 4); for (let y = 0; y < H; y++) { const t = y / (H - 1), bg = [255 - 28 * t, 255 - 12 * t, 255 - 4 * t]; for (let x = 0; x < W; x++) { const a = alpha[y * W + x], o = (y * W + x) * 4; for (let j = 0; j < 3; j++) rgba[o + j] = Math.round(bg[j] * (1 - a) + NAVY[j] * a); rgba[o + 3] = 255; } } return rgba; },
    shadow: async () => { const sh = await blur(alpha, 3); const rgba = Buffer.alloc(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sy = y - 4, sx = x - 4, s = sy >= 0 && sx >= 0 ? sh[sy * W + sx] * 0.55 : 0; const a = alpha[y * W + x], o = (y * W + x) * 4; for (let j = 0; j < 3; j++) { const bg = 255 * (1 - s) + 110 * s; rgba[o + j] = Math.round(bg * (1 - a) + NAVY[j] * a); } rgba[o + 3] = 255; } return rgba; },
    texture: async () => { const rgba = Buffer.alloc(W * H * 4); for (let i = 0; i < W * H; i++) { const a = alpha[i], n = gauss() * 6; for (let j = 0; j < 3; j++) rgba[i * 4 + j] = Math.max(0, Math.min(255, Math.round((255 + n) * (1 - a) + NAVY[j] * a))); rgba[i * 4 + 3] = 255; } const j = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).blur(0.7).jpeg({ quality: 80 }).toBuffer(); return await sharp(j).ensureAlpha().raw().toBuffer(); },
  };
  for (const [vk, make] of Object.entries(variants)) {
    const id = `mx_${vk}_${font}_${size}mm_${str}`;
    fs.mkdirSync(path.join(DST, id), { recursive: true });
    fs.writeFileSync(path.join(DST, id, "image.rgba"), await make());
    fs.writeFileSync(path.join(DST, id, "meta.json"), JSON.stringify({ ...meta0, id }));
    out.push({ id, kind: "line", font, size, str, value: meta0.spec.texts[0].value, w: W, h: H, variant: vk, style: vk });
  }
}
fs.writeFileSync(path.join(DST, "manifest.json"), JSON.stringify(out, null, 1));
console.log("pictures:", out.length, "->", DST);
