// Real pictures: stitches and trims in two bench runs (before -> now), from each picture's stats.json.
// usage: node real_before_now.mjs <beforeDir> <nowDir>      (the dirs hold pics/<set>__<name>/stats.json)
import fs from "node:fs";
import path from "node:path";
const [beforeDir, nowDir] = process.argv.slice(2);
const read = (dir) => {
  const out = {};
  const pics = path.join(dir, "pics");
  for (const name of fs.readdirSync(pics)) {
    const f = path.join(pics, name, "stats.json");
    if (!fs.existsSync(f)) continue;
    const s = JSON.parse(fs.readFileSync(f, "utf8"));
    out[name] = { stitches: s.stitches, trims: s.trims, refine: s.refine || (s.stats && s.stats.refine) || null };
  }
  return out;
};
const A = read(beforeDir), B = read(nowDir);
const names = Object.keys(B).filter((n) => A[n]).sort();
let same = 0;
const changed = [];
for (const n of names) {
  if (A[n].stitches === B[n].stitches && A[n].trims === B[n].trims) same++;
  else changed.push(n);
}
console.log(`${names.length} pictures in both runs: ${changed.length} change, ${same} are stitch for stitch what they were.`);
for (const n of changed) console.log(`  ${n.padEnd(42)} stitches ${String(A[n].stitches).padStart(6)} -> ${String(B[n].stitches).padStart(6)}   trims ${String(A[n].trims).padStart(4)} -> ${String(B[n].trims).padStart(4)}`);
