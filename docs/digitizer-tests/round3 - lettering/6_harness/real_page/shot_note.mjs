// Screenshots of the new notes in the real page: the text note with its button, and the picture panel's lettering note.
// usage: node shot_note.mjs <out dir of the build> <results dir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startOut } from "./serve_out.mjs";
const FACES = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(FACES);
const require = createRequire(path.join(SCRATCH, "node_modules", "x.js"));
const { chromium } = require("playwright-core");
const [, , OUTDIR, RESULTS] = process.argv;
fs.mkdirSync(RESULTS, { recursive: true });
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const { server, port } = await startOut(OUTDIR, 0);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/digitizer/`, { waitUntil: "load" });
await page.waitForSelector('input[aria-label="Choose a picture"]', { state: "attached", timeout: 60000 });
await page.getByRole("button", { name: "Necessary Only" }).click().catch(() => {});
// 1. the text note
await page.locator('[title="Text (T)"]').first().click();
await page.locator('[aria-label="Canvas"]').click({ position: { x: 400, y: 300 } });
const words = page.locator('textarea[aria-label="The words"]');
await words.waitFor({ timeout: 20000 });
await words.fill("AVE MARIA");
await page.locator('select[aria-label="Font"]').selectOption({ label: "Times" }).catch(() => {});
const size = page.locator('input[aria-label="Letter height in millimetres"]');
await size.fill("4"); await size.press("Enter");
await page.waitForTimeout(2000);
await page.locator(".dz-warn").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(RESULTS, "text_note_times_4mm.png") });
// 2. the picture panel's lettering note
await page.reload({ waitUntil: "load" });
await page.waitForSelector('input[aria-label="Choose a picture"]', { state: "attached", timeout: 60000 });
await page.getByRole("button", { name: "Necessary Only" }).click().catch(() => {});
await page.setInputFiles('input[aria-label="Choose a picture"]', path.join(SCRATCH, "text2", "src", "new55__emblems_logo_sdl.png"));
await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || "")); return !!b && /Convert again/.test(b.textContent) && !b.disabled && document.querySelectorAll(".dz-pal li").length > 0; }, null, { timeout: 240000 });
await page.waitForTimeout(1500);
await page.locator(".dz-warn, .dz-note-inline").filter({ hasText: "Lettering found" }).first().scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(RESULTS, "picture_note_sdl.png") });
await browser.close();
server.close();
console.log("done");
