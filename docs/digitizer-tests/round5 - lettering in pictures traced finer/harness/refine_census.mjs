// How often is the second tracing used, refused or not tried, over a set of pictures?  usage: node refine_census.mjs <cache dir with lpics/>
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const LIB = "<REPO>/app/lib";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const root = process.argv[2];
const dir = path.join(root, "lpics");
const tally = { used: 0, refused: 0, none: 0 };
const why = new Map();
const refusedIds = [];
let ms0 = 0, ms1 = 0;
for (const id of fs.readdirSync(dir).filter((n) => /^(line|badge|outline)_/.test(n))) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, id, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, id, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  const t = traceImage(image, conv.traceOptions(settings, 0.1));
  const r = t.stats.refine;
  if (!r) tally.none++; else if (r.used) tally.used++; else { tally.refused++; refusedIds.push(id); why.set(r.why, (why.get(r.why) || 0) + 1); }
}
console.log(root.split("/").pop(), JSON.stringify(tally), [...why].map(([k, v]) => `${v}x ${k}`).join("; "), refusedIds.length ? "refused: " + refusedIds.slice(0, 12).join(", ") : "");
