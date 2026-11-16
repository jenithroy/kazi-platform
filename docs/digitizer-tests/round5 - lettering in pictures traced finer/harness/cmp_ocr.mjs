import fs from "node:fs";
import path from "node:path";
const OUT = "<SESSION>/scratchpad/text/out";
const load = (v) => { const d = {}; for (const f of fs.readdirSync(path.join(OUT, v))) if (/^ocr_lpics_p\d\.json$/.test(f)) Object.assign(d, JSON.parse(fs.readFileSync(path.join(OUT, v, f), "utf8"))); return d; };
const [A, B, thr = "0.1"] = process.argv.slice(2);
const a = load(A), b = load(B);
const rows = Object.keys(a).filter((k) => k in b && Math.abs(b[k] - a[k]) >= Number(thr)).sort();
console.log(`${A} -> ${B}: pictures whose error moved by ${thr} or more: ${rows.length}`);
for (const k of rows) console.log(k.padEnd(28), `${a[k].toFixed(2)} -> ${b[k].toFixed(2)}`);
