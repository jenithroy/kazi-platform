// What does the engine's meanStrokeWidth (the typical stroke the weight rule works from) say for each typed text? usage: node stroke_probe.mjs [set=typed] [variant=cur]  -> mean by font and by size
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = "<REPO>/app/lib";
const { meanStrokeWidth, letterHeight, thinShare } = await import(pathToFileURL(path.join(LIB, "embroidery/geometry/thin.js")).href);
const SET = process.argv[2] || "typed", VAR = process.argv[3] || "cur";
const man = JSON.parse(fs.readFileSync(path.join(HERE, "cache", SET, "manifest.json"), "utf8")).filter((c) => c.size <= 6);
const rows = [];
for (const c of man) {
  const f = path.join(HERE, "out", VAR, SET, c.id, "rings.json");
  if (!fs.existsSync(f)) continue;
  const rings = JSON.parse(fs.readFileSync(f, "utf8"));
  rows.push({ ...c, stroke: meanStrokeWidth(rings), cap: letterHeight(rings) });
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
console.log(`${rows.length} texts; typical stroke (mm) the engine measures, by size:`);
for (const s of [3, 4, 5, 6]) console.log(`  caps ${s} mm: mean ${mean(rows.filter((r) => r.size === s).map((r) => r.stroke)).toFixed(2)}  range ${Math.min(...rows.filter((r) => r.size === s).map((r) => r.stroke)).toFixed(2)}-${Math.max(...rows.filter((r) => r.size === s).map((r) => r.stroke)).toFixed(2)}`);
console.log("by font (3 / 4 / 5 / 6 mm):");
for (const f of [...new Set(rows.map((r) => r.font + (r.bold ? "" : "(r)")))].sort()) {
  const fr = rows.filter((r) => r.font + (r.bold ? "" : "(r)") === f);
  console.log(`  ${f.padEnd(14)} ` + [3, 4, 5, 6].map((s) => { const m = fr.filter((r) => r.size === s); return m.length ? mean(m.map((r) => r.stroke)).toFixed(2) : "-"; }).join(" / "));
}
