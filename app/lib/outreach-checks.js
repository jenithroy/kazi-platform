import { templateVariables } from "@/supabase/functions/_shared/outreach/template";

// Pointers for writing cold email that gets replies and stays out of spam folders. Like the
// SEO checks, they're advice rather than rules.

const SPAM_PHRASES = [
  "free",
  "guarantee",
  "guaranteed",
  "100%",
  "act now",
  "limited time",
  "click here",
  "buy now",
  "risk-free",
  "risk free",
  "no obligation",
  "special offer",
  "winner",
  "cash",
  "urgent",
  "$$$",
  "!!!",
];

const words = (text) => (String(text ?? "").match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
const links = (text) => (String(text ?? "").match(/https?:\/\/\S+|www\.\S+/gi) ?? []).length;

export function checkStep({ subject, body, position, unsubscribeLink }) {
  const checks = [];
  const add = (id, status, label, hint) => checks.push({ id, status, label, hint });
  const text = `${subject ?? ""}\n${body ?? ""}`;
  const count = words(body);

  if (position === 1) {
    if (/^\s*(re|fwd?)\s*:/i.test(subject ?? "")) {
      add("fake-reply", "fail", "Don't start with “Re:” or “Fwd:”", "Pretending to continue a conversation breaks trust, and spam filters notice.");
    }
    if ((subject ?? "").length > 60) add("subject-length", "warn", "Long subject", "Short subjects (2–6 words) read like a colleague's email and get opened more.");
    if (!templateVariables(text).length) {
      add("personal", "warn", "Not personalised", "Mention their name or company with {{first_name}} or {{company}} — generic emails get ignored.");
    }
    if (count > 150) add("length", "warn", `${count} words`, "First emails under about 125 words get the most replies. Say one thing and ask one question.");
  } else if (count > 100) {
    add("length", "warn", `${count} words`, "Follow-ups work best short — two or three sentences.");
  }
  if (count > 0 && count < 12) add("short", "warn", "Very short", "Add a sentence of context so the email stands on its own.");

  const linkCount = links(body);
  if (linkCount > 1) add("links", "warn", `${linkCount} links`, "Several links make a first-time email look like marketing. Keep it to one, or none.");
  if (/<\s*(a|img|p|br|div|span|table)\b/i.test(body ?? "")) {
    add("html", "warn", "HTML in the message", "Emails go out as plain text, so tags appear exactly as typed.");
  }

  const lower = text.toLowerCase();
  const spammy = SPAM_PHRASES.filter((phrase) => lower.includes(phrase));
  if (spammy.length) add("spam", "warn", "Words spam filters watch for", `Consider rewording: ${spammy.map((phrase) => `“${phrase}”`).join(", ")}.`);
  if (/\b[A-Z]{4,}\b/.test(subject ?? "")) add("caps", "warn", "Capitals in the subject", "All-caps words read as shouting and as spam.");

  if (position === 1 && !unsubscribeLink && !/(let me know|not (the right|relevant|interested)|unsubscribe|reply)/i.test(body ?? "")) {
    add(
      "opt-out",
      "warn",
      "No way to opt out",
      "Tell people how to stop the emails — e.g. “If this isn't relevant, just let me know and I won't follow up.” — or turn on the unsubscribe link.",
    );
  }
  return checks;
}
