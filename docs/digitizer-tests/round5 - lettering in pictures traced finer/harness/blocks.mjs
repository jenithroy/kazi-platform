import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const LIB = "<REPO>/app/lib";
const HERE = "<SESSION>/scratchpad";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const ids = process.argv.slice(2);
for (const id of ids) {
  const dir = path.join(HERE, "text/cache/lpics", id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  for (const refine of [false, true]) {
    const t = traceImage(image, { ...conv.traceOptions(settings, 0.1), refineLettering: refine });
    const bl = t.lettering.blocks;
    console.log(id.padEnd(26), "refine", String(refine).padEnd(5), "shapes", t.shapes.length, "blocks", bl.length, bl.map((b) => `n=${b.count} cap=${b.capMm.toFixed(1)} stroke=${b.strokeMm.toFixed(2)}`).join(" | "), "| refine:", JSON.stringify(t.stats.refine || null));
  }
}
