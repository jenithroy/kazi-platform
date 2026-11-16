// What does the lettering finder make of every shape in a region of a picture?  usage: node piece_dump.mjs set/name x0,y0,x1,y1   (pixels of the cached picture)
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = process.env.LIB || "<REPO>/app/lib";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const { describePiece } = await imp("embroidery/trace/lettering.js");
const conv = await imp("digitizer/convert.js");
const [item, region] = process.argv.slice(2);
const [set, name] = item.split("/");
const dir = [path.join(HERE, "cache", set, name), path.join(HERE, "..", "faces", "cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));
const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
const raw = fs.readFileSync(path.join(dir, "image.rgba"));
const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
const mmPerPx = meta.width / 10 / image.width;
const traced = traceImage(image, conv.traceOptions({ ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" }, mmPerPx));
const [rx0, ry0, rx1, ry1] = region.split(",").map(Number);
let n = 0;
for (const s of traced.shapes) {
  const cx = (s.bbox[0] + s.bbox[2]) / 2, cy = (s.bbox[1] + s.bbox[3]) / 2;
  if (cx < rx0 || cx > rx1 || cy < ry0 || cy > ry1) continue;
  const d = describePiece(s, mmPerPx);
  n++;
  console.log(`#${s.id} col ${s.color} box [${s.bbox.map(Math.round)}] size ${d.sizeMm.toFixed(1)} area ${d.areaMm2.toFixed(2)} stroke ${d.strokeMm.toFixed(2)} ratio ${d.ratio.toFixed(2)} steady ${d.steady == null ? "-" : d.steady.toFixed(2)} holes ${d.holes} compact ${d.compact.toFixed(0)} -> ${d.ok ? "LETTER-SHAPED" : d.why}`);
}
console.log(n, "shapes in the region;", traced.palette.map((p, i) => `${i}:#${[p.r, p.g, p.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}${p.background ? "(bg)" : ""}`).join(" "));
