// Capture the typed-text matrix in headless Chromium with the site's REAL text.js. usage: node capture_text.mjs [--force]
// writes text/cache/typed/<cell>/{alpha.u8, meta.json}, text/cache/typed/manifest.json (every cell) and fonts.json (which family each font id really drew with).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startServer } from "./server_text.mjs";
import { cells } from "./matrix.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(HERE);
const require = createRequire(path.join(SCRATCH, "node_modules", "x.js"));
const { chromium } = require("playwright-core");
const force = process.argv.includes("--force");
const CACHE = path.join(HERE, "cache", "typed");
fs.mkdirSync(CACHE, { recursive: true });

const { server, port } = await startServer(0);
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });

const fonts = await page.evaluate(() => window.fontReport());
fs.writeFileSync(path.join(CACHE, "fonts.json"), JSON.stringify(fonts, null, 1));
console.log("fonts drawn with:", fonts.map((f) => `${f.id}=${f.used}`).join(", "));

const all = cells();
let done = 0, skipped = 0;
for (const c of all) {
  const dir = path.join(CACHE, c.id);
  if (!force && fs.existsSync(path.join(dir, "meta.json")) && fs.existsSync(path.join(dir, "alpha.u8"))) { skipped++; continue; }
  const meta = await page.evaluate(([cell, d]) => window.captureText(cell, d), [c, `typed/${c.id}`]);
  if (meta.colourLeak) console.log(`  ${c.id}: ${meta.colourLeak} pixels are not black (the alpha-only cache would be wrong)`);
  done++;
}
fs.writeFileSync(path.join(CACHE, "manifest.json"), JSON.stringify(all, null, 1));
console.log(`captured ${done}, kept ${skipped}, cells ${all.length}`);
await browser.close();
server.close();
