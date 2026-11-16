// How thin are the thin strokes of each font? The share of the letters' area in strips thinner than half the typical stroke, and thinner than 0.45 mm, for the bench cells.
// usage: node contrast_probe.mjs [typed|typed2]
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = "<REPO>/app/lib";
const { meanStrokeWidth, thinShare, letterHeight } = await import(pathToFileURL(path.join(LIB, "embroidery/geometry/thin.js")).href);
const SET = process.argv[2] || "typed";
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, "cache", SET, "manifest.json"), "utf8"));
const OUTV = process.argv[3] || "final1";
const rows = [];
for (const c of manifest) {
  const f = path.join(HERE, "out", OUTV, SET, c.id, "rings.json");
  if (!fs.existsSync(f)) continue;
  const rings = JSON.parse(fs.readFileSync(f, "utf8"));
  const s = meanStrokeWidth(rings);
  rows.push({ id: c.id, font: c.font, bold: c.bold, size: c.size, str: c.str, stroke: s, cap: letterHeight(rings), hair: thinShare(rings, 0.5 * s), hair45: thinShare(rings, 0.45) });
}
const by = new Map();
for (const r of rows) { const k = `${r.font}${r.bold ? "" : "(r)"}`; (by.get(k) || by.set(k, []).get(k)).push(r); }
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
console.log("font          stroke(mean over sizes)  hair@0.5s  hair@0.45mm   [per size 3,4,5,6,8: stroke / hair@0.5s]");
for (const [k, list] of [...by].sort()) {
  const sizes = [3, 4, 5, 6, 8].map((sz) => { const l = list.filter((r) => r.size === sz); return l.length ? `${mean(l.map((r) => r.stroke)).toFixed(2)}/${mean(l.map((r) => r.hair)).toFixed(2)}` : "-"; });
  console.log(`${k.padEnd(14)}${mean(list.map((r) => r.stroke)).toFixed(2).padStart(6)}      ${mean(list.map((r) => r.hair)).toFixed(3)}    ${mean(list.map((r) => r.hair45)).toFixed(3)}      [${sizes.join("  ")}]`);
}
