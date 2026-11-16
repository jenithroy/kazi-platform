import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const LIB = "<REPO>/app/lib";
const HERE = "<SESSION>/scratchpad";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const item = process.argv[2];
const [set, name] = item.split("/");
const dir = [path.join(HERE, "text/cache", set, name), path.join(HERE, "faces/cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));
const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
const raw = fs.readFileSync(path.join(dir, "image.rgba"));
const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
const mmPerPx = (meta.width / 10) / image.width;
const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
const base = conv.traceOptions(settings, mmPerPx);
for (const refine of [false, true]) {
  const t = traceImage(image, { ...base, refineLettering: refine });
  const by = new Map();
  for (const s of t.shapes) { const k = t.palette[s.color]; const key = `${k.hex}${k.background ? " bg" : ""}${k.enclosedBackground ? " encl" : ""}`; const e = by.get(key) || { n: 0, tiny: 0, area: 0 }; e.n++; e.area += s.area * mmPerPx * mmPerPx; if (s.area * mmPerPx * mmPerPx < 0.3) e.tiny++; by.set(key, e); }
  console.log(`refine ${refine}: shapes ${t.shapes.length}`, JSON.stringify(t.stats.refine || null));
  console.log("   ", [...by].map(([k, e]) => `${k}: ${e.n} (${e.tiny} under 0.3 mm2, ${e.area.toFixed(0)} mm2)`).join(" | "));
}
