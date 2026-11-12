// Records the homepage promo of the embroidery digitizer: a REAL session of /digitizer being used (a logo is dragged in,
// converted, one shape is recoloured, the stitches are played back, the DST file is saved) and encodes it to
//   public/videos/digitizer-demo.mp4 + .webm   and   public/images/home/digitizer-poster.webp
// See README.md in this folder.
//
// Usage, from app/, with the site being served (`npm run dev`, or a static server on out/ after `npm run build`):
//   node scripts/digitizer-promo/build.mjs
//
// Needs `playwright-core` (npm i --no-save playwright-core), a Chromium (set CHROME_PATH, or run
// `npx playwright-core install chromium`) and `ffmpeg` / `ffprobe` on the PATH.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = process.env.APP_DIR || fileURLToPath(new URL("../../", import.meta.url)); // the app/ folder (where public/ is)
const BASE = process.env.BASE_URL || "http://localhost:3000";
const WORK = process.env.WORK_DIR || path.join(os.tmpdir(), "kazi-digitizer-promo");
const OUT_VIDEOS = process.env.OUT_VIDEOS || path.join(APP, "public", "videos");
const OUT_IMAGES = process.env.OUT_IMAGES || path.join(APP, "public", "images", "home");
const VW = 1200, VH = 675; // CSS px of the editor in the recording (16:9). The screencast gives frames this size; the clip is W x H.
const W = 1600, H = 900;
const CRF_MP4 = process.env.CRF_MP4 || "25", CRF_WEBM = process.env.CRF_WEBM || "33";
const frames = path.join(WORK, "frames");
fs.mkdirSync(frames, { recursive: true });
fs.mkdirSync(OUT_VIDEOS, { recursive: true });
fs.mkdirSync(OUT_IMAGES, { recursive: true });
for (const f of fs.readdirSync(frames)) fs.unlinkSync(path.join(frames, f));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── 1. the logo to drag in: an original badge in the site's greens with a gold sun (five threads) ───────────── */
async function makeEmblem(browser) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.goto("about:blank");
  const out = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 1000; c.height = 1000;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1000, 1000);
    const cx = 500, cy = 500;
    g.fillStyle = "#1b3a2b"; g.beginPath(); g.arc(cx, cy, 470, 0, Math.PI * 2); g.fill(); // ring (pine)
    g.fillStyle = "#3f8f5c"; g.beginPath(); g.arc(cx, cy, 425, 0, Math.PI * 2); g.fill(); // sky (moss)
    g.save(); g.beginPath(); g.arc(cx, cy, 425, 0, Math.PI * 2); g.clip();
    g.fillStyle = "#e3a93a"; g.beginPath(); g.arc(660, 320, 84, 0, Math.PI * 2); g.fill(); // sun (gold)
    g.fillStyle = "#2e6e46"; g.beginPath(); g.moveTo(70, 700); g.lineTo(320, 380); g.lineTo(590, 700); g.closePath(); g.fill(); // back mountain (forest)
    g.fillStyle = "#d3e4cf"; g.beginPath(); g.moveTo(250, 700); g.lineTo(530, 260); g.lineTo(820, 700); g.closePath(); g.fill(); // front mountain (pale sage)
    g.fillStyle = "#9cc3a6"; g.beginPath(); g.moveTo(530, 260); g.lineTo(820, 700); g.lineTo(600, 700); g.lineTo(560, 520); g.lineTo(500, 600); g.closePath(); g.fill(); // shadow side
    g.fillStyle = "#1b3a2b"; g.fillRect(0, 700, 1000, 330); // lettering band (pine)
    g.restore();
    g.fillStyle = "#d3e4cf"; g.font = "900 150px 'Arial Black', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("PEAK", cx, 805);
    const t = document.createElement("canvas"); t.width = t.height = 64; t.getContext("2d").drawImage(c, 0, 0, 64, 64);
    return [c.toDataURL("image/png").split(",")[1], t.toDataURL("image/png")];
  });
  await page.close();
  fs.writeFileSync(path.join(WORK, "peak-logo.png"), Buffer.from(out[0], "base64"));
  return { b64: out[0], thumb: out[1] };
}

/* ── runs in the page before the app: the editor fills the window, plus a pointer, click ripples and a dragged-file chip ── */
function initPage() {
  try { localStorage.setItem("kazi-cookie-consent", "rejected"); } catch { /* ignore */ }
  // z-index 1000: above the site's nav / banner / WhatsApp button (all under 100), but BELOW the editor's own pop-ups
  // (1400+, portalled to <body>): a higher value hides the colour chart that the recording opens.
  const css = `
    .dz-page{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:1000!important;border:0!important;border-radius:0!important}
    html,body{overflow:hidden!important}
    #fx-cursor{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));will-change:transform}
    #fx-chip{display:none;position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;align-items:center;gap:9px;padding:7px 14px 7px 8px;background:#fff;border:1px solid rgba(27,58,43,.22);border-radius:10px;box-shadow:0 14px 28px -12px rgba(0,0,0,.45);font:700 15px 'ITC Garamond Condensed',serif;color:#1b3a2b;white-space:nowrap;will-change:transform}
    #fx-chip img{width:30px;height:30px;border-radius:6px;display:block}
    .fx-ripple{position:fixed;z-index:2147483645;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;border:2px solid rgba(27,58,43,.65);background:rgba(63,143,92,.22);pointer-events:none;animation:fx-r .55s ease-out forwards}
    @keyframes fx-r{from{transform:scale(.25);opacity:1}to{transform:scale(1.5);opacity:0}}`;
  const mount = () => {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const cur = document.createElement("div"); cur.id = "fx-cursor";
    cur.innerHTML = '<svg width="24" height="30" viewBox="0 0 24 30"><path d="M3 2.5 L3 23 L8.4 18.2 L12.1 26.6 L15.9 24.9 L12.2 16.7 L19.6 16.3 Z" fill="#fff" stroke="#17201b" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    const chip = document.createElement("div"); chip.id = "fx-chip"; chip.innerHTML = '<img alt=""><span></span>';
    document.body.append(cur, chip);
    let x = -200, y = -200;
    const place = () => { cur.style.transform = `translate(${x - 3}px,${y - 2.5}px)`; chip.style.transform = `translate(${x + 18}px,${y + 14}px) rotate(-2.5deg)`; };
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; place(); }, true);
    addEventListener("mousedown", (e) => { const r = document.createElement("div"); r.className = "fx-ripple"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px"; document.body.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
    place();
    window.__fx = {
      chip(name, src) { chip.style.display = name ? "flex" : "none"; if (name) { chip.querySelector("span").textContent = name; chip.querySelector("img").src = src; place(); } },
      hideCursor(v) { cur.style.display = v ? "none" : ""; },
    };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
}

/* ── 2. the session, recorded as raw screencast frames (a JPEG per repaint, with its timestamp) ─────────── */
async function record() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const emblem = await makeEmblem(browser);
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, acceptDownloads: true });
  await ctx.addInitScript(initPage);
  const page = await ctx.newPage();

  // Not Playwright's recordVideo: it needs its own ffmpeg build, pads the frame and encodes at low quality.
  const cdp = await ctx.newCDPSession(page);
  const shots = [];
  cdp.on("Page.screencastFrame", async (f) => {
    const file = `f_${String(shots.length).padStart(5, "0")}.jpg`;
    fs.writeFileSync(path.join(frames, file), Buffer.from(f.data, "base64"));
    shots.push({ t: f.metadata.timestamp, file });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch { /* the page closed */ }
  });

  let cur = { x: 1130, y: 200 };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  // a time-based move (a "0.8 s" move takes 0.8 s whatever the machine is doing), along a gentle arc like a hand
  async function glide(to, ms = 800, { curve = 14, onStep } = {}) {
    const from = { ...cur }, dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const t0 = Date.now();
    for (;;) {
      const p = Math.min(1, (Date.now() - t0) / ms), t = ease(p), bend = Math.sin(Math.PI * t) * curve;
      const x = from.x + dx * t + nx * bend, y = from.y + dy * t + ny * bend;
      await page.mouse.move(x, y);
      if (onStep) await onStep(x, y);
      if (p >= 1) break;
      await sleep(6);
    }
    cur = { ...to };
  }
  const center = async (loc) => { const b = await loc.boundingBox(); if (!b) throw new Error("no box for " + loc); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  async function clickOn(loc, { ms = 750, after = 300 } = {}) {
    await glide(await center(loc), ms);
    await sleep(130); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(after);
  }
  const idle = async (ms = 20000) => { // wait until the engine has nothing left to do
    const t0 = Date.now(); await sleep(200);
    while (Date.now() - t0 < ms) {
      const busy = await page.evaluate(() => !!document.querySelector(".dz-busy-bar") || /Working…|Updating…|Making the stitches…/.test(document.querySelector(".dz-page")?.innerText || ""));
      if (!busy) return; await sleep(100);
    }
  };
  const shapes = () => page.waitForFunction(() => Number((document.querySelector(".dz-left .kb-note")?.textContent || "0").trim()) > 0, null, { timeout: 60000 });
  const stitchesReady = () => page.waitForFunction(() => /\d[\d,]*\s*stitches/i.test(document.querySelector(".dz-bar-info")?.textContent || ""), null, { timeout: 60000 });
  const step = (name) => page.locator(".dz-seg--step button", { hasText: name });

  await page.goto(BASE + "/digitizer/", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForSelector(".dz-page");
  await page.locator(".dz-canvas").focus();
  await page.mouse.move(cur.x, cur.y);
  await sleep(700);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: VW * 2, maxHeight: VH * 2, everyNthFrame: 1 });
  await sleep(700);

  const tStart = Date.now();
  const log = (s) => console.log(`${((Date.now() - tStart) / 1000).toFixed(1).padStart(5)}s  ${s}`);

  // a. drag the logo in from the desktop
  await sleep(600);
  log("a file is dragged over the canvas");
  const dt = await page.evaluateHandle((b64) => {
    const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    const d = new DataTransfer(); d.items.add(new File([a], "peak-logo.png", { type: "image/png" })); return d;
  }, emblem.b64);
  await page.evaluate(([n, s]) => window.__fx.chip(n, s), ["peak-logo.png", emblem.thumb]);
  const stage = await page.locator(".dz-stage").boundingBox();
  const inStage = (x, y) => x > stage.x && x < stage.x + stage.width && y > stage.y && y < stage.y + stage.height;
  await glide({ x: stage.x + stage.width * 0.5, y: stage.y + stage.height * 0.6 }, 1300, {
    curve: 30,
    onStep: async (x, y) => { if (inStage(x, y)) await page.dispatchEvent(".dz-stage", "dragover", { dataTransfer: dt }); },
  });
  await sleep(450);
  log("dropped");
  await page.dispatchEvent(".dz-stage", "drop", { dataTransfer: dt });
  await page.evaluate(() => window.__fx.chip(""));
  await shapes(); await idle();
  await sleep(1200);

  // b. the Picture step is showing; on to the Design step
  log("-> Design");
  await clickOn(step("Design"), { ms: 800, after: 600 });

  // c. pick the sun and change its thread colour
  log("select the sun");
  await clickOn(page.locator(".dz-orow", { hasText: "Gold" }).first().locator(".dz-oname"), { ms: 800, after: 650 });
  log("open the colour chart");
  await clickOn(page.locator(".dz-right button.dz-color").first(), { ms: 750, after: 600 });
  await page.locator(".dz-pop").waitFor({ timeout: 5000 });
  const idx = await page.evaluate(() => { // the swatch nearest a warm red-orange
    const want = [217, 83, 47]; let best = 0, bd = 1e9;
    [...document.querySelectorAll(".dz-pop .dz-swatch")].forEach((el, i) => {
      const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(getComputedStyle(el).backgroundColor); if (!m) return;
      const d = (m[1] - want[0]) ** 2 + (m[2] - want[1]) ** 2 + (m[3] - want[2]) ** 2; if (d < bd) { bd = d; best = i; }
    });
    return best;
  });
  log("pick a new colour");
  await clickOn(page.locator(".dz-pop .dz-swatch").nth(idx), { ms: 700, after: 1100 });

  // d. the stitches
  log("-> Stitches");
  await clickOn(step("Stitches"), { ms: 900, after: 400 });
  await stitchesReady(); await idle(); await sleep(1100);

  // e. watch them being sewn
  log("play");
  await clickOn(page.getByRole("button", { name: "Play the stitching" }), { ms: 900, after: 150 });
  await page.waitForFunction(() => { const r = document.querySelector(".dz-sim input[type=range]"); return r && Number(r.value) >= Number(r.max) - 1; }, null, { timeout: 60000 });
  await sleep(1300);
  log("sewn");

  // the poster: the finished piece, no pointer
  await page.evaluate(() => window.__fx.hideCursor(true)); await sleep(350);
  const poster = shots.at(-1).file;
  await page.evaluate(() => window.__fx.hideCursor(false)); await sleep(200);

  // f. save the file
  log("download");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 20000 }),
    clickOn(page.getByRole("button", { name: "Download DST", exact: true }), { ms: 1000, after: 150 }),
  ]);
  log("saved " + download.suggestedFilename());
  await sleep(2200);
  const tEnd = Date.now();

  await cdp.send("Page.stopScreencast");
  await sleep(300);
  await browser.close();
  return { tStart: tStart / 1000, tEnd: tEnd / 1000, poster, shots };
}

/* ── 3. the video: each frame held until the next arrives (real timing), 30 fps, last seconds cross-faded back to the first frame so it loops ── */
function encode({ tStart, tEnd, poster, shots }) {
  // the frame showing at tStart is the last one painted before it
  let i0 = 0; while (i0 + 1 < shots.length && shots[i0 + 1].t <= tStart) i0++;
  const use = shots.slice(i0).filter((s) => s.t <= tEnd + 0.01);
  const dir = frames.replace(/\\/g, "/");
  const lines = ["ffconcat version 1.0"];
  use.forEach((s, k) => {
    const from = Math.max(s.t, tStart), to = k + 1 < use.length ? use[k + 1].t : tEnd;
    lines.push(`file '${dir}/${s.file}'`, `duration ${Math.max(0.001, to - from).toFixed(4)}`);
  });
  lines.push(`file '${dir}/${use.at(-1).file}'`); // ffconcat ignores the duration of the last entry
  const list = path.join(WORK, "list.txt");
  fs.writeFileSync(list, lines.join("\n"));
  const D = tEnd - tStart;
  console.log(`frames used: ${use.length}, session ${D.toFixed(2)} s`);

  const first = `${dir}/${shots[i0].file}`;
  const XF = 0.7;
  // fps=30 first: concat leaves a 1/1000000 timebase that xfade will not mix with the looped still's 1/30.
  // The screencast frames are full-range JPEGs (BT.601). Convert them properly to the standard limited-range BT.709 that
  // players expect: left as they are the clip comes out as full-range "yuvj420p", which some GPUs' VP9 decoders refuse
  // (Chrome on an RTX 5070 gave "video decode error" on the first frame while software decoding played it).
  const prep = (i, tag) => `[${i}:v]fps=30,scale=${W}:${H}:flags=lanczos:in_range=pc:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709,setsar=1,format=yuv420p[${tag}]`;
  const tags = ["-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"];
  const graph = [prep(0, "a"), prep(1, "b"), `[a][b]xfade=transition=fade:duration=${XF}:offset=${(D - XF).toFixed(3)}[out]`].join(";");
  const inputs = ["-f", "concat", "-safe", "0", "-i", list, "-loop", "1", "-framerate", "30", "-t", "1.2", "-i", first];
  const run = (args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: ["ignore", "inherit", "inherit"] });
  const mp4 = path.join(OUT_VIDEOS, "digitizer-demo.mp4"), webm = path.join(OUT_VIDEOS, "digitizer-demo.webm"), webp = path.join(OUT_IMAGES, "digitizer-poster.webp");
  run([...inputs, "-filter_complex", graph, "-map", "[out]", "-an", "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", CRF_MP4, "-pix_fmt", "yuv420p", ...tags, "-movflags", "+faststart", mp4]);
  run([...inputs, "-filter_complex", graph, "-map", "[out]", "-an", "-r", "30", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", CRF_WEBM, "-row-mt", "1", "-pix_fmt", "yuv420p", ...tags, webm]);
  run(["-i", path.join(frames, poster), "-vf", `scale=${W}:${H}:flags=lanczos`, "-c:v", "libwebp", "-quality", "86", webp]);
  for (const f of [mp4, webm, webp]) console.log(path.relative(APP, f).padEnd(44), (fs.statSync(f).size / 1024).toFixed(0).padStart(5), "KB");
}

encode(await record());
console.log("done. Rebuild the site (npm run build) to pick the files up; check the clip with a contact sheet:");
console.log('  ffmpeg -i public/videos/digitizer-demo.mp4 -vf "fps=1/2,scale=400:-1,tile=4x4" -frames:v 1 contact.png');
