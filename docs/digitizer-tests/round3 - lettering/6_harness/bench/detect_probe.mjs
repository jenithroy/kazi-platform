// Where does the lettering finder (trace/lettering.js) see lettering in a picture? Traces each cached picture the way the page does with no person path, runs the finder
// and draws a box round every piece it takes for a letter (a colour per run).
// usage: node detect_probe.mjs --lib <app/lib> --out <dir> --items set/name,set/name | --all  [--width px10] [--detail 0.75] [--png 1]
// writes <out>/<set>__<name>.png and <out>/detect.json ({ item: { kind, shapes, runs: [{ count, strokeMm, capMm }], tagged } })
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const LIB = opt("lib", "<REPO>/app/lib");
const OUT = opt("out");
let ITEMS = opt("items", "");
const WIDTH = opt("width", "px10");
const DETAIL = Number(opt("detail", "0.75"));
const WANT_PNG = opt("png", "1") !== "0";
const FOPTS = opt("opts", "") ? Object.fromEntries(opt("opts", "").split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, Number(v)])) : null; // --opts minLetters=5,maxSizeMm=14
const TEXTY = new Set(["chart2/chart", "reg18/crest_manzanares", "new55/emblems_seal_torrance_bw", "new55/emblems_logo_sdl", "new55/emblems_flag_washington_island", "new55/text_sans_sign_medstead", "new55/text_serif_sign_st_xavier", "new55/text_devanagari_nepali_plaque", "new55/text_kufic_calligraphy_folio", "reg18/emblem_nepal", "new55/lineart_bellin_ionian_sea_map", "reg18/logo_harley"]); // pictures that contain lettering
if (!OUT) throw new Error("--out is required");
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const { traceImage } = await imp("embroidery/trace/index.js");
const { findLettering } = await imp("embroidery/trace/lettering.js");
const conv = await imp("digitizer/convert.js");

const dirsOf = (set) => { const d = [path.join(HERE, "cache", set), path.join(HERE, "..", "faces", "cache", set)].find((p) => fs.existsSync(p)); return d ? fs.readdirSync(d).map((n) => `${set}/${n}`) : []; };
if (opt("set")) ITEMS = dirsOf(opt("set")).join(",");
if (argv.includes("--all")) ITEMS = [...dirsOf("reg18"), ...dirsOf("new55"), "chart2/chart"].join(",");
const find = (set, name) => [path.join(HERE, "cache", set, name), path.join(HERE, "..", "faces", "cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));
const PALETTE = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#008080", "#f032e6", "#9a6324", "#800000", "#808000"];

fs.mkdirSync(OUT, { recursive: true });
const summary = {};
for (const item of ITEMS.split(",").filter(Boolean)) {
  const [set, name] = item.split("/");
  const dir = find(set, name);
  if (!dir) { console.log("missing", item); continue; }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const wMm = WIDTH === "px10" ? meta.width / 10 : Number(WIDTH);
  const mmPerPx = wMm / image.width;
  const settings = { ...conv.CONVERT_DEFAULTS, detail: DETAIL, people: false, background: "auto" };
  const t0 = Date.now();
  // the trace is the slow part and does not depend on the finder: keep it (shapes, palette, kind) between runs
  const cacheFile = path.join(HERE, "..", "text2", "shapes", `${set}__${name}.json`);
  let traced;
  if (fs.existsSync(cacheFile)) traced = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  else {
    traced = traceImage(image, conv.traceOptions(settings, mmPerPx));
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify({ shapes: traced.shapes, palette: traced.palette, stats: { kind: traced.stats.kind } }));
  }
  const t1 = Date.now();
  const runs = findLettering(traced.shapes, { mmPerPx, debug: true, options: FOPTS });
  const t2 = Date.now();
  const tagged = runs.reduce((a, r) => a + r.count, 0);
  let expected = null;
  if (set === "lpics") { const m = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")); expected = m.spec.texts.reduce((a, t) => a + [...t.value].filter((c) => c !== " ").length, 0); }
  summary[item] = { expected, kind: traced.stats.kind, shapes: traced.shapes.length, runs: runs.map((r) => ({ count: r.count, strokeMm: +r.strokeMm.toFixed(2), capMm: +r.capMm.toFixed(1), kinds: r.kinds, straight: +r.straight.toFixed(2), steady: +r.steadyMedian.toFixed(2), box: r.box.map(Math.round) })), tagged, msTrace: t1 - t0, msFind: t2 - t1 };
  console.log(`${item}: ${traced.stats.kind} ${traced.shapes.length} shapes -> ${runs.length} runs, ${tagged} letters  [${runs.slice(0, 6).map((r) => `${r.count}x ${r.capMm.toFixed(1)}mm/${r.strokeMm.toFixed(2)}`).join(", ")}]  find ${t2 - t1} ms`);
  if (WANT_PNG && runs.length) {
    const byId = new Map(traced.shapes.map((s) => [s.id, s]));
    const rects = [];
    runs.forEach((r, k) => {
      const col = PALETTE[k % PALETTE.length];
      for (const id of r.shapes) { const [x0, y0, x1, y1] = byId.get(id).bbox; rects.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${col}" stroke-width="${Math.max(1.5, meta.width / 500)}"/>`); }
    });
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${rects.join("")}</svg>`);
    await sharp(raw, { raw: { width: meta.width, height: meta.height, channels: 4 } }).flatten({ background: "#ffffff" }).composite([{ input: svg }]).png().toFile(path.join(OUT, `${set}__${name}.png`));
  }
}
fs.writeFileSync(path.join(OUT, "detect.json"), JSON.stringify(summary, null, 1));
const all = Object.entries(summary);
const fp = all.filter(([k, s]) => !TEXTY.has(k) && s.runs.length), fpNP = fp.filter(([, s]) => s.kind !== "photo");
console.log(`\nwithout lettering but with runs: ${fp.length} pictures (${fpNP.length} of them logo/art: ${fpNP.map(([k]) => k.split("/")[1]).join(", ")}); with lettering and found: ${all.filter(([k, s]) => TEXTY.has(k) && s.runs.length).length} of ${all.filter(([k]) => TEXTY.has(k)).length}`);
console.log(`${all.length} pictures, ${all.filter(([, s]) => s.runs.length).length} with lettering found, ${all.reduce((a, [, s]) => a + s.tagged, 0)} letters in ${all.reduce((a, [, s]) => a + s.runs.length, 0)} runs`);




