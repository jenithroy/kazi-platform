import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const LIB = "<REPO>/app/lib";
const HERE = "<SESSION>/scratchpad";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
for (const item of process.argv.slice(2)) {
  const [set, name] = item.split("/");
  const dir = [path.join(HERE, "text/cache", set, name), path.join(HERE, "faces/cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const mmPerPx = (meta.width / 10) / image.width;
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  const base = conv.traceOptions(settings, mmPerPx);
  const t0 = Date.now(); const a = traceImage(image, { ...base, refineLettering: false }); const t1 = Date.now() - t0;
  const t2 = Date.now(); const b = traceImage(image, base); const t3 = Date.now() - t2;
  console.log(item.padEnd(40), `off ${String(t1).padStart(5)} ms (${a.shapes.length} shapes)   on ${String(t3).padStart(5)} ms (${b.shapes.length} shapes)  ${JSON.stringify(b.stats.refine || null)}`);
}
