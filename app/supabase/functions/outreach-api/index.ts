// Supabase Edge Function: the staff-only side of outreach that needs Google or the service
// role — connecting and disconnecting Gmail mailboxes, sending test emails, and running the
// worker on demand. Called from /admin with the signed-in user's session.
//
// Secrets (see docs/outreach.md): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OUTREACH_SECRET.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { ConfigError, decryptSecret, encryptSecret, signPayload, verifyPayload } from "../_shared/outreach/crypto.ts";
import {
  authorizeUrl,
  exchangeCode,
  GMAIL_READ,
  GMAIL_SEND,
  gmail,
  GoogleError,
  idTokenClaims,
  revokeToken,
} from "../_shared/outreach/google.ts";
import { buildMessage } from "../_shared/outreach/mime.ts";
import { composeEmail, TEMPLATE_FIELDS } from "../_shared/outreach/template.js";
import { mailboxAccessToken, runWorker, sendRaw, unsubscribeLinks } from "../_shared/outreach/worker.ts";
import { check, corsHeaders, errorMessage, HttpError, json, requireStaff, serviceClient, type Staff } from "../_shared/outreach/http.ts";

const CALLBACK_PATH = "/admin/outreach/connect/";

const SAMPLE_PROSPECT = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "anna@example.com",
  fields: {},
  ...Object.fromEntries(TEMPLATE_FIELDS.filter((field) => !field.key.startsWith("sender_")).map((field) => [field.key, field.sample])),
};

type Body = Record<string, unknown>;

// --- connecting a mailbox ------------------------------------------------------------------

function checkRedirectUri(value: unknown): string {
  let url: URL;
  try {
    url = new URL(String(value));
  } catch {
    throw new HttpError(400, "Missing or invalid redirect_uri.");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !local) || url.pathname !== CALLBACK_PATH || url.search || url.hash) {
    throw new HttpError(400, `redirect_uri must be this site's ${CALLBACK_PATH} page.`);
  }
  return url.toString();
}

async function connectUrl(staff: Staff, body: Body) {
  const redirectUri = checkRedirectUri(body.redirect_uri);
  const state = await signPayload("google-connect", { uid: staff.id, redirect_uri: redirectUri }, 15 * 60);
  return { url: authorizeUrl({ redirectUri, state }) };
}

async function connect(staff: Staff, body: Body) {
  const state = await verifyPayload("google-connect", String(body.state ?? ""));
  if (!state || state.uid !== staff.id) {
    throw new HttpError(400, "This sign-in link has expired or belongs to someone else. Start again from Mailboxes.");
  }
  const redirectUri = String(state.redirect_uri);

  let tokens;
  try {
    tokens = await exchangeCode(String(body.code ?? ""), redirectUri);
  } catch (error) {
    throw new HttpError(400, `Google didn't accept the sign-in: ${errorMessage(error)}`);
  }
  const granted = new Set((tokens.scope ?? "").split(/\s+/));
  if (!granted.has(GMAIL_SEND) || !granted.has(GMAIL_READ)) {
    await revokeToken(tokens.access_token);
    throw new HttpError(
      400,
      "Outreach needs permission both to send email and to read replies. Connect again and leave both boxes ticked on Google's screen.",
    );
  }
  if (!tokens.refresh_token) {
    throw new HttpError(400, "Google didn't grant ongoing access. Connect again and approve every permission it asks for.");
  }

  const profile = await gmail<{ emailAddress: string; historyId: string }>(tokens.access_token, "/profile");
  const email = profile.emailAddress.toLowerCase();
  const claims = idTokenClaims(tokens.id_token);
  const db = serviceClient();

  const { data: existing } = check(await db.from("outreach_mailboxes").select("id, gmail_history_id").eq("email", email).maybeSingle());
  let mailboxId: string;
  if (existing) {
    // Reconnecting keeps the history cursor, so replies that arrived meanwhile are still read.
    check(
      await db
        .from("outreach_mailboxes")
        .update({
          status: "active",
          last_error: null,
          connected_at: new Date().toISOString(),
          gmail_history_id: existing.gmail_history_id ?? String(profile.historyId),
        })
        .eq("id", existing.id),
    );
    mailboxId = existing.id;
  } else {
    const { data: created } = check(
      await db
        .from("outreach_mailboxes")
        .insert({
          email,
          from_name: typeof claims.name === "string" ? claims.name : "",
          connected_by: staff.id,
          gmail_history_id: String(profile.historyId),
        })
        .select("id")
        .single(),
    );
    mailboxId = created!.id;
  }

  check(
    await db.from("outreach_mailbox_credentials").upsert({
      mailbox_id: mailboxId,
      refresh_token: await encryptSecret(tokens.refresh_token),
      access_token: await encryptSecret(tokens.access_token),
      access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope ?? null,
      updated_at: new Date().toISOString(),
    }),
  );
  return { mailbox_id: mailboxId, email };
}

async function disconnect(staff: Staff, body: Body) {
  const db = serviceClient();
  const { data: mailbox } = check(
    await db.from("outreach_mailboxes").select("id, email, connected_by").eq("id", String(body.mailbox_id ?? "")).maybeSingle(),
  );
  if (!mailbox) throw new HttpError(404, "That mailbox doesn't exist.");
  if (mailbox.connected_by !== staff.id && !staff.isAdmin) {
    throw new HttpError(403, "Only the person who connected this mailbox, or an admin, can disconnect it.");
  }

  const { data: credential } = check(
    await db.from("outreach_mailbox_credentials").select("refresh_token").eq("mailbox_id", mailbox.id).maybeSingle(),
  );
  if (credential) {
    try {
      await revokeToken(await decryptSecret(credential.refresh_token));
    } catch (error) {
      console.error("Couldn't revoke the Google token", error);
    }
  }
  check(await db.from("outreach_mailbox_credentials").delete().eq("mailbox_id", mailbox.id));
  check(await db.from("outreach_mailboxes").update({ status: "disconnected", last_error: null }).eq("id", mailbox.id));
  const { data: paused } = check(
    await db
      .from("outreach_sequences")
      .update({ status: "paused" })
      .eq("mailbox_id", mailbox.id)
      .eq("status", "active")
      .select("id"),
  );
  return { ok: true, paused_sequences: paused?.length ?? 0 };
}

// --- test emails ---------------------------------------------------------------------------

async function sendTest(staff: Staff, body: Body) {
  if (!staff.email) throw new HttpError(400, "Your account has no email address to send the test to.");
  const db = serviceClient();
  const { data: sequence } = check(
    await db.from("outreach_sequences").select("id, mailbox_id, unsubscribe_link").eq("id", String(body.sequence_id ?? "")).maybeSingle(),
  );
  if (!sequence) throw new HttpError(404, "Save the sequence first.");
  if (!sequence.mailbox_id) throw new HttpError(400, "Choose the mailbox this sequence sends from first.");

  const { data: mailbox } = check(await db.from("outreach_mailboxes").select("*").eq("id", sequence.mailbox_id).single());
  if (!["active", "paused"].includes(mailbox.status)) {
    throw new HttpError(400, `${mailbox.email} needs reconnecting before it can send.`);
  }

  const { data: steps } = check(
    await db.from("outreach_steps").select("position, subject, body").eq("sequence_id", sequence.id).order("position"),
  );
  const position = Number(body.step_position ?? 1);
  const step = steps?.find((candidate: { position: number }) => candidate.position === position);
  if (!steps || !step) throw new HttpError(404, "Save the sequence first, so the test sends the saved version of this email.");

  let prospect = SAMPLE_PROSPECT;
  if (body.prospect_id) {
    const { data: found } = check(await db.from("outreach_prospects").select("*").eq("id", String(body.prospect_id)).maybeSingle());
    if (!found) throw new HttpError(404, "That prospect no longer exists.");
    prospect = found;
  }

  const sender = { name: mailbox.from_name, email: mailbox.email };
  const first = steps[0];
  const threadSubject =
    position > 1 && first ? composeEmail({ subjectTemplate: first.subject, bodyTemplate: "", prospect, sender }).subject : null;
  const links = sequence.unsubscribe_link ? await unsubscribeLinks(prospect.id) : null;
  const email = composeEmail({
    subjectTemplate: step.subject,
    bodyTemplate: step.body,
    threadSubject,
    inThread: true,
    prospect,
    sender,
    signature: mailbox.signature,
    unsubscribeUrl: links?.page ?? null,
    seed: `test:${prospect.id}:${position}`,
  });

  const token = await mailboxAccessToken(db, mailbox);
  const subject = `[Test] ${email.subject ?? "(no subject)"}`;
  const note = email.missing.length
    ? `\n\n---\nTest note: this prospect has nothing for ${email.missing.map((key) => `{{${key}}}`).join(", ")}, so the real email wouldn't send until that's fixed.`
    : "";
  const raw = buildMessage({ from: sender, to: { email: staff.email }, subject, body: email.body + note });
  const sent = await sendRaw(token, raw, null);

  await db.from("outreach_messages").insert({
    mailbox_id: mailbox.id,
    sequence_id: sequence.id,
    step_position: position,
    direction: "outbound",
    kind: "test",
    from_email: mailbox.email,
    to_email: staff.email,
    subject,
    body: email.body,
    gmail_message_id: sent.id,
    gmail_thread_id: sent.threadId,
  });
  return { ok: true, to: staff.email, missing: email.missing };
}

// --- router --------------------------------------------------------------------------------

const ACTIONS: Record<string, (staff: Staff, body: Body) => Promise<unknown>> = {
  connect_url: connectUrl,
  connect,
  disconnect,
  send_test: sendTest,
  run_worker: () => runWorker(serviceClient()),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const staff = await requireStaff(req);
    const body = (await req.json().catch(() => ({}))) as Body;
    const action = ACTIONS[String(body.action)];
    if (!action) throw new HttpError(400, `Unknown action “${body.action}”.`);
    return json(await action(staff, body));
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof ConfigError) return json({ error: error.message }, 503);
    if (error instanceof GoogleError) return json({ error: `Google: ${error.message}` }, 502);
    console.error(error);
    return json({ error: errorMessage(error) }, 500);
  }
});
