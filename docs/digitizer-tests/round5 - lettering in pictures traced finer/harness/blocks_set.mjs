// What the finder and the second tracing do on a set of pictures: how many have a block found, refined, refused.  usage: node blocks_set.mjs <set> [maxPrint]
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const LIB = "<REPO>/app/lib";
const HERE = "<SESSION>/scratchpad/text";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const set = process.argv[2];
const dir = path.join(HERE, "cache", set);
const man = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const tally = { refined: 0, refused: 0, none: 0 };
const bySize = {};
const nones = [];
for (const m of man) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, m.id, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, m.id, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  const t = traceImage(image, conv.traceOptions(settings, 0.1));
  const r = t.stats.refine;
  const k = !r ? "none" : r.used ? "refined" : "refused";
  tally[k]++;
  const key = `${m.size}mm`; bySize[key] = bySize[key] || { refined: 0, refused: 0, none: 0 }; bySize[key][k]++;
  if (k === "none") nones.push(`${m.id.replace(/^(xf|sw)_/, "")}[blocks ${t.lettering.blocks.map((b) => `L${b.letters}`).join("+") || "-"}]`);
}
console.log(set, JSON.stringify(tally), JSON.stringify(bySize));
console.log("not refined:", nones.slice(0, Number(process.argv[3] || 40)).join(", "));
