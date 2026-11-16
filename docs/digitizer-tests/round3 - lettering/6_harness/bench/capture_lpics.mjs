// Capture the lettering pictures in headless Chromium with the site's REAL text.js fonts. usage: node capture_lpics.mjs [--force]
// writes text/cache/lpics/<id>/{image.rgba, meta.json} and lpics/manifest.json
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startServer } from "./server_text.mjs";
import { pictures } from "./lpics_matrix.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(HERE);
const require = createRequire(path.join(SCRATCH, "node_modules", "x.js"));
const { chromium } = require("playwright-core");
const force = process.argv.includes("--force");
const CACHE = path.join(HERE, "cache", "lpics");
fs.mkdirSync(CACHE, { recursive: true });
const { server, port } = await startServer(0);
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
await page.goto(`http://127.0.0.1:${port}/lpics_harness.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const all = pictures();
let done = 0, skipped = 0;
for (const p of all) {
  const dir = path.join(CACHE, p.id);
  if (!force && fs.existsSync(path.join(dir, "meta.json")) && fs.existsSync(path.join(dir, "image.rgba"))) { skipped++; continue; }
  await page.evaluate(([spec, d]) => window.capturePicture(spec, d), [p, `lpics/${p.id}`]);
  done++;
}
fs.writeFileSync(path.join(CACHE, "manifest.json"), JSON.stringify(all.map(({ texts, extras, ...rest }) => ({ ...rest, nTexts: texts.length })), null, 1));
console.log(`captured ${done}, kept ${skipped}, pictures ${all.length}`);
await browser.close();
server.close();
