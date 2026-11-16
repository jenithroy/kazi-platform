// Firefox smoke test of the person + face pipeline on the production build (puppeteer-core, WebDriver BiDi, the installed Firefox).
// usage: node ff_smoke.mjs <out dir of the build> <results dir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startOut } from "./serve_out.mjs";

const FACES = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(FACES);
const require = createRequire(path.join(SCRATCH, "node_modules", "x.js"));
const puppeteer = require("puppeteer-core");
const [, , OUTDIR, RESULTS] = process.argv;
fs.mkdirSync(RESULTS, { recursive: true });
const { server, port } = await startOut(OUTDIR, 0);
const base = `http://127.0.0.1:${port}`;
const file = fs.realpathSync.native(path.join(SCRATCH, "inputs3", "face_armstrong.png"));
const browser = await puppeteer.launch({ browser: "firefox", executablePath: "C:/Program Files/Mozilla Firefox/firefox.exe", protocol: "webDriverBiDi", headless: true, args: ["-no-remote"], env: { ...process.env, MOZ_NO_REMOTE: "1" } });
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });
const errors = [], models = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error" && !/XNNPACK|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200)); });
page.on("response", (r) => { const u = r.url(); if (/\/mediapipe\//.test(u)) models.push(`${r.status()} ${u.split("/mediapipe/")[1]}`); });
const out = { browser: await browser.version() };
const settle = async () => {
  await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || "")); return !!b && /Convert again/.test(b.textContent) && !b.disabled && document.querySelectorAll(".dz-pal li").length > 0; }, { timeout: 240000, polling: 300 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || "")); return !!b && /Convert again/.test(b.textContent) && !b.disabled; }, { timeout: 240000, polling: 300 });
};
const faceLine = () => page.evaluate(() => { const p = [...document.querySelectorAll(".dz-note-inline, .dz-warn")].find((e) => /The face is/.test(e.textContent)); return p ? p.textContent.trim() : null; });
try {
  await page.goto(`${base}/digitizer/`, { waitUntil: "load" });
  const input = await page.waitForSelector('input[aria-label="Choose a picture"]', { timeout: 60000 });
  const t0 = Date.now();
  await input.uploadFile(file);
  await settle();
  out.convertMs = Date.now() - t0;
  out.faceNote = await faceLine();
  out.models = [...new Set(models)];
  out.cropButton = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => /Crop to the face/.test(b.textContent)));
  const stitchesOf = () => page.evaluate(() => { const dt = [...document.querySelectorAll("dt")].find((d) => d.textContent === "Stitches"); return dt && dt.nextElementSibling ? dt.nextElementSibling.textContent : null; });
  await page.click('[title="See the stitches and save the file"]');
  await page.waitForFunction(() => { const dt = [...document.querySelectorAll("dt")].find((d) => d.textContent === "Stitches"); const dd = dt && dt.nextElementSibling; return !!dd && /\d/.test(dd.textContent); }, { timeout: 240000, polling: 300 });
  await new Promise((r) => setTimeout(r, 1000));
  out.stitches = await stitchesOf();
  await page.screenshot({ path: path.join(RESULTS, "firefox_stitches.png") });
  // back to the Picture step and crop to the face
  await page.click('[title="The picture, its size, crop and colours"]');
  await new Promise((r) => setTimeout(r, 500));
  const [btn] = await page.$$("::-p-text(Crop to the face)");
  if (btn) {
    await btn.click();
    await new Promise((r) => setTimeout(r, 1200));
    await settle();
    out.afterCrop = await faceLine();
  }
} catch (e) {
  out.failed = String(e).slice(0, 400);
  await page.screenshot({ path: path.join(RESULTS, "firefox_FAILED.png") }).catch(() => {});
}
out.errors = errors;
fs.writeFileSync(path.join(RESULTS, "firefox_smoke.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
