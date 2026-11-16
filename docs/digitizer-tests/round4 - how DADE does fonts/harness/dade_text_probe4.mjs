// Fourth probe: what does DADE's inspector say for single letter islands (fill type, density, angle, underlay...)?
// usage: node dade_text_probe4.mjs <png> <outdir> [island numbers, comma separated]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const IMG = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
const PICK = (process.argv[4] || "18,60,110").split(",").map(Number);
fs.mkdirSync(OUT, { recursive: true });
const CHROME = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const shot = (n) => page.screenshot({ path: path.join(OUT, n + ".png") });
const inspector = async () => page.evaluate(() => {
  const t = document.body.innerText.replace(/[ \t]+/g, " ").replace(/\n+/g, " | ");
  const i = t.lastIndexOf("INSPECTOR");
  return i >= 0 ? t.slice(i, i + 3500) : t.slice(0, 2500);
});
const controls = async () => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("input, select, textarea")) {
    if (el.type === "file") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const lab = (el.labels && el.labels[0] && el.labels[0].innerText) || el.getAttribute("aria-label") || el.title || el.name || el.id || (el.parentElement && el.parentElement.innerText) || "";
    let opts = "";
    if (el.tagName === "SELECT") opts = " [" + [...el.options].map((o) => o.text).join(" | ") + "]";
    out.push(el.tagName.toLowerCase() + ":" + el.type + " '" + lab.replace(/\s+/g, " ").slice(0, 70) + "' = " + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) + (el.min ? " (min " + el.min + " max " + el.max + " step " + el.step + ")" : "") + opts);
  }
  return out.join("\n");
});

await page.goto("https://png2dst.com", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
await page.locator("input[type=file]").first().setInputFiles(IMG);
await page.waitForURL(/editor/, { timeout: 60000 });
await page.waitForSelector("text=/Detected \\d+ islands/i", { timeout: 120000 });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: /Generate Preview/i }).first().click();
await page.waitForSelector("text=/Generated \\d+ stitches/i", { timeout: 180000 });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /^Fills$/i }).first().click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(1000);
const arrows = page.locator("button, [role=button], summary, span, div").filter({ hasText: /^▶$/ });
console.log("arrows", await arrows.count(), "li before", await page.locator("li").count());
await arrows.first().click({ timeout: 4000 });
await page.waitForTimeout(1500);
console.log("li after", await page.locator("li").count());
if ((await page.locator("li").count()) === 0) {
  await page.locator("text=Color 1").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log("li after clicking the Color 1 text", await page.locator("li").count());
}
await shot("after_expand");

for (const n of PICK) {
  try {
    const li = page.locator("li").nth(n);
    console.log("clicking li #" + n + ": " + (await li.innerText()).replace(/\s+/g, " "));
    await li.click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    console.log(`=== ISLAND ${n} ===\n` + (await inspector()) + "\n--- controls ---\n" + (await controls()));
    await shot("island_" + n);
  } catch (e) {
    console.log("island " + n + " failed: " + String(e).slice(0, 150));
  }
}
await browser.close();
