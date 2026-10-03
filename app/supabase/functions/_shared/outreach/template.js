// Personalisation for outreach emails. Shared by the outreach-worker edge function, which
// sends, and by /admin, which previews — so a preview is exactly what goes out.
//
//   {{first_name}}             a prospect field, or an imported column by its key
//   {{first_name|there}}       the same, with a fallback when the prospect has no value
//   {{random: Hi|Hello|Hey}}   one of the options, chosen per prospect and email
//
// Plain JavaScript with no imports, so Deno and Next can both load it.

export const TEMPLATE_FIELDS = [
  { key: "first_name", label: "First name", sample: "Anna" },
  { key: "last_name", label: "Last name", sample: "Kowalski" },
  { key: "company", label: "Company", sample: "Northbound Apparel" },
  { key: "title", label: "Job title", sample: "Head of Product" },
  { key: "website", label: "Website", sample: "northbound.co.uk" },
  { key: "city", label: "City", sample: "Manchester" },
  { key: "country", label: "Country", sample: "United Kingdom" },
  { key: "sender_first_name", label: "Your first name", sample: "Sam" },
  { key: "sender_name", label: "Your full name", sample: "Sam Rai" },
];

const PROSPECT_COLUMNS = new Set([
  "email",
  "first_name",
  "last_name",
  "company",
  "title",
  "website",
  "phone",
  "linkedin_url",
  "city",
  "country",
]);

const TOKEN = /\{\{([^{}]*)\}\}/g;
const RANDOM = /^\s*random\s*:([\s\S]*)$/i;

/** "First Name" / "first-name" → "first_name", the form imported columns are stored under. */
export function normalizeKey(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function lookup(key, context) {
  const prospect = context.prospect ?? {};
  if (PROSPECT_COLUMNS.has(key)) return prospect[key];
  switch (key) {
    case "full_name":
      return [prospect.first_name, prospect.last_name].filter(Boolean).join(" ");
    case "sender_name":
      return context.sender?.name;
    case "sender_first_name":
      return context.sender?.name?.trim().split(/\s+/)[0];
    case "sender_email":
      return context.sender?.email;
    case "unsubscribe_url":
      return context.unsubscribeUrl;
    default:
      return prospect.fields?.[key];
  }
}

// FNV-1a, then mulberry32: a small, repeatable generator, so a retried send (or a preview of
// the same prospect) picks the same {{random}} options.
function seededRandom(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills in a template. Variables with no value and no fallback are left as they are and
 * listed in `missing` — the worker won't send an email with any missing.
 */
export function renderTemplate(template, context = {}, seed = "") {
  const missing = new Set();
  const random = seededRandom(seed);
  const text = String(template ?? "").replace(TOKEN, (token, inner) => {
    const choice = RANDOM.exec(inner);
    if (choice) {
      const options = choice[1].split("|").map((option) => option.trim());
      return options[Math.floor(random() * options.length)];
    }
    const [name, ...fallback] = inner.split("|");
    const key = normalizeKey(name);
    if (!key) return token;
    const value = lookup(key, context);
    const clean = value == null ? "" : String(value).trim();
    if (clean) return clean;
    if (fallback.length) return fallback.join("|").trim();
    missing.add(key);
    return token;
  });
  return { text, missing: [...missing] };
}

/**
 * The variables a template uses (not counting {{random}}), in order of appearance.
 * `fallback` is true when every use of the variable has one, so a blank value is fine.
 */
export function templateVariables(template) {
  const found = new Map();
  for (const [, inner] of String(template ?? "").matchAll(TOKEN)) {
    if (RANDOM.test(inner)) continue;
    const [name, ...fallback] = inner.split("|");
    const key = normalizeKey(name);
    if (!key) continue;
    found.set(key, (found.get(key) ?? true) && fallback.length > 0);
  }
  return [...found].map(([key, fallback]) => ({ key, fallback }));
}

export function replySubject(subject) {
  const clean = String(subject ?? "").trim();
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`;
}

export const UNSUBSCRIBE_TEXT = "If you'd rather not hear from us again, you can unsubscribe here:";

/**
 * Builds one email of a sequence for one prospect.
 *
 *   subjectTemplate  the step's subject; empty on a follow-up that replies in the thread
 *   threadSubject    the subject the thread started with (already personalised)
 *   inThread         whether this mailbox can continue the prospect's thread
 *
 * A follow-up with no subject of its own is a reply ("Re: …") when it can continue the
 * thread, and otherwise goes out under the thread's original subject — never a "Re:" to a
 * conversation the prospect can't see.
 *
 * @param {{
 *   subjectTemplate?: string | null,
 *   bodyTemplate?: string | null,
 *   threadSubject?: string | null,
 *   inThread?: boolean,
 *   prospect?: Record<string, any> | null,
 *   sender?: { name?: string | null, email?: string | null } | null,
 *   signature?: string | null,
 *   unsubscribeUrl?: string | null,
 *   seed?: string,
 * }} options
 * @returns {{ subject: string | null, body: string, isReply: boolean, missing: string[] }}
 */
export function composeEmail({
  subjectTemplate,
  bodyTemplate,
  threadSubject = null,
  inThread = false,
  prospect,
  sender,
  signature = "",
  unsubscribeUrl = null,
  seed = "",
}) {
  const context = { prospect, sender, unsubscribeUrl };
  const missing = new Set();
  const collect = (result) => {
    result.missing.forEach((key) => missing.add(key));
    return result.text;
  };

  let subject = null;
  let isReply = false;
  if (String(subjectTemplate ?? "").trim()) {
    subject = collect(renderTemplate(subjectTemplate, context, `${seed}:subject`)).trim();
  } else if (threadSubject) {
    isReply = inThread;
    subject = inThread ? replySubject(threadSubject) : threadSubject;
  }
  // A subject is a header: no line breaks, whatever ended up in the prospect's data.
  if (subject) subject = subject.replace(/\s*[\r\n]+\s*/g, " ");

  let body = collect(renderTemplate(bodyTemplate, context, `${seed}:body`)).trimEnd();
  if (String(signature ?? "").trim()) {
    body += `\n\n${collect(renderTemplate(signature, context, `${seed}:signature`)).trim()}`;
  }
  if (unsubscribeUrl && !/\{\{\s*unsubscribe_url/i.test(String(bodyTemplate ?? ""))) {
    body += `\n\n${UNSUBSCRIBE_TEXT} ${unsubscribeUrl}`;
  }

  return { subject, body, isReply, missing: [...missing] };
}
