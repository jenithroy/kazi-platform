// End-to-end test of the REAL page (the production build) for the second round: the background switch, the whites of a face, typed lettering.
// usage: node e2e_round2.mjs <out dir of the build> <results dir>
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
const IN3 = path.join(SCRATCH, "inputs3"), IN4 = path.join(SCRATCH, "inputs4_dade");
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const { server, port } = await startOut(OUTDIR, 0);
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: exe, headless: true });
const report = [];
const ok = (name, cond, extra = "") => { report.push({ name, ok: !!cond, extra }); console.log(cond ? "ok  " : "FAIL", name, extra); };

async function waitConverted(page, timeout = 240000) {
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || ""));
    return !!b && /Convert again/.test(b.textContent) && !b.disabled && document.querySelectorAll(".dz-pal li").length > 0;
  }, null, { timeout, polling: 200 });
}
async function stitchesStep(page) {
  await page.locator('[title="See the stitches and save the file"]').first().click();
  await page.waitForFunction(() => { const dt = [...document.querySelectorAll("dt")].find((d) => d.textContent === "Stitches"); const dd = dt && dt.nextElementSibling; return !!dd && /\d/.test(dd.textContent) && !/Making the stitches/.test(document.body.textContent); }, null, { timeout: 240000 });
  await page.waitForTimeout(800);
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll("dl > div")].map((d) => [d.querySelector("dt")?.textContent, d.querySelector("dd")?.textContent]).filter((x) => x[0])));
}
const num = (s) => Number(String(s || "").replace(/[^\d.]/g, ""));
async function newPage(viewport = { width: 1500, height: 950 }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 240)); }); // (the 404s are Next.js prefetch payloads of other pages, which this plain static server does not have)
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 240)));
  await page.goto(`${base}/digitizer/`, { waitUntil: "load" });
  await page.waitForSelector('input[aria-label="Choose a picture"]', { state: "attached", timeout: 60000 });
  return { page, ctx, errors };
}

// ---------------------------------------------------------------- 1. a logo with the background left out, then not
{
  const { page, ctx, errors } = await newPage();
  await page.setInputFiles('input[aria-label="Choose a picture"]', path.join(IN3, "logo_nike.png"));
  await waitConverted(page);
  await page.waitForTimeout(1200);
  await waitConverted(page);
  const palOn = await page.evaluate(() => [...document.querySelectorAll(".dz-pal li")].map((e) => e.textContent.trim().slice(0, 60)));
  const sOn = await stitchesStep(page);
  await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, "nike_background_left_out_stitches.png") }).catch(() => {});
  await page.locator('[title="The picture, its size, crop and colours"]').first().click();
  await page.waitForTimeout(500);
  const tog = page.getByLabel("Leave out the background");
  ok("the Picture step has the switch, ticked by default", (await tog.count()) === 1 && (await tog.isChecked()));
  await tog.uncheck().catch(() => tog.click());
  await page.waitForTimeout(500);
  await waitConverted(page);
  await page.waitForTimeout(1200);
  await waitConverted(page);
  const palOff = await page.evaluate(() => [...document.querySelectorAll(".dz-pal li")].map((e) => e.textContent.trim().slice(0, 60)));
  const hint = await page.evaluate(() => [...document.querySelectorAll(".dz-hint")].map((e) => e.textContent.trim()).find((t) => /whole picture is stitched/.test(t)) || null);
  const sOff = await stitchesStep(page);
  await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, "nike_background_off_stitches.png") }).catch(() => {});
  console.log("   left out:", sOn.Stitches, "colours", palOn.length, "| off:", sOff.Stitches, "colours", palOff.length);
  ok("with the background switched OFF the whole picture is stitched: far more stitches (the page of the logo too)", num(sOff.Stitches) > 2.5 * num(sOn.Stitches), `${sOn.Stitches} -> ${sOff.Stitches}`);
  console.log("   colours, left out:", JSON.stringify(palOn), "| off:", JSON.stringify(palOff));
  ok("the colour list marks the page's white as left out when the background is left out, and not when it is switched off", palOn.some((t) => /left out|background|cloth/i.test(t)) && !palOff.some((t) => /left out|background|cloth/i.test(t)), JSON.stringify([palOn, palOff]));
  ok("the cloth hint says the whole picture is stitched", !!hint, hint || "");
  await page.locator('[title="The picture, its size, crop and colours"]').first().click();
  await tog.check().catch(() => tog.click());
  await waitConverted(page);
  await page.waitForTimeout(1200);
  await waitConverted(page);
  const sBack = await stitchesStep(page);
  ok("ticking it again gives the first result back (same number of stitches)", sBack.Stitches === sOn.Stitches, `${sOn.Stitches} vs ${sBack.Stitches}`);
  ok("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------- 2. a face with teeth, through the real worker
for (const [name, file] of [["chawla", path.join(IN4, "faces_colour_chawla_nasa_portrait.png")], ["boy", path.join(IN4, "faces_colour_boy_madagascar.png")]]) {
  if (!fs.existsSync(file)) { console.log("skip (no picture)", name); continue; }
  const { page, ctx, errors } = await newPage();
  const logs = [];
  page.on("console", (m) => { if (/\[digitizer\]/.test(m.text())) logs.push(m.text().slice(0, 200)); });
  await page.setInputFiles('input[aria-label="Choose a picture"]', file);
  await waitConverted(page, 300000);
  await page.waitForTimeout(1500);
  await waitConverted(page, 300000);
  const info = await page.evaluate(() => ({ notes: [...document.querySelectorAll(".dz-note-inline")].map((e) => e.textContent.trim()), pal: [...document.querySelectorAll(".dz-pal li")].map((e) => e.textContent.trim().slice(0, 50)) }));
  const s = await stitchesStep(page);
  await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, `${name}_stitches.png`) }).catch(() => {});
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: "Download DST" }).click()]);
  const dst = path.join(RESULTS, `${name}.dst`);
  await dl.saveAs(dst);
  ok(`${name}: the person was found and the picture converted (a person note, colours, stitches)`, info.notes.some((t) => /A person was found/.test(t)) && info.pal.length >= 6 && num(s.Stitches) > 4000, `${info.pal.length} colours, ${s.Stitches} stitches`);
  ok(`${name}: a DST was written`, fs.statSync(dst).size > 10000, `${fs.statSync(dst).size} bytes`);
  ok(`${name}: no console errors, no digitizer warnings`, errors.length === 0 && logs.length === 0, [...errors, ...logs].slice(0, 3).join(" | "));
  fs.writeFileSync(path.join(RESULTS, `${name}_palette.json`), JSON.stringify(info.pal, null, 1));
  await ctx.close();
}

// ---------------------------------------------------------------- 3. typed lettering: serif and sans, bold and not, small
{
  const { page, ctx, errors } = await newPage();
  const cases = [
    { id: "times_bold_5", font: "Times", bold: true, size: 5 },
    { id: "times_regular_5", font: "Times", bold: false, size: 5 },
    { id: "sans_regular_5", font: "Sans", bold: false, size: 5 },
    { id: "sans_bold_8", font: "Sans", bold: true, size: 8 },
  ];
  // a text object: the Text tool, a click on the hoop, then the words and the settings
  const results = {};
  for (const c of cases) {
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector('[title="Text (T)"]', { timeout: 60000 });
    await page.locator('[title="Text (T)"]').first().click();
    await page.locator('[aria-label="Canvas"]').click({ position: { x: 400, y: 300 } });
    const words = page.locator('textarea[aria-label="The words"]');
    await words.waitFor({ timeout: 20000 });
    await words.fill("AVE MARIA");
    await page.locator('select[aria-label="Font"]').selectOption({ label: c.font }).catch(async () => { await page.locator('select[aria-label="Font"]').selectOption(c.font.toLowerCase()); });
    const size = page.locator('input[aria-label="Letter height in millimetres"]');
    await size.fill(String(c.size));
    await size.press("Enter");
    const bold = page.getByLabel("Bold");
    if ((await bold.isChecked()) !== c.bold) await bold.click();
    await page.waitForTimeout(2500);
    const s = await stitchesStep(page);
    await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, `text_${c.id}_stitches.png`) }).catch(() => {});
    results[c.id] = s.Stitches;
    await page.locator('[title="The picture, its size, crop and colours"]').first().click().catch(() => {});
  }
  console.log("   typed text stitches:", JSON.stringify(results));
  ok("typed lettering is stitched at every setting (more than 100 stitches each)", Object.values(results).every((v) => num(v) > 100), JSON.stringify(results));
  ok("no console errors while typing and sewing text", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

fs.writeFileSync(path.join(RESULTS, "report.json"), JSON.stringify(report, null, 1));
console.log(`\n${report.filter((r) => r.ok).length} of ${report.length} checks passed`);
await browser.close();
server.close();
process.exit(report.every((r) => r.ok) ? 0 : 1);
