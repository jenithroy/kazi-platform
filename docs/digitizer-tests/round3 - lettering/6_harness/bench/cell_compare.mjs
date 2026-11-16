// Stack the renders of typed cells: for each cell, one row per variant (the ideal glyph picture first).
// usage: node cell_compare.mjs <out.png> <variant,variant,...> <cell,cell,...> [scale=2]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const [outFile, variantList, cellList, sc = "2"] = process.argv.slice(2);
const SET = process.env.TYPED_SET || "typed";
const variants = variantList === "-" ? [] : variantList.split(","), cells = cellList.split(",");
const scale = Number(sc);
const rows = [];
let maxW = 0;
for (const cell of cells) {
  const meta = JSON.parse(fs.readFileSync(path.join(HERE, "cache", SET, cell, "meta.json"), "utf8"));
  const alpha = fs.readFileSync(path.join(HERE, "cache", SET, cell, "alpha.u8"));
  // the ideal glyphs at the same scale as the renders (8 px per mm): the drawing was made at 14
  const k = 8 / meta.pxPerMm;
  const rgba = Buffer.alloc(meta.width * meta.height * 4);
  for (let i = 0; i < alpha.length; i++) { const v = 255 - alpha[i]; rgba[i * 4] = v; rgba[i * 4 + 1] = v; rgba[i * 4 + 2] = v; rgba[i * 4 + 3] = 255; }
  const ideal = await sharp(rgba, { raw: { width: meta.width, height: meta.height, channels: 4 } }).resize({ width: Math.round(meta.width * k * scale) }).png().toBuffer();
  const imgs = [ideal];
  for (const v of variants) imgs.push(await sharp(path.join(HERE, "out", v, SET, cell, "render.png")).resize({ width: Math.round((await sharp(path.join(HERE, "out", v, SET, cell, "render.png")).metadata()).width * scale), kernel: "nearest" }).png().toBuffer());
  for (const b of imgs) { const m = await sharp(b).metadata(); maxW = Math.max(maxW, m.width); }
  rows.push(...imgs);
}
const metas = await Promise.all(rows.map((b) => sharp(b).metadata()));
const gap = 4;
const H = metas.reduce((a, m) => a + m.height + gap, 0);
let y = 0;
await sharp({ create: { width: maxW, height: H, channels: 3, background: "#777777" } })
  .composite(rows.map((b, i) => { const top = y; y += metas[i].height + gap; return { input: b, left: 0, top }; }))
  .png().toFile(outFile);
console.log("ok", outFile, maxW, "x", H);

