// Draws the lettering test pictures with headless Chromium (the page's own font table), 10 px to the millimetre.
// usage: node draw.mjs            -> writes bench/inputs/<id>.png  (1000 x 240, navy lettering on white)
// Fonts the machine lacks fall back the way the page does (Kazi Heavy / Condensed / Script / Round from public/fonts/digitizer).
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const require = createRequire(import.meta.url);
const sharp = require(ROOT + "/app/node_modules/sharp");
const { FONTS, CAP_HEIGHT } = await import(pathToFileURL(ROOT + "/app/lib/digitizer/text.js").href);

const SIZES = [3, 4, 6];
const STRINGS = { ave: "AVE MARIA", ham: "Hamburgefonts 2026" };
const NAVY = "#16285e";
const specs = [];
for (const f of FONTS) for (const size of SIZES) for (const [sk, value] of Object.entries(STRINGS)) specs.push({ id: `line_${f.id}_${size}mm_${sk}`, css: f.css, size, value });

const OUT = path.join(HERE, "inputs");
fs.mkdirSync(OUT, { recursive: true });
const fontDir = pathToFileURL(ROOT + "/app/public/fonts/digitizer/").href;
const faces = [["Kazi Heavy", "kazi-heavy.woff2", "400 900"], ["Kazi Condensed", "kazi-condensed.woff2", "400 900"], ["Kazi Script", "kazi-script.woff2", "400 900"], ["Kazi Round", "kazi-round-400.woff2", "400"], ["Kazi Round", "kazi-round-700.woff2", "700"]]
  .map(([n, f, w]) => `@font-face{font-family:"${n}";src:url("${fontDir}${f}") format("woff2");font-weight:${w};}`).join("");

const CH = 240, CW = 1000, BATCH = 18;
for (let b = 0; b < specs.length; b += BATCH) {
  const chunk = specs.slice(b, b + BATCH);
  const html = `<!doctype html><meta charset="utf-8"><style>${faces}html,body{margin:0;background:#fff}canvas{display:block}</style><body></body><script>
const specs=${JSON.stringify(chunk)}; const CAP=${CAP_HEIGHT};
(async()=>{ for(const s of specs){ const c=document.createElement('canvas'); c.width=${CW}; c.height=${CH}; document.body.appendChild(c);
  const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,${CW},${CH});
  const emPx=(s.size/CAP)*10, font='700 '+emPx+'px '+s.css; try{await document.fonts.load(font,s.value);}catch(e){}
  ctx.font=font; ctx.textBaseline='alphabetic'; ctx.textAlign='center'; ctx.fillStyle='${NAVY}'; ctx.fillText(s.value,500,120+s.size*10/2); }
  document.title='done'; })();</script>`;
  const htmlPath = path.join(HERE, "inputs", `_batch${b}.html`);
  fs.writeFileSync(htmlPath, html);
  const shot = path.join(HERE, "inputs", `_batch${b}.png`);
  const r = spawnSync("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${CW},${CH * chunk.length}`, "--virtual-time-budget=15000", `--screenshot=${shot}`, pathToFileURL(htmlPath).href], { encoding: "utf8", timeout: 120000 });
  if (!fs.existsSync(shot)) throw new Error("chromium made no screenshot: " + (r.stderr || "").slice(0, 400));
  for (let i = 0; i < chunk.length; i++) await sharp(shot).extract({ left: 0, top: i * CH, width: CW, height: CH }).png().toFile(path.join(OUT, chunk[i].id + ".png"));
  fs.rmSync(htmlPath); fs.rmSync(shot);
  console.log(`drew ${b + chunk.length}/${specs.length}`);
}
