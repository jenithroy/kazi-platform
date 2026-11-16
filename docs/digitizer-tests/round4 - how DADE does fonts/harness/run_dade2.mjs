// png2dst.com / DADE on the detail set (1000 px wide = 100 mm), default one-click flow.
// usage: node run_dade2.mjs <root> <image,image,...>
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2]);
const IMAGES = (process.argv[3] || "chart.png").split(",");
const CHROME = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const INDIR = process.env.INDIR || "inputs2";
const OUTDIR = process.env.OUTDIR || "out2";
const OUT = path.join(ROOT, OUTDIR, "png2dst");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const results = [];
for (const img of IMAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const rec = { tool: "png2dst", img };
  const base = img.replace(/\.[a-z]+$/, "");
  const t0 = Date.now();
  try {
    await page.goto("https://png2dst.com", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.locator("input[type=file]").first().setInputFiles(path.join(ROOT, INDIR, img));
    await page.waitForURL(/editor/, { timeout: 60000 });
    await page.waitForSelector("text=/Detected \\d+ islands/i", { timeout: 90000 });
    rec.detect = await page.evaluate(() => (document.body.innerText.match(/Detected \d+ islands?/i) || [""])[0]);
    await page.getByRole("button", { name: /Generate Preview/i }).click();
    await page.waitForSelector("text=/Generated \\d+ stitches/i", { timeout: 120000 });
    const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    const m = txt.match(/Stitches\s*([\d,]+)\s*Jumps\s*([\d,]+)\s*Color Changes\s*([\d,]+)\s*Size\s*([\d.]+)\s*x\s*([\d.]+)\s*mm/i);
    if (m) Object.assign(rec, { stitches: +m[1].replace(/,/g, ""), jumps: +m[2], colour_changes: +m[3], w: +m[4], h: +m[5] });
    await page.getByRole("button", { name: /Download/i }).first().click();
    await page.waitForTimeout(1500);
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), page.getByRole("button", { name: /Download original \.dst/i }).click()]);
    await dl.saveAs(path.join(OUT, base + ".dst"));
    rec.saved = base + ".dst";
    await page.screenshot({ path: path.join(OUT, base + ".ui.png") });
  } catch (e) {
    rec.error = String(e).slice(0, 200);
  }
  rec.secs = ((Date.now() - t0) / 1000).toFixed(1);
  results.push(rec);
  console.log(JSON.stringify(rec));
  await ctx.close();
}
fs.writeFileSync(path.join(OUT, "ui-stats.json"), JSON.stringify(results, null, 1));
await browser.close();
