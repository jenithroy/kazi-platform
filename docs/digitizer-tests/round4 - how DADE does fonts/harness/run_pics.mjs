// Sew the lettering pictures with the working tree's library, several processes at once.
// usage: node run_pics.mjs --out <dir> [--jobs 3] [--opts k=v,k=v] [--items set/name,... | --set lpics | --real] [--png 1]
//   --set lpics  every picture of the lettering-picture matrix (text/cache/lpics);  --real  the real pictures of the bench (chart, crest, seal, logos, signs)
//   --opts       engine options for the experiment (ENGINE_OPTS of replay_pic.mjs), numbers only
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const OUT = opt("out");
if (!OUT) throw new Error("--out is required");
const JOBS = Number(opt("jobs", "3"));
const optsObj = opt("opts", "") ? Object.fromEntries(opt("opts", "").split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, Number(v)])) : {};
let items = [];
if (opt("items")) items = opt("items").split(",");
else if (opt("set")) items = fs.readdirSync(path.join(HERE, "cache", opt("set"))).filter((n) => fs.existsSync(path.join(HERE, "cache", opt("set"), n, "image.rgba"))).map((n) => `${opt("set")}/${n}`);
else if (argv.includes("--real")) items = ["chart2/chart", "reg18/crest_manzanares", "new55/emblems_seal_torrance_bw", "new55/emblems_logo_sdl", "new55/emblems_flag_washington_island", "new55/text_sans_sign_medstead", "new55/text_serif_sign_st_xavier"];
const only = opt("only");
if (only) items = items.filter((i) => new RegExp(only).test(i));
fs.mkdirSync(OUT, { recursive: true });
const chunks = Array.from({ length: JOBS }, () => []);
items.forEach((it, k) => chunks[k % JOBS].push(it));
const lib = opt("lib", "<REPO>/app/lib");
const t0 = Date.now();
let failed = 0;
await Promise.all(chunks.filter((c) => c.length).map((c) => new Promise((resolve) => {
  const p = spawn(process.execPath, ["--no-warnings", "replay_pic.mjs", "--lib", lib, "--out", OUT, "--items", c.join(","), "--dst", "0", "--png", opt("png", "1")], { cwd: HERE, env: { ...process.env, ENGINE_OPTS: JSON.stringify(optsObj) } });
  let buf = "";
  p.stdout.on("data", (d) => { buf += d; });
  p.stderr.on("data", (d) => { buf += d; });
  p.on("close", () => { failed += (buf.match(/FAILED/g) || []).length; if (/FAILED/.test(buf)) console.log(buf.split("\n").filter((l) => /FAILED/.test(l)).join("\n")); resolve(); });
})));
console.log(`${items.length} pictures sewn into ${OUT} in ${((Date.now() - t0) / 1000).toFixed(0)} s, ${failed} failed  (engine options ${JSON.stringify(optsObj)})`);
