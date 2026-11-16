// Capture the wider font set in headless Chromium with the site's REAL text.js. usage: node capture_text2.mjs [--force]
// writes text/cache/typed2/<cell>/{alpha.u8, meta.json} and typed2/manifest.json
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startServer } from "./server_text.mjs";
import { cells } from "./matrix2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(HERE);
const require = createRequire(path.join(SCRATCH, "node_modules", "x.js"));
const { chromium } = require("playwright-core");
const force = process.argv.includes("--force");
const CACHE = path.join(HERE, "cache", "typed2");
fs.mkdirSync(CACHE, { recursive: true });
const { server, port } = await startServer(0);
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text().slice(0, 200)); });
await page.goto(`http://127.0.0.1:${port}/text_harness2.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
console.log("fonts loaded:", (await page.evaluate(() => window.loadFonts())).join(", "));
const all = cells();
let done = 0, skipped = 0;
for (const c of all) {
  const dir = path.join(CACHE, c.id);
  if (!force && fs.existsSync(path.join(dir, "meta.json")) && fs.existsSync(path.join(dir, "alpha.u8"))) { skipped++; continue; }
  await page.evaluate(([cell, d]) => window.captureText(cell, d), [c, `typed2/${c.id}`]);
  done++;
}
fs.writeFileSync(path.join(CACHE, "manifest.json"), JSON.stringify(all, null, 1));
console.log(`captured ${done}, kept ${skipped}, cells ${all.length}`);
await browser.close();
server.close();
