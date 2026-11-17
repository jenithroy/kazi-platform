// Compares two outputs of real.mjs (two versions of the engine on the 73 real pictures): which pictures are stitch for stitch the same, and by how much the others changed.
// usage: node compare_real.mjs <before.json> <after.json>
import fs from "node:fs";
const [a, b] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(a, "utf8")), B = JSON.parse(fs.readFileSync(b, "utf8"));
let same = 0;
const changed = [];
for (const name of Object.keys(B)) {
  const x = A[name], y = B[name];
  if (!x || x.error || y.error) { changed.push(`${name}: ${x && x.error ? "before FAILED " + x.error : ""}${y.error ? "after FAILED " + y.error : ""}${!x ? "missing before" : ""}`); continue; }
  if (x.hash === y.hash && x.stitches === y.stitches) { same++; continue; }
  const d = y.stitches - x.stitches;
  changed.push(`${name.padEnd(56)} ${String(x.stitches).padStart(6)} -> ${String(y.stitches).padStart(6)} stitches (${d >= 0 ? "+" : ""}${d}, ${(100 * d / Math.max(1, x.stitches)).toFixed(2)} %)  trims ${x.trims} -> ${y.trims}`);
}
console.log(`${same} of ${Object.keys(B).length} pictures are stitch for stitch the same.`);
if (changed.length) console.log(`${changed.length} changed:\n` + changed.join("\n"));
const msA = Object.values(A).reduce((s, r) => s + (r.ms || 0), 0), msB = Object.values(B).reduce((s, r) => s + (r.ms || 0), 0);
console.log(`total time ${(msA / 1000).toFixed(0)} s before, ${(msB / 1000).toFixed(0)} s after`);
