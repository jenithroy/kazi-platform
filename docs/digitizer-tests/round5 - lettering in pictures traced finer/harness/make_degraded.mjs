// Degraded copies of the drawn lettering pictures: what a logo that came off the web looks like.
//   jpg50: JPEG at quality 50 with chroma subsampling, same size.   low: shrunk to half the pixels, JPEG at quality 65, enlarged back (a 500 px logo made 100 mm wide).
// usage: node make_degraded.mjs <mode jpg50|low> <outDir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const HERE = "<SESSION>/scratchpad/text";
const [mode, outDir] = process.argv.slice(2);
const src = path.join(HERE, "cache", "lpics");
let n = 0;
for (const id of fs.readdirSync(src)) {
  const d = path.join(src, id);
  if (!fs.existsSync(path.join(d, "image.rgba"))) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(d, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(d, "image.rgba"));
  let img = sharp(raw, { raw: { width: meta.width, height: meta.height, channels: 4 } }).flatten({ background: "#ffffff" });
  let jpg;
  if (mode === "jpg50") jpg = await img.jpeg({ quality: 50, chromaSubsampling: "4:2:0" }).toBuffer();
  else {
    const small = await img.resize({ width: Math.round(meta.width / 2), kernel: "lanczos3" }).jpeg({ quality: 65, chromaSubsampling: "4:2:0" }).toBuffer();
    jpg = await sharp(small).resize({ width: meta.width, height: meta.height, kernel: "cubic" }).jpeg({ quality: 95 }).toBuffer();
  }
  const out = await sharp(jpg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const od = path.join(outDir, "lpics", id);
  fs.mkdirSync(od, { recursive: true });
  fs.writeFileSync(path.join(od, "image.rgba"), out.data);
  fs.writeFileSync(path.join(od, "meta.json"), JSON.stringify(meta));
  n++;
}
console.log(mode, n, "pictures ->", outDir);
