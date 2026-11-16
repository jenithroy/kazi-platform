// A small static server for a Next static export (out/): real MIME types (.wasm, .task, .tflite), /x -> /x/ like Cloudflare Pages, 404 for the rest.
// usage: node serve_out.mjs <out dir> [port]      (exports startOut(dir, port) too)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain",
  ".wasm": "application/wasm", ".tflite": "application/octet-stream", ".task": "application/octet-stream", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".mp4": "video/mp4", ".webm": "video/webm", ".xml": "application/xml",
};

export function startOut(root, port = 0) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(u.pathname);
    let file = path.join(root, p);
    if (!file.startsWith(path.resolve(root))) { res.writeHead(400); res.end(); return; }
    let st = fs.existsSync(file) ? fs.statSync(file) : null;
    if (st && st.isDirectory()) {
      if (!p.endsWith("/")) { res.writeHead(308, { Location: p + "/" + u.search }); res.end(); return; }
      file = path.join(file, "index.html");
      st = fs.existsSync(file) ? fs.statSync(file) : null;
    }
    if (!st) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { port } = await startOut(path.resolve(process.argv[2]), Number(process.argv[3] || 4791));
  console.log("serving on http://127.0.0.1:" + port);
}
