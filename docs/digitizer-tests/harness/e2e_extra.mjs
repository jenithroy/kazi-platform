// Extra real-page checks on the production build: (1) the face note and "Crop to the face" on a phone, (2) an axe accessibility scan with the note and the button on screen,
// (3) undo after "Crop to the face".   usage: node e2e_extra.mjs <out dir> <results dir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startOut } from "./serve_out.mjs";

const FACES = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(FACES);
const require = createRequire(path.join(SCRATCH, "node_modules", "x.js"));
const { chromium } = require("playwright-core");
const axeSource = fs.readFileSync(path.join(SCRATCH, "node_modules", "axe-core", "axe.min.js"), "utf8");
const [, , OUTDIR, RESULTS] = process.argv;
fs.mkdirSync(RESULTS, { recursive: true });
const FILE = path.join(SCRATCH, "inputs3", "face_armstrong.png");
const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const { server, port } = await startOut(OUTDIR, 0);
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: exe, headless: true });
const out = {};

async function open(viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error" && !/XNNPACK|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await page.goto(`${base}/digitizer/`, { waitUntil: "load" });
  await page.waitForSelector('input[aria-label="Choose a picture"]', { state: "attached" });
  await page.setInputFiles('input[aria-label="Choose a picture"]', FILE);
  const settle = async () => {
    await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || "")); return !!b && /Convert again/.test(b.textContent) && !b.disabled && document.querySelectorAll(".dz-pal li").length > 0; }, null, { timeout: 240000, polling: 200 });
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || "")); return !!b && /Convert again/.test(b.textContent) && !b.disabled; }, null, { timeout: 240000, polling: 200 });
  };
  await settle();
  // dismiss the cookie banner so it does not cover the panel
  await page.getByRole("button", { name: "Necessary Only" }).click({ timeout: 2000 }).catch(() => {});
  return { ctx, page, errors, settle };
}
const faceLine = (page) => page.evaluate(() => { const p = [...document.querySelectorAll(".dz-note-inline, .dz-warn")].find((e) => /The face is/.test(e.textContent)); return p ? p.textContent.trim() : null; });

// (1) a phone
{
  const { ctx, page, errors } = await open({ width: 390, height: 844 });
  const note = page.locator("p", { hasText: "The face is about" }).first();
  await note.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(RESULTS, "phone_face_note.png") });
  const box = await note.boundingBox();
  const btn = page.getByRole("button", { name: "Crop to the face" });
  const bb = await btn.boundingBox();
  out.phone = { note: await faceLine(page), noteFitsWidth: box && box.x >= 0 && box.x + box.width <= 390, buttonVisible: !!bb, buttonFitsWidth: bb && bb.x >= 0 && bb.x + bb.width <= 390, overflowX: await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth), errors };
  await ctx.close();
}
// (2) accessibility, desktop, with the note and the button on screen
{
  const { ctx, page, errors } = await open({ width: 1500, height: 950 });
  await page.getByRole("button", { name: "Crop to the face" }).scrollIntoViewIfNeeded();
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => { const r = await window.axe.run(document, { resultTypes: ["violations"] }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })); });
  out.axe = { violations: res, count: res.length, errors };
  // (3) undo after the crop
  const before = await faceLine(page);
  await page.getByRole("button", { name: "Crop to the face" }).click();
  await page.waitForTimeout(800);
  await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || "")); return !!b && /Convert again/.test(b.textContent) && !b.disabled; }, null, { timeout: 240000, polling: 200 });
  await page.waitForTimeout(1500);
  const cropped = await faceLine(page);
  const steps = [];
  for (let i = 0; i < 5; i++) {
    const undo = page.getByRole("button", { name: "Undo" });
    if (await undo.isDisabled()) break;
    await undo.click();
    await page.waitForTimeout(1200);
    steps.push(await faceLine(page));
    if (steps[steps.length - 1] && steps[steps.length - 1] === before) break;
  }
  const mmOf = (s) => (s && /about ([\d.]+) mm wide/.test(s) ? Number(s.match(/about ([\d.]+) mm wide/)[1]) : null);
  const b0 = mmOf(before);
  // every note after an undo says what the picture is now: the face as wide as before the crop (the picture is back at its old size, cropped or not)
  out.undo = { before, cropped, afterUndo: steps, returnedToBefore: steps.some((s) => mmOf(s) !== null && Math.abs(mmOf(s) - b0) <= 1.2), everyNoteMatchesThePicture: steps.every((s) => s === null || Math.abs(mmOf(s) - b0) <= 1.2), errors };
  await ctx.close();
}
fs.writeFileSync(path.join(RESULTS, "e2e_extra.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ phone: out.phone, axeViolations: out.axe.violations.map((v) => `${v.id}(${v.impact}) x${v.nodes}`), undo: out.undo }, null, 1));
await browser.close();
server.close();
