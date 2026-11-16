// The 18 open-licence fonts (the "typed2" bench) as PICTURES of lettering, the way lpics has them: navy on white, 10 px to the millimetre, 1000 x 240 px.
// The glyph rasters are the typed2 cells' alpha masks (14 px/mm, drawn by Chromium with the real font), resampled to 10 px/mm; so DADE's results for those very glyphs (out/dade/typed2) can be compared.
// usage: node make_xfonts.mjs [--sizes 3,4,5,6]    writes text/cache/lpicsx/<id>/{image.rgba, meta.json} and lpicsx/manifest.json
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const argv = process.argv.slice(2);
const sizes = (argv[argv.indexOf("--sizes") + 1] || "3,4,5,6").split(",").map(Number);
const SRC = path.join(HERE, "cache", "typed2"), DST = path.join(HERE, "cache", "lpicsx");
fs.mkdirSync(DST, { recursive: true });
const NAVY = [0x16, 0x28, 0x5e], W = 1000, H = 240, PX = 10;
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8")).filter((c) => sizes.includes(c.size));
const out = [];
for (const c of manifest) {
  const dir = path.join(SRC, c.id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const a = fs.readFileSync(path.join(dir, "alpha.u8"));
  const k = PX / meta.pxPerMm;
  const nw = Math.max(1, Math.round(meta.width * k)), nh = Math.max(1, Math.round(meta.height * k));
  const rs = await sharp(a, { raw: { width: meta.width, height: meta.height, channels: 1 } }).resize(nw, nh, { kernel: "lanczos3" }).toColourspace("b-w").raw().toBuffer({ resolveWithObject: true });
  const ch = rs.info.channels, small = { get: (i) => rs.data[i * ch] };
  // ink box of the glyph picture
  let x0 = nw, x1 = -1, y0 = nh, y1 = -1;
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) if (small.get(y * nw + x) > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  // centre the ink on the canvas
  const ox = Math.round(W / 2 - (x0 + x1) / 2), oy = Math.round(H / 2 - (y0 + y1) / 2);
  const rgba = Buffer.alloc(W * H * 4, 255);
  for (let y = 0; y < nh; y++) {
    const yy = y + oy; if (yy < 0 || yy >= H) continue;
    for (let x = 0; x < nw; x++) {
      const xx = x + ox; if (xx < 0 || xx >= W) continue;
      const al = small.get(y * nw + x) / 255, o = (yy * W + xx) * 4;
      for (let j = 0; j < 3; j++) rgba[o + j] = Math.round(255 * (1 - al) + NAVY[j] * al);
    }
  }
  const capPx = c.size * PX;
  const box = { value: c.value, x0: x0 + ox, x1: x1 + ox + 1, y0: Math.max(0, y0 + oy - capPx * 0.1), y1: Math.min(H, y1 + oy + 1 + capPx * 0.1) };
  const id = `xf_${c.id}`;
  fs.mkdirSync(path.join(DST, id), { recursive: true });
  fs.writeFileSync(path.join(DST, id, "image.rgba"), rgba);
  fs.writeFileSync(path.join(DST, id, "meta.json"), JSON.stringify({ id, width: W, height: H, spec: { texts: [{ value: c.value, font: c.font, capMm: c.size, bold: c.bold, ink: "#16285e", x: 500, y: 120 }], extras: [], bg: "#ffffff", badge: null }, boxes: [box] }));
  out.push({ id, kind: "line", font: c.font, size: c.size, str: c.str, value: c.value, w: W, h: H, style: c.style, typed2: c.id });
}
fs.writeFileSync(path.join(DST, "manifest.json"), JSON.stringify(out, null, 1));
console.log("pictures:", out.length, "->", DST);
