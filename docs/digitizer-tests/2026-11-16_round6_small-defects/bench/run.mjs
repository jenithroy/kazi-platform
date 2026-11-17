// Sews every picture in bench/inputs with the working tree's engine (trace -> objects -> generate, people off, like the page),
// draws it, and measures two things against the picture's own ink:
//   MISSING = % of the picture's ink with no stitch within 0.125 mm      (parts of letters that are not sewn)
//   EXTRA   = % of the stitched ink with no picture ink within 0.125 mm  (stitches where there should be none)
// usage: node run.mjs --label <what> [--only regex]   -> ../runs/<YYYY-MM-DD_HHMM>_<label>/{metrics.json, summary.txt, compare/<id>.png}
// compare/<id>.png (top to bottom): the picture | what was sewn | red = missing, blue = extra, grey = right
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const require = createRequire(import.meta.url);
const sharp = require(ROOT + "/app/node_modules/sharp");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const label = opt("label", "run"), only = opt("only") ? new RegExp(opt("only")) : null;
const THREAD = Number(opt("thread", "0.45")); // mm: the thread the picture of the stitches is drawn with (the preview draws 0.45; real thread is about 0.4)
const d = new Date(), p2 = (n) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}`;
const OUT = path.join(HERE, "..", "runs", `${stamp}_${label}`);
fs.mkdirSync(path.join(OUT, "compare"), { recursive: true });

const imp = (rel) => import(pathToFileURL(path.join(ROOT, "app/lib", rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const model = await imp("digitizer/model.js");
const { generate } = await imp("embroidery/stitch/engine.js");
const { rasterizePattern } = await imp("embroidery/stitch/raster.js");

const PX = 8, TOL = 1, SCALE = 3;
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function dilate(mask, W, H, r) {
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) { const xx = x + k; if (xx >= 0 && xx < W && mask[y * W + xx]) v = 1; } tmp[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) { const yy = y + k; if (yy >= 0 && yy < H && tmp[yy * W + x]) v = 1; } out[y * W + x] = v; }
  return out;
}

const files = fs.readdirSync(path.join(HERE, "inputs")).filter((f) => f.endsWith(".png") && !f.startsWith("_")).sort();
const results = [];
for (const f of files) {
  const id = f.replace(/\.png$/, "");
  if (only && !only.test(id)) continue;
  const { data, info } = await sharp(path.join(HERE, "inputs", f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
  const wMm = image.width / 10, mm = wMm / image.width, hMm = image.height * mm;
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  const t0 = Date.now();
  const traced = traceImage(image, conv.traceOptions(settings, mm));
  const fabric = conv.clothFromTrace(traced) || model.DEFAULT_CLOTH;
  const res = conv.objectsFromTrace(traced, { originX: -wMm / 2, originY: -hMm / 2, mmPerPx: mm, fabric, maxColors: 12, detailThick: false });
  const design = model.newDesign({ objects: res.objects, fabricColor: fabric, hoop: { w: 450, h: 450 }, name: id });
  const g = generate(model.engineDesign(design), JSON.parse(opt("engine", "{}")));
  const bg = hex2rgb(fabric);
  const img = rasterizePattern(g.pattern, { pxPerMm: PX, marginMm: 2, threadMm: THREAD, background: [bg[0], bg[1], bg[2], 255] });
  const W = img.width, H = img.height;
  let stitches = 0, trims = 0, jumps = 0;
  for (const s of g.pattern.stitches) { if (s[2] === 0) stitches++; else if (s[2] === 2) trims++; else if (s[2] === 1) jumps++; }
  // masks in the render's grid
  const stitch = new Uint8Array(W * H), src = new Uint8Array(W * H), srcRgb = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, k = y * W + x;
    stitch[k] = Math.max(Math.abs(img.data[i] - bg[0]), Math.abs(img.data[i + 1] - bg[1]), Math.abs(img.data[i + 2] - bg[2])) > 48 ? 1 : 0;
    const sx = Math.round((x / PX + img.originX - (-wMm / 2)) / mm), sy = Math.round((y / PX + img.originY - (-hMm / 2)) / mm);
    if (sx >= 0 && sx < image.width && sy >= 0 && sy < image.height) {
      const j = (sy * image.width + sx) * 4, lum = 0.3 * data[j] + 0.59 * data[j + 1] + 0.11 * data[j + 2];
      src[k] = lum < 160 ? 1 : 0; srcRgb[k * 3] = data[j]; srcRgb[k * 3 + 1] = data[j + 1]; srcRgb[k * 3 + 2] = data[j + 2];
    } else { srcRgb[k * 3] = srcRgb[k * 3 + 1] = srcRgb[k * 3 + 2] = 255; }
  }
  // the traced shapes (what the engine is handed), in the render's grid: tells a fault of the tracer from a fault of the engine
  const poly = new Uint8Array(W * H);
  for (const o of design.objects) {
    const hits = Array.from({ length: H }, () => []);
    for (const ring of model.worldRings(o)) for (let i = 0, n = ring.length; i < n; i++) {
      const p = ring[i], q = ring[(i + 1) % n];
      const py = (p[1] - img.originY) * PX, qy = (q[1] - img.originY) * PX;
      if (py === qy) continue;
      for (let y = Math.max(0, Math.floor(Math.min(py, qy) - 0.5) - 1); y <= Math.min(H - 1, Math.ceil(Math.max(py, qy) - 0.5) + 1); y++) {
        const yc = y + 0.5;
        if ((py <= yc) !== (qy <= yc)) hits[y].push((p[0] + ((q[0] - p[0]) * ((yc / PX + img.originY) - p[1])) / (q[1] - p[1]) - img.originX) * PX);
      }
    }
    for (let y = 0; y < H; y++) { const h = hits[y].sort((a, b) => a - b); for (let i = 0; i + 1 < h.length; i += 2) for (let x = Math.max(0, Math.ceil(h[i] - 0.5)); x <= Math.min(W - 1, Math.floor(h[i + 1] - 0.5)); x++) poly[y * W + x] = 1; }
  }
  // is the whole sewn picture shifted against the drawn one? (the centre of the ink of each, in mm; a thread's overhang is the same on every side and moves nothing)
  let sx = 0, sy = 0, sn = 0, tx = 0, ty = 0, tn = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (src[k]) { sx += x; sy += y; sn++; } if (stitch[k]) { tx += x; ty += y; tn++; } }
  const shiftXmm = +(((tx / Math.max(1, tn)) - (sx / Math.max(1, sn))) / PX).toFixed(3), shiftYmm = +(((ty / Math.max(1, tn)) - (sy / Math.max(1, sn))) / PX).toFixed(3);
  const dS = dilate(stitch, W, H, TOL), dP = dilate(src, W, H, TOL), dQ = dilate(poly, W, H, TOL);
  let srcInk = 0, stInk = 0, miss = 0, extra = 0, missEng = 0, missTr = 0, extraTr = 0;
  const engMask = new Uint8Array(W * H), exMask = new Uint8Array(W * H), eAll = new Uint8Array(W * H);
  const ov = Buffer.alloc(W * H * 3, 255);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let k = 0; k < W * H; k++) {
    const m = src[k] && !dS[k], e = stitch[k] && !dP[k];
    const mEng = m && dQ[k], mTr = m && !dQ[k], eTr = e && dQ[k]; // not sewn though the engine had a shape there / ink the tracer's shape lacks; sewn where the tracer's shape already was fatter than the picture
    if (src[k]) srcInk++; if (stitch[k]) stInk++; if (m) miss++; if (e) extra++; if (mEng) { missEng++; engMask[k] = 1; } if (mTr) missTr++; if (eTr) extraTr++; if (e && !eTr) exMask[k] = 1; if (e) eAll[k] = 1;
    const c = mEng ? [220, 30, 30] : mTr ? [250, 140, 0] : eTr ? [0, 170, 200] : e ? [30, 90, 230] : stitch[k] ? [90, 90, 90] : src[k] ? [150, 150, 150] : [255, 255, 255];
    ov[k * 3] = c[0]; ov[k * 3 + 1] = c[1]; ov[k * 3 + 2] = c[2];
    if (src[k] || stitch[k]) { const x = k % W, y = (k / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  // the patches of ink the engine left unsewn (8-connected), biggest first: where they are and how wide
  const seen = new Uint8Array(W * H), patches = [];
  for (let k0 = 0; k0 < W * H; k0++) {
    if (!engMask[k0] || seen[k0]) continue;
    const stack = [k0]; seen[k0] = 1; let px = 0, bx0 = W, by0 = H, bx1 = 0, by1 = 0;
    while (stack.length) {
      const k = stack.pop(), x = k % W, y = (k / W) | 0; px++;
      bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const kk = yy * W + xx; if (engMask[kk] && !seen[kk]) { seen[kk] = 1; stack.push(kk); } }
    }
    patches.push({ px, xMm: +((bx0 + bx1) / 2 / PX + img.originX).toFixed(1), yMm: +((by0 + by1) / 2 / PX + img.originY).toFixed(1), wMm: +((bx1 - bx0 + 1) / PX).toFixed(2), hMm: +((by1 - by0 + 1) / PX).toFixed(2) });
  }
  patches.sort((a, b) => b.px - a.px);
  // the engine's extra ink as FAT blobs (a thread's overhang along an edge is a thin fringe and cannot be avoided; a filled counter, a bridge or a stray stitch is fat)
  const core = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x; if (exMask[k] && exMask[k - 1] && exMask[k + 1] && exMask[k - W] && exMask[k + W]) core[k] = 1; }
  const seen2 = new Uint8Array(W * H), blobs = []; let blobPx = 0;
  for (let k0 = 0; k0 < W * H; k0++) {
    if (!core[k0] || seen2[k0]) continue;
    const stack = [k0]; seen2[k0] = 1; let px = 0, bx0 = W, by0 = H, bx1 = 0, by1 = 0;
    while (stack.length) {
      const k = stack.pop(), x = k % W, y = (k / W) | 0; px++;
      bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const kk = yy * W + xx; if (core[kk] && !seen2[kk]) { seen2[kk] = 1; stack.push(kk); } }
    }
    blobPx += px; blobs.push({ px, xMm: +((bx0 + bx1) / 2 / PX + img.originX).toFixed(1), yMm: +((by0 + by1) / 2 / PX + img.originY).toFixed(1), wMm: +((bx1 - bx0 + 1) / PX).toFixed(2), hMm: +((by1 - by0 + 1) / PX).toFixed(2) });
  }
  blobs.sort((a, b) => b.px - a.px);
  // how wide is the stroke of the picture that each extra pixel lies next to? (distance transform of the drawn ink, widest inscribed disk covering each ink pixel, then the nearest ink pixel's value)
  const dist = new Int32Array(W * H);
  for (let k = 0; k < W * H; k++) dist[k] = src[k] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (!dist[k]) continue; let v = dist[k]; if (x > 0) v = Math.min(v, dist[k - 1] + 3); if (y > 0) { v = Math.min(v, dist[k - W] + 3); if (x > 0) v = Math.min(v, dist[k - W - 1] + 4); if (x < W - 1) v = Math.min(v, dist[k - W + 1] + 4); } dist[k] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const k = y * W + x; if (!dist[k]) continue; let v = dist[k]; if (x < W - 1) v = Math.min(v, dist[k + 1] + 3); if (y < H - 1) { v = Math.min(v, dist[k + W] + 3); if (x < W - 1) v = Math.min(v, dist[k + W + 1] + 4); if (x > 0) v = Math.min(v, dist[k + W - 1] + 4); } dist[k] = v; }
  const thick = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const k = y * W + x, d0 = dist[k];
    if (!src[k] || d0 < 3) continue;
    let top = true;
    for (let dy = -1; dy <= 1 && top; dy++) for (let dx = -1; dx <= 1; dx++) if (dist[k + dy * W + dx] > d0) { top = false; break; }
    if (!top) continue;
    const R = d0 / 3, wpx = 2 * R - 1, Ri = Math.ceil(R);
    for (let dy = -Ri; dy <= Ri; dy++) for (let dx = -Ri; dx <= Ri; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (dx * dx + dy * dy <= (R + 0.5) * (R + 0.5)) { const kk = yy * W + xx; if (src[kk] && wpx > thick[kk]) thick[kk] = wpx; } }
  }
  const near = new Float32Array(W * H), reached = new Uint8Array(W * H); let q = [];
  for (let k = 0; k < W * H; k++) if (src[k]) { near[k] = thick[k] || 1; reached[k] = 1; q.push(k); }
  for (let step = 0; step < 8 && q.length; step++) {
    const nq = [];
    for (const k of q) { const x = k % W, y = (k / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const kk = yy * W + xx; if (!reached[kk]) { reached[kk] = 1; near[kk] = near[k]; nq.push(kk); } } }
    q = nq;
  }
  const byWidth = [0, 0, 0, 0]; // extra pixels next to a stroke thinner than 0.25 mm, 0.25 to 0.45, 0.45 to 0.7, 0.7 and more
  for (let k = 0; k < W * H; k++) if (eAll[k] && reached[k]) { const wmm = near[k] / PX; byWidth[wmm < 0.25 ? 0 : wmm < 0.45 ? 1 : wmm < 0.7 ? 2 : 3]++; }
  const pad = 10; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const rgb = (buf, c) => sharp(buf, { raw: { width: W, height: H, channels: c } }).removeAlpha().extract({ left: x0, top: y0, width: cw, height: ch }).resize({ width: cw * SCALE, kernel: "nearest" }).png().toBuffer();
  const panels = [await rgb(Buffer.from(srcRgb), 3), await rgb(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), 4), await rgb(ov, 3)];
  const ph = ch * SCALE;
  await sharp({ create: { width: cw * SCALE, height: ph * 3 + 8, channels: 3, background: "#888888" } }).composite(panels.map((p, i) => ({ input: p, left: 0, top: i * (ph + 4) }))).png().toFile(path.join(OUT, "compare", id + ".png"));
  const r = { id, stitches, trims, jumps, srcInkPx: srcInk, missingPct: +(100 * miss / Math.max(1, srcInk)).toFixed(2), missingEnginePct: +(100 * missEng / Math.max(1, srcInk)).toFixed(2), missingTracePct: +(100 * missTr / Math.max(1, srcInk)).toFixed(2), extraPct: +(100 * extra / Math.max(1, stInk)).toFixed(2), extraTracePct: +(100 * extraTr / Math.max(1, stInk)).toFixed(2), patches: patches.slice(0, 6), extraByWidth: byWidth, stitchInkPx: stInk, shiftXmm, shiftYmm, blobPct: +(100 * blobPx / Math.max(1, stInk)).toFixed(2), blobs: blobs.slice(0, 6), ms: Date.now() - t0 };
  results.push(r);
  console.log(`${id.padEnd(26)} missing ${String(r.missingPct).padStart(6)}% (engine ${String(r.missingEnginePct).padStart(5)} trace ${String(r.missingTracePct).padStart(5)})  extra ${String(r.extraPct).padStart(6)}% (tracer's shape ${String(r.extraTracePct).padStart(5)})  stitches ${String(stitches).padStart(5)} trims ${trims}`);
}
const avg = (a, k) => a.length ? +(a.reduce((s, r) => s + r[k], 0) / a.length).toFixed(2) : 0;
const lines = [`Run ${stamp}_${label}  (${results.length} pictures)`, `average MISSING ${avg(results, "missingPct")}% (the engine did not sew a shape it had: ${avg(results, "missingEnginePct")}%, the tracer lost the ink: ${avg(results, "missingTracePct")}%)   average EXTRA ${avg(results, "extraPct")}% (of which the tracer's shape was already fatter: ${avg(results, "extraTracePct")}%)`];
for (const sz of [3, 4, 6]) { const s = results.filter((r) => r.id.includes(`_${sz}mm_`)); lines.push(`  ${sz} mm caps: missing ${avg(s, "missingPct")}%  extra ${avg(s, "extraPct")}%  (${s.length})`); }
const fonts = [...new Set(results.map((r) => r.id.split("_")[1]))];
for (const ft of fonts) { const s = results.filter((r) => r.id.split("_")[1] === ft); lines.push(`  ${ft.padEnd(10)} missing ${String(avg(s, "missingPct")).padStart(6)}%  extra ${String(avg(s, "extraPct")).padStart(6)}%`); }
{ // the extra ink by the width of the stroke it lies next to (pooled over the pictures)
  const bins = ["thinner than 0.25 mm (a hairline: the thread cannot be thinner than 0.4)", "0.25 to 0.45 mm", "0.45 to 0.7 mm", "0.7 mm and more"];
  const tot = results.reduce((t, r) => t + r.extraByWidth.reduce((a, b) => a + b, 0), 0), ink = results.reduce((t, r) => t + r.stitchInkPx, 0);
  lines.push(`  thread drawn ${THREAD} mm wide; the extra ink lies next to strokes that are:`);
  for (let b = 0; b < 4; b++) { const n = results.reduce((t, r) => t + r.extraByWidth[b], 0); lines.push(`    ${bins[b].padEnd(78)} ${String((100 * n / Math.max(1, tot)).toFixed(0)).padStart(3)} % of the extra ink  (${(100 * n / Math.max(1, ink)).toFixed(2)} % of all stitched ink)`); }
}
fs.writeFileSync(path.join(OUT, "metrics.json"), JSON.stringify(results, null, 1));
fs.writeFileSync(path.join(OUT, "summary.txt"), lines.join("\n") + "\n");
console.log("\n" + lines.join("\n") + "\nwritten to " + OUT);
