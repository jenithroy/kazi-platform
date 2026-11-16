// What the lettering finder says with a lower minimum: blocks of 3-4 letters (which it rejects today) on the real pictures and on the pictures that are NOT text (patterns).
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const LIB = "<REPO>/app/lib";
const HERE = "<SESSION>/scratchpad";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const { findLettering } = await imp("embroidery/trace/lettering.js");
const conv = await imp("digitizer/convert.js");
const items = [];
for (const s of ["reg18", "new55"]) for (const n of fs.readdirSync(path.join(HERE, "faces/cache", s))) items.push([s, n, path.join(HERE, "faces/cache", s, n), 0]);
for (const n of fs.readdirSync(path.join(HERE, "text/cache/lpics"))) if (/^(pat|mix|arc)_/.test(n)) items.push(["lpics", n, path.join(HERE, "text/cache/lpics", n), 1]);
const MIN = Number(process.argv[2] || 3);
let withNew = 0, total = 0;
for (const [set, name, dir, tenPx] of items) {
  if (!fs.existsSync(path.join(dir, "image.rgba"))) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const mmPerPx = 0.1 * 1000 / meta.width; // 100 mm wide, as the benches do
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  let t;
  try { t = traceImage(image, { ...conv.traceOptions(settings, mmPerPx), refineLettering: false }); } catch (e) { continue; }
  total++;
  if (t.stats.kind === "photo") continue;
  const five = findLettering(t.shapes, { mmPerPx, options: { minLetters: t.stats.kind === "art" ? 9 : 5 } });
  const low = findLettering(t.shapes, { mmPerPx, options: { minLetters: MIN } });
  const extra = low.filter((b) => !five.some((f) => Math.hypot((f.box[0] + f.box[2]) / 2 - (b.box[0] + b.box[2]) / 2, (f.box[1] + f.box[3]) / 2 - (b.box[1] + b.box[3]) / 2) < 0.5 * Math.max(f.box[2] - f.box[0], b.box[2] - b.box[0], 1)));
  if (extra.length) { withNew++; console.log(`${set}/${name}`.padEnd(48), t.stats.kind.padEnd(5), `five-rule blocks ${five.length}`, "| new:", extra.map((b) => `L${b.letters}/p${b.count} cap ${b.capMm.toFixed(1)} st ${b.strokeMm.toFixed(2)}`).join("; ")); }
}
console.log(`\nminLetters ${MIN}: ${withNew} of ${total} pictures get at least one block the five-rule does not find`);
