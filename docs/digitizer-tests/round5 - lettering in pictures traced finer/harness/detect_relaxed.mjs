// Would lettering be found more reliably on a FINER tracing (the cleaning relaxed everywhere, only to look for lettering)? For each picture: blocks found on the normal first tracing against blocks found on a relaxed one.
// usage: node detect_relaxed.mjs <set dir under text/cache or faces/cache: lpicss | lpicsx | lpics | real>
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const LIB = "<REPO>/app/lib";
const HERE = "<SESSION>/scratchpad";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const { findLettering } = await imp("embroidery/trace/lettering.js");
const conv = await imp("digitizer/convert.js");
const which = process.argv[2];
let items = [];
if (which === "real") { for (const s of ["reg18", "new55"]) for (const n of fs.readdirSync(path.join(HERE, "faces/cache", s))) items.push([`${s}/${n}`, path.join(HERE, "faces/cache", s, n)]); }
else { const d = path.join(HERE, "text/cache", which); for (const n of fs.readdirSync(d)) if (fs.existsSync(path.join(d, n, "image.rgba"))) items.push([n, path.join(d, n)]); }
let a = 0, b = 0, gainOnly = 0, lost = 0, n = 0, relaxedMs = 0;
const gains = [], extras = [];
for (const [name, dir] of items) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const mmPerPx = 100 / meta.width;
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  const base = { ...conv.traceOptions(settings, mmPerPx), refineLettering: false };
  let t1, t2;
  try { t1 = traceImage(image, base); } catch { continue; }
  if (t1.stats.kind === "photo" || t1.stats.kind === "art") continue;
  const t0 = Date.now();
  t2 = traceImage(image, { ...base, minFeatureMm: 0.12, minAreaMm2: 0.03, simplifyMm: 0.02 });
  relaxedMs += Date.now() - t0;
  n++;
  const opt = { minLetters: 5, shortLetters: 3, shortMaxPieces: 24 };
  const f1 = findLettering(t1.shapes, { mmPerPx, options: opt }), f2 = findLettering(t2.shapes, { mmPerPx, options: opt });
  const L1 = f1.reduce((s, x) => s + x.letters, 0), L2 = f2.reduce((s, x) => s + x.letters, 0);
  if (f1.length) a++; if (f2.length) b++;
  if (!f1.length && f2.length) { gainOnly++; gains.push(`${name}[L${f2.map((x) => x.letters).join("+")} cap ${f2[0].capMm.toFixed(1)}]`); }
  if (f1.length && !f2.length) { lost++; extras.push(`${name} LOST`); }
  else if (L2 > L1 + 2 && f1.length) extras.push(`${name}: ${L1} -> ${L2} letters`);
}
console.log(`${which}: ${n} pictures (logo kind); lettering found on the normal tracing in ${a}, on the relaxed one in ${b}; only on the relaxed one in ${gainOnly}; lost on the relaxed one in ${lost}; mean relaxed tracing ${(relaxedMs / Math.max(1, n)).toFixed(0)} ms`);
console.log("gained:", gains.slice(0, 40).join(", "));
console.log("other changes:", extras.slice(0, 20).join("; "));
