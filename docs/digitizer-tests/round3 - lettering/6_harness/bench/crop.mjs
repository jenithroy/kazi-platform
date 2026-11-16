// Crop and enlarge a part of an image. usage: node crop.mjs <in.png> <out.png> <left> <top> <width> <height> [scale=3]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const [inp, out, l, t, w, h, sc] = process.argv.slice(2);
const s = Number(sc || 3);
await sharp(inp).extract({ left: +l, top: +t, width: +w, height: +h }).resize({ width: Math.round(+w * s), kernel: "nearest" }).png().toFile(out);
console.log("ok", out);
