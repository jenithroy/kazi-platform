// Typed lettering, the way the page does it, replayed in Node on the pixels captured in Chromium (cache/typed/<cell>/alpha.u8 + meta.json).
// Page path (useDigitizer.retext + createText): drawText(text, 14) -> engine.trace(pixels, { colors: 2, mmPerPx: 1 / pxPerMm, background: "auto", minFeatureMm: 0.15,
// minAreaMm2: 0.05, simplifyMm: 0.03 }) -> textRings -> an object of kind "text" (fill auto, black) -> generate().  Everything after the pixels is the library's own code.
//
// usage: node replay_text.mjs --lib <path to an app/lib> --out <dir> [--cells all | id,id | font=serif,size=3] [--png 1] [--dst 1]
// writes <out>/typed/<cell>/{stats.json, rings.json, cover.u8, render.png, design.dst}
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { installKindHook, summariseKinds } from "./hooks.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const LIB = opt("lib");
const OUT = opt("out");
const CELLS = opt("cells", "all");
const WANT_PNG = opt("png", "1") !== "0";
const WANT_DST = opt("dst", "1") !== "0";
if (!LIB || !OUT) throw new Error("--lib and --out are required");

const hook = installKindHook();
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const { traceImage } = await imp("embroidery/trace/index.js");
const model = await imp("digitizer/model.js");
const textlib = await imp("digitizer/text.js");
const { generate } = await imp("embroidery/stitch/engine.js");
const fmts = await imp("embroidery/formats/index.js");
const { rasterizePattern } = await imp("embroidery/stitch/raster.js");

const TYPED = path.join(HERE, "cache", "typed");
const manifest = JSON.parse(fs.readFileSync(path.join(TYPED, "manifest.json"), "utf8"));
let cells = manifest;
if (CELLS !== "all") {
  const wants = CELLS.split(",");
  const kv = wants.filter((w) => w.includes("=")).map((w) => w.split("="));
  const ids = wants.filter((w) => !w.includes("="));
  cells = manifest.filter((c) => ids.includes(c.id) || (kv.length && kv.every(([k, v]) => String(c[k]) === v)));
}
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const round3 = (x) => Math.round(x * 1000) / 1000;

async function runCell(c) {
  const dir = path.join(TYPED, c.id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const alpha = fs.readFileSync(path.join(dir, "alpha.u8"));
  const n = meta.width * meta.height;
  const data = new Uint8ClampedArray(n * 4); // black text: (0, 0, 0, alpha)
  for (let i = 0; i < n; i++) data[i * 4 + 3] = alpha[i];
  const t0 = Date.now();
  const traced = traceImage({ width: meta.width, height: meta.height, data }, { colors: 2, mmPerPx: 1 / meta.pxPerMm, background: "auto", minFeatureMm: 0.15, minAreaMm2: 0.05, simplifyMm: 0.03 });
  const tTrace = Date.now() - t0;
  // where the page centres the letters: the centre of the traced outlines' box, in canvas millimetres (design = canvas - centre)
  const raw = [];
  for (const s of traced.shapes) for (const ct of s.contours) raw.push(ct.map((p) => [p[0] / meta.pxPerMm, p[1] / meta.pxPerMm]));
  const centre = model.centreRings(raw);
  const rings = textlib.textRings(traced, meta.pxPerMm);
  const outDir = path.join(OUT, "typed", c.id);
  fs.mkdirSync(outDir, { recursive: true });
  const stats = {
    id: c.id, font: c.font, bold: c.bold, size: c.size, str: c.str, value: c.value,
    canvas: { w: meta.width, h: meta.height, pxPerMm: meta.pxPerMm }, ideal: { cx: centre.cx, cy: centre.cy },
    trace: { shapes: traced.shapes.length, rings: rings.length, points: rings.reduce((a, r) => a + r.length, 0), ms: tTrace },
    hooked: hook.plan && hook.engine,
  };
  fs.writeFileSync(path.join(outDir, "rings.json"), JSON.stringify(rings.map((r) => r.map((p) => [round3(p[0]), round3(p[1])]))));
  if (!rings.length) { stats.nothing = true; fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats)); return stats; }

  const text = { ...textlib.DEFAULT_TEXT, ...meta.text };
  const obj = model.makeObject({ name: "Text", kind: "text", rings, text, fill: { color: "#000000", type: "auto" }, transform: { x: 0, y: 0, sx: 1, sy: 1, rot: 0 } });
  const design = model.newDesign({ objects: [obj], hoop: { w: 400, h: 450 }, name: c.id });
  globalThis.__kindLog = [];
  const t1 = Date.now();
  const g = generate(model.engineDesign(design), JSON.parse(process.env.ENGINE_OPTS || "{}")); // (ENGINE_OPTS: engine options for an experiment, e.g. {"textLineBelow":0.6})
  stats.ms = { trace: tTrace, generate: Date.now() - t1 };
  const kindLog = globalThis.__kindLog; globalThis.__kindLog = null;

  const st = g.pattern.stitches;
  let stitches = 0, trims = 0, jumps = 0, changes = 0, thread = 0, px = null, py = null;
  for (const s of st) {
    if (s[2] === 0) { stitches++; if (px !== null) thread += Math.hypot(s[0] - px, s[1] - py) / 10; px = s[0]; py = s[1]; }
    else if (s[2] === 2) { trims++; px = null; } else if (s[2] === 1) { jumps++; px = null; } else if (s[2] === 3) { changes++; px = null; }
  }
  const info = g.info || [];
  const byKind = {};
  for (const i of info) { const o = (byKind[i.kind] ||= { islands: 0, area: 0 }); o.islands++; o.area += i.area || 0; }
  Object.assign(stats, {
    stitches, trims, jumps, colourChanges: changes, threadMm: round3(thread), runs: g.runs,
    islands: byKind, kinds: hook.plan && hook.engine ? summariseKinds(kindLog) : null,
    why: info.filter((i) => i.kind === "tatami" || i.kind === "none").map((i) => ({ kind: i.kind, area: round3(i.area), why: i.why })).slice(0, 12),
    warnings: (g.warnings || []).map((w) => ({ kind: w.kind, count: w.count || 1, message: w.message })),
    cloth: model.DEFAULT_CLOTH,
  });
  if (WANT_DST) fs.writeFileSync(path.join(outDir, "design.dst"), fmts.writePattern("dst", { name: "t", threads: g.pattern.threads, stitches: st }, { title: "t" }));
  const R = { pxPerMm: 8, marginMm: 2, threadMm: 0.45 };
  const cov = rasterizePattern(g.pattern, { ...R, background: [0, 0, 0, 0] }); // transparent: the alpha plane is how much thread covers each pixel
  const plane = new Uint8Array(cov.width * cov.height);
  for (let i = 0; i < plane.length; i++) plane[i] = cov.data[i * 4 + 3];
  fs.writeFileSync(path.join(outDir, "cover.u8"), plane);
  stats.render = { width: cov.width, height: cov.height, originX: cov.originX, originY: cov.originY, pxPerMm: cov.pxPerMm };
  if (WANT_PNG) {
    const bg = hex2rgb(model.DEFAULT_CLOTH);
    const img = rasterizePattern(g.pattern, { ...R, background: [bg[0], bg[1], bg[2], 255] });
    await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } }).png().toFile(path.join(outDir, "render.png"));
  }
  fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats));
  return stats;
}

fs.mkdirSync(path.join(OUT, "typed"), { recursive: true });
fs.writeFileSync(path.join(OUT, "lib.txt"), `${LIB}\nhooked: plan=${hook.plan} engine=${hook.engine}\n`);
let done = 0, failed = 0;
const t0 = Date.now();
for (const c of cells) {
  try {
    const s = await runCell(c);
    done++;
    if (cells.length <= 12) console.log(`${c.id}: ${s.nothing ? "NOTHING TO STITCH" : `${s.stitches} st, ${s.trims} trims, ${s.jumps} jumps, ${JSON.stringify(s.islands)}`}`);
  } catch (e) {
    failed++;
    console.log(`${c.id}: FAILED ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
  }
}
console.log(`typed: ${done} cells done, ${failed} failed, ${((Date.now() - t0) / 1000).toFixed(1)} s  (lib ${LIB}; hook plan=${hook.plan} engine=${hook.engine})`);
