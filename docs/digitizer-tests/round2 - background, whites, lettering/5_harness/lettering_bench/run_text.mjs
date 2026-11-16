// The lettering bench, end to end, for one copy of the library.
//   node run_text.mjs --lib <path to an app/lib> --variant <name> [--snapshot auto|1|0] [--tools 0] [--skip-typed] [--skip-pics]
// 1. captures the typed-text matrix in Chromium once (cache/typed; the page's own text.js; skipped when it is already there) and puts the chart in the cache (set chart2)
// 2. replays every cell and every lettering picture with the library (typed -> out/<variant>/typed, pictures -> out/<variant>/pics)
// 3. runs the python tools (metrics, table, summary, contact sheets, picture crop sheets) unless --tools 0
// A library that is not already prepared (a package.json with "type": "module" beside lib/) is first COPIED to trees/<variant>/app/lib (--snapshot 1 forces it, 0 forbids it),
// so the run is not disturbed by edits made while it runs, and trees/<variant>/SNAPSHOT.txt says what was run (time, git HEAD, file hashes).
// Results: out/<variant>/{table.md, summary.md, table.csv, metrics_*.json, sheets/*.png}. The library is only READ (the stitch counters are patched in memory, see hooks.mjs).
// Examples:
//   node run_text.mjs --lib "<scratchpad>\faces\base_lib\app\lib" --variant base        (the repo at HEAD 40c71ac)
//   node run_text.mjs --lib "<scratchpad>\text\trees\tree\app\lib" --variant tree       (a snapshot of the working tree, see trees\tree\SNAPSHOT.txt)
//   node run_text.mjs --lib "<REPO>\app\lib" --variant live       (the working tree as it is right now)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(HERE);
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
let LIB = opt("lib");
const VARIANT = opt("variant");
if (!LIB || !VARIANT) { console.log("usage: node run_text.mjs --lib <path to an app/lib> --variant <name> [--snapshot auto|1|0] [--tools 0] [--skip-typed] [--skip-pics]"); process.exit(1); }
if (!fs.existsSync(path.join(LIB, "embroidery", "stitch", "engine.js"))) { console.log(`not an app/lib: ${LIB}`); process.exit(1); }

function snapshotOf(lib) {
  const dest = path.join(HERE, "trees", VARIANT, "app");
  fs.rmSync(path.join(dest, "lib"), { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(lib, path.join(dest, "lib"), { recursive: true });
  fs.writeFileSync(path.join(dest, "package.json"), '{ "type": "module" }');
  const nm = path.join(lib, "..", "node_modules");
  if (!fs.existsSync(path.join(dest, "node_modules")) && fs.existsSync(nm)) fs.symlinkSync(nm, path.join(dest, "node_modules"), "junction");
  let repo = path.resolve(lib), head = "(not a git checkout)", status = "";
  while (repo && !fs.existsSync(path.join(repo, ".git"))) { const up = path.dirname(repo); if (up === repo) { repo = null; break; } repo = up; }
  if (repo) {
    const g = (a) => spawnSync("git", ["-C", repo, ...a], { encoding: "utf8" }).stdout?.trimEnd() ?? "";
    head = g(["rev-parse", "HEAD"]);
    status = g(["status", "--short", "--", path.relative(repo, lib).split(path.sep).join("/")]);
  }
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.(m?js|json)$/.test(e.name)) files.push(f); } };
  walk(path.join(dest, "lib"));
  const lines = [`taken: ${new Date().toString()}  (${new Date().toISOString()})`, `from: ${lib}`, `git HEAD: ${head}`, "git status of that lib folder at the time:", status || "(clean)", "sha256 (first 12) of the js/json files:",
    ...files.sort().map((f) => `${crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 12)}  ${path.relative(path.join(dest, "lib"), f).split(path.sep).join("/")}`)];
  fs.writeFileSync(path.join(HERE, "trees", VARIANT, "SNAPSHOT.txt"), lines.join("\n"));
  return path.join(dest, "lib");
}
const prepared = fs.existsSync(path.join(LIB, "..", "package.json")) && /"type"\s*:\s*"module"/.test(fs.readFileSync(path.join(LIB, "..", "package.json"), "utf8"));
const snap = opt("snapshot", "auto");
if (snap === "1" || (snap === "auto" && !prepared)) { LIB = snapshotOf(LIB); console.log(`snapshot of the library: ${LIB}`); }
const OUT = path.join(HERE, "out", VARIANT);
const PY = [path.join(SCRATCH, "venv", "Scripts", "python.exe"), "python"].find((p) => p === "python" || fs.existsSync(p));
const PICS = [
  "chart2/chart", "reg18/crest_manzanares", "new55/text_serif_sign_st_xavier", "new55/text_sans_sign_medstead",
  "new55/emblems_seal_torrance_bw", "new55/emblems_logo_sdl", "new55/emblems_flag_washington_island",
];

const run = (cmd, args, label) => {
  const t0 = Date.now();
  console.log(`\n== ${label}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: HERE });
  if (r.status !== 0) { console.log(`${label} failed (exit ${r.status})`); process.exit(r.status || 1); }
  console.log(`   (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
};

fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(HERE, "cache", "typed", "manifest.json"))) run(process.execPath, ["capture_text.mjs"], "capture the typed text in Chromium");
if (!fs.existsSync(path.join(HERE, "cache", "chart2", "chart", "image.rgba"))) run(process.execPath, ["make_chart2.mjs"], "chart into the cache");
if (!argv.includes("--skip-typed")) run(process.execPath, ["replay_text.mjs", "--lib", LIB, "--out", OUT], `typed text through ${LIB}`);
if (!argv.includes("--skip-pics")) run(process.execPath, ["replay_pic.mjs", "--lib", LIB, "--out", OUT, "--items", PICS.join(",")], `lettering pictures through ${LIB}`);
fs.writeFileSync(path.join(OUT, "run.json"), JSON.stringify({ variant: VARIANT, lib: LIB, at: new Date().toISOString() }, null, 1));
if (opt("tools", "1") !== "0") run(PY, ["-I", "tools_text.py", "all", VARIANT], "metrics, tables and sheets");
console.log(`\ndone: ${OUT}`);
