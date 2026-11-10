// Shared plumbing for the scripts that need three.js in a real (headless) browser: a tiny static
// file server and a minimal DevTools-protocol client. Chrome or Chromium must be installed
// (set CHROME_PATH if it isn't on the PATH); it is used headless, with software GL.

import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import { extname, join } from "node:path";

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".glb": "model/gltf-binary",
  ".json": "application/json",
};

/** Serves `html` at "/" and files under each mount (`{ "/three/": "<dir>", ... }`). */
export function serve({ html, mounts }) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }
    let file = null;
    for (const [prefix, dir] of Object.entries(mounts)) {
      if (url.startsWith(prefix)) file = join(dir, url.slice(prefix.length));
    }
    if (!file || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const name of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"]) {
    try {
      return execSync(`command -v ${name}`, { encoding: "utf8" }).trim();
    } catch {
      /* try the next one */
    }
  }
  throw new Error("No Chrome/Chromium found. Install one or set CHROME_PATH.");
}

/** Just enough of the DevTools protocol to open a page and evaluate a promise in it. */
export async function launchChrome(profileDir) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const chrome = spawn(
    findChrome(),
    [
      "--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`,
      "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
      "--window-size=800,800", "about:blank",
    ],
    { stdio: "ignore" },
  );
  let page;
  for (let i = 0; i < 80 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
    } catch {
      /* not up yet */
    }
    if (!page) await new Promise((r) => setTimeout(r, 250));
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) waiting.get(m.id)(m);
  };
  const call = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      waiting.set(n, resolve);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  await call("Runtime.enable");
  await call("Page.enable");

  const browser = {
    async evaluate(expression) {
      const reply = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (reply.error) throw new Error(`DevTools error: ${JSON.stringify(reply.error)}`);
      const { result, exceptionDetails } = reply.result;
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text ?? "evaluate failed");
      return result.value;
    },
    /** Opens a page and waits until its module script has set `window.ready`. */
    async open(url) {
      await call("Page.navigate", { url });
      for (let i = 0; i < 80; i++) {
        const ready = await browser.evaluate("window.ready === true").catch(() => false);
        if (ready) return;
        await new Promise((r) => setTimeout(r, 250));
      }
      throw new Error("The page never became ready.");
    },
    close() {
      ws.close();
      chrome.kill("SIGKILL");
    },
  };
  return browser;
}
