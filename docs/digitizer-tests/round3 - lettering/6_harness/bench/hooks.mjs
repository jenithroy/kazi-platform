// A read-only look into the engine: which stitch type each run was sewn as, and how many stitches it took.
// Nothing on disk is changed: the library's plan.js and engine.js are patched IN MEMORY while they are loaded (module.registerHooks), and only by adding a counter.
// If the library has changed so the patch no longer fits, installKindHook() says so and the bench falls back to the engine's own `info` (islands by area).
//   globalThis.__kindLog = []  before generate(); afterwards it holds [kind, stitches, points] per run, kind = line | satin | underlay | fill | outline
import { registerHooks } from "node:module";

export function installKindHook() {
  const patched = { plan: false, engine: false };
  const text = (src) => (typeof src === "string" ? src : Buffer.from(src).toString("utf8"));
  registerHooks({
    load(url, context, nextLoad) {
      const r = nextLoad(url, context);
      if (r.format !== "module" || r.source == null) return r;
      const u = url.replace(/\\/g, "/");
      if (/\/embroidery\/stitch\/plan\.js$/.test(u)) {
        let s = text(r.source);
        const a = "    colour(color) {";
        if (s.includes(a)) { s = s.replace(a, "    count() { return out.length; },\n" + a); patched.plan = true; }
        return { ...r, source: s };
      }
      if (/\/embroidery\/stitch\/engine\.js$/.test(u)) {
        let s = text(r.source);
        const a = "plan.run(r.pts, { join: r.join, connectMax: r.connectMax, travel });";
        if (s.includes(a)) {
          s = s.replace(a, "const __n0 = plan.count ? plan.count() : -1; " + a + " if (globalThis.__kindLog && __n0 >= 0) globalThis.__kindLog.push([r.kind, plan.count() - __n0, r.pts.length]);");
          patched.engine = true;
        }
        return { ...r, source: s };
      }
      return r;
    },
  });
  return patched;
}

/** [kind, stitches, points][] -> { kind: { runs, stitches, points } } */
export function summariseKinds(log) {
  const out = {};
  for (const [k, n, pts] of log || []) {
    const o = (out[k] ||= { runs: 0, stitches: 0, points: 0 });
    o.runs++; o.stitches += n; o.points += pts;
  }
  return out;
}
