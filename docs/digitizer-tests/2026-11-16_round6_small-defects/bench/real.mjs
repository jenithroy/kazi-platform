// Sews the 73 real test pictures (docs/digitizer-tests/inputs/) with the engine in a given lib folder and writes, for each, the number of stitches and a fingerprint of the stitch file,
// so two versions of the engine can be compared picture by picture (compare_real.mjs).
// usage: node real.mjs --lib <path to an app/lib> --out <file.json> [--only regex]
// A picture is fitted into 1000 x 1000 px and counted 10 px to the millimetre (like the earlier benches), people off.
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const require = createRequire(import.meta.url);
const sharp = require(ROOT + "/app/node_modules/sharp");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const LIB = opt("lib", ROOT + "/app/lib"), OUT = opt("out"), only = opt("only") ? new RegExp(opt("only")) : null;
if (!OUT) throw new Error("--out is required");
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const model = await imp("digitizer/model.js");
const { generate } = await imp("embroidery/stitch/engine.js");

const dirs = [path.join(ROOT, "docs/digitizer-tests/inputs/new55"), path.join(ROOT, "docs/digitizer-tests/inputs/earlier18")];
const files = dirs.flatMap((d) => fs.readdirSync(d).filter((f) => /\.(png|jpe?g)$/i.test(f) && !/^(review_|contact_sheet)/.test(f)).map((f) => [path.basename(d) + "/" + f, path.join(d, f)])).filter(([n]) => !only || only.test(n));
const result = {};
for (const [name, file] of files) {
  try {
    const { data, info } = await sharp(file).resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const image = { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
    const wMm = image.width / 10, mm = wMm / image.width, hMm = image.height * mm;
    const t0 = Date.now();
    const traced = traceImage(image, conv.traceOptions({ ...conv.CONVERT_DEFAULTS, detail: 0.75, people: false, background: "auto" }, mm));
    const fabric = conv.clothFromTrace(traced) || model.DEFAULT_CLOTH;
    const res = conv.objectsFromTrace(traced, { originX: -wMm / 2, originY: -hMm / 2, mmPerPx: mm, fabric, maxColors: 12, detailThick: false });
    const g = generate(model.engineDesign(model.newDesign({ objects: res.objects, fabricColor: fabric, hoop: { w: 450, h: 450 }, name })), {});
    let stitches = 0, trims = 0, h = 0;
    for (const s of g.pattern.stitches) { if (s[2] === 0) stitches++; else if (s[2] === 2) trims++; h = (h * 31 + s[0] * 7 + s[1] * 13 + s[2]) >>> 0; }
    result[name] = { stitches, trims, hash: h, ms: Date.now() - t0 };
    console.log(name.padEnd(58), String(stitches).padStart(7), "stitches", String(Date.now() - t0).padStart(6), "ms");
  } catch (e) { result[name] = { error: String(e && e.message || e).slice(0, 160) }; console.log(name, "FAILED", result[name].error); }
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log("wrote", OUT);
