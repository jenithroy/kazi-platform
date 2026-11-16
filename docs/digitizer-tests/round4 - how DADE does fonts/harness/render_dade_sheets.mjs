// Draw DADE's DST of each lettering sheet the way OUR bench draws ours (the site's own raster.js, 8 px/mm, 0.45 mm round threads, the page's cloth colour),
// then cut one picture per typed cell so the same reader (ocr_text.py) can score it.  Black thread everywhere: DADE's file carries no colours.
// usage: node render_dade_sheets.mjs --sheets <dir> --dst <dir> --out <dir> --set typed|typed2 [--prefix typed] [--blocks all|first]
// writes <out>/<set>/<cell>/render.png (+stats.json) and <out>/sheets/<sheet>.png (the whole sheet, drawn)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const SHEETS = opt("sheets"), DST = opt("dst"), OUT = opt("out"), SET = opt("set", "typed"), PREFIX = opt("prefix", SET), BLOCKS = opt("blocks", "all");
const LIB = opt("lib", "<REPO>/app/lib");
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const fmts = await imp("embroidery/formats/index.js");
const { rasterizePattern } = await imp("embroidery/stitch/raster.js");
const model = await imp("digitizer/model.js");
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const bg = hex2rgb(model.DEFAULT_CLOTH);
const R = { pxPerMm: 8, marginMm: 2, threadMm: 0.45 };

fs.mkdirSync(path.join(OUT, "sheets"), { recursive: true });
const sheetFiles = fs.readdirSync(SHEETS).filter((f) => f.startsWith(PREFIX + "_") && f.endsWith(".json")).sort();
let cellsDone = 0;
for (const sf of sheetFiles) {
  const base = sf.replace(/\.json$/, "");
  const dstPath = path.join(DST, base + ".dst");
  if (!fs.existsSync(dstPath)) { console.log("no DST for", base); continue; }
  const sheet = JSON.parse(fs.readFileSync(path.join(SHEETS, sf), "utf8"));
  // the ink box of the sheet picture, in mm (1 px = 0.1 mm): DADE sews only the ink, and its file starts at the ink's corner
  const png = await sharp(path.join(SHEETS, base + ".png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: CH } = png.info;
  const NONWHITE = opt("nonwhite", "0") === "1"; // coloured backgrounds (a yellow picture) count as ink too
  let ix0 = W, iy0 = H, ix1 = -1, iy1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * CH, r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    const ink = NONWHITE ? Math.min(r, g, b) < 215 : 0.299 * r + 0.587 * g + 0.114 * b < 128;
    if (ink) { if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y; }
  }
  const inkMm = { x0: ix0 / sheet.pxPerMm, y0: iy0 / sheet.pxPerMm, x1: (ix1 + 1) / sheet.pxPerMm, y1: (iy1 + 1) / sheet.pxPerMm };

  const pattern = fmts.readPattern("dst", fs.readFileSync(dstPath));
  // blocks: DADE sews its colours one after the other; "first" keeps only the first block (the black letters), "all" draws every block in black
  let keep = pattern.stitches;
  if (BLOCKS === "first") {
    const out = [];
    for (const s of pattern.stitches) { if (s[2] === 3) break; out.push(s); }
    keep = out;
  }
  const black = { r: 0, g: 0, b: 0 };
  // thread colours: DADE's file has none. "source" (default): each colour block gets the median colour of the sheet picture under its needle points;
  // "black": everything black
  let threads;
  const nBlocks = keep.reduce((n, s) => n + (s[2] === 3 ? 1 : 0), 1);
  if (opt("colours", "source") === "black") {
    threads = Array.from({ length: nBlocks }, () => black);
  } else {
    let minX = Infinity, minY = Infinity;
    for (const s of keep) if (s[2] === 0 || s[2] === 1) { if (s[0] < minX) minX = s[0]; if (s[1] < minY) minY = s[1]; }
    const oX = minX / 10 - R.marginMm, oY = minY / 10 - R.marginMm; // the origin rasterizePattern will use
    const samples = Array.from({ length: nBlocks }, () => [[], [], []]);
    let b = 0, qx = null, qy = null;
    for (const s of keep) {
      if (s[2] === 3) { b++; qx = null; continue; }
      if (s[2] !== 0) { qx = null; continue; }
      // a needle point of a fill sits ON the island's edge, where the picture is half-covered: sample the middle of the stitch instead (inside the island)
      const prevX = qx, prevY = qy; qx = s[0]; qy = s[1];
      if (prevX === null) continue;
      const mx = (s[0] + prevX) / 20 - oX - R.marginMm + inkMm.x0, my = (s[1] + prevY) / 20 - oY - R.marginMm + inkMm.y0; // sheet mm
      const px = Math.min(W - 1, Math.max(0, Math.floor(mx * sheet.pxPerMm))), py = Math.min(H - 1, Math.max(0, Math.floor(my * sheet.pxPerMm)));
      const i = (py * W + px) * CH;
      samples[b][0].push(png.data[i]); samples[b][1].push(png.data[i + 1]); samples[b][2].push(png.data[i + 2]);
    }
    const med = (a) => { if (!a.length) return 0; const t = [...a].sort((p, q) => p - q); return t[t.length >> 1]; };
    threads = samples.map((a) => ({ r: med(a[0]), g: med(a[1]), b: med(a[2]) }));
  }
  const pat = { ...pattern, stitches: keep, threads };
  // design y runs the same way as the picture's? (checked on the first sheet by eye: pass --flip 1 when it does not)
  const flip = opt("flip", "0") === "1";
  if (flip) pat.stitches = pat.stitches.map((s) => [s[0], -s[1], s[2], ...s.slice(3)]);

  const img = rasterizePattern(pat, { ...R, background: [bg[0], bg[1], bg[2], 255] });
  const sheetPng = sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } });
  await sheetPng.clone().png().toFile(path.join(OUT, "sheets", base + ".png"));
  // the render pixel of a sheet point (mm): (mm - inkMin + margin) * pxPerMm  (the stitches' corner sits on the ink's corner)
  const toPx = (mmX, mmY) => [Math.round((mmX - inkMm.x0 + R.marginMm) * R.pxPerMm), Math.round((mmY - inkMm.y0 + R.marginMm) * R.pxPerMm)];
  // stitches per block, for the notes
  let blk = 0; const perBlock = [0];
  for (const s of pattern.stitches) { if (s[2] === 3) { blk++; perBlock[blk] = 0; } else if (s[2] === 0) perBlock[blk]++; }
  console.log(`${base}: ${pattern.stitches.length} records, blocks ${JSON.stringify(perBlock)} colours ${JSON.stringify(threads.map((t) => [t.r, t.g, t.b]))}, ink box ${inkMm.x0.toFixed(1)},${inkMm.y0.toFixed(1)}..${inkMm.x1.toFixed(1)},${inkMm.y1.toFixed(1)} mm, render ${img.width}x${img.height}`);

  for (const c of sheet.cells) {
    const [x0, y0] = toPx(c.x / sheet.pxPerMm, c.y / sheet.pxPerMm);
    const [x1, y1] = toPx((c.x + c.w) / sheet.pxPerMm, (c.y + c.h) / sheet.pxPerMm);
    const left = Math.max(0, x0), top = Math.max(0, y0);
    const w = Math.min(img.width, x1) - left, h = Math.min(img.height, y1) - top;
    if (w < 4 || h < 4) { console.log("  cell outside the render:", c.id); continue; }
    const dir = path.join(OUT, SET, c.id);
    fs.mkdirSync(dir, { recursive: true });
    await sheetPng.clone().extract({ left, top, width: w, height: h }).png().toFile(path.join(dir, "render.png"));
    // stitches inside the cell, in mm: count and length histogram
    const cx0 = (left / R.pxPerMm) + (img.originX), cy0 = (top / R.pxPerMm) + (img.originY);
    const cx1 = cx0 + w / R.pxPerMm, cy1 = cy0 + h / R.pxPerMm;
    let n = 0, short = 0, len = 0, px = null, py = null;
    for (const s of keep) {
      if (s[2] === 0) {
        const X = s[0] / 10, Y = s[1] / 10;
        if (X >= cx0 && X <= cx1 && Y >= cy0 && Y <= cy1) {
          n++;
          if (px !== null) { const l = Math.hypot(X - px, Y - py); len += l; if (l < 0.4) short++; }
        }
        px = X; py = Y;
      } else { px = null; }
    }
    fs.writeFileSync(path.join(dir, "stats.json"), JSON.stringify({ id: c.id, stitches: n, shortShare: n ? +(short / n).toFixed(3) : 0, threadMm: +len.toFixed(1) }));
    cellsDone++;
  }
}
console.log("cells cut:", cellsDone);
