// One pass of the outreach worker over every connected mailbox. Runs every minute from
// pg_cron (the outreach-worker function) and on demand from /admin ("Run now").
//
// For each mailbox:
//   1. Read the mail that arrived since the last pass (Gmail history) and record replies,
//      out-of-office replies and bounces against the prospects they belong to. A reply or
//      bounce ends that prospect's sequence before anything else goes out.
//   2. If the mailbox is active, under its 24-hour limit and past its pause after the last
//      send, send the next email that's due inside its sequence's sending hours. One per
//      pass, so emails go out a few minutes apart like someone working through a list.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  classifyInbound,
  decodeSnippet,
  failedRecipient,
  FREE_MAIL_DOMAINS,
  isOptOut,
  parseAddress,
} from "./classify.js";
import { composeEmail } from "./template.js";
import { effectiveDailyLimit, isWithinWindow, randomGapSeconds } from "./schedule.js";
import { buildMessage, toBase64Url } from "./mime.ts";
import { decryptSecret, encryptSecret, unsubscribeToken } from "./crypto.ts";
import { domainAcceptsMail, gmail, GoogleError, messageHeaders, refreshAccessToken } from "./google.ts";
import { check, errorMessage } from "./http.ts";

const LEASE_SECONDS = 150;
const MAX_INBOUND_PER_PASS = 150;
const DUE_BATCH = 25;
const DOMAIN_CHECK_DAYS = 30;
const SLOW_DOWN_MINUTES = 15;
const RESERVE_MINUTES = 30;

// Prospects in these states never get another cold email.
const FINISHED_PROSPECT = new Map([
  ["replied", "replied"],
  ["interested", "interested"],
  ["meeting", "meeting booked"],
  ["customer", "customer"],
  ["not_interested", "not interested"],
  ["bounced", "bounced"],
  ["unsubscribed", "unsubscribed"],
]);

const INBOUND_HEADERS = ["From", "To", "Subject", "Auto-Submitted", "X-Autoreply", "X-Autorespond", "Precedence", "X-Failed-Recipients", "Content-Type"]
  .map((name) => `metadataHeaders=${name}`)
  .join("&");

export type Summary = {
  mailboxes: number;
  sent: number;
  replies: number;
  autoReplies: number;
  bounces: number;
  optOuts: number;
  errors: string[];
};

export type Mailbox = {
  id: string;
  email: string;
  from_name: string;
  signature: string;
  status: string;
  last_error: string | null;
  daily_limit: number;
  warmup_enabled: boolean;
  warmup_start: number;
  warmup_increment: number;
  warmup_started_at: string;
  min_gap_seconds: number;
  max_gap_seconds: number;
  next_send_at: string;
  gmail_history_id: string | null;
};

type Prospect = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  [key: string]: unknown;
};

type DueEmail = {
  enrollment_id: string;
  last_step_position: number;
  gmail_thread_id: string | null;
  thread_subject: string | null;
  rfc_message_ids: string[];
  thread_mailbox_id: string | null;
  sequence_id: string;
  timezone: string;
  send_days: number[];
  send_from: string;
  send_until: string;
  unsubscribe_link: boolean;
  step_position: number | null;
  step_subject: string | null;
  step_body: string | null;
  prospect: Prospect;
};

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

export class MailboxAuthError extends Error {}

const nowIso = () => new Date().toISOString();

export async function runWorker(db: SupabaseClient): Promise<Summary | { skipped: string }> {
  const { data: claimed } = check(await db.rpc("outreach_claim_worker", { p_seconds: LEASE_SECONDS }));
  if (!claimed) return { skipped: "Another run is still in progress." };

  const summary: Summary = { mailboxes: 0, sent: 0, replies: 0, autoReplies: 0, bounces: 0, optOuts: 0, errors: [] };
  let fatal: string | null = null;
  try {
    const { data: mailboxes } = check(
      await db.from("outreach_mailboxes").select("*").in("status", ["active", "paused"]).order("created_at"),
    );
    for (const mailbox of (mailboxes ?? []) as Mailbox[]) {
      summary.mailboxes++;
      let notice: string | null = null;
      try {
        notice = await processMailbox(db, mailbox, summary);
      } catch (error) {
        notice = errorMessage(error);
        summary.errors.push(`${mailbox.email}: ${notice}`);
        if (error instanceof MailboxAuthError) {
          await db.from("outreach_mailboxes").update({ status: "error", last_error: notice }).eq("id", mailbox.id);
          continue;
        }
      }
      if ((mailbox.last_error ?? null) !== notice) {
        await db.from("outreach_mailboxes").update({ last_error: notice }).eq("id", mailbox.id);
      }
    }
  } catch (error) {
    fatal = errorMessage(error);
  } finally {
    await db.rpc("outreach_finish_worker", { p_summary: summary, p_error: fatal });
  }
  return summary;
}

/** Returns a notice to show on the mailbox (e.g. Gmail's limit was reached), or null. */
async function processMailbox(db: SupabaseClient, mailbox: Mailbox, summary: Summary): Promise<string | null> {
  const token = await mailboxAccessToken(db, mailbox);
  await syncMailbox(db, mailbox, token, summary);
  return mailbox.status === "active" ? await sendNext(db, mailbox, token, summary) : null;
}

// ---------------------------------------------------------------------------------------
// Google access
// ---------------------------------------------------------------------------------------

export async function mailboxAccessToken(db: SupabaseClient, mailbox: Pick<Mailbox, "id">): Promise<string> {
  const { data: credential } = check(
    await db.from("outreach_mailbox_credentials").select("*").eq("mailbox_id", mailbox.id).maybeSingle(),
  );
  if (!credential) throw new MailboxAuthError("No Google access is stored for this mailbox. Reconnect it.");
  if (
    credential.access_token &&
    credential.access_token_expires_at &&
    Date.parse(credential.access_token_expires_at) - Date.now() > 120_000
  ) {
    return decryptSecret(credential.access_token);
  }

  let fresh;
  try {
    fresh = await refreshAccessToken(await decryptSecret(credential.refresh_token));
  } catch (error) {
    if (error instanceof GoogleError && error.reason === "invalid_grant") {
      throw new MailboxAuthError(
        "Google no longer accepts this mailbox's access (its password changed, or access was removed in the Google account). Reconnect it.",
      );
    }
    throw error;
  }
  check(
    await db
      .from("outreach_mailbox_credentials")
      .update({
        access_token: await encryptSecret(fresh.access_token),
        access_token_expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString(),
        updated_at: nowIso(),
      })
      .eq("mailbox_id", mailbox.id),
  );
  return fresh.access_token;
}

// ---------------------------------------------------------------------------------------
// Reading replies and bounces
// ---------------------------------------------------------------------------------------

async function syncMailbox(db: SupabaseClient, mailbox: Mailbox, token: string, summary: Summary) {
  if (!mailbox.gmail_history_id) {
    const profile = await gmail(token, "/profile");
    check(
      await db
        .from("outreach_mailboxes")
        .update({ gmail_history_id: String(profile.historyId), last_synced_at: nowIso() })
        .eq("id", mailbox.id),
    );
    return;
  }

  const inbound: string[] = [];
  let cursor = mailbox.gmail_history_id;
  let pageToken: string | undefined;
  let full = false;
  while (!full) {
    const params = new URLSearchParams({ startHistoryId: mailbox.gmail_history_id, historyTypes: "messageAdded", maxResults: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    let page;
    try {
      page = await gmail(token, `/history?${params}`);
    } catch (error) {
      // History only goes back about a week; after a long gap, fall back to the threads.
      if (error instanceof GoogleError && error.status === 404) return resyncFromThreads(db, mailbox, token, summary);
      throw error;
    }
    for (const record of page.history ?? []) {
      const ids = (record.messagesAdded ?? [])
        .map((added: { message: GmailMessage }) => added.message)
        .filter((message: GmailMessage) => !message.labelIds?.includes("SENT") && !message.labelIds?.includes("DRAFT"))
        .map((message: GmailMessage) => message.id);
      if (inbound.length && inbound.length + ids.length > MAX_INBOUND_PER_PASS) {
        full = true; // the rest waits for the next pass, which starts after `cursor`
        break;
      }
      inbound.push(...ids);
      cursor = String(record.id);
    }
    if (full) break;
    if (!page.nextPageToken) {
      cursor = String(page.historyId ?? cursor);
      break;
    }
    pageToken = page.nextPageToken;
  }

  const messages = await fetchMessages(token, inbound);
  for (const message of messages) await recordInbound(db, mailbox, message, summary);
  check(await db.from("outreach_mailboxes").update({ gmail_history_id: cursor, last_synced_at: nowIso() }).eq("id", mailbox.id));
}

async function fetchMessages(token: string, ids: string[]): Promise<GmailMessage[]> {
  const unique = [...new Set(ids)];
  const results: GmailMessage[] = [];
  for (let i = 0; i < unique.length; i += 10) {
    const batch = await Promise.all(
      unique.slice(i, i + 10).map((id) =>
        gmail<GmailMessage>(token, `/messages/${id}?format=metadata&${INBOUND_HEADERS}`).catch((error) => {
          if (error instanceof GoogleError && error.status === 404) return null; // deleted since
          throw error;
        }),
      ),
    );
    results.push(...(batch.filter(Boolean) as GmailMessage[]));
  }
  return results;
}

async function resyncFromThreads(db: SupabaseClient, mailbox: Mailbox, token: string, summary: Summary) {
  const profile = await gmail(token, "/profile");
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: threads } = check(
    await db
      .from("outreach_enrollments")
      .select("gmail_thread_id")
      .eq("mailbox_id", mailbox.id)
      .not("gmail_thread_id", "is", null)
      .gte("last_sent_at", since)
      .limit(200),
  );
  for (const { gmail_thread_id } of threads ?? []) {
    let thread;
    try {
      thread = await gmail(token, `/threads/${gmail_thread_id}?format=metadata&${INBOUND_HEADERS}`);
    } catch (error) {
      if (error instanceof GoogleError && error.status === 404) continue;
      throw error;
    }
    for (const message of (thread.messages ?? []) as GmailMessage[]) {
      if (message.labelIds?.includes("SENT") || message.labelIds?.includes("DRAFT")) continue;
      await recordInbound(db, mailbox, message, summary);
    }
  }
  check(
    await db
      .from("outreach_mailboxes")
      .update({ gmail_history_id: String(profile.historyId), last_synced_at: nowIso() })
      .eq("id", mailbox.id),
  );
}

async function recordInbound(db: SupabaseClient, mailbox: Mailbox, message: GmailMessage, summary: Summary) {
  const headers = messageHeaders(message);
  const from = parseAddress(headers.from);
  if (!from.email || from.email === mailbox.email) return;

  const subject = headers.subject ?? "";
  const kind = classifyInbound({ from: headers.from, subject, headers });
  if (kind === "delay") return;
  const snippet = decodeSnippet(message.snippet);
  // A "Re:" subject is our own subject coming back, so only a fresh one can carry an opt-out
  // (e.g. "unsubscribe", which the List-Unsubscribe mailto link sends).
  const ownSubject = /^\s*(re|aw|sv|antw|odp)\s*:/i.test(subject) ? "" : subject;

  const { data: outcome } = check(
    await db.rpc("outreach_record_inbound", {
      p: {
        mailbox_id: mailbox.id,
        kind,
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
        from_email: from.email,
        to_email: parseAddress(headers.to).email || null,
        subject,
        snippet,
        occurred_at: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
        failed_recipient: kind === "bounce" ? failedRecipient({ headers, snippet, exclude: [mailbox.email] }) : null,
        unsubscribe: kind === "reply" && isOptOut(`${ownSubject}\n${snippet}`),
        free_mail_domains: FREE_MAIL_DOMAINS,
      },
    }),
  );
  if (outcome === "reply") summary.replies++;
  if (outcome === "unsubscribe") {
    summary.replies++;
    summary.optOuts++;
  }
  if (outcome === "auto_reply") summary.autoReplies++;
  if (outcome === "bounce") summary.bounces++;
}

// ---------------------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------------------

async function sendNext(db: SupabaseClient, mailbox: Mailbox, token: string, summary: Summary): Promise<string | null> {
  const now = new Date();
  if (Date.parse(mailbox.next_send_at) > now.getTime()) return mailbox.last_error;

  const { count, error } = await db
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("mailbox_id", mailbox.id)
    .eq("direction", "outbound")
    .gte("occurred_at", new Date(now.getTime() - 86_400_000).toISOString());
  if (error) throw new Error(errorMessage(error));
  if ((count ?? 0) >= effectiveDailyLimit(mailbox, now.getTime())) return null;

  const { data: due } = check(await db.rpc("outreach_due_enrollments", { p_mailbox_id: mailbox.id, p_limit: DUE_BATCH }));
  for (const item of (due ?? []) as DueEmail[]) {
    if (!isWithinWindow(now, item)) continue;
    const outcome = await sendStep(db, mailbox, token, item);
    if (outcome.status === "sent") {
      summary.sent++;
      return null;
    }
    if (outcome.status === "stop") return outcome.notice;
  }
  return null;
}

type StepOutcome = { status: "sent" } | { status: "skipped" } | { status: "stop"; notice: string };

async function sendStep(db: SupabaseClient, mailbox: Mailbox, token: string, item: DueEmail): Promise<StepOutcome> {
  const prospect = item.prospect;
  const setEnrollment = async (status: string, detail: string | null, extra: Record<string, unknown> = {}) => {
    check(await db.from("outreach_enrollments").update({ status, status_detail: detail, ...extra }).eq("id", item.enrollment_id));
  };

  if (!item.step_position) {
    await setEnrollment("completed", "Sent every email — no reply");
    return { status: "skipped" };
  }
  const finished = FINISHED_PROSPECT.get(prospect.status);
  if (finished) {
    await setEnrollment("stopped", `The prospect is marked “${finished}”`);
    return { status: "skipped" };
  }
  const { data: suppressed } = check(await db.rpc("outreach_is_suppressed", { p_email: prospect.email }));
  if (suppressed) {
    await setEnrollment("stopped", "On the do-not-contact list");
    return { status: "skipped" };
  }
  if (item.last_step_position === 0) {
    const domain = prospect.email.split("@")[1];
    if ((await checkDomain(db, domain)) === false) {
      await setEnrollment("bounced", `${domain} can't receive email (it has no mail server)`);
      await db.from("outreach_prospects").update({ status: "bounced" }).eq("id", prospect.id).neq("status", "customer");
      return { status: "skipped" };
    }
  }

  const links = item.unsubscribe_link ? await unsubscribeLinks(prospect.id) : null;
  const email = composeEmail({
    subjectTemplate: item.step_subject,
    bodyTemplate: item.step_body,
    threadSubject: item.thread_subject,
    inThread: Boolean(item.gmail_thread_id) && item.thread_mailbox_id === mailbox.id,
    prospect,
    sender: { name: mailbox.from_name, email: mailbox.email },
    signature: mailbox.signature,
    unsubscribeUrl: links?.page ?? null,
    seed: `${item.enrollment_id}:${item.step_position}`,
  });
  if (email.missing.length) {
    const list = email.missing.map((key) => `{{${key}}}`).join(", ");
    await setEnrollment(
      "error",
      `Nothing to fill in for ${list}. Add it to the prospect, or give it a fallback like {{${email.missing[0]}|there}}, then retry.`,
    );
    return { status: "skipped" };
  }
  if (!email.subject) {
    await setEnrollment("error", "This email has no subject. Add one in the sequence, then retry.");
    return { status: "skipped" };
  }

  const references = email.isReply ? (item.rfc_message_ids ?? []) : [];
  const raw = buildMessage({
    from: { name: mailbox.from_name, email: mailbox.email },
    to: { name: [prospect.first_name, prospect.last_name].filter(Boolean).join(" "), email: prospect.email },
    subject: email.subject,
    body: email.body,
    inReplyTo: references.at(-1) ?? null,
    references,
    headers: links
      ? {
          "List-Unsubscribe": `<${links.oneClick}>, <mailto:${mailbox.email}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : {},
  });

  // Hold the enrolment while sending, so a crash between sending and recording can't make
  // the next pass send the same email straight away.
  check(
    await db
      .from("outreach_enrollments")
      .update({ next_send_at: new Date(Date.now() + RESERVE_MINUTES * 60_000).toISOString() })
      .eq("id", item.enrollment_id),
  );

  let sent: { id: string; threadId: string };
  try {
    sent = await sendRaw(token, raw, email.isReply ? item.gmail_thread_id : null);
  } catch (error) {
    if (!(error instanceof GoogleError)) throw error;
    if (/dailyLimitExceeded|quotaExceeded/i.test(error.reason) || /sending limit/i.test(error.message)) {
      await holdMailbox(db, mailbox, 6 * 60);
      await db.from("outreach_enrollments").update({ next_send_at: nowIso() }).eq("id", item.enrollment_id);
      return { status: "stop", notice: "Gmail's daily sending limit for this account was reached. Sending resumes by itself in a few hours." };
    }
    if (error.status === 429 || error.status >= 500 || /rateLimitExceeded/i.test(error.reason)) {
      await holdMailbox(db, mailbox, SLOW_DOWN_MINUTES);
      await db.from("outreach_enrollments").update({ next_send_at: nowIso() }).eq("id", item.enrollment_id);
      return { status: "stop", notice: `Gmail asked to slow down (${error.message}). Trying again in ${SLOW_DOWN_MINUTES} minutes.` };
    }
    if (error.status === 401 || error.status === 403) {
      await db.from("outreach_enrollments").update({ next_send_at: nowIso() }).eq("id", item.enrollment_id);
      throw new MailboxAuthError(`Gmail refused to send from this mailbox (${error.message}). Reconnect it.`);
    }
    await setEnrollment("error", `Gmail rejected this email: ${error.message}`, { next_send_at: nowIso() });
    return { status: "skipped" };
  }

  let rfcMessageId: string | null = null;
  try {
    const meta = await gmail<GmailMessage>(token, `/messages/${sent.id}?format=metadata&metadataHeaders=Message-ID`);
    rfcMessageId = messageHeaders(meta)["message-id"] ?? null;
  } catch {
    // Follow-ups still thread in this mailbox through Gmail's threadId; only the
    // In-Reply-To header for the prospect's mail client is lost.
  }

  const record = {
    enrollment_id: item.enrollment_id,
    mailbox_id: mailbox.id,
    step_position: item.step_position,
    gmail_message_id: sent.id,
    gmail_thread_id: sent.threadId,
    rfc_message_id: rfcMessageId,
    subject: email.subject,
    body: email.body,
    to_email: prospect.email,
    from_email: mailbox.email,
    new_thread: !email.isReply,
    next_gap_seconds: randomGapSeconds(mailbox),
  };
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await db.rpc("outreach_record_send", { p: record });
    if (!error) return { status: "sent" };
    lastError = error;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  await db
    .from("outreach_enrollments")
    .update({ status: "error", status_detail: "This email was sent but couldn't be recorded. Check the mailbox's Sent folder before retrying." })
    .eq("id", item.enrollment_id);
  throw new Error(`Sent ${sent.id} but couldn't record it: ${errorMessage(lastError)}`);
}

export async function sendRaw(token: string, raw: string, threadId: string | null) {
  return gmail<{ id: string; threadId: string }>(token, "/messages/send", {
    method: "POST",
    body: JSON.stringify(threadId ? { raw: toBase64Url(raw), threadId } : { raw: toBase64Url(raw) }),
  });
}

async function holdMailbox(db: SupabaseClient, mailbox: Mailbox, minutes: number) {
  await db
    .from("outreach_mailboxes")
    .update({ next_send_at: new Date(Date.now() + minutes * 60_000).toISOString() })
    .eq("id", mailbox.id);
}

async function checkDomain(db: SupabaseClient, domain: string): Promise<boolean | null> {
  const { data: cached } = check(
    await db.from("outreach_domain_checks").select("accepts_mail, checked_at").eq("domain", domain).maybeSingle(),
  );
  if (cached && Date.now() - Date.parse(cached.checked_at) < DOMAIN_CHECK_DAYS * 86_400_000) return cached.accepts_mail;
  const accepts = await domainAcceptsMail(domain);
  if (accepts !== null) {
    await db.from("outreach_domain_checks").upsert({ domain, accepts_mail: accepts, checked_at: nowIso() });
  }
  return accepts;
}

export async function unsubscribeLinks(prospectId: string) {
  const token = await unsubscribeToken(prospectId);
  const site = (Deno.env.get("OUTREACH_SITE_URL") || "https://kazimanufacturing.com").replace(/\/+$/, "");
  return {
    page: `${site}/unsubscribe/?t=${token}`,
    oneClick: `${Deno.env.get("SUPABASE_URL")}/functions/v1/outreach-unsubscribe?t=${token}`,
  };
}
