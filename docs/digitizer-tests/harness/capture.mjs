// Capture the browser-only inputs (page pixels, person model maps, face landmarks, hair mask) for a set of pictures.
// usage: node capture.mjs <set name> <manifest.json | dir of pictures> [what: seg,faces,hair] [--force]
// manifest.json: [{ "name": "face_einstein", "file": "C:/.../face_einstein.png" }, ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startServer } from "./server.mjs";

const FACES = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(path.dirname(FACES), "node_modules", "x.js"));
const { chromium } = require("playwright-core");
const [, , SET, SRC, WHAT = "seg,faces", ...rest] = process.argv;
const force = rest.includes("--force");
const what = WHAT.split(",");

let items;
if (fs.statSync(SRC).isDirectory()) {
  items = fs.readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp|gif|bmp)$/i.test(f)).map((f) => ({ name: f.replace(/\.[^.]+$/, ""), file: path.join(SRC, f) }));
} else items = JSON.parse(fs.readFileSync(SRC, "utf8"));

const CACHE = path.join(FACES, "cache");
const { server, port } = await startServer(0);
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ["--enable-features=SharedArrayBuffer"] });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("  [page " + m.type() + "]", m.text().slice(0, 200)); });
page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 300)));
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });

let done = 0, failed = 0;
for (const it of items) {
  const dir = `${SET}/${it.name}`;
  const metaFile = path.join(CACHE, dir, "meta.json");
  let have = [];
  if (fs.existsSync(metaFile) && !force) {
    const m = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    have = ["seg", "faces", "hair"].filter((k) => m[k]);
    if (what.every((k) => have.includes(k))) { done++; continue; }
  }
  const url = `/file?p=${encodeURIComponent(it.file)}`;
  const t0 = Date.now();
  try {
    const prev = fs.existsSync(metaFile) && !force ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {};
    const meta = await page.evaluate(([n, u, d, w]) => window.capture(n, u, d, w), [it.name, url, dir, what]);
    // keep what an earlier capture already saved (the page rewrote meta.json with only this run's parts)
    fs.writeFileSync(metaFile, JSON.stringify({ ...prev, ...meta }));
    console.log(`${it.name}: ${meta.width}x${meta.height}` + (meta.seg ? ` seg ${meta.seg.ms}ms` : "") + (meta.faces ? ` faces ${meta.faces.n} (${meta.faces.ms}ms)` : "") + (meta.hair ? ` hair ${meta.hair.ms}ms` : "") + ` [${Date.now() - t0}ms]`);
    done++;
  } catch (e) {
    failed++;
    console.log(`${it.name}: FAILED ${String(e).slice(0, 200)}`);
  }
}
await browser.close();
server.close();
console.log(`captured ${done}, failed ${failed}`);
