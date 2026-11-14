#!/usr/bin/env node
// Is the dashboard link working? Calls the dashboard Worker the way the website does (docs/dashboard-link.md):
//
//   1. GET  /api/website-orders/health      the Worker is up and can reach its database
//   2. POST /api/website-orders             a clearly marked TEST order ("dashboard link check, ignore")
//   3. POST it again with the same key      must answer duplicate: true (a resend is never a second order)
//   4. GET  /api/website-orders/logo        only with --logo <instagram name or site>: prints what came back
//
// node scripts/dashboard-link/check.mjs [--base <url>] [--logo acme] [--no-order] [--yes]
//
// --base   the Worker's address; default NEXT_PUBLIC_DASHBOARD_API_URL, else http://localhost:8787 (wrangler dev)
// A test order is a real row in the dashboard (WEB-nnn, "Dashboard link check"): delete it there afterwards. To keep this from being run
// against the live dashboard by accident, any address that is not this computer needs --yes.
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const base = String(value("--base") || process.env.NEXT_PUBLIC_DASHBOARD_API_URL || "http://localhost:8787").replace(/\/+$/, "");
const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(base);
const noOrder = flag("--no-order");

if (!local && !noOrder && !flag("--yes")) {
  console.log(`This would send a TEST order to ${base}, which is not this computer.`);
  console.log("It creates a real row in the dashboard. Run it again with --yes if that is what you want, or with --no-order to only check health.");
  process.exit(2);
}

let failed = 0;
const say = (ok, text, extra = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${text}${extra ? `  ${extra}` : ""}`);
};

async function call(path, init) {
  const started = Date.now();
  try {
    const res = await fetch(`${base}${path}`, init);
    const type = res.headers.get("content-type") || "";
    const body = type.includes("json") ? await res.json().catch(() => null) : null;
    return { res, body, ms: Date.now() - started, type };
  } catch (err) {
    return { error: err, ms: Date.now() - started };
  }
}

console.log(`dashboard link check: ${base}\n`);

// 1. health
{
  const r = await call("/api/website-orders/health");
  if (r.error) say(false, "health", `could not connect: ${r.error.cause?.code || r.error.message}`);
  else if (!r.res.ok || !r.body) say(false, "health", `HTTP ${r.res.status}, ${r.type || "no content type"} (is the route deployed?)`);
  else {
    say(r.body.ok === true, "health", `v${r.body.v}, ${r.ms} ms`);
    say(r.body.db !== false, "the Worker reaches its database", r.body.db === false ? "db:false: check SUPABASE_URL and the SUPABASE_SERVICE_KEY secret" : "");
  }
}

// 2 and 3. a test order, then the same one again
if (!noOrder) {
  const key = randomUUID();
  const order = {
    v: 1,
    key,
    kind: "quote",
    contact: { name: "Dashboard link check", email: "link-check@example.invalid", company: "Kazi test" },
    items: [{ garment: "other", label: "Link check", qty: 1 }],
    message: "dashboard link check, ignore",
    source: { page: "/scripts/dashboard-link/check" },
    hp: "",
  };
  const post = () => call("/api/website-orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order) });

  const first = await post();
  if (first.error) say(false, "test order", `could not connect: ${first.error.message}`);
  else if (first.body?.ok === true) say(true, "test order stored", `${first.body.ref} (${first.body.id}), ${first.ms} ms, duplicate:${first.body.duplicate}`);
  else say(false, "test order", `HTTP ${first.res.status} ${first.body ? JSON.stringify(first.body) : first.type}`);

  if (first.body?.ok === true) {
    const again = await post();
    say(again.body?.ok === true && again.body.duplicate === true && again.body.ref === first.body.ref, "the same key again is a duplicate, not a second order", again.body ? JSON.stringify(again.body) : again.error?.message);
    console.log(`\nDelete the test order ${first.body.ref} in the dashboard (Production > Filters > Website) when you have seen it.`);
  }
}

// 4. a logo lookup
const logo = value("--logo");
if (logo) {
  const q = /[.:/]/.test(logo) ? `site=${encodeURIComponent(logo)}` : `handle=${encodeURIComponent(logo.replace(/^@/, ""))}`;
  const r = await call(`/api/website-orders/logo?${q}`);
  if (r.error) say(false, `logo ${logo}`, r.error.message);
  else if (r.res.ok) say(true, `logo ${logo}`, `${r.res.headers.get("content-type")}, ${r.res.headers.get("content-length") || "?"} bytes, from ${r.res.headers.get("x-logo-source")} (${r.res.headers.get("x-logo-from")}), ${r.ms} ms`);
  else say(r.res.status === 404, `logo ${logo}`, `HTTP ${r.res.status} ${r.body ? JSON.stringify(r.body) : ""}${r.res.status === 404 ? " (not found is an expected answer)" : ""}`);
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
