// Replays the page's conversion in Node on captured inputs (cache/<set>/<name>: image.rgba, probs.f32, landmarks.json, hair.f32, meta.json).
// The same calls the page makes (useDigitizer.runConvert): first trace; if the picture is a photo and people are looked for, the person model's
// maps are refined (segment.js refineFromProbs) and the picture is traced again with them; then objectsFromTrace, generate.
//
// usage: node replay.mjs --set reg18 --out <dir> [--lib <app/lib>] [--names a,b | all] [--people on|off] [--background auto|none]
//          [--width px10|<mm>] [--detail 0.75] [--faces on|off] [--hair on|off] [--png 1] [--dst 1] [--settings '{"colors":8}']
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const FACES = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const LIB = opt("lib", "<REPO>/app/lib");
const SET = opt("set", "reg18");
const OUT = opt("out");
const NAMES = opt("names", "all");
const PEOPLE = opt("people", "on") !== "off";
const BACKGROUND = opt("background", "auto");
const WIDTH = opt("width", "px10");
const DETAIL = Number(opt("detail", "0.75"));
const FACES_ON = opt("faces", "on") !== "off";
const HAIR_ON = opt("hair", "off") === "on";
const ANCHORS_ON = opt("anchors", "on") !== "off"; // the white of the eyes and of the teeth measured on the picture (faces.js featureAnchors), when the library has it
const ANCHOR_KINDS = opt("anchor-kinds", "sclera,teeth").split(","); // which of them to use (for experiments)
const WANT_PNG = opt("png", "1") !== "0";
const WANT_DST = opt("dst", "1") !== "0";
const EXTRA = JSON.parse(opt("settings", "{}"));
const TRACE_EXTRA = JSON.parse(opt("trace", "{}")); // extra tracer options for experiments, e.g. '{"regionAreaPower":0.7}'
if (!OUT) throw new Error("--out is required");

const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");

const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const model = await imp("digitizer/model.js");
const { generate } = await imp("embroidery/stitch/engine.js");
const fmts = await imp("embroidery/formats/index.js");
const { rasterizePattern } = await imp("embroidery/stitch/raster.js");
const seg = await imp("digitizer/segment.js");
let facesLib = null;
if (fs.existsSync(path.join(LIB, "digitizer/faces.js"))) facesLib = await imp("digitizer/faces.js");

const CACHE = path.join(FACES, "cache", SET);
const names = NAMES === "all" ? fs.readdirSync(CACHE).filter((n) => fs.existsSync(path.join(CACHE, n, "image.rgba"))).sort() : NAMES.split(",");
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function readF32(file) { const b = fs.readFileSync(file); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); }

async function runOne(name) {
  const dir = path.join(CACHE, name);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const wMm = WIDTH === "px10" ? meta.width / 10 : Number(WIDTH);
  const mmPerPx = wMm / image.width;
  const hMm = image.height * mmPerPx;
  const settings = { ...conv.CONVERT_DEFAULTS, detail: DETAIL, people: PEOPLE, background: BACKGROUND, ...EXTRA };
  const t0 = Date.now();
  const stage = {};
  let traced = traceImage(image, conv.traceOptions(settings, mmPerPx));
  stage.trace1 = Date.now() - t0;
  let person = null, faceInfo = null, anchors = [];
  const lookForPerson = settings.people !== false && settings.background !== "none" && (settings.kind === "auto" || settings.kind === "photo");
  const hasAlpha = (() => { let c = 0; for (let i = 3; i < image.data.length; i += 16) if (image.data[i] < 250) c++; return c * 4 >= Math.max(1, (image.data.length / 4) * 0.0005); })();
  if (lookForPerson && !hasAlpha && traced.stats?.kind === "photo" && fs.existsSync(path.join(dir, "probs.f32"))) {
    const probs = readF32(path.join(dir, "probs.f32"));
    const n = meta.seg.w * meta.seg.h;
    const maps = []; for (let c = 0; c < 6; c++) maps.push(probs.subarray(c * n, (c + 1) * n));
    const refined = seg.refineFromProbs({ width: image.width, height: image.height, data: image.data }, { w: meta.seg.w, h: meta.seg.h, probs: maps }, {});
    person = { person: refined.person, share: refined.share, faceBox: refined.faceBox, faceShare: refined.faceShare, faceConf: refined.faceConf };
    fs.mkdirSync(path.join(OUT, SET, name), { recursive: true });
    // (classes.u8 is written again below with the facial features painted in, when there are any)
    fs.writeFileSync(path.join(OUT, SET, name, "classes.u8"), refined.classes);
    if (refined.person) {
      let classes = refined.classes;
      const o = conv.traceOptions(settings, mmPerPx);
      // the face landmarks / hair mask hooks (the modified library offers them; the baseline has no faces.js and ignores these)
      if (facesLib && HAIR_ON && facesLib.mergeHair && fs.existsSync(path.join(dir, "hair.f32"))) {
        const hair = readF32(path.join(dir, "hair.f32"));
        classes = facesLib.mergeHair(classes, image.width, image.height, hair, meta.hair.w, meta.hair.h);
      }
      if (facesLib && FACES_ON && facesLib.mainFaces && fs.existsSync(path.join(dir, "landmarks.json"))) {
        const lm = JSON.parse(fs.readFileSync(path.join(dir, "landmarks.json"), "utf8"));
        const fl = facesLib.mainFaces(lm, image.width, image.height);
        if (fl.length) {
          const painted = facesLib.paintFeatureClasses(classes, image.width, image.height, fl, { mmPerPx });
          classes = painted.classes;
          faceInfo = { faces: fl.map((p) => facesLib.faceMeasures(p, mmPerPx)), featurePx: painted.featurePx, lipPx: painted.lipPx, reclaimedPx: painted.reclaimedPx || 0 };
          if (ANCHORS_ON && facesLib.featureAnchors) { anchors = facesLib.featureAnchors(image, fl).filter((a) => ANCHOR_KINDS.includes(a.kind)); faceInfo.anchors = anchors; }
        }
      }
      const found = { regions: { width: image.width, height: image.height, data: classes }, share: refined.share, faceBox: refined.faceBox };
      const t1 = Date.now();
      traced = traceImage(image, { ...o, ...TRACE_EXTRA, regions: found.regions, ...(anchors.length ? { regionAnchors: anchors } : {}) });
      stage.trace2 = Date.now() - t1;
    }
  }
  const fabric = conv.clothFromTrace(traced) || model.DEFAULT_CLOTH;
  const t2 = Date.now();
  const res = conv.objectsFromTrace(traced, { originX: -wMm / 2, originY: -hMm / 2, mmPerPx, fabric, maxColors: 12, detailThick: false });
  const design = model.newDesign({ objects: res.objects, fabricColor: fabric, name });
  stage.convert = Date.now() - t2;
  const t3 = Date.now();
  const g = generate(model.engineDesign(design), {});
  stage.generate = Date.now() - t3;
  const st = g.pattern.stitches;
  let stitches = 0, trims = 0, jumps = 0, changes = 0;
  for (const s of st) { if (s[2] === 0) stitches++; else if (s[2] === 2) trims++; else if (s[2] === 1) jumps++; else if (s[2] === 3) changes++; }
  const outDir = path.join(OUT, SET, name);
  fs.mkdirSync(outDir, { recursive: true });
  if (WANT_DST) fs.writeFileSync(path.join(outDir, "design.dst"), fmts.writePattern("dst", { name: "t", threads: g.pattern.threads, stitches: st }, { title: "t" }));
  let renderInfo = null;
  if (WANT_PNG) {
    const bg = hex2rgb(fabric);
    const img = rasterizePattern(g.pattern, { pxPerMm: 8, marginMm: 2, threadMm: 0.45, background: [bg[0], bg[1], bg[2], 255] });
    await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } }).png().toFile(path.join(outDir, "render.png"));
    renderInfo = { width: img.width, height: img.height, originX: img.originX, originY: img.originY, pxPerMm: img.pxPerMm };
  }
  const stats = {
    name, set: SET, widthMm: wMm, heightMm: hMm, mmPerPx, imageW: image.width, imageH: image.height,
    kind: traced.stats?.kind, personFound: !!person?.person, person, tracePerson: traced.stats?.person ?? null, regionColours: traced.stats?.regionColours ?? null,
    stitches, trims, jumps, colourChanges: changes, objects: res.objects.length, palette: res.palette.filter((p) => !p.skipped).map((p) => p.hex || p.color || null),
    threads: g.pattern.threads.map((t) => [t.r, t.g, t.b]), cloth: fabric, warnings: (g.warnings || []).length,
    faces: faceInfo || null, render: renderInfo, ms: { ...stage, total: Date.now() - t0 },
  };
  fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats));
  return stats;
}

for (const name of names) {
  try {
    const s = await runOne(name);
    console.log(`${name}: ${s.kind}${s.personFound ? "+person" : ""} ${s.stitches} st, ${s.trims} trims, ${s.threads.length} threads, ${s.objects} obj, ${s.ms.total} ms` + (s.regionColours ? " alloc " + JSON.stringify(s.regionColours) : ""));
  } catch (e) {
    console.log(`${name}: FAILED ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
  }
}
