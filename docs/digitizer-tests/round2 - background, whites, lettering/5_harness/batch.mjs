// Runs replay.mjs in several processes. usage: node batch.mjs --jobs 3 <replay.mjs options...>   (names default: every captured picture of the set)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FACES = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const take = (k, d) => { const i = argv.indexOf("--" + k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const jobs = Number(take("jobs", "3"));
const set = argv[argv.indexOf("--set") + 1];
let names = take("names", "all");
const cache = path.join(FACES, "cache", set);
names = names === "all" ? fs.readdirSync(cache).filter((n) => fs.existsSync(path.join(cache, n, "image.rgba"))).sort() : names.split(",");
const chunks = Array.from({ length: Math.min(jobs, names.length) }, () => []);
names.forEach((n, i) => chunks[i % chunks.length].push(n));
const t0 = Date.now();
await Promise.all(chunks.map((c) => new Promise((resolve) => {
  const p = spawn(process.execPath, [path.join(FACES, "replay.mjs"), ...argv, "--names", c.join(",")], { stdio: ["ignore", "pipe", "pipe"] });
  p.stdout.on("data", (d) => process.stdout.write(d));
  p.stderr.on("data", (d) => process.stderr.write(d));
  p.on("close", resolve);
})));
console.log(`done ${names.length} pictures in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
