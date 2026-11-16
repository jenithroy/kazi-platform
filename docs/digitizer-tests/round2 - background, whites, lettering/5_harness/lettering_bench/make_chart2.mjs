// Puts inputs2/chart.png into the cache as the set "chart2" (image.rgba + meta.json, the same shape the page's canvas hands the tracer). usage: node make_chart2.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const src = path.join(path.dirname(HERE), "inputs2", "chart.png");
const dir = path.join(HERE, "cache", "chart2", "chart");
fs.mkdirSync(dir, { recursive: true });
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
fs.writeFileSync(path.join(dir, "image.rgba"), data);
fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ name: "chart", width: info.width, height: info.height, scale: 1, source: src }));
console.log(`chart2/chart: ${info.width}x${info.height} (${info.channels} channels) -> ${dir}`);
