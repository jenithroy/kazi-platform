// How does the person model label the teeth (inside the inner lips) and the eye whites (inside the eye outlines)? class 0 = background = CUT OUT.
// usage: node probe_whites.mjs <set> [variant dir with classes.u8 = out/<variant>/<set>/<name>/classes.u8]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const FACES = path.dirname(fileURLToPath(import.meta.url));
const lib = process.env.LIB || "<REPO>/app/lib";
const F = await import(pathToFileURL(path.join(lib, "digitizer/faces.js")).href);
const [, , SET, VARIANT = "after"] = process.argv;
const cache = path.join(FACES, "cache", SET);
const NAMES = ["bg", "hair", "bodySkin", "faceSkin", "clothes", "other", "eyes", "lips"];
const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const tot = { mouth: new Float64Array(8), eyes: new Float64Array(8) };
let n = 0;
for (const name of fs.readdirSync(cache).sort()) {
  const clsFile = path.join(FACES, "out", VARIANT, SET, name, "classes.u8");
  const lmFile = path.join(cache, name, "landmarks.json");
  if (!fs.existsSync(clsFile) || !fs.existsSync(lmFile)) continue;
  const lms = JSON.parse(fs.readFileSync(lmFile, "utf8"));
  if (!lms.length) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(cache, name, "meta.json"), "utf8"));
  const { width: W, height: H } = meta;
  const cls = fs.readFileSync(clsFile);
  if (cls.length !== W * H) continue;
  const faces = F.mainFaces(lms, W, H);
  if (!faces.length) continue;
  const f = faces[0];
  const count = (polys) => { const h = new Float64Array(8); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of polys) for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) if (polys.some((p) => inside(p, x + 0.5, y + 0.5))) h[cls[y * W + x]]++; return h; };
  const mouth = count([f.lipsInner]);
  const eyes = count([f.rightEye, f.leftEye]);
  const pct = (h) => { const s = h.reduce((a, b) => a + b, 0) || 1; return NAMES.map((nm, i) => (h[i] ? `${nm} ${(100 * h[i] / s).toFixed(0)}%` : null)).filter(Boolean).join(", "); };
  console.log(`${name.slice(0, 40).padEnd(40)} mouth opening: ${pct(mouth).padEnd(46)} | eyes: ${pct(eyes)}`);
  for (let i = 0; i < 8; i++) { tot.mouth[i] += mouth[i]; tot.eyes[i] += eyes[i]; }
  n++;
}
const pct2 = (h) => { const s = h.reduce((a, b) => a + b, 0) || 1; return NAMES.map((nm, i) => `${nm} ${(100 * h[i] / s).toFixed(0)}%`).join(", "); };
console.log(`\nALL ${n} faces with a person map: mouth opening: ${pct2(tot.mouth)}\n                                  eyes:          ${pct2(tot.eyes)}`);
