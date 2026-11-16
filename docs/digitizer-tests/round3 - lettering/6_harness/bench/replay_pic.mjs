// A picture of lettering, converted the way the page does it with NO person path (people off): trace -> objectsFromTrace -> generate. Same calls as faces/replay.mjs
// (which the earlier work checked against the real page), plus the stitch-type counters of hooks.mjs.
//
// usage: node replay_pic.mjs --lib <app/lib> --out <dir> --items reg18/crest_manzanares,new55/text_serif_sign_st_xavier,chart2/chart
//          [--width px10] [--detail 0.75] [--png 1] [--dst 1]
// a picture is looked up in text/cache/<set>/<name> first, then faces/cache/<set>/<name> (image.rgba + meta.json: the pixels the page's canvas gave)
// writes <out>/pics/<set>__<name>/{stats.json, render.png, design.dst}
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
const ITEMS = opt("items");
const WIDTH = opt("width", "px10");
const DETAIL = Number(opt("detail", "0.75"));
const WANT_PNG = opt("png", "1") !== "0";
const WANT_DST = opt("dst", "1") !== "0";
if (!LIB || !OUT || !ITEMS) throw new Error("--lib, --out and --items are required");

const hook = installKindHook();
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const model = await imp("digitizer/model.js");
const { generate } = await imp("embroidery/stitch/engine.js");
const fmts = await imp("embroidery/formats/index.js");
const { rasterizePattern } = await imp("embroidery/stitch/raster.js");

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const round3 = (x) => Math.round(x * 1000) / 1000;
const find = (set, name) => [path.join(HERE, "cache", set, name), path.join(HERE, "..", "faces", "cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));

async function runOne(item) {
  const [set, name] = item.split("/");
  const dir = find(set, name);
  if (!dir) throw new Error(`no cached picture for ${item}`);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const wMm = WIDTH === "px10" ? meta.width / 10 : Number(WIDTH);
  const mmPerPx = wMm / image.width;
  const hMm = image.height * mmPerPx;
  const settings = { ...conv.CONVERT_DEFAULTS, detail: DETAIL, people: false, background: "auto" };
  const t0 = Date.now();
  const traced = traceImage(image, conv.traceOptions(settings, mmPerPx));
  const tTrace = Date.now() - t0;
  const fabric = conv.clothFromTrace(traced) || model.DEFAULT_CLOTH;
  const finderOpts = process.env.FINDER_OPTS ? Object.fromEntries(process.env.FINDER_OPTS.split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, Number(v)])) : null; // FINDER_OPTS=k=v,...: options of the lettering finder
  const res = conv.objectsFromTrace(traced, { originX: -wMm / 2, originY: -hMm / 2, mmPerPx, fabric, maxColors: 12, detailThick: false, letteringOptions: finderOpts });
  const design = model.newDesign({ objects: res.objects, fabricColor: fabric, hoop: { w: 450, h: 450 }, name });
  globalThis.__kindLog = [];
  const t1 = Date.now();
  const g = generate(model.engineDesign(design), JSON.parse(process.env.ENGINE_OPTS || "{}")); // (ENGINE_OPTS: engine options for an experiment)
  const tGen = Date.now() - t1;
  const kindLog = globalThis.__kindLog; globalThis.__kindLog = null;
  const st = g.pattern.stitches;
  let stitches = 0, trims = 0, jumps = 0, changes = 0;
  for (const s of st) { if (s[2] === 0) stitches++; else if (s[2] === 2) trims++; else if (s[2] === 1) jumps++; else if (s[2] === 3) changes++; }
  const info = g.info || [];
  const byKind = {};
  for (const i of info) { const o = (byKind[i.kind] ||= { islands: 0, area: 0 }); o.islands++; o.area += i.area || 0; }
  const outDir = path.join(OUT, "pics", `${set}__${name}`);
  fs.mkdirSync(outDir, { recursive: true });
  if (WANT_DST) fs.writeFileSync(path.join(outDir, "design.dst"), fmts.writePattern("dst", { name: "t", threads: g.pattern.threads, stitches: st }, { title: "t" }));
  const bg = hex2rgb(fabric);
  const img = rasterizePattern(g.pattern, { pxPerMm: 8, marginMm: 2, threadMm: 0.45, background: [bg[0], bg[1], bg[2], 255] });
  if (WANT_PNG) await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } }).png().toFile(path.join(outDir, "render.png"));
  const stats = {
    item, set, name, widthMm: wMm, heightMm: hMm, mmPerPx, imageW: image.width, imageH: image.height, kind: traced.stats?.kind,
    stitches, trims, jumps, colourChanges: changes, objects: res.objects.length, runs: g.runs, cloth: fabric,
    islands: byKind, kinds: hook.plan && hook.engine ? summariseKinds(kindLog) : null,
    warnings: (g.warnings || []).map((w) => ({ kind: w.kind, count: w.count || 1, message: w.message })),
    render: { width: img.width, height: img.height, originX: img.originX, originY: img.originY, pxPerMm: img.pxPerMm },
    source: { originX: -wMm / 2, originY: -hMm / 2 },
    ms: { trace: tTrace, generate: tGen, total: Date.now() - t0 },
  };
  fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats));
  return stats;
}

fs.mkdirSync(path.join(OUT, "pics"), { recursive: true });
let done = 0, failed = 0;
for (const item of ITEMS.split(",")) {
  try {
    const s = await runOne(item);
    done++;
    console.log(`${item}: ${s.kind} ${s.stitches} st, ${s.trims} trims, ${s.objects} obj, ${JSON.stringify(s.islands)}, ${s.ms.total} ms`);
  } catch (e) {
    failed++;
    console.log(`${item}: FAILED ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
  }
}
console.log(`pics: ${done} done, ${failed} failed  (lib ${LIB}; hook plan=${hook.plan} engine=${hook.engine})`);


