// Sorting what arrives in a mailbox: a real reply, an out-of-office, or a bounce — and
// whether a reply asks to be left alone. Used by the outreach-worker edge function.
//
// Plain JavaScript with no imports, so Deno and Next can both load it.

// Replies from these don't say anything about the rest of a company, so they never stop
// colleagues' sequences.
export const FREE_MAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "live.co.uk",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.de",
  "web.de",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "qq.com",
  "163.com",
  "btinternet.com",
  "sky.com",
  "virginmedia.com",
];

const FREE_MAIL = new Set(FREE_MAIL_DOMAINS);

export function isFreeMailDomain(domain) {
  return FREE_MAIL.has(String(domain ?? "").toLowerCase());
}

/** `"Anna K" <anna@brand.co>` → { name: "Anna K", email: "anna@brand.co" }. */
export function parseAddress(value) {
  const text = String(value ?? "");
  const angle = /<([^<>\s]+@[^<>\s]+)>/.exec(text);
  const email = (angle ? angle[1] : (/[^\s<>"',;:]+@[^\s<>"',;:]+\.[^\s<>"',;:]+/.exec(text)?.[0] ?? "")).toLowerCase();
  const name = angle ? text.slice(0, angle.index).trim().replace(/^"(.*)"$/, "$1").trim() : "";
  return { name, email };
}

const BOUNCE_SENDER = /^(mailer-daemon|mail-daemon|mailerdaemon|postmaster)@/i;
const DELAY_SUBJECT = /\(delay\)|delayed|delivery delay|still trying|will (keep )?retry|not (yet )?been delivered yet/i;
const AUTO_REPLY_SUBJECT =
  /^\s*(auto(matic)?[\s_-]*(reply|response|antwort)|auto:|autoreply|out of (the )?office|ooo\b|away from (the )?office|on (annual )?leave|abwesenheit|r[ée]ponse automatique|respuesta autom[áa]tica|risposta automatica|automatisch antwoord)/i;
// Phrases asking us to stop. Deliberately broad: a false positive only means someone isn't
// emailed again, which is the safe side to err on.
const OPT_OUT =
  /\b(unsubscribe|remove me|take me off|opt[\s-]?out|stop (emailing|contacting|sending|messaging)|do not (email|contact)|don'?t (email|contact)|no more emails|not interested[,.!]? (please )?(remove|stop))/i;

function lowerKeys(headers) {
  const result = {};
  for (const [key, value] of Object.entries(headers ?? {})) result[key.toLowerCase()] = String(value ?? "");
  return result;
}

/**
 * Classifies an incoming message from its headers, subject and snippet:
 * 'bounce' (delivery failed), 'delay' (delivery still being retried — ignore),
 * 'auto_reply' (out-of-office and other machine replies) or 'reply'.
 */
export function classifyInbound({ from, subject = "", headers = {} }) {
  const h = lowerKeys(headers);
  const sender = parseAddress(from ?? h.from).email;
  const contentType = h["content-type"] ?? "";
  const deliveryReport = /multipart\/report/i.test(contentType) && /delivery-status/i.test(contentType);

  if (BOUNCE_SENDER.test(sender) || h["x-failed-recipients"] || deliveryReport) {
    return DELAY_SUBJECT.test(subject) ? "delay" : "bounce";
  }

  const autoSubmitted = (h["auto-submitted"] ?? "").trim().toLowerCase();
  if (
    (autoSubmitted && autoSubmitted !== "no") ||
    h["x-autoreply"] ||
    h["x-autorespond"] ||
    /auto[_-]?reply/i.test(h.precedence ?? "") ||
    AUTO_REPLY_SUBJECT.test(subject)
  ) {
    return "auto_reply";
  }
  return "reply";
}

/** Gmail snippets are HTML-escaped. */
export function decodeSnippet(snippet) {
  return String(snippet ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** The reply's own words: everything before the quoted email it's answering. */
export function stripQuoted(text) {
  const value = String(text ?? "");
  const cut = value.search(/\bOn .{1,160}? wrote:|-{2,}\s*Original Message\s*-{2,}|\n\s*>|\bFrom: .{1,200}?Sent: /i);
  return (cut === -1 ? value : value.slice(0, cut)).trim();
}

export function isOptOut(text) {
  return OPT_OUT.test(stripQuoted(text));
}

/**
 * For a bounce: the address that failed, from X-Failed-Recipients or the bounce text.
 * @param {{ headers?: Record<string, string>, snippet?: string, exclude?: string[] }} options
 * @returns {string | null}
 */
export function failedRecipient({ headers = {}, snippet = "", exclude = [] }) {
  const h = lowerKeys(headers);
  const fromHeader = parseAddress(h["x-failed-recipients"]).email;
  if (fromHeader) return fromHeader;
  const skip = new Set(exclude.map((email) => String(email).toLowerCase()));
  for (const match of String(snippet).matchAll(/[^\s<>"',;:()]+@[^\s<>"',;:()]+\.[a-z]{2,}/gi)) {
    const email = match[0].toLowerCase().replace(/[.]+$/, "");
    if (!skip.has(email) && !BOUNCE_SENDER.test(email)) return email;
  }
  return null;
}
