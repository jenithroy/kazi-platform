// Draws faces.js's parts over each captured picture that has landmarks, and prints the plausibility verdict and the measures.
// usage: node faces_probe.mjs <set> <outdir> [mmPerPx]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const FACES = path.dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(import.meta.url)("<REPO>/app/node_modules/sharp");
const lib = process.env.LIB || "<REPO>/app/lib";
const F = await import(pathToFileURL(path.join(lib, "digitizer/faces.js")).href);
const [, , SET, OUT, MM = "0.1"] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const cache = path.join(FACES, "cache", SET);
for (const name of fs.readdirSync(cache).sort()) {
  const lmFile = path.join(cache, name, "landmarks.json");
  if (!fs.existsSync(lmFile)) continue;
  const lms = JSON.parse(fs.readFileSync(lmFile, "utf8"));
  if (!lms.length) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(cache, name, "meta.json"), "utf8"));
  const { width: W, height: H } = meta;
  const raw = fs.readFileSync(path.join(cache, name, "image.rgba"));
  const poly = (pts, col) => `<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${col}" fill-opacity="0.25" stroke="${col}" stroke-width="${Math.max(1, W / 500)}"/>`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  const lines = [];
  for (const [i, lm] of lms.entries()) {
    const p = F.faceParts(lm, W, H);
    const ok = F.plausibleFace(p);
    const m = F.faceMeasures(p, Number(MM));
    const eyeToMouth = Math.hypot(p.mouthCentre[0] - (p.eyeCentres[0][0] + p.eyeCentres[1][0]) / 2, p.mouthCentre[1] - (p.eyeCentres[0][1] + p.eyeCentres[1][1]) / 2) / Math.hypot(p.eyeCentres[0][0] - p.eyeCentres[1][0], p.eyeCentres[0][1] - p.eyeCentres[1][1]);
    lines.push(`  face ${i}: ${ok ? "PLAUSIBLE" : "rejected"}  width ${m.faceMm} mm  eye ${m.eyeMm} mm  ipd ${m.ipdMm} mm  iris ${m.irisMm}  eyeRatio ${(p.rightEyeWidthPx / p.leftEyeWidthPx).toFixed(2)}  eyeToMouth/ipd ${eyeToMouth.toFixed(2)}  aspect ${(p.heightPx / p.widthPx).toFixed(2)}  roll ${p.rollDeg.toFixed(0)}`);
    svg += poly(p.oval, "#ffffff") + poly(p.rightEye, "#ff3030") + poly(p.leftEye, "#ff3030") + poly(p.rightBrow, "#30ff30") + poly(p.leftBrow, "#30ff30") + poly(p.lipsOuter, "#3070ff");
    for (const ir of [p.rightIris, p.leftIris]) if (ir) svg += `<circle cx="${ir.cx}" cy="${ir.cy}" r="${ir.r}" fill="#ffee00" fill-opacity="0.5"/>`;
  }
  svg += "</svg>";
  console.log(name + ` (${W}x${H}, ${lms.length} face(s))`);
  for (const l of lines) console.log(l);
  const p0 = F.faceParts(lms[0], W, H);
  const mx = p0.widthPx * 0.35, my = p0.heightPx * 0.35;
  const x0 = Math.max(0, Math.floor(p0.box[0] - mx)), y0 = Math.max(0, Math.floor(p0.box[1] - my));
  const x1 = Math.min(W, Math.ceil(p0.box[2] + mx)), y1 = Math.min(H, Math.ceil(p0.box[3] + my));
  const composed = await sharp(Buffer.from(raw.buffer, raw.byteOffset, raw.length), { raw: { width: W, height: H, channels: 4 } }).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  await sharp(composed).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).resize({ width: 760, kernel: "lanczos3" }).png().toFile(path.join(OUT, name + ".png"));
}
