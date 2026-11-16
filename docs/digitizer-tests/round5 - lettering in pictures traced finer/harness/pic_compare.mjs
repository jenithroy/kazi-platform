// Side by side: the same part of a picture, as the picture is, and as each variant sewed it.
// usage: node pic_compare.mjs <out.png> <set/name> <x0,y0,x1,y1 (source pixels)> <variantDir>[,<variantDir>...] [scale=3] [vertical=0]
// each variantDir is an out dir of replay_pic.mjs (it holds pics/<set>__<name>/{render.png,stats.json})
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const [out, item, box, dirs, sc = "3", vert = "0"] = process.argv.slice(2);
const [set, name] = item.split("/");
const [x0, y0, x1, y1] = box.split(",").map(Number);
const scale = Number(sc);
const srcDir = [path.join(HERE, "cache", set, name), path.join(HERE, "..", "faces", "cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));
const meta = JSON.parse(fs.readFileSync(path.join(srcDir, "meta.json"), "utf8"));
const raw = fs.readFileSync(path.join(srcDir, "image.rgba"));
const targetW = Math.round((x1 - x0) * scale), targetH = Math.round((y1 - y0) * scale);
const panels = [];
panels.push(await sharp(raw, { raw: { width: meta.width, height: meta.height, channels: 4 } }).flatten({ background: "#ffffff" }).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).resize({ width: targetW, height: targetH, kernel: "nearest" }).png().toBuffer());
for (const d of dirs.split(",")) {
  const dir = path.join(d, "pics", `${set}__${name}`);
  const st = JSON.parse(fs.readFileSync(path.join(dir, "stats.json"), "utf8"));
  const mm = st.mmPerPx, r = st.render, so = st.source;
  const rx0 = Math.round((x0 * mm + so.originX - r.originX) * r.pxPerMm), ry0 = Math.round((y0 * mm + so.originY - r.originY) * r.pxPerMm);
  const rw = Math.round((x1 - x0) * mm * r.pxPerMm), rh = Math.round((y1 - y0) * mm * r.pxPerMm);
  const img = sharp(path.join(dir, "render.png"));
  const m = await img.metadata();
  const left = Math.max(0, Math.min(m.width - 1, rx0)), top = Math.max(0, Math.min(m.height - 1, ry0));
  panels.push(await sharp(path.join(dir, "render.png")).extract({ left, top, width: Math.min(rw, m.width - left), height: Math.min(rh, m.height - top) }).resize({ width: targetW, height: targetH, fit: "fill" }).png().toBuffer());
}
const gap = 8, n = panels.length;
const W = vert === "1" ? targetW : n * targetW + (n - 1) * gap, H = vert === "1" ? n * targetH + (n - 1) * gap : targetH;
await sharp({ create: { width: W, height: H, channels: 3, background: "#888888" } })
  .composite(panels.map((p, i) => ({ input: p, left: vert === "1" ? 0 : i * (targetW + gap), top: vert === "1" ? i * (targetH + gap) : 0 })))
  .png().toFile(out);
console.log("ok", out, W, "x", H);
