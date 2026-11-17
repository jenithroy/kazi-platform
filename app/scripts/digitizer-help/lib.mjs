/**
 * Library for the digitizer's help videos (see README.md): it records a scenario on the real /digitizer page with Chrome DevTools
 * Page.startScreencast (one JPEG per repaint, with its time) and encodes it with the system ffmpeg: mp4 (H.264), webm (VP9) and a poster.
 * It is not Playwright's own `recordVideo`: that wants a VP9 ffmpeg build that the cached one does not have, and pads and encodes poorly.
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.OUT_DIR || path.resolve(HERE, "../../public/videos/digitizer"); // where the clips go (the site serves /videos/digitizer)
const WORK = process.env.WORK_DIR || path.join(os.tmpdir(), "digitizer-help-videos"); // frames, the demo logo, and a screenshot if a scenario fails
const CHROME = process.env.CHROME_PATH || undefined; // a chrome / chromium binary; by default playwright-core's own
export const DEMO = path.join(WORK, "demo-logo.png");
mkdirSync(OUT, { recursive: true });
mkdirSync(WORK, { recursive: true });

const W = 1100, H = 700, NAV = 88; // the window; the site's nav (88 px) is cropped off the top, so a clip is 1100 x 612, scaled to 960 wide
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── what every recording page gets: a cursor you can see, no dev badge, no tour ────────────────────────────────────────────────── */
const INIT = `(() => {
  try { localStorage.setItem("kazi.digitizer.tour", "1"); } catch {}
  const css = "#__cur{position:fixed;z-index:2147483647;left:-60px;top:-60px;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;pointer-events:none;background:rgba(255,255,255,.4);border:2px solid #1b3a2b;box-shadow:0 2px 8px rgba(0,0,0,.35);transition:transform .08s,background .08s}#__cur.down{transform:scale(.68);background:rgba(240,138,28,.6)}nextjs-portal{display:none!important}";
  const add = () => {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const d = document.createElement("div"); d.id = "__cur"; document.body.appendChild(d);
    addEventListener("mousemove", (e) => { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => d.classList.add("down"), true);
    addEventListener("mouseup", () => d.classList.remove("down"), true);
  };
  if (document.body) add(); else addEventListener("DOMContentLoaded", add);
})();`;

/* ── helpers a scenario uses ───────────────────────────────────────────────────────────────────────────────────────────────────── */
const mk = (page, state) => {
  const box = async (t) => (t && typeof t.boundingBox === "function" ? t.boundingBox() : t);
  const api = {
    sleep,
    /**
     * Keep a wait out of the clip. Whatever `fn` paints is left out: the clip goes from the picture before it (held for a moment, CUT_HOLD)
     * straight to the one it ended in. Use it for what a viewer should not sit through (a picture being converted, the stitches being made,
     * a scan of the canvas for a handle); the reading pauses between steps are plain sleeps. Returns what `fn` returns.
     */
    async skip(fn) {
      const from = state.frames.length;
      try { return await fn(); } finally { await sleep(80); state.cuts.push([from, state.frames.length]); } // (the last repaint's frame lands just after)
    },
    /** Glide the cursor to the middle of a locator (or a { x, y, width, height } box). */
    async moveTo(t, { dx = 0, dy = 0, steps = 16, pause = 220 } = {}) {
      const b = await box(t);
      if (!b) throw new Error("cannot move: no box");
      const x = b.x + (b.width ?? 0) / 2 + dx, y = b.y + (b.height ?? 0) / 2 + dy;
      await page.mouse.move(x, y, { steps });
      await sleep(pause);
      return { x, y };
    },
    async click(t, o = {}) {
      if (t && t.scrollIntoViewIfNeeded) await t.scrollIntoViewIfNeeded().catch(() => {});
      await api.moveTo(t, o);
      await page.mouse.down(); await sleep(90); await page.mouse.up(); await sleep(o.after ?? 340);
    },
    async dragBy(from, dx, dy, { steps = 22, hold = 120 } = {}) {
      await page.mouse.move(from.x, from.y, { steps: 18 }); await sleep(220);
      await page.mouse.down(); await sleep(hold);
      await page.mouse.move(from.x + dx, from.y + dy, { steps });
      await sleep(hold); await page.mouse.up(); await sleep(450);
    },
    step: (name) => page.locator(".dz-steps-hd").getByRole("radio", { name }),
    tool: (name) => page.getByRole("button", { name: new RegExp("^" + name) }),
    panelBox: () => page.locator(".dz-panel").boundingBox(),
    /** Scroll the right-hand panel with the wheel, as a person would. */
    async wheelPanel(dy, n = 6) {
      const p = await api.panelBox();
      await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2, { steps: 10 });
      for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await sleep(60); }
      await sleep(350);
    },
    /** Where the hoop is on the page (its middle and the room between the panels). */
    async hoop() {
      const c = await page.locator(".dz-canvas").boundingBox();
      const cs = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".dz-page")); return [parseFloat(s.getPropertyValue("--dz-inset-l")) || 0, parseFloat(s.getPropertyValue("--dz-inset-r")) || 0]; });
      return { x: c.x + cs[0] + (c.width - cs[0] - cs[1]) / 2, y: c.y + (c.height - 50) / 2, l: c.x + cs[0], r: c.x + c.width - cs[1], t: c.y, b: c.y + c.height - 50 };
    },
    /** Where the canvas shows a handle: move along a line of points and read the cursor the stage sets (ew-resize, nwse-resize ...). */
    async findCursor(kind, line) {
      const hits = [];
      for (const [x, y] of line) {
        await page.mouse.move(x, y);
        const cur = await page.evaluate(() => document.querySelector(".dz-canvas").style.cursor);
        if (cur === kind) hits.push([x, y]);
      }
      return hits;
    },
    /** The stitches are made (Download DST is enabled). */
    async ready() { await page.locator('.dz-card-ft button:has-text("Download DST"):not([disabled])').waitFor({ timeout: 120000 }); },
    /** A conversion has finished (Convert again is enabled). */
    async settle() {
      await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /Convert again|Working/.test(x.textContent || "")); return !!b && /Convert again/.test(b.textContent) && !b.disabled; }, null, { timeout: 120000 });
    },
    async loadPicture(file = DEMO) {
      await page.locator('input[type=file][aria-label="Choose a picture"]').setInputFiles(file);
      await api.settle(); await sleep(2600); await api.settle();
    },
  };
  return api;
};

/* ── encode: the screencast's frames (with their times) become a video: crop the nav, scale, mp4 + webm + a poster ───────────────── */
const CUT_HOLD = 0.45; // seconds: the picture before a cut stays this long (a converter's "Working" state, say) before the clip jumps to the result
const MAX_HOLD = 1.8;  // seconds: no picture stays on screen longer than this, so a wait that painted nothing is shortened the same way

/** Take the cuts out: of the frames painted inside a `skip` only the last stays (the state the wait ended in), shown CUT_HOLD after the frame before it; everything after moves up by the time taken out. */
function closeUp(raw, cuts) {
  const out = [];
  let shift = 0, i = 0;
  for (const [from, to] of [...cuts].filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0])) {
    for (; i < from; i++) out.push({ data: raw[i].data, t: raw[i].t - shift });
    const prev = out[out.length - 1], last = raw[to - 1];
    if (prev) { const gap = last.t - shift - prev.t; if (gap > CUT_HOLD) shift += gap - CUT_HOLD; }
    out.push({ data: last.data, t: last.t - shift });
    i = to;
  }
  for (; i < raw.length; i++) out.push({ data: raw[i].data, t: raw[i].t - shift });
  return out;
}

function encode(raw, id, cuts) {
  const frames = closeUp(raw, cuts);
  const dir = path.join(WORK, "frames", id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const lines = [];
  let len = 0;
  frames.forEach((f, i) => {
    const name = "f" + String(i).padStart(6, "0") + ".jpg";
    writeFileSync(path.join(dir, name), Buffer.from(f.data, "base64"));
    const next = frames[i + 1];
    const d = next ? Math.min(MAX_HOLD, Math.max(0.001, next.t - f.t)) : 1.0;
    len += d;
    lines.push("file '" + name + "'", "duration " + d.toFixed(4));
  });
  lines.push("file 'f" + String(frames.length - 1).padStart(6, "0") + ".jpg'"); // (the concat demuxer wants the last frame named again)
  writeFileSync(path.join(dir, "list.txt"), lines.join("\n"));
  const vf = "fps=20,crop=" + W + ":" + (H - NAV) + ":0:" + NAV + ",scale=960:-2";
  const mp4 = path.join(OUT, id + ".mp4"), webm = path.join(OUT, id + ".webm"), jpg = path.join(OUT, id + ".jpg");
  const base = ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-vf", vf, "-an"];
  execFileSync("ffmpeg", [...base, "-c:v", "libx264", "-preset", "slow", "-crf", process.env.CRF_MP4 || "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  execFileSync("ffmpeg", [...base, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", process.env.CRF_WEBM || "36", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", webm]);
  // the poster is the first frame, so the picture does not change when the video starts
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", mp4, "-frames:v", "1", "-q:v", "5", jpg]);
  rmSync(dir, { recursive: true, force: true });
  const kb = (f) => Math.round(statSync(f).size / 1024);
  return id + ": " + len.toFixed(1) + "s, " + frames.length + " frames  mp4 " + kb(mp4) + " KB  webm " + kb(webm) + " KB  poster " + kb(jpg) + " KB";
}

export const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });

/** The demo logo: a four-colour badge (navy, orange, white, red) drawn on a canvas, so the colour features have something to show. */
async function makeDemoLogo() {
  const page = await browser.newPage();
  await page.setContent('<canvas id="c" width="600" height="600"></canvas>');
  const url = await page.evaluate(() => {
    const c = document.getElementById("c"), g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 600, 600);
    const disc = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(300, 300, r, 0, Math.PI * 2); g.fill(); };
    disc(280, "#1f3a8a"); disc(244, "#f08a1c"); disc(226, "#1f3a8a");
    g.fillStyle = "#ffffff"; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 === 0 ? 120 : 50; g.lineTo(300 + r * Math.cos(a), 270 + r * Math.sin(a)); }
    g.closePath(); g.fill();
    g.fillStyle = "#d0262c"; g.beginPath(); g.arc(300, 276, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffffff"; g.font = "900 78px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("KAZI", 300, 432);
    return c.toDataURL("image/png");
  });
  writeFileSync(DEMO, Buffer.from(url.split(",")[1], "base64"));
  await page.close();
}
await makeDemoLogo();

/**
 * Record one scenario: `setup(page, h)` gets the page ready (not recorded), `show(page, h)` is what the clip shows. `hold` (ms) is how long the
 * last frame stays. With ONLY=<id> in the environment, only that scenario runs.
 */
export async function rec(id, scenario) {
  if (process.env.ONLY && process.env.ONLY !== id) return;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, acceptDownloads: true });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const state = { frames: [], cuts: [] }; // the screencast's frames, and the stretches of them `h.skip` left out
  // The dev server reloads the page when a source file is saved: a clip made across a reload shows the editor emptying itself.
  let watching = false, reloaded = false;
  page.on("framenavigated", (f) => { if (watching && f === page.mainFrame()) reloaded = true; });
  const RELOADED = "the page reloaded while it was being recorded (the dev server does that when a source file is saved: leave the source alone until the recording is done)";
  const h = mk(page, state);
  const cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", (e) => { state.frames.push({ t: e.metadata.timestamp, data: e.data }); cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {}); });
  try {
    await page.goto(BASE + "/digitizer/", { waitUntil: "load" });
    await sleep(2800);
    const nb = page.getByRole("button", { name: "Necessary Only" });
    if (await nb.count()) await nb.click();
    await sleep(400);
    watching = true;
    await scenario.setup?.(page, h);
    await page.mouse.move(W / 2, 330); // the cursor starts mid-canvas
    await sleep(500);
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    await sleep(120); // (just long enough for the first frame to arrive: the clip starts on the first thing that happens, not after a wait)
    await scenario.show(page, h);
    await sleep(scenario.hold ?? 1100);
    await cdp.send("Page.stopScreencast");
    if (reloaded) throw new Error(RELOADED);
    await ctx.close();
    console.log(encode(state.frames, id, state.cuts));
  } catch (e) {
    console.log(id + ": FAILED: " + (reloaded ? RELOADED : String(e.message).split("\n")[0]));
    try { await page.screenshot({ path: path.join(WORK, id + "-FAILED.png") }); } catch { /* the page is gone */ }
    await ctx.close().catch(() => {});
  }
}
