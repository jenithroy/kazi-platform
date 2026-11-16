// Where does lettering in a picture lose its shape? For each drawn lettering picture (navy text on a plain ground, 10 px/mm) the TRUE ink (pixels nearer the ink colour than the ground) is compared with
//   stage 1: the shapes the tracer made (traced.shapes whose colour is the ink's)
//   stage 2: the objects the converter made of them (res.objects, the same colour)
//   stage 3: the stitched render (out/<variant>/pics/lpics__<id>/render.png), cloth subtracted
// recall = share of the true ink that is covered, precision = share of the covered that is true ink, edge = |R xor T| / perimeter(T) (mm): the average distance the edge is out by, comps = ink pieces (letters) found against true.
// usage: node diag_trace.mjs <variant for stage 3> <id> [<id> ...]   (ids like line_sans_3mm_ave; "all:<kind>" takes every height/text of that face kind, e.g. all:sans)
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const HERE = "<SESSION>/scratchpad/text";
const LIB = process.env.LIB || "<REPO>/app/lib";
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const model = await imp("digitizer/model.js");

const variant = process.argv[2];
let ids = process.argv.slice(3);
const all = fs.readdirSync(path.join(HERE, "cache", "lpics")).filter((n) => fs.existsSync(path.join(HERE, "cache", "lpics", n, "meta.json")));
ids = ids.flatMap((a) => (a.startsWith("all:") ? all.filter((n) => n.startsWith("line_" + a.slice(4) + "_")) : [a]));

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

function fillRings(W, H, rings, mask, x0, y0, x1, y1) {
  // even-odd scanline fill of rings (pixel coordinates) into mask (W x H) inside the box
  for (let y = y0; y < y1; y++) {
    const yc = y + 0.5;
    const xs = [];
    for (const r of rings) {
      for (let i = 0, n = r.length; i < n; i++) {
        const p = r[i], q = r[(i + 1) % n];
        if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc)) xs.push(p[0] + ((yc - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(x0, Math.ceil(xs[k] - 0.5)), b = Math.min(x1 - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = a; x <= b; x++) mask[y * W + x] ^= 1;
    }
  }
}
function comps(mask, W, x0, y0, x1, y1) {
  const seen = new Uint8Array(mask.length);
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x;
    if (!mask[i] || seen[i]) continue;
    let area = 0;
    const st = [i]; seen[i] = 1;
    while (st.length) {
      const j = st.pop(); area++;
      const jx = j % W, jy = (j - jx) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = jx + dx, ny = jy + dy;
        if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
        const k = ny * W + nx;
        if (mask[k] && !seen[k]) { seen[k] = 1; st.push(k); }
      }
    }
    if (area >= 6) n++; // a 0.06 mm2 crumb is not a piece
  }
  return n;
}
function perim(mask, W, x0, y0, x1, y1) {
  let e = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const v = mask[y * W + x];
    if (x + 1 < x1 && mask[y * W + x + 1] !== v) e++;
    if (y + 1 < y1 && mask[(y + 1) * W + x] !== v) e++;
  }
  return e;
}

const rows = [];
for (const id of ids) {
  const dir = path.join(HERE, "cache", "lpics", id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const W = meta.width, H = meta.height;
  const image = { width: W, height: H, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const wMm = W / 10, hMm = H / 10, mmPerPx = 0.1;
  const b = meta.boxes[0], pad = 25;
  const x0 = Math.max(0, Math.floor(b.x0 - pad)), x1 = Math.min(W, Math.ceil(b.x1 + pad)), y0 = Math.max(0, Math.floor(b.y0 - pad)), y1 = Math.min(H, Math.ceil(b.y1 + pad));
  const ink = hex2rgb(meta.spec.texts[0].ink), bg = hex2rgb(meta.spec.bg || "#ffffff");
  // true ink: nearer the ink than the ground
  const T = new Uint8Array(W * H);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const o = (y * W + x) * 4, p = [raw[o], raw[o + 1], raw[o + 2]];
    T[y * W + x] = d2(p, ink) < d2(p, bg) ? 1 : 0;
  }
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  const traced = traceImage(image, { ...conv.traceOptions(settings, mmPerPx), ...(process.env.TRACE_OPTS ? JSON.parse(process.env.TRACE_OPTS) : {}) });
  const fabric = conv.clothFromTrace(traced) || model.DEFAULT_CLOTH;
  // stage 1: traced shapes of the ink's colour (palette entry nearer the ink than the ground)
  const isInkCol = (rgb) => d2(rgb, ink) < d2(rgb, bg);
  const S1 = new Uint8Array(W * H);
  for (const s of traced.shapes) {
    const pal = traced.palette[s.color];
    if (!pal || pal.background || !isInkCol([pal.r, pal.g, pal.b])) continue;
    const bb = s.bbox;
    if (bb[2] < x0 || bb[0] > x1 || bb[3] < y0 || bb[1] > y1) continue;
    fillRings(W, H, s.contours, S1, x0, y0, x1, y1);
  }
  // stage 2: the objects
  const res = conv.objectsFromTrace(traced, { originX: -wMm / 2, originY: -hMm / 2, mmPerPx, fabric, maxColors: 12, detailThick: false });
  const S2 = new Uint8Array(W * H);
  let nLet = 0;
  for (const o of res.objects) {
    const col = o.fill && o.fill.color;
    if (!col || !/^#[0-9a-f]{6}$/i.test(col) || !isInkCol(hex2rgb(col))) continue;
    if (o.letters) nLet++;
    const rings = o.rings.map((r) => r.map((p) => [(p[0] + wMm / 2) / mmPerPx, (p[1] + hMm / 2) / mmPerPx]));
    fillRings(W, H, rings, S2, x0, y0, x1, y1);
  }
  // stage 3: the stitched render, thread drawn 0.45 mm wide
  const st = JSON.parse(fs.readFileSync(path.join(HERE, "out", variant, "pics", "lpics__" + id, "stats.json"), "utf8"));
  const rimg = sharp(path.join(HERE, "out", variant, "pics", "lpics__" + id, "render.png"));
  const rm = await rimg.metadata();
  const rb = await rimg.raw().toBuffer();
  const rch = rm.channels, cloth = hex2rgb(st.cloth);
  const S3 = new Uint8Array(W * H);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const mx = -wMm / 2 + (x + 0.5) * mmPerPx, my = -hMm / 2 + (y + 0.5) * mmPerPx;
    const u = Math.floor((mx - st.render.originX) * st.render.pxPerMm), v = Math.floor((my - st.render.originY) * st.render.pxPerMm);
    if (u < 0 || v < 0 || u >= rm.width || v >= rm.height) continue;
    const o = (v * rm.width + u) * rch, p = [rb[o], rb[o + 1], rb[o + 2]];
    S3[y * W + x] = d2(p, cloth) > d2(p, ink) ? 1 : 0; // nearer the thread's colour than the cloth's
  }
  const area = (m) => { let a = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) a += m[y * W + x]; return a; };
  const aT = area(T), pT = perim(T, W, x0, y0, x1, y1) * 0.1;
  const stat = (R) => {
    let inter = 0, xor = 0, aR = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const t = T[y * W + x], r = R[y * W + x];
      aR += r; if (t && r) inter++; if (t !== r) xor++;
    }
    return { recall: inter / aT, precision: aR ? inter / aR : 0, weight: aR / aT, edge: (xor * 0.01) / (pT || 1), comps: comps(R, W, x0, y0, x1, y1) };
  };
  rows.push({ id, cap: meta.spec.texts[0].capMm, tComps: comps(T, W, x0, y0, x1, y1), nLet, s1: stat(S1), s2: stat(S2), s3: stat(S3) });
}

const f = (x, d = 2) => x.toFixed(d);
console.log("id".padEnd(26) + "true | stage1 tracer shapes        | stage2 converter objects      | stage3 stitched render");
console.log("".padEnd(26) + "comps| rec  prec  wt   edge  comps  | rec  prec  wt   edge  comps    | rec  prec  wt   edge  comps");
for (const r of rows) {
  const s = (x) => `${f(x.recall)} ${f(x.precision)} ${f(x.weight)} ${f(x.edge, 3)} ${String(x.comps).padStart(3)}`;
  console.log(r.id.padEnd(26) + String(r.tComps).padStart(3) + "  | " + s(r.s1) + "  | " + s(r.s2) + "  | " + s(r.s3));
}
const by = new Map();
for (const r of rows) { const k = r.cap; if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
const mean = (a, g) => a.reduce((s, r) => s + g(r), 0) / a.length;
console.log("\nmeans by cap height (mm):  recall / precision / weight(ink area vs true) / edge error mm / pieces vs true");
for (const [k, a] of [...by].sort((p, q) => p[0] - q[0])) {
  const line = (name, g) => `${name} ${f(mean(a, (r) => g(r).recall))} ${f(mean(a, (r) => g(r).precision))} ${f(mean(a, (r) => g(r).weight))} ${f(mean(a, (r) => g(r).edge), 3)} ${f(mean(a, (r) => g(r).comps), 1)}`;
  console.log(`${String(k).padStart(3)} mm n=${a.length}  true pieces ${f(mean(a, (r) => r.tComps), 1)} | ${line("trace", (r) => r.s1)} | ${line("objects", (r) => r.s2)} | ${line("stitch", (r) => r.s3)}`);
}
