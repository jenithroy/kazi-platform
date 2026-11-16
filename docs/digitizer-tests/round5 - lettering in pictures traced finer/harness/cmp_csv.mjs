import fs from "node:fs";
import path from "node:path";
const OUT = "<SESSION>/scratchpad/text/out";
const load = (v) => { const d = {}; for (const f of fs.readdirSync(path.join(OUT, v))) if (/^ocr_lpics_p\d\.json$/.test(f)) Object.assign(d, JSON.parse(fs.readFileSync(path.join(OUT, v, f), "utf8"))); return d; };
const vars = process.argv.slice(2);
const data = vars.map(load);
const ids = Object.keys(data[0]).sort();
console.log("picture," + vars.join(","));
for (const id of ids) console.log(id + "," + data.map((d) => (id in d ? d[id].toFixed(3) : "")).join(","));
