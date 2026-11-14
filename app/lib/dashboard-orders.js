// The one client of the dashboard link: everything the site sends to the Kazi dashboard (kazi-app) goes through here.
// The contract (endpoints, payload, answers, limits) is docs/dashboard-link.md; read it before changing anything below.
//
//   submitOrder(payload)      POST /api/website-orders with ONE key for every attempt, kept in an outbox (localStorage) until the
//                             dashboard says it has it, so a closed tab, a dead network or a deploy in progress loses nothing
//   submitWithMirror(...)     the quote forms: the dashboard AND the site's own database, success when either stored it
//   retryOutbox()             resend what an earlier visit could not deliver (the pages that use the link call it once, quietly)
//   fetchLogo({handle,site})  GET /api/website-orders/logo: a brand's logo, found by the Worker (browsers may not read other sites' pages): from
//                             the brand's WEBSITE, or from the public profile picture of an Instagram name (150 x 150 px: small). It answers 404
//                             with the words to show the customer when it finds nothing (a typo, a site that keeps robots out, Instagram not
//                             answering), and that is an ordinary outcome, not a fault.
//   parseBrandInput(text)     what a person typed ("@acme", "instagram.com/acme/", "acme.com") -> { handle } | { site } | null
//   checkHealth()             GET /api/website-orders/health
//
// Plain JS with no imports from the app (`createDashboardClient` takes its fetch, storage and clock) so it runs under node for the
// tests. The default client at the bottom is the one the pages use: it reads NEXT_PUBLIC_DASHBOARD_API_URL, which Next inlines at
// build time. Unset = the link is off and every function says so instead of throwing.
import { SITE_EMAIL, SITE_PHONE_DIGITS } from "./site.js";

export const OUTBOX_KEY = "kazi.orders.outbox";
const OUTBOX_MAX_ORDERS = 5;
const OUTBOX_MAX_CHARS = 4 * 1024 * 1024;
const OUTBOX_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const RETRY_DELAYS_MS = [1000, 3000];
const ATTEMPT_TIMEOUT_MS = 25000;
const LOGO_TIMEOUT_MS = 20000;
const HEALTH_TIMEOUT_MS = 8000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Limits the Worker enforces (docs/dashboard-link.md); the forms cut their text to these so a long message is not a 400, and the Create page
 * keeps its files inside the byte limits (`filesBytes`: all the files of an order once decoded; `dstBytes`: the stitch file; `bodyBytes`: the whole request).
 */
export const LIMITS = { name: 120, company: 160, message: 4000, qtyMax: 100000, bodyBytes: 4.5 * 1024 * 1024, filesBytes: 3 * 1024 * 1024, dstBytes: 2 * 1024 * 1024 };

/** A new uuid v4 for an order. Made once per order and reused on every retry: it is how the dashboard knows a resend from a new order. */
export function newOrderKey() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // randomUUID exists only in secure contexts (https, localhost): a phone testing the dev server on a LAN address has getRandomValues only.
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Text cut to a length (and trimmed) so it passes the Worker's caps. */
export function clip(text, max) {
  const s = String(text ?? "").replace(/\u0000/g, "").trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

/** A whole number from 1 to the Worker's cap: the quote forms may hold 0 ("custom", unreadable) or a million. */
export function clampQty(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v < 1) return 1;
  return Math.min(v, LIMITS.qtyMax);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// What a person typed into "Your Instagram name or website"
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const HANDLE = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9._]{1,30}$/;
const HOSTNAME = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})$/;
const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com", "instagr.am", "www.instagr.am", "l.instagram.com"]);
// First path segments on instagram.com that are pages, not accounts.
const IG_RESERVED = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct", "about", "legal", "developer", "web", "challenge", "emailsignup", "login", "privacy", "terms", "directory", "press", "api", "oauth", "_u"]);

/** A hostname in the form the Worker will fetch (lower case, punycode), or null when it is not a real public-looking name. */
function cleanHost(host) {
  const h = String(host || "").toLowerCase().replace(/\.$/, "");
  return HOSTNAME.test(h) ? h : null;
}

function handleFromPath(pathname) {
  const parts = String(pathname || "").split("/").filter(Boolean);
  if (parts[0] && parts[0].toLowerCase() === "_u" && parts[1]) parts.shift(); // instagram.com/_u/acme: the app's deep link
  const first = (parts[0] || "").toLowerCase();
  if (!first || IG_RESERVED.has(first) || !HANDLE.test(first)) return null;
  return first;
}

/**
 * What a person typed -> { handle: "acme" } | { site: "https://acme.com/shop" } | null.
 * Accepted: @acme, acme, Acme_Co, instagram.com/acme (with or without https://, www., a trailing slash or ?igsh=...), acme.com,
 * www.acme.com, https://acme.com/shop (the path is kept, the query and the #fragment are not).
 * A bare name with a dot ("acme.coffee") is a website; an Instagram name with a dot needs its @ ("@acme.coffee").
 * Rejected: spaces, an e-mail address, a link that is not http(s), a post or reel link, an address of a computer rather than a website.
 */
export function parseBrandInput(text) {
  let s = String(text ?? "").trim();
  if (!s || s.length > 300 || /\s/.test(s)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s) && !/^[a-z0-9.-]+:\d+(\/|$)/i.test(s)) return null; // javascript:, mailto:, ftp: ...

  if (s.startsWith("@")) {
    const h = s.slice(1).toLowerCase();
    return HANDLE.test(h) ? { handle: h } : null;
  }
  // An e-mail address, or a user@host link: an "@" before the first "/", "?" or "#". (A path may hold one: medium.com/@brand.)
  if (s.split(/[/?#]/)[0].includes("@")) return null;

  const looksLikeUrl = /^https?:\/\//i.test(s) || s.includes("/") || s.includes("?") || s.includes("#");
  const dotted = s.includes(".");
  if (!looksLikeUrl && !dotted) {
    const h = s.toLowerCase();
    return HANDLE.test(h) ? { handle: h } : null;
  }

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = cleanHost(url.hostname);
  if (!host) return null;
  if (IG_HOSTS.has(host)) {
    const h = handleFromPath(url.pathname);
    return h ? { handle: h } : null;
  }
  const path = url.pathname.replace(/\/+$/, "");
  return { site: `https://${host}${path}` };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The text of an order, for a person to send themselves when nothing else worked
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export function describeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((i) => [i.label || i.garment, i.colour?.label, i.qty ? `${i.qty} pcs` : null].filter(Boolean).join(", "))
    .join("; ");
}

/** An order written out in plain words (WhatsApp / e-mail fallback). Never contains the files. */
export function orderAsText(payload) {
  const p = payload || {};
  const c = p.contact || {};
  const b = p.brand || {};
  const brand = [b.handle ? `@${b.handle}` : null, b.website].filter(Boolean).join(" / ");
  const lines = [
    p.kind === "design" ? "Hi Kazi Manufacturing, I tried to place a Create by design order on your website but it did not go through." : "Hi Kazi Manufacturing, I tried to send a quote request on your website but it did not go through.",
    "",
    `What: ${describeItems(p.items) || "-"}`,
    brand ? `Brand: ${brand}` : null,
    p.service ? `Service: ${p.service}` : null,
    p.deadline ? `Deadline: ${p.deadline}` : null,
    p.design ? `Design: ${p.design.stitches?.toLocaleString?.("en-GB") ?? p.design.stitches} stitches, ${p.design.widthMm} x ${p.design.heightMm} mm${p.design.placement ? `, ${p.design.placement}` : ""}` : null,
    `Name: ${c.name || "-"}${c.company ? ` (${c.company})` : ""}`,
    `Email: ${c.email || "-"}`,
    c.phone ? `Phone: ${c.phone}` : null,
    p.message ? `\nMessage: ${p.message}` : null,
    p.key ? `\nReference: ${String(p.key).slice(0, 8)}` : null,
  ].filter((l) => l !== null);
  return lines.join("\n");
}

export const whatsappUrl = (payload) => `https://wa.me/${SITE_PHONE_DIGITS}?text=${encodeURIComponent(orderAsText(payload).slice(0, 1500))}`;
export const mailtoUrl = (payload) =>
  `mailto:${SITE_EMAIL}?subject=${encodeURIComponent(payload?.kind === "design" ? "Create by design order" : "Quote request")}&body=${encodeURIComponent(orderAsText(payload).slice(0, 1800))}`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The client
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export class LogoError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = "LogoError";
    this.code = code; // "not_found" | "rate_limited" | "unavailable" | "network" | "invalid" | "disabled"
    Object.assign(this, extra);
  }
}

const sleepFor = (ms) => new Promise((r) => setTimeout(r, ms));

function parseSize(text) {
  const m = /^(\d+)\s*x\s*(\d+)$/i.exec(String(text || "").trim());
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

function normaliseBase(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : "";
  } catch {
    return "";
  }
}

/** A short ladder for an order too big for what is left of the browser's storage: the stitch file goes first (staff can digitize the logo again), then the picture. */
const SHRINK_STEPS = [[], ["design"], ["design", "preview"], ["design", "preview", "logo", "artwork"]];
const SHRUNK_NOTE = "(Note: the customer's files could not be kept on their device when this was resent: please ask them for the logo again.)";

function shrunk(payload, level) {
  if (level === 0) return payload;
  const drop = new Set(SHRINK_STEPS[Math.min(level, SHRINK_STEPS.length - 1)]);
  const files = (payload.files || []).filter((f) => !drop.has(f.kind));
  const message = payload.message?.includes(SHRUNK_NOTE) ? payload.message : clip(`${payload.message || ""}\n\n${SHRUNK_NOTE}`, LIMITS.message);
  return { ...payload, files: files.length ? files : undefined, message };
}

export function createDashboardClient({ base, fetch: fetchImpl, storage, sleep = sleepFor, now = () => Date.now(), uuid = newOrderKey } = {}) {
  const origin = normaliseBase(base);
  const enabled = Boolean(origin);
  const doFetch = fetchImpl || ((...a) => globalThis.fetch(...a));
  const inflight = new Set();
  let retrying = false;

  const store = () => {
    try {
      return storage || globalThis.localStorage || null;
    } catch {
      return null; // a browser that blocks storage throws on the property read itself
    }
  };

  // ── the outbox ──────────────────────────────────────────────────────────────────────────────
  function readOutbox() {
    try {
      const raw = store()?.getItem(OUTBOX_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      const items = Array.isArray(data?.items) ? data.items : [];
      return items.filter((i) => i && UUID.test(String(i.key)) && i.payload && typeof i.payload === "object" && Number.isFinite(i.savedAt));
    } catch {
      return [];
    }
  }

  /** Writes the outbox; makes room (oldest first, then smaller files) when it is too big. Returns what was really kept. */
  function writeOutbox(items, newestKey) {
    const s = store();
    if (!s) return false;
    let list = items.slice(-OUTBOX_MAX_ORDERS);
    const text = (l) => JSON.stringify({ v: 1, items: l });
    const tryWrite = (l) => {
      try {
        if (l.length === 0) s.removeItem(OUTBOX_KEY);
        else s.setItem(OUTBOX_KEY, text(l));
        return true;
      } catch {
        return false; // quota, or storage blocked
      }
    };
    // drop the oldest others until it fits the size we allow ourselves
    while (list.length > 1 && text(list).length > OUTBOX_MAX_CHARS) list = list.slice(1);
    if (tryWrite(list)) return true;
    // the browser said no: fewer orders first, then smaller files on the newest one
    while (list.length > 1) {
      list = list.slice(1);
      if (tryWrite(list)) return true;
    }
    const newest = list.find((i) => i.key === newestKey) || list[0];
    if (!newest) return false;
    for (let level = 1; level < SHRINK_STEPS.length; level++) {
      if (tryWrite([{ ...newest, payload: shrunk(newest.payload, level) }])) return true;
    }
    return false;
  }

  function saveToOutbox(payload) {
    // A quote never carries files; for a design order the files are what makes it worth resending, so they stay (up to the size limit).
    const clean = payload.kind === "quote" ? { ...payload, files: undefined } : payload;
    const list = readOutbox().filter((i) => i.key !== payload.key);
    const entry = { key: payload.key, savedAt: now(), payload: clean };
    // an order bigger than the allowance on its own is stored smaller, never refused
    let level = 0;
    let candidate = entry;
    while (JSON.stringify(candidate).length > OUTBOX_MAX_CHARS && level < SHRINK_STEPS.length - 1) {
      level += 1;
      candidate = { ...entry, payload: shrunk(clean, level) };
    }
    return writeOutbox([...list, candidate], payload.key);
  }

  function removeFromOutbox(key) {
    const s = store();
    if (!s) return;
    const list = readOutbox();
    const next = list.filter((i) => i.key !== key);
    if (next.length === list.length) return;
    try {
      if (next.length === 0) s.removeItem(OUTBOX_KEY);
      else s.setItem(OUTBOX_KEY, JSON.stringify({ v: 1, items: next }));
    } catch {
      /* blocked: the order stays and is resent as a duplicate, which the dashboard answers with duplicate:true */
    }
  }

  // ── one POST ────────────────────────────────────────────────────────────────────────────────
  async function postOnce(payload, timeoutMs) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    let res;
    try {
      res = await doFetch(`${origin}/api/website-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctl.signal,
        credentials: "omit",
        cache: "no-store",
      });
    } catch {
      return { ok: false, status: 0, error: "network", message: "We could not reach the order system.", retryable: true };
    } finally {
      clearTimeout(timer);
    }
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    // Only an explicit { ok: true } is success: a 200 that is not the Worker's JSON (a page from some other route, an error page) is not.
    if (res.ok && body && body.ok === true) return { ok: true, status: res.status, ref: body.ref ?? null, id: body.id ?? null, duplicate: Boolean(body.duplicate) };
    const message = typeof body?.message === "string" ? body.message : "";
    if (res.status === 400) return { ok: false, status: 400, error: "invalid", field: body?.field ?? null, message: message || "The order system did not accept something in this order.", retryable: false };
    if (res.status === 413) return { ok: false, status: 413, error: "too_large", message: message || "The files are too big. Try a smaller logo.", retryable: false };
    if (res.status === 429) {
      const retryAfter = Number(body?.retryAfter ?? res.headers?.get?.("retry-after")) || 600;
      return { ok: false, status: 429, error: "rate_limited", retryAfter, message: message || "There have been a lot of orders from this connection. Please try again in a little while.", retryable: true };
    }
    return { ok: false, status: res.status, error: "unavailable", message: message || "The order system is not answering right now.", retryable: true };
  }

  /**
   * Send an order. Kept in the outbox before the first attempt and until the dashboard answers (ok, duplicate, or a 400/413 that no resend can fix).
   * Resolves (never throws) to { ok: true, ref, id, duplicate, key } or { ok: false, error, message, retryable, key, field? }.
   * `retryable: true` means it is still in the outbox and will be sent again by retryOutbox().
   */
  async function submitOrder(payload, { onProgress, attempts = 3, timeoutMs = ATTEMPT_TIMEOUT_MS } = {}) {
    const key = payload?.key && UUID.test(payload.key) ? payload.key : uuid();
    if (!enabled) return { ok: false, error: "disabled", message: "The order system is not connected on this site.", retryable: false, key };
    const order = { v: 1, ...payload, key };
    saveToOutbox(order);
    inflight.add(key);
    try {
      let last = null;
      for (let i = 0; i < attempts; i++) {
        onProgress?.({ attempt: i + 1, of: attempts, state: "sending" });
        const r = await postOnce(order, timeoutMs);
        if (r.ok) {
          removeFromOutbox(key);
          return { ...r, key };
        }
        last = r;
        if (!r.retryable) {
          removeFromOutbox(key); // no resend can fix it: keeping it would only make every page load try again
          return { ...r, key };
        }
        if (r.error === "rate_limited" && r.retryAfter > 10) break; // ten more seconds will not help against "try in ten minutes"
        if (i < attempts - 1) {
          onProgress?.({ attempt: i + 1, of: attempts, state: "waiting" });
          await sleep(RETRY_DELAYS_MS[i] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        }
      }
      return { ...last, retryable: true, key };
    } finally {
      inflight.delete(key);
    }
  }

  /** Orders an earlier visit could not deliver, sent again (one try each, oldest first). Quiet: never throws, never blocks a page. */
  async function retryOutbox() {
    const out = { sent: 0, kept: 0, dropped: 0 };
    if (!enabled || retrying) return out;
    retrying = true;
    try {
      const items = readOutbox().sort((a, b) => a.savedAt - b.savedAt);
      for (const item of items) {
        if (inflight.has(item.key)) { out.kept += 1; continue; } // a form on this page is sending it right now
        if (now() - item.savedAt > OUTBOX_MAX_AGE_MS) { removeFromOutbox(item.key); out.dropped += 1; continue; }
        inflight.add(item.key);
        let r;
        try {
          r = await postOnce({ v: 1, ...item.payload, key: item.key }, ATTEMPT_TIMEOUT_MS);
        } finally {
          inflight.delete(item.key);
        }
        if (r.ok) { removeFromOutbox(item.key); out.sent += 1; }
        else if (!r.retryable) { removeFromOutbox(item.key); out.dropped += 1; }
        else {
          out.kept += 1;
          if (r.error === "network" || r.error === "unavailable") break; // the system is down: do not hammer it with the rest
        }
      }
    } catch {
      /* quiet */
    } finally {
      retrying = false;
    }
    return out;
  }

  /**
   * The quote forms: send to the dashboard AND to the site's own database (`mirror`, a function that stores it there and resolves true,
   * or throws / resolves false). The customer is told it was received when EITHER stored it. If the mirror stored it and the dashboard is
   * slow, we wait for the dashboard only `graceMs` (the order stays in the outbox and is resent later); if the mirror failed we wait for
   * the dashboard to finish, because it may be the only copy.
   * Resolves to { stored, dashboard: result | null, mirror: { ok, error? } | null }.
   */
  async function submitWithMirror(payload, mirror, { graceMs = 12000, onProgress } = {}) {
    const key = payload?.key && UUID.test(payload.key) ? payload.key : uuid();
    const withKey = { ...payload, key };
    const dashP = enabled ? submitOrder(withKey, { onProgress, timeoutMs: 15000 }) : Promise.resolve(null);
    const mirrorP = typeof mirror === "function"
      ? Promise.resolve().then(mirror).then((r) => ({ ok: r !== false }), (error) => ({ ok: false, error }))
      : Promise.resolve(null);
    const m = await mirrorP;
    let d;
    if (m && m.ok && enabled) {
      let timer;
      d = await Promise.race([dashP, new Promise((r) => { timer = setTimeout(() => r(undefined), graceMs); })]);
      clearTimeout(timer);
      if (d === undefined) d = null; // still going: stays in the outbox
    } else {
      d = await dashP;
    }
    return { stored: Boolean((d && d.ok) || (m && m.ok)), dashboard: d, mirror: m, key };
  }

  // ── the logo ────────────────────────────────────────────────────────────────────────────────
  /** A brand's logo: { blob, type, source, from, size } or throws a LogoError (not_found, rate_limited, unavailable, network, invalid, disabled). */
  async function fetchLogo({ handle, site, signal } = {}) {
    if (!enabled) throw new LogoError("disabled", "The logo finder is not connected on this site.");
    const q = new URLSearchParams();
    if (handle) q.set("handle", handle);
    if (site) q.set("site", site);
    if (!q.toString()) throw new LogoError("invalid", "Type an Instagram name or a website first.");
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), LOGO_TIMEOUT_MS);
    const onAbort = () => ctl.abort();
    if (signal) {
      if (signal.aborted) ctl.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    let res;
    try {
      res = await doFetch(`${origin}/api/website-orders/logo?${q.toString()}`, { signal: ctl.signal, credentials: "omit", cache: "no-store" });
    } catch (err) {
      if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { name: "AbortError", code: "aborted" });
      throw new LogoError("network", ctl.signal.aborted ? "The logo search took too long." : "We could not reach the logo finder.", { cause: err });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    }
    if (res.ok) {
      const type = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!type.startsWith("image/")) throw new LogoError("unavailable", "The logo finder sent something that is not a picture.");
      const blob = await res.blob();
      if (!blob.size) throw new LogoError("not_found", "No logo found.");
      return { blob, type, source: res.headers.get("x-logo-source") || null, from: res.headers.get("x-logo-from") || null, size: parseSize(res.headers.get("x-logo-size")) };
    }
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    // 404 is an ordinary outcome (a mistyped Instagram name, Instagram not answering the Worker, a site that asks robots to keep out): the
    // Worker's `message` is written for the customer, so it is passed on as it is (`fromServer`) for the page to show.
    if (res.status === 404) {
      throw new LogoError("not_found", body?.message || "We could not find a logo there.", { fromServer: typeof body?.message === "string" && body.message.length > 0, tried: Array.isArray(body?.tried) ? body.tried : [] });
    }
    if (res.status === 400) throw new LogoError("invalid", body?.message || "That does not look like an Instagram name or a website.");
    if (res.status === 429) throw new LogoError("rate_limited", body?.message || "Too many searches just now. Try again in a minute, or upload your logo.", { retryAfter: Number(body?.retryAfter) || 60 });
    throw new LogoError("unavailable", body?.message || "The logo finder is not answering right now.");
  }

  async function checkHealth() {
    if (!enabled) return { ok: false, error: "disabled" };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), HEALTH_TIMEOUT_MS);
    try {
      const res = await doFetch(`${origin}/api/website-orders/health`, { signal: ctl.signal, credentials: "omit", cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) return { ok: false, status: res.status, error: "unavailable" };
      return { ok: body.ok === true, db: body.db !== false, v: body.v ?? null, status: res.status };
    } catch {
      return { ok: false, error: "network" };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    enabled,
    origin,
    submitOrder,
    submitWithMirror,
    retryOutbox,
    fetchLogo,
    checkHealth,
    outbox: { read: readOutbox, remove: removeFromOutbox, size: () => readOutbox().length },
  };
}

// The client the pages use. `process.env.NEXT_PUBLIC_DASHBOARD_API_URL` is replaced by Next at build time, so it must be spelled out like this.
const client = createDashboardClient({ base: process.env.NEXT_PUBLIC_DASHBOARD_API_URL });

export const dashboardEnabled = client.enabled;
export const submitOrder = client.submitOrder;
export const submitWithMirror = client.submitWithMirror;
export const retryOutbox = client.retryOutbox;
export const fetchLogo = client.fetchLogo;
export const checkHealth = client.checkHealth;
export const outboxSize = client.outbox.size;
