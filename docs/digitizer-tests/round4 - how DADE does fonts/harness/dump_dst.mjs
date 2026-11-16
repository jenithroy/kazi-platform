// DST -> JSON in the site's orientation (the one render_dade_sheets.mjs draws): [[x_mm, y_mm, cmd], ...], cmd 0 stitch, 1 jump, 2 trim, 3 colour change.
// usage: node dump_dst.mjs <in.dst> <out.json>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const LIB = "<REPO>/app/lib";
const { readPattern } = await import(pathToFileURL(path.join(LIB, "embroidery/formats/index.js")).href);
const p = readPattern("dst", fs.readFileSync(process.argv[2]));
fs.writeFileSync(process.argv[3], JSON.stringify({ threads: p.threads.length, stitches: p.stitches.map((s) => [s[0] / 10, s[1] / 10, s[2]]) }));
console.log("stitches", p.stitches.length);
