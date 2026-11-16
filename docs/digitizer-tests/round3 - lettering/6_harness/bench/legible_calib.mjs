// For the advice in lib/digitizer/legible.js: how well is lettering read back, by height and by kind of face? Joins the OCR character error of a variant with what the page itself measures of each text
// (typical stroke, share of hairline, height). usage: node legible_calib.mjs <variant> [typed|typed2|both]
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = "<REPO>/app/lib";
const { meanStrokeWidth, thinShare } = await import(pathToFileURL(path.join(LIB, "embroidery/geometry/thin.js")).href);
const { letteringAdvice } = await import(pathToFileURL(path.join(LIB, "digitizer/legible.js")).href);
const variant = process.argv[2] || "k2";
const sets = process.argv[3] === "typed" ? ["typed"] : process.argv[3] === "typed2" ? ["typed2"] : ["typed", "typed2"];
const rows = [];
for (const SET of sets) {
  const manifest = JSON.parse(fs.readFileSync(path.join(HERE, "cache", SET, "manifest.json"), "utf8"));
  const ocr = {};
  for (let p = 0; p < 4; p++) {
    const f = path.join(HERE, "out", variant, SET === "typed" ? `ocr_p${p}.json` : `ocr_typed2_p${p}.json`);
    if (fs.existsSync(f)) Object.assign(ocr, JSON.parse(fs.readFileSync(f, "utf8")));
  }
  for (const c of manifest) {
    if (!ocr[c.id]) continue;
    const rf = path.join(HERE, "out", variant, SET, c.id, "rings.json");
    if (!fs.existsSync(rf)) continue;
    const rings = JSON.parse(fs.readFileSync(rf, "utf8"));
    const stroke = meanStrokeWidth(rings), hair = thinShare(rings, 0.5 * stroke);
    const a = letteringAdvice({ capMm: c.size, strokeMm: stroke, hair });
    rows.push({ set: SET, id: c.id, font: c.font, size: c.size, cer: ocr[c.id].cer, stroke, hair, kind: a.kind, level: a.level });
  }
}
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
console.log(`${rows.length} cells (${sets.join("+")}) of variant ${variant}`);
console.log("\nby kind of face and cap height: mean character error (cells)");
for (const kind of ["plain", "heavy", "hairline"]) {
  const parts = [3, 4, 5, 6].map((s) => { const l = rows.filter((r) => r.kind === kind && r.size === s); return l.length ? `${s} mm ${mean(l.map((r) => r.cer)).toFixed(2)} (${l.length})` : `${s} mm -`; });
  console.log(`  ${kind.padEnd(9)} ${parts.join("   ")}`);
}
console.log("\nby the advice the page gives today (level): mean error");
for (const lv of ["good", "tight", "small"]) { const l = rows.filter((r) => r.level === lv); console.log(`  ${lv.padEnd(6)} ${mean(l.map((r) => r.cer)).toFixed(3)} (${l.length} cells)`); }
console.log("\nby font (all sizes 3-6): hair share, mean stroke at 5 mm, error at 3/4/5/6 mm");
const byFont = new Map();
for (const r of rows) (byFont.get(r.font) || byFont.set(r.font, []).get(r.font)).push(r);
for (const [f, l] of [...byFont].sort()) console.log(`  ${f.padEnd(13)} hair ${mean(l.map((r) => r.hair)).toFixed(3)}  stroke5 ${(mean(l.filter((r) => r.size === 5).map((r) => r.stroke)) || 0).toFixed(2)}  ` + [3, 4, 5, 6].map((s) => { const m = l.filter((r) => r.size === s); return m.length ? mean(m.map((r) => r.cer)).toFixed(2) : "-"; }).join(" / "));
