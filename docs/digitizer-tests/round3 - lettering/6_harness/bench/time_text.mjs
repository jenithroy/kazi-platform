// How long does generate() take for a typed text with different engine options? usage: node time_text.mjs <cell> [set=typed] [n=5]   (engine options in ENGINE_LIST: name=json;name=json)
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = "<REPO>/app/lib";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const model = await imp("digitizer/model.js");
const textlib = await imp("digitizer/text.js").catch(() => null);
const { generate } = await imp("embroidery/stitch/engine.js");
const [cell, SET = "typed", nStr = "5"] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(HERE, "cache", SET, cell, "meta.json"), "utf8"));
const outDirs = fs.readdirSync(path.join(HERE, "out")).filter((d) => fs.existsSync(path.join(HERE, "out", d, SET, cell, "rings.json")));
const rings = JSON.parse(fs.readFileSync(path.join(HERE, "out", outDirs[0], SET, cell, "rings.json"), "utf8"));
const obj = model.makeObject({ name: "Text", kind: "text", rings, text: { ...(textlib ? textlib.DEFAULT_TEXT : {}), ...meta.text }, fill: { color: "#000000", type: "auto" }, transform: { x: 0, y: 0, sx: 1, sy: 1, rot: 0 } });
const design = model.newDesign({ objects: [obj], hoop: { w: 400, h: 450 }, name: cell });
const variants = (process.env.ENGINE_LIST || "default={}").split(";").map((s) => { const i = s.indexOf("="); return [s.slice(0, i), JSON.parse(s.slice(i + 1))]; });
const n = Number(nStr);
for (const [name, opts] of variants) {
  generate(model.engineDesign(design), opts); // warm up
  const t0 = performance.now();
  let st = 0;
  for (let i = 0; i < n; i++) st = generate(model.engineDesign(design), opts).pattern.stitches.length;
  console.log(`${name.padEnd(12)} ${((performance.now() - t0) / n).toFixed(0).padStart(5)} ms per generate  (${st} stitches)`);
}
