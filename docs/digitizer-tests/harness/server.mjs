// Static server for the capture harness (localhost only).
//   /                 harness.html
//   /lib/*            the site's app/lib (the real ES modules)
//   /vendor/*         MediaPipe's ES bundle from app/node_modules
//   /mediapipe/*      app/public/mediapipe (wasm, selfie model) and, if absent there, faces/models (face landmarker, hair segmenter)
//   /file?p=<abs>     any file under the scratchpad (the test pictures)
//   POST /save?path=  writes the body to faces/cache/<path>
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FACES = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.dirname(FACES);
const APP = process.env.APP_ROOT || "<REPO>/app";
const LIB = process.env.LIB_ROOT || path.join(APP, "lib");
const CACHE = path.join(FACES, "cache");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

function inside(root, p) {
  const full = path.resolve(root, p);
  return full.startsWith(path.resolve(root)) ? full : null;
}
function sendFile(res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end("not found: " + file); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
}

export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    const p = decodeURIComponent(u.pathname);
    if (req.method === "POST" && p === "/save") {
      const dest = inside(CACHE, u.searchParams.get("path") || "");
      if (!dest) { res.writeHead(400); res.end("bad path"); return; }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const out = fs.createWriteStream(dest);
      req.pipe(out);
      out.on("finish", () => { res.writeHead(200); res.end("ok"); });
      out.on("error", (e) => { res.writeHead(500); res.end(String(e)); });
      return;
    }
    if (p === "/" || p === "/harness.html") return sendFile(res, path.join(FACES, "harness.html"));
    if (p.startsWith("/lib/")) { const f = inside(LIB, p.slice(5)); return f ? sendFile(res, f) : (res.writeHead(400), res.end()); }
    if (p.startsWith("/vendor/")) { const f = inside(path.join(APP, "node_modules/@mediapipe/tasks-vision"), p.slice(8)); return f ? sendFile(res, f) : (res.writeHead(400), res.end()); }
    if (p.startsWith("/mediapipe/")) {
      const a = inside(path.join(APP, "public/mediapipe"), p.slice(11));
      if (a && fs.existsSync(a)) return sendFile(res, a);
      const b = inside(path.join(FACES, "models"), p.slice(11));
      return b ? sendFile(res, b) : (res.writeHead(400), res.end());
    }
    if (p.startsWith("/models/")) { const f = inside(path.join(FACES, "models"), p.slice(8)); return f ? sendFile(res, f) : (res.writeHead(400), res.end()); }
    if (p === "/file") { const f = inside(SCRATCH, path.relative(SCRATCH, path.resolve(u.searchParams.get("p") || ""))); return f ? sendFile(res, f) : (res.writeHead(400), res.end()); }
    res.writeHead(404); res.end("no route " + p);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { port } = await startServer(Number(process.env.PORT || 4789));
  console.log("harness server on http://127.0.0.1:" + port);
}
