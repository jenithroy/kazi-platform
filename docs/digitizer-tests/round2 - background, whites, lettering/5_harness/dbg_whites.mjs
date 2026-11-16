// Where does the area of the teeth / eye white get lost? For one picture: the area (mm2) of the candidate pixels in the source, and of the shapes the tracer made in the anchor's colour.
// usage: node dbg_whites.mjs <set> <name> [width mm]
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
const FACES = path.dirname(fileURLToPath(import.meta.url));
const LIB = process.env.LIB || "<REPO>/app/lib";
const imp = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);
const { traceImage } = await imp("embroidery/trace/index.js");
const conv = await imp("digitizer/convert.js");
const seg = await imp("digitizer/segment.js");
const F = await imp("digitizer/faces.js");
const [, , SET, NAME] = process.argv;
const dir = path.join(FACES, "cache", SET, NAME);
const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
const raw = fs.readFileSync(path.join(dir, "image.rgba"));
const image = { width: meta.width, height: meta.height, data: new Uint8ClampedArray(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)) };
const wMm = process.argv[4] ? Number(process.argv[4]) : image.width / 10;
const mmPerPx = wMm / image.width;
const probsB = fs.readFileSync(path.join(dir, "probs.f32"));
const probs = new Float32Array(probsB.buffer, probsB.byteOffset, probsB.length / 4);
const n = meta.seg.w * meta.seg.h;
const maps = []; for (let c = 0; c < 6; c++) maps.push(probs.subarray(c * n, (c + 1) * n));
const refined = seg.refineFromProbs({ width: image.width, height: image.height, data: image.data }, { w: meta.seg.w, h: meta.seg.h, probs: maps }, {});
const lm = JSON.parse(fs.readFileSync(path.join(dir, "landmarks.json"), "utf8"));
const fl = F.mainFaces(lm, image.width, image.height);
const painted = F.paintFeatureClasses(refined.classes, image.width, image.height, fl, { mmPerPx });
const anchors = F.featureAnchors(image, fl);
console.log("anchors", JSON.stringify(anchors));
const settings = { ...conv.CONVERT_DEFAULTS, detail: 0.75 };
const o = conv.traceOptions(settings, mmPerPx);
const traced = traceImage(image, { ...o, regions: { width: image.width, height: image.height, data: painted.classes }, regionAnchors: anchors });
// source-side geometry
const f = fl[0];
const area = (poly) => { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
console.log(`mouth opening ${(area(f.lipsInner) * mmPerPx * mmPerPx).toFixed(1)} mm2, outer lips ${(area(f.lipsOuter) * mmPerPx * mmPerPx).toFixed(1)} mm2, eyes ${((area(f.rightEye) + area(f.leftEye)) * mmPerPx * mmPerPx).toFixed(1)} mm2, face width ${(f.widthPx * mmPerPx).toFixed(1)} mm`);
// the colours of the palette and the area each one covers in the traced shapes
const shapeArea = new Map();
for (const s of traced.shapes) shapeArea.set(s.color, (shapeArea.get(s.color) || 0) + s.area * mmPerPx * mmPerPx);
const rows = traced.palette.map((p, i) => ({ i, rgb: [Math.round(p.r), Math.round(p.g), Math.round(p.b)], mm2: +(shapeArea.get(i) || 0).toFixed(1), bg: !!p.background }));
for (const r of rows) console.log(`  palette ${r.i}: rgb(${r.rgb.join(",")}) ${r.mm2} mm2${r.bg ? " bg" : ""}`);
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 3;
for (const a of anchors) {
  const hit = rows.find((r) => near(r.rgb, a.rgb));
  const shapes = hit ? traced.shapes.filter((s) => s.color === hit.i) : [];
  console.log(`anchor ${a.kind} rgb(${a.rgb}) px ${a.px} -> palette ${hit ? hit.i : "none"}: ${hit ? hit.mm2 : 0} mm2 in ${shapes.length} shapes; candidate px ${(a.px * mmPerPx * mmPerPx).toFixed(2)} mm2 (the lightest ${"top share"} only)`);
}
