// Tiny static server for the lettering capture (localhost only): / -> text_harness.html, /lib/* -> the site's app/lib (the REAL text.js), POST /save?path= -> text/cache/<path>.
// env LIB_ROOT picks another copy of app/lib (default: the working tree).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = process.env.LIB_ROOT || "<REPO>/app/lib";
const CACHE = path.join(HERE, "cache");
const inside = (root, p) => { const f = path.resolve(root, p); return f.startsWith(path.resolve(root)) ? f : null; };

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
    const send = (file, type) => fs.stat(file, (e, st) => { if (e || !st.isFile()) { res.writeHead(404); res.end("nf"); return; } res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" }); fs.createReadStream(file).pipe(res); });
    if (p === "/" || p === "/text_harness.html") return send(path.join(HERE, "text_harness.html"), "text/html");
    if (p === "/lpics_harness.html") return send(path.join(HERE, "lpics_harness.html"), "text/html");
    if (p === "/text_harness2.html") return send(path.join(HERE, "text_harness2.html"), "text/html");
    if (p === "/matrix2.mjs") return send(path.join(HERE, "matrix2.mjs"), "text/javascript");
    if (p.startsWith("/fonts/")) { const f = inside(path.join(path.dirname(HERE), "fonts_dl"), p.slice(7)); return f ? send(f, "font/ttf") : (res.writeHead(400), res.end()); }
    if (p.startsWith("/lib/")) { const f = inside(LIB, p.slice(5)); return f ? send(f, "text/javascript") : (res.writeHead(400), res.end()); }
    res.writeHead(404); res.end("no route");
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}


