#!/usr/bin/env node
// Sends the dashboard the quotes it does not have. The site's own database (the `quotes` table) keeps every quote request; the dashboard
// gets them through POST /api/website-orders (docs/dashboard-link.md). If that ever failed (the Worker was down, a deploy, a bad key), this
// finds the quotes and sends them again. The `key` is the quote's id, and the dashboard stores one order per key, so it is safe to run twice:
// a quote it already has comes back as "already there".
//
// node scripts/dashboard-link/replay-quotes.mjs [--since 2026-11-01] [--limit 500] [--base <url>] [--delay 1200] [--send]
//
//   without --send   a dry run: reads the quotes and prints what it WOULD send (nothing is sent)
//   --send           sends them, one every --delay milliseconds (the dashboard allows 10 an hour from one address and 5 per e-mail unless
//                    the Worker has WEBSITE_ORDERS_REPLAY_SECRET set and the same value is in this environment)
//
// Environment (never put these in a file in the repo):
//   SITE_SUPABASE_URL           the website's Supabase project URL
//   SITE_SUPABASE_SERVICE_KEY   its service_role (or sb_secret_...) key: the quotes table is not readable with the public key
//   NEXT_PUBLIC_DASHBOARD_API_URL or --base   the dashboard Worker
//   WEBSITE_ORDERS_REPLAY_SECRET (optional)   sent as x-replay-secret so the rate limits are skipped
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const siteUrl = String(process.env.SITE_SUPABASE_URL || "").replace(/\/+$/, "");
const siteKey = process.env.SITE_SUPABASE_SERVICE_KEY || "";
const base = String(value("--base", process.env.NEXT_PUBLIC_DASHBOARD_API_URL || "")).replace(/\/+$/, "");
const secret = process.env.WEBSITE_ORDERS_REPLAY_SECRET || "";
const send = flag("--send");
const since = value("--since", "");
const limit = Math.max(1, Math.min(5000, Number(value("--limit", "500")) || 500));
const delay = Math.max(0, Number(value("--delay", "1200")) || 0);

const die = (text) => { console.error(text); process.exit(2); };
if (!siteUrl || !siteKey) die("Set SITE_SUPABASE_URL and SITE_SUPABASE_SERVICE_KEY (the website's Supabase project) to read the quotes.");
if (!base) die("Say where the dashboard is: --base https://... or NEXT_PUBLIC_DASHBOARD_API_URL.");
if (since && !/^\d{4}-\d{2}-\d{2}/.test(since)) die("--since must look like 2026-11-01.");

// A newer Supabase "sb_secret_..." key is not a JWT: it goes on apikey alone (the same rule as the dashboard Worker's service client).
const rest = (path) =>
  fetch(`${siteUrl}/rest/v1/${path}`, { headers: { apikey: siteKey, ...(siteKey.startsWith("sb_") ? {} : { Authorization: `Bearer ${siteKey}` }) } }).then(async (res) => {
    if (!res.ok) throw new Error(`reading ${path.split("?")[0]} failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.json();
  });

const clip = (text, max) => {
  const s = String(text ?? "").replace(/\u0000/g, "").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};
const qty = (n) => Math.min(100000, Math.max(1, Math.round(Number(n)) || 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── read ──────────────────────────────────────────────────────────────────────────────────────
const filter = since ? `&created_at=gte.${encodeURIComponent(since)}` : "";
const quotes = await rest(`quotes?select=id,created_at,customer_id,contact_name,contact_email,contact_phone,company_name,product_type,quantity,deadline,details&order=created_at.asc${filter}&limit=${limit}`);

// A signed-in customer's quote may carry no contact details of its own: they are on the profile.
const needProfile = [...new Set(quotes.filter((q) => !q.contact_email && q.customer_id).map((q) => q.customer_id))];
const profiles = new Map();
for (let i = 0; i < needProfile.length; i += 50) {
  const chunk = needProfile.slice(i, i + 50);
  for (const p of await rest(`profiles?select=id,email,full_name,company_name,phone&id=in.(${chunk.join(",")})`)) profiles.set(p.id, p);
}

function toOrder(q) {
  const profile = profiles.get(q.customer_id) || {};
  const email = (q.contact_email || profile.email || "").trim();
  const name = (q.contact_name || profile.full_name || "").trim();
  if (!email) return { skip: "no e-mail on the quote or its profile" };
  if (!name) return { skip: "no name" };
  const received = String(q.created_at || "").replace("T", " ").slice(0, 16);
  return {
    order: {
      v: 1,
      key: q.id,
      kind: "quote",
      contact: {
        name: clip(name, 120),
        email,
        ...((q.contact_phone || profile.phone) ? { phone: clip(q.contact_phone || profile.phone, 40) } : {}),
        ...((q.company_name || profile.company_name) ? { company: clip(q.company_name || profile.company_name, 160) } : {}),
      },
      items: [{ garment: "other", label: clip(q.product_type || "Quote request", 80), qty: qty(q.quantity) }],
      ...(q.deadline ? { deadline: String(q.deadline).slice(0, 10) } : {}),
      message: clip(`${q.details || ""}\n\n(Sent again from the website's own database: the request was made on ${received} UTC.)`, 4000),
      source: { page: "/replay" },
      hp: "",
    },
  };
}

// ── report / send ─────────────────────────────────────────────────────────────────────────────
const rows = [];
let stop = "";
for (const q of quotes) {
  const made = toOrder(q);
  const row = { id: q.id.slice(0, 8), made: String(q.created_at || "").slice(0, 16).replace("T", " "), who: (q.contact_email || profiles.get(q.customer_id)?.email || "-").slice(0, 28), what: `${q.product_type || "-"} x${q.quantity ?? "?"}`.slice(0, 28), result: "" };
  if (made.skip) {
    row.result = `skipped: ${made.skip}`;
  } else if (!send) {
    row.result = "would send";
  } else if (stop) {
    row.result = "not tried";
  } else {
    let res;
    try {
      res = await fetch(`${base}/api/website-orders`, { method: "POST", headers: { "content-type": "application/json", ...(secret ? { "x-replay-secret": secret } : {}) }, body: JSON.stringify(made.order) });
    } catch (err) {
      row.result = `FAILED: ${err.cause?.code || err.message}`;
      stop = "the dashboard did not answer";
      rows.push(row);
      continue;
    }
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok === true) row.result = body.duplicate ? `already there (${body.ref})` : `sent (${body.ref})`;
    else if (res.status === 429) { row.result = "RATE LIMITED"; stop = "the dashboard says too many (set WEBSITE_ORDERS_REPLAY_SECRET on both sides, or run again later)"; }
    else row.result = `FAILED: HTTP ${res.status} ${body?.field ? `${body.field}: ` : ""}${body?.message || body?.error || ""}`.slice(0, 90);
    if (delay) await sleep(delay);
  }
  rows.push(row);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`${send ? "SENDING" : "DRY RUN (nothing is sent; add --send)"}  ${quotes.length} quote(s)${since ? ` since ${since}` : ""}, dashboard ${base}\n`);
console.log(`${pad("id", 9)}${pad("made", 17)}${pad("e-mail", 30)}${pad("what", 30)}result`);
for (const r of rows) console.log(`${pad(r.id, 9)}${pad(r.made, 17)}${pad(r.who, 30)}${pad(r.what, 30)}${r.result}`);
const count = (re) => rows.filter((r) => re.test(r.result)).length;
console.log(`\n${send ? `sent ${count(/^sent/)}, already there ${count(/^already/)}` : `would send ${count(/^would/)}`}, skipped ${count(/^skipped/)}, failed ${count(/FAILED|RATE/)}${stop ? `. Stopped: ${stop}` : ""}`);
process.exit(count(/FAILED|RATE/) ? 1 : 0);
