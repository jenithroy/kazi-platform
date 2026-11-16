// Which objects of a picture does the lettering finder mark as letters, and where (mm, in the picture's frame)? usage: node letters_probe.mjs <set/name> [<set/name> ...]
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = "<REPO>/app/lib";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const model = await imp("digitizer/model.js");
const find = (set, name) => [path.join(HERE, "cache", set, name), path.join(HERE, "..", "faces", "cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));
for (const item of process.argv.slice(2)) {
  const [set, name] = item.split("/");
  const dir = find(set, name);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
  const wMm = meta.width / 10, mmPerPx = wMm / image.width, hMm = image.height * mmPerPx;
  const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
  const traced = traceImage(image, conv.traceOptions(settings, mmPerPx));
  const fabric = conv.clothFromTrace(traced) || model.DEFAULT_CLOTH;
  const res = conv.objectsFromTrace(traced, { originX: -wMm / 2, originY: -hMm / 2, mmPerPx, fabric, maxColors: 12, detailThick: false });
  const blocks = {};
  for (const o of res.objects) {
    if (!o.letters) continue;
    const b = (blocks[o.letters.block] ||= { n: 0, cap: o.letters.cap, stroke: o.letters.stroke, x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, colour: o.fill && o.fill.color });
    b.n++;
    for (const r of o.rings) for (const p of r) { b.x0 = Math.min(b.x0, p[0] + wMm / 2); b.x1 = Math.max(b.x1, p[0] + wMm / 2); b.y0 = Math.min(b.y0, p[1] + hMm / 2); b.y1 = Math.max(b.y1, p[1] + hMm / 2); }
  }
  console.log(`${item}: ${res.objects.length} objects, picture ${wMm.toFixed(0)} x ${hMm.toFixed(0)} mm, kind ${traced.stats && traced.stats.kind}`);
  for (const [k, b] of Object.entries(blocks)) console.log(`   block ${k}: ${b.n} letters, cap ${b.cap} mm, stroke ${b.stroke} mm, ${b.colour}, box x ${b.x0.toFixed(1)}..${b.x1.toFixed(1)} y ${b.y0.toFixed(1)}..${b.y1.toFixed(1)} mm`);
}
