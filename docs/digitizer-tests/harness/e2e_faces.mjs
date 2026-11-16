// End-to-end test of the REAL page (the production build) in headless Chromium.
// usage: node e2e_faces.mjs <out dir of the build> <results dir> [case,case,...]
// Each case: upload a picture like a visitor, wait for the conversion, read what the Picture panel says, switch to the Stitches step, read the numbers, take pictures,
// download the DST. Also checks which model files were requested, console errors, and the crop-to-face action; plus robustness cases (landmarker file missing, person finder off, phone width).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startOut } from "./serve_out.mjs";

const FACES = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(FACES);
const require = createRequire(path.join(SCRATCH, "node_modules", "x.js"));
const { chromium } = require("playwright-core");
const [, , OUTDIR, RESULTS, ONLY] = process.argv;
fs.mkdirSync(RESULTS, { recursive: true });
const IN3 = path.join(SCRATCH, "inputs3"), IN4 = path.join(SCRATCH, "inputs4_dade");
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");

const CASES = {
  astronaut: { file: path.join(IN3, "face_armstrong.png"), face: true, crop: true },
  chawla: { file: path.join(IN4, "faces_colour_chawla_nasa_portrait.png"), face: true },
  rose: { file: path.join(IN4, "faces_colour_young_woman_rose.png"), face: true },
  pearl: { file: path.join(IN3, "painting_pearl.png"), face: true },
  einstein: { file: path.join(IN3, "face_einstein.png"), face: false }, // read as artwork: the person finder is not asked
  dog: { file: path.join(IN3, "dog.png"), face: false }, // the person model says "person" for a dog, the face finder finds no face: no face note
  cat: { file: path.join(IN3, "cat.png"), face: false }, // a photo with no person: the face finder is not asked
  logo: { file: path.join(IN3, "logo_nike.png"), face: false, noModels: true },
  sign: { file: path.join(IN4, "text_sans_sign_medstead.png"), face: false },
  pencil: { file: path.join(IN4, "faces_art_pencil_elderly_lady.png"), face: null },
  crowd: { file: path.join(IN4, "faces_small_street_crowd.png"), face: false },
  // robustness
  nolandmarker: { file: path.join(IN3, "face_armstrong.png"), face: false, blockLandmarker: true },
  peopleoff: { file: path.join(IN3, "face_armstrong.png"), face: false, peopleOff: true, noModels: true },
  phone: { file: path.join(IN3, "face_armstrong.png"), face: true, viewport: { width: 390, height: 844 } },
};
const wanted = ONLY ? ONLY.split(",") : Object.keys(CASES);

const { server, port } = await startOut(OUTDIR, 0);
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: exe, headless: true });
const report = [];

async function waitConverted(page, t0, timeout = 240000) {
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || ""));
    return !!b && /Convert again/.test(b.textContent) && !b.disabled && document.querySelectorAll(".dz-pal li").length > 0;
  }, null, { timeout, polling: 200 });
  return Date.now() - t0;
}
const panelNotes = (page) => page.evaluate(() => ({
  warn: [...document.querySelectorAll(".dz-warn")].map((e) => e.textContent.trim()),
  notes: [...document.querySelectorAll(".dz-note-inline")].map((e) => e.textContent.trim()),
  buttons: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter((t) => /Crop to the face|Convert again|Crop$|Reset crop/.test(t)),
  size: ([...document.querySelectorAll(".dz-hint")].map((e) => e.textContent.trim()).find((t) => /^[\d.]+ × [\d.]+ mm/.test(t)) || null),
}));

for (const name of wanted) {
  const c = CASES[name];
  if (!c) continue;
  const rec = { name, file: path.basename(c.file) };
  const ctx = await browser.newContext({ viewport: c.viewport || { width: 1500, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on("console", (m) => { if (["error"].includes(m.type())) errors.push(m.text().slice(0, 240)); if (/\[digitizer\]/.test(m.text())) rec.digitizerLog = (rec.digitizerLog || []).concat(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 240)));
  const bad = [];
  page.on("response", (r) => { const u = r.url(); if (/\/mediapipe\//.test(u)) requests.push(`${r.status()} ${u.split("/mediapipe/")[1]}`); if (r.status() >= 400) bad.push(`${r.status()} ${u.replace(base, "")}`); });
  if (c.blockLandmarker) await page.route("**/face_landmarker.task", (r) => r.fulfill({ status: 404, body: "no" }));
  try {
    await page.goto(`${base}/digitizer/`, { waitUntil: "load" });
    await page.waitForSelector('input[aria-label="Choose a picture"]', { state: "attached", timeout: 60000 });
    if (c.peopleOff) { /* set after the picture is placed: the toggle lives in the Picture panel */ }
    const t0 = Date.now();
    await page.setInputFiles('input[aria-label="Choose a picture"]', c.file);
    if (c.peopleOff) {
      const tog = page.getByLabel("Find the person in a photo");
      await tog.waitFor({ timeout: 60000 });
      // switch it off, then wait for the new conversion
      await tog.uncheck().catch(() => tog.click());
    }
    rec.convertMs = await waitConverted(page, t0);
    // a second conversion may follow (a new picture is read, made as big as the hoop allows, read again): let the UI settle
    await page.waitForTimeout(1500);
    await waitConverted(page, Date.now());
    rec.picture = await panelNotes(page);
    rec.requests = requests.slice();
    await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, `${name}_picture.png`) }).catch(() => {});
    await page.screenshot({ path: path.join(RESULTS, `${name}_page.png`) });
    if (c.viewport) {
      rec.overflowX = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
      const panel = page.locator(".dz-panel, [aria-label='Picture'], .kb-hd").first();
    }
    // the Stitches step
    await page.locator('[title="See the stitches and save the file"]').first().click();
    await page.waitForFunction(() => { const dt = [...document.querySelectorAll("dt")].find((d) => d.textContent === "Stitches"); const dd = dt && dt.nextElementSibling; return !!dd && /\d/.test(dd.textContent) && !/Making the stitches/.test(document.body.textContent); }, null, { timeout: 240000 });
    await page.waitForTimeout(800);
    rec.summary = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("dl > div")].map((d) => [d.querySelector("dt")?.textContent, d.querySelector("dd")?.textContent]).filter((x) => x[0])));
    await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, `${name}_stitches.png`) }).catch(() => {});
    // the DST, like a visitor saving it
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: "Download DST" }).click()]);
    const dstPath = path.join(RESULTS, `${name}.dst`);
    await dl.saveAs(dstPath);
    rec.dst = { file: path.basename(dstPath), bytes: fs.statSync(dstPath).size };
    // crop to the face
    if (c.crop) {
      await page.locator('[title="Cut away what is round the head and shoulders, then make the result fill the hoop"]').first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
      await page.locator('[title="See the stitches and save the file"]').first().waitFor({ timeout: 5000 });
      // back to the Picture step
      await page.locator('[title="The picture, its size, crop and colours"]').first().click();
      await page.waitForTimeout(500);
      const btn = page.getByRole("button", { name: "Crop to the face" });
      rec.cropButtonBefore = await btn.count();
      if (rec.cropButtonBefore) {
        const before = await panelNotes(page);
        await btn.first().click();
        await page.waitForTimeout(800);
        const t1 = Date.now();
        rec.cropConvertMs = await waitConverted(page, t1);
        await page.waitForTimeout(1500);
        await waitConverted(page, Date.now());
        rec.afterCrop = await panelNotes(page);
        rec.beforeCrop = before;
        await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, `${name}_cropped_picture.png`) }).catch(() => {});
        await page.locator('[title="See the stitches and save the file"]').first().click();
        await page.waitForTimeout(3000);
        await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, `${name}_cropped_stitches.png`) }).catch(() => {});
        rec.summaryAfterCrop = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("dl > div")].map((d) => [d.querySelector("dt")?.textContent, d.querySelector("dd")?.textContent]).filter((x) => x[0])));
        // undo brings the old crop back
        await page.keyboard.press("Control+z").catch(() => {});
      }
    }
    // checks
    const allText = [...(rec.picture.warn || []), ...(rec.picture.notes || [])].join(" | ");
    rec.faceNote = /The face is (only )?about/.test(allText) ? allText.match(/The face is (only )?about .*? mm\./)[0] : null;
    rec.faceWarning = (rec.picture.warn || []).some((w) => /The face is only about/.test(w));
    rec.modelsRequested = [...new Set(requests.map((r) => r.replace(/^\d+ /, "")))];
    rec.landmarkerRequested = requests.some((r) => /face_landmarker\.task/.test(r));
    rec.personModelRequested = requests.some((r) => /selfie_multiclass/.test(r));
    if (c.noModels) rec.checkNoModels = !rec.personModelRequested && !rec.landmarkerRequested;
    if (c.face === true) rec.checkFaceNote = !!rec.faceNote;
    if (c.face === false) rec.checkNoFaceNote = !rec.faceNote;
  } catch (e) {
    rec.failed = String(e).slice(0, 400);
    await page.screenshot({ path: path.join(RESULTS, `${name}_FAILED.png`) }).catch(() => {});
  }
  // the native TFLite message is logged as "error" by Chromium; Next's background prefetches of route data are answered by Cloudflare in production and 404 on this simple server
  rec.errors = errors.filter((e) => !/XNNPACK delegate/.test(e) && !/Failed to load resource/.test(e));
  rec.badResponses = bad;
  rec.badResponsesReal = bad.filter((b) => !/__next\./.test(b) && !/\.txt/.test(b));
  report.push(rec);
  console.log(JSON.stringify({ name, ms: rec.convertMs, face: rec.faceNote, warn: rec.faceWarning, crop: rec.cropButtonBefore, models: rec.modelsRequested.map((m) => m.replace("wasm/vision_wasm_internal", "wasm")), stitches: rec.summary && rec.summary.Stitches, errors: rec.errors.length, bad: rec.badResponsesReal.length, failed: rec.failed || null }));
  await ctx.close();
}
fs.writeFileSync(path.join(RESULTS, "e2e_report.json"), JSON.stringify(report, null, 1));
await browser.close();
server.close();
console.log("wrote", path.join(RESULTS, "e2e_report.json"));
