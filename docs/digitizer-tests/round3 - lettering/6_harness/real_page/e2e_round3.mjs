// End-to-end test of the REAL page (the production build) for the lettering round: lettering found in a picture, the notes in the text tool, the look-alike fonts.
// usage: node e2e_round3.mjs <out dir of the build> <results dir>
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
const SRC = path.join(SCRATCH, "text2", "src"), IN3 = path.join(SCRATCH, "inputs3");
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
  const errors = [], requests = [];
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 240)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 240)));
  page.on("response", (r) => { if (/\/fonts\/digitizer\//.test(r.url())) requests.push(`${r.status()} ${r.url().split("/").pop()}`); });
  await page.goto(`${base}/digitizer/`, { waitUntil: "load" });
  await page.waitForSelector('input[aria-label="Choose a picture"]', { state: "attached", timeout: 60000 });
  return { page, ctx, errors, requests };
}
const notes = (page) => page.evaluate(() => [...document.querySelectorAll(".dz-note-inline, .dz-warn")].map((e) => e.textContent.trim()));

// ---------------------------------------------------------------- 1. lettering found in pictures, through the real worker
for (const [name, file, expectLetters] of [["chart", path.join(SRC, "chart2__chart.png"), true], ["crest", path.join(SRC, "reg18__crest_manzanares.png"), true], ["sdl", path.join(SRC, "new55__emblems_logo_sdl.png"), true], ["nike", path.join(IN3, "logo_nike.png"), false]]) {
  if (!fs.existsSync(file)) { console.log("skip (no picture)", name); continue; }
  const { page, ctx, errors } = await newPage();
  await page.setInputFiles('input[aria-label="Choose a picture"]', file);
  await waitConverted(page);
  await page.waitForTimeout(1200);
  await waitConverted(page);
  const ns = await notes(page);
  const found = ns.find((t) => /^Lettering found:/.test(t));
  console.log("   ", name, "->", found || "(no lettering note)");
  ok(`${name}: ${expectLetters ? "the lettering is found and the Picture panel says so, with how tall the smallest is" : "no lettering is found, no note"}`, expectLetters ? !!found && /\d+ mm tall/.test(found) : !found, found || ns.join(" | ").slice(0, 160));
  const s = await stitchesStep(page);
  await page.locator('[aria-label="Canvas"]').screenshot({ path: path.join(RESULTS, `${name}_stitches.png`) }).catch(() => {});
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: "Download DST" }).click()]);
  const dst = path.join(RESULTS, `${name}.dst`);
  await dl.saveAs(dst);
  ok(`${name}: stitched (${s.Stitches}) and a DST was written`, num(s.Stitches) > 500 && fs.statSync(dst).size > 3000, `${s.Stitches} stitches, ${fs.statSync(dst).size} bytes`);
  ok(`${name}: no console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------- 2. the text tool: the note follows the font and the height, and the way out works
{
  const { page, ctx, errors, requests } = await newPage();
  await page.locator('[title="Text (T)"]').first().click();
  await page.locator('[aria-label="Canvas"]').click({ position: { x: 400, y: 300 } });
  const words = page.locator('textarea[aria-label="The words"]');
  await words.waitFor({ timeout: 20000 });
  await words.fill("AVE MARIA");
  const font = page.locator('select[aria-label="Font"]');
  const size = page.locator('input[aria-label="Letter height in millimetres"]');
  const warn = () => page.evaluate(() => [...document.querySelectorAll(".dz-warn")].map((e) => e.textContent.trim()).join(" | "));
  const setFont = async (label) => { await font.selectOption({ label }).catch(async () => font.selectOption(label.toLowerCase())); await page.waitForTimeout(1500); };
  const setSize = async (v) => { await size.fill(String(v)); await size.press("Enter"); await page.waitForTimeout(1500); };
  await setFont("Times"); await setSize(2.5);
  const wTimes3 = await warn();
  ok("Times at 2.5 mm: the note says the thin strokes cannot be stitched and offers Sans", /thin strokes and serifs of Times cannot be stitched/.test(wTimes3) && (await page.getByRole("button", { name: "Use Sans" }).count()) === 1, wTimes3.slice(0, 160));
  await page.screenshot({ path: path.join(RESULTS, "text_times_2_5mm_note.png") }).catch(() => {});
  await setSize(4);
  const wTimes4 = await warn();
  ok("Times at 4 mm: still a note (tight: the thin strokes are stitched heavier than drawn), and the way out is offered", /stitched heavier than drawn/.test(wTimes4) && (await page.getByRole("button", { name: "Use Sans" }).count()) === 1, wTimes4.slice(0, 160));
  await page.getByRole("button", { name: "Use Sans" }).click();
  await page.waitForTimeout(1500);
  const fontNow = await font.evaluate((el) => el.options[el.selectedIndex].textContent.trim());
  ok("the Use Sans button switches the font to Sans", /^Sans$/.test(fontNow), fontNow);
  await setSize(5);
  ok("Sans at 5 mm: no note", (await warn()) === "", await warn());
  await setFont("Times"); await setSize(8);
  ok("Times at 8 mm: no note (it is big enough for its hairlines)", (await warn()) === "", await warn());
  await setFont("Condensed"); await setSize(4);
  const wCond = await warn();
  ok("Condensed (heavy) at 4 mm: the note says the holes of a, e, o close up", /heavy face closes up/.test(wCond), wCond.slice(0, 140));
  await setFont("Sans"); await setSize(2);
  ok("Sans at 2 mm: too small to read, said plainly", /too small for thread to read/.test(await warn()), (await warn()).slice(0, 140));
  // the look-alike fonts: asked for when a text uses the four faces, and they load
  for (const f of ["Sans heavy", "Condensed", "Script", "Rounded"]) { await setFont(f); await setSize(8); }
  await page.waitForTimeout(1500);
  console.log("   font files:", JSON.stringify(requests));
  ok("the four look-alike fonts were fetched and loaded (HTTP 200) when a text used those faces", ["kazi-heavy", "kazi-condensed", "kazi-script", "kazi-round-700"].every((n) => requests.some((r) => r.startsWith("200") && r.includes(n))), JSON.stringify(requests));
  const loaded = await page.evaluate(() => ["Kazi Heavy", "Kazi Condensed", "Kazi Script", "Kazi Round"].map((f) => [f, document.fonts.check(`700 20px "${f}"`)]));
  ok("document.fonts knows the four look-alikes as loaded", loaded.every(([, v]) => v), JSON.stringify(loaded));
  const s = await stitchesStep(page);
  ok("the text is stitched", num(s.Stitches) > 100, s.Stitches);
  ok("no console errors in the text tool", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

fs.writeFileSync(path.join(RESULTS, "report.json"), JSON.stringify(report, null, 1));
console.log(`\n${report.filter((r) => r.ok).length} of ${report.length} checks passed`);
await browser.close();
server.close();
process.exit(report.every((r) => r.ok) ? 0 : 1);

