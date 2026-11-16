// Draw the lettering blocks the tracer finds on the picture: usage: node show_blocks.mjs <set/name> <out.png> [refine on|off]
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const LIB = "<REPO>/app/lib";
const HERE = "<SESSION>/scratchpad";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const [item, outPng, refine = "off"] = process.argv.slice(2);
const [set, name] = item.split("/");
const dir = [path.join(HERE, "text/cache", set, name), path.join(HERE, "faces/cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));
const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
const raw = fs.readFileSync(path.join(dir, "image.rgba"));
const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
const mmPerPx = 0.1; // the benches: 10 px to the millimetre
const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" };
const t = traceImage(image, { ...conv.traceOptions(settings, mmPerPx), refineLettering: refine === "on" });
const W = meta.width, H = meta.height;
const buf = Buffer.from(raw);
const rect = (x0, y0, x1, y1, col) => { for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) for (const y of [Math.floor(y0), Math.floor(y1)]) if (y >= 0 && y < H) { const o = (y * W + x) * 4; buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; } for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++) for (const x of [Math.floor(x0), Math.floor(x1)]) if (x >= 0 && x < W) { const o = (y * W + x) * 4; buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; } };
console.log(item, t.stats.kind, "blocks:");
t.lettering.blocks.forEach((b, i) => { console.log("  ", i, `L${b.letters}/p${b.count} cap ${b.capMm.toFixed(1)} st ${b.strokeMm.toFixed(2)} box ${b.box.map((v) => Math.round(v)).join(",")}`); rect(b.box[0], b.box[1], b.box[2], b.box[3], [255, 0, 0]); });
await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPng);
