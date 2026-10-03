import { supabase } from "@/lib/supabase";

// Browser-side reads and writes for /admin/outreach, made as the signed-in user — row level
// security (supabase/migrations/008_outreach.sql) keeps it to staff. Anything that needs
// Google or the service role goes through the outreach-api edge function.

export const PAGE_SIZE = 50;

function fail(error, fallback) {
  if (!error) return;
  if (error.code === "23505") throw new Error("That already exists.");
  if (error.code === "42501") throw new Error("Your account doesn't have permission to do that.");
  if (error.code === "22023" && /time zone/.test(error.message)) throw new Error("That time zone isn't recognised.");
  throw new Error(error.message || fallback);
}

async function callFunction(body) {
  const { data, error } = await supabase.functions.invoke("outreach-api", { body });
  if (error) {
    let message = error.message;
    try {
      const details = await error.context?.json?.();
      if (details?.error) message = details.error;
    } catch {
      // not a JSON error body — keep the generic message
    }
    if (/Failed to send a request|Failed to fetch/i.test(message)) {
      message = "Couldn't reach the outreach-api function. Has it been deployed? (docs/outreach.md, step 4)";
    }
    throw new Error(message);
  }
  return data;
}

/** PostgREST `or` filters treat commas and brackets as syntax; searches only need words. */
const searchTerm = (query) => query.replace(/[,()*%\\]/g, " ").trim();

// --- mailboxes -------------------------------------------------------------------------------

export async function listMailboxes() {
  const { data, error } = await supabase.from("outreach_mailboxes").select("*").order("created_at");
  fail(error, "Couldn't load mailboxes");
  return data;
}

const MAILBOX_SETTINGS = [
  "from_name",
  "signature",
  "status",
  "daily_limit",
  "warmup_enabled",
  "warmup_start",
  "warmup_increment",
  "min_gap_seconds",
  "max_gap_seconds",
];

export async function updateMailbox(id, values) {
  const row = Object.fromEntries(MAILBOX_SETTINGS.filter((key) => key in values).map((key) => [key, values[key]]));
  const { data, error } = await supabase.from("outreach_mailboxes").update(row).eq("id", id).select("*").maybeSingle();
  fail(error, "Couldn't save the mailbox");
  if (!data) throw new Error("Only the person who connected this mailbox, or an admin, can change it.");
  return data;
}

export async function mailboxSentCounts() {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("outreach_messages")
    .select("mailbox_id")
    .eq("direction", "outbound")
    .gte("occurred_at", since);
  fail(error, "Couldn't count sent emails");
  const counts = {};
  for (const row of data) counts[row.mailbox_id] = (counts[row.mailbox_id] ?? 0) + 1;
  return counts;
}

export const connectUrl = () =>
  callFunction({ action: "connect_url", redirect_uri: `${window.location.origin}/admin/outreach/connect/` }).then((data) => data.url);
export const completeConnection = (code, state) => callFunction({ action: "connect", code, state });
export const disconnectMailbox = (id) => callFunction({ action: "disconnect", mailbox_id: id });
export const sendTestEmail = (sequenceId, stepPosition, prospectId = null) =>
  callFunction({ action: "send_test", sequence_id: sequenceId, step_position: stepPosition, prospect_id: prospectId });
export const runWorkerNow = () => callFunction({ action: "run_worker" });

export async function getWorkerState() {
  const { data, error } = await supabase.from("outreach_worker_state").select("last_run_at, last_run_summary, last_error").maybeSingle();
  fail(error, "Couldn't check the scheduler");
  return data;
}

// --- prospects -------------------------------------------------------------------------------

export async function listProspects({ search = "", status = "", tag = "", page = 0 } = {}) {
  let query = supabase
    .from("outreach_prospects")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  const term = searchTerm(search);
  if (term) {
    const like = `%${term}%`;
    query = query.or(`email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},company.ilike.${like}`);
  }
  if (status) query = query.eq("status", status);
  if (tag) query = query.contains("tags", [tag]);
  const { data, error, count } = await query;
  fail(error, "Couldn't load prospects");
  return { rows: data, total: count ?? 0 };
}

export async function getProspect(id) {
  const [prospect, enrollments, messages] = await Promise.all([
    supabase.from("outreach_prospects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("outreach_enrollments")
      .select("*, sequence:outreach_sequences(id, name, status)")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("outreach_messages")
      .select("*, mailbox:outreach_mailboxes(email), sequence:outreach_sequences(name)")
      .eq("prospect_id", id)
      .order("occurred_at", { ascending: false }),
  ]);
  fail(prospect.error || enrollments.error || messages.error, "Couldn't load the prospect");
  if (!prospect.data) return null;
  return { ...prospect.data, enrollments: enrollments.data, messages: messages.data };
}

const PROSPECT_FIELDS = [
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
  "fields",
  "tags",
  "source",
  "status",
  "notes",
];

const blankToNull = (value) => (typeof value === "string" && !value.trim() ? null : typeof value === "string" ? value.trim() : value);

export async function saveProspect(id, values) {
  const row = {};
  for (const key of PROSPECT_FIELDS) if (key in values) row[key] = blankToNull(values[key]);
  if (row.email) row.email = row.email.toLowerCase();
  const query = id
    ? supabase.from("outreach_prospects").update(row).eq("id", id)
    : supabase.from("outreach_prospects").insert(row);
  const { data, error } = await query.select("*").single();
  if (error?.code === "23505") throw new Error("There's already a prospect with that email address.");
  if (error?.code === "23514") throw new Error("That email address doesn't look right.");
  fail(error, "Couldn't save the prospect");
  return data;
}

export async function prospectEmails(ids) {
  const rows = await inBatches(ids, 150, async (batch) => {
    const { data, error } = await supabase.from("outreach_prospects").select("email").in("id", batch);
    fail(error, "Couldn't load the prospects");
    return data;
  });
  return rows.map((row) => row.email);
}

export async function deleteProspects(ids) {
  const { error } = await supabase.from("outreach_prospects").delete().in("id", ids);
  fail(error, "Couldn't delete");
}

export async function setProspectStatus(ids, status) {
  const { error } = await supabase.from("outreach_prospects").update({ status }).in("id", ids);
  fail(error, "Couldn't update the status");
}

export async function addTags(ids, tags) {
  const { error } = await supabase.rpc("outreach_add_tags", { p_ids: ids, p_tags: tags });
  fail(error, "Couldn't add the tags");
}

export async function tagCounts() {
  const { data, error } = await supabase.rpc("outreach_tag_counts");
  fail(error, "Couldn't load tags");
  return data;
}

async function inBatches(values, size, run) {
  const results = [];
  for (let i = 0; i < values.length; i += size) results.push(...(await run(values.slice(i, i + size))));
  return results;
}

/** Existing prospects among these emails, keyed by email. */
export async function existingProspects(emails) {
  const rows = await inBatches(emails, 150, async (batch) => {
    const { data, error } = await supabase.from("outreach_prospects").select("*").in("email", batch);
    fail(error, "Couldn't check for existing prospects");
    return data;
  });
  return new Map(rows.map((row) => [row.email, row]));
}

/** Which of these emails (or their domains) are on the do-not-contact list. */
export async function suppressedEmails(emails) {
  const domains = [...new Set(emails.map((email) => email.split("@")[1]))];
  const values = await inBatches([...emails, ...domains], 150, async (batch) => {
    const { data, error } = await supabase.from("outreach_suppressions").select("value").in("value", batch);
    fail(error, "Couldn't check the do-not-contact list");
    return data.map((row) => row.value);
  });
  const blocked = new Set(values);
  return new Set(emails.filter((email) => blocked.has(email) || blocked.has(email.split("@")[1])));
}

const IMPORT_COLUMNS = ["email", "first_name", "last_name", "company", "title", "website", "phone", "linkedin_url", "city", "country", "notes", "source", "fields", "tags"];

/** Upserts prospects by email in batches; every record carries every column so batches stay uniform. */
export async function upsertProspects(records, onProgress) {
  const saved = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200).map((record) => {
      const row = Object.fromEntries(IMPORT_COLUMNS.map((key) => [key, record[key] ?? null]));
      row.fields = record.fields ?? {};
      row.tags = record.tags ?? [];
      return row;
    });
    const { data, error } = await supabase.from("outreach_prospects").upsert(batch, { onConflict: "email" }).select("id, email");
    fail(error, "Couldn't import prospects");
    saved.push(...data);
    onProgress?.(Math.min(records.length, i + 200), records.length);
  }
  return saved;
}

// --- sequences -------------------------------------------------------------------------------

export async function listSequences({ includeArchived = false } = {}) {
  let query = supabase
    .from("outreach_sequences")
    .select("*, mailbox:outreach_mailboxes(email, status), steps:outreach_steps(count)")
    .order("created_at", { ascending: false });
  if (!includeArchived) query = query.neq("status", "archived");
  const [sequences, stats] = await Promise.all([query, supabase.from("outreach_sequence_stats").select("*")]);
  fail(sequences.error || stats.error, "Couldn't load sequences");
  const bySequence = new Map(stats.data.map((row) => [row.sequence_id, row]));
  return sequences.data.map((sequence) => ({
    ...sequence,
    stepCount: sequence.steps?.[0]?.count ?? 0,
    stats: bySequence.get(sequence.id) ?? null,
  }));
}

export async function getSequence(id) {
  const [sequence, steps, stats, stepStats, furthest] = await Promise.all([
    supabase.from("outreach_sequences").select("*").eq("id", id).maybeSingle(),
    supabase.from("outreach_steps").select("*").eq("sequence_id", id).order("position"),
    supabase.from("outreach_sequence_stats").select("*").eq("sequence_id", id).maybeSingle(),
    supabase.from("outreach_step_stats").select("*").eq("sequence_id", id),
    supabase
      .from("outreach_enrollments")
      .select("last_step_position")
      .eq("sequence_id", id)
      .in("status", ["active", "paused", "error"])
      .order("last_step_position", { ascending: false })
      .limit(1),
  ]);
  fail(sequence.error || steps.error || stats.error || stepStats.error || furthest.error, "Couldn't load the sequence");
  if (!sequence.data) return null;
  return {
    ...sequence.data,
    steps: steps.data,
    stats: stats.data,
    stepStats: stepStats.data,
    // Emails up to here have gone to prospects still in the sequence: editable, but fixed in place.
    lockedThrough: furthest.data[0]?.last_step_position ?? 0,
  };
}

/** Saves settings and the full list of emails atomically; returns the sequence id. */
export async function saveSequence(id, settings, steps) {
  const { data, error } = await supabase.rpc("outreach_save_sequence", {
    p_sequence_id: id ?? null,
    p_settings: settings,
    p_steps: steps.map((step) => ({ id: step.id ?? null, wait_days: Number(step.wait_days), subject: step.subject ?? "", body: step.body ?? "" })),
  });
  fail(error, "Couldn't save the sequence");
  return data;
}

export async function setSequenceStatus(id, status) {
  const { error } = await supabase.from("outreach_sequences").update({ status }).eq("id", id);
  fail(error, "Couldn't change the sequence");
}

export async function deleteSequence(id) {
  const { error } = await supabase.from("outreach_sequences").delete().eq("id", id);
  fail(error, "Couldn't delete the sequence");
}

export async function enroll(sequenceId, prospectIds) {
  const results = await inBatches(prospectIds, 500, async (batch) => {
    const { data, error } = await supabase.rpc("outreach_enroll", { p_sequence_id: sequenceId, p_prospect_ids: batch });
    fail(error, "Couldn't add prospects to the sequence");
    return [data];
  });
  return results.reduce(
    (total, part) => Object.fromEntries(Object.keys(part).map((key) => [key, (total[key] ?? 0) + part[key]])),
    {},
  );
}

export async function listEnrollments(sequenceId, { status = "", page = 0 } = {}) {
  let query = supabase
    .from("outreach_enrollments")
    .select("*, prospect:outreach_prospects(*)", { count: "exact" })
    .eq("sequence_id", sequenceId)
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (status) query = query.in("status", status.split(","));
  const { data, error, count } = await query;
  fail(error, "Couldn't load the prospects in this sequence");
  return { rows: data, total: count ?? 0 };
}

export async function listProblemEnrollments() {
  const { data, error } = await supabase
    .from("outreach_enrollments")
    .select("*, prospect:outreach_prospects(id, email, first_name, last_name, company), sequence:outreach_sequences(id, name)")
    .eq("status", "error")
    .order("updated_at", { ascending: false })
    .limit(50);
  fail(error, "Couldn't load enrolments that need attention");
  return data;
}

export async function updateEnrollments(ids, values) {
  const row = {};
  for (const key of ["status", "status_detail", "next_send_at"]) if (key in values) row[key] = values[key];
  const { error } = await supabase.from("outreach_enrollments").update(row).in("id", ids);
  fail(error, "Couldn't update");
}

export async function removeEnrollment(id) {
  const { data, error } = await supabase.from("outreach_enrollments").delete().eq("id", id).select("id");
  fail(error, "Couldn't remove");
  if (!data?.length) throw new Error("Emails have already gone to this prospect — stop the sequence for them instead.");
}

// --- replies and activity --------------------------------------------------------------------

const MESSAGE_SELECT =
  "*, prospect:outreach_prospects(id, email, first_name, last_name, company, status), sequence:outreach_sequences(id, name), mailbox:outreach_mailboxes(email)";

export async function listInbound({ view = "todo", page = 0 } = {}) {
  let query = supabase
    .from("outreach_messages")
    .select(MESSAGE_SELECT, { count: "exact" })
    .eq("direction", "inbound")
    .order("occurred_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (view === "todo") query = query.eq("kind", "reply").is("handled_at", null);
  if (view === "replies") query = query.eq("kind", "reply");
  if (view === "auto") query = query.eq("kind", "auto_reply");
  if (view === "bounces") query = query.eq("kind", "bounce");
  const { data, error, count } = await query;
  fail(error, "Couldn't load replies");
  return { rows: data, total: count ?? 0 };
}

export async function markHandled(ids, handledBy) {
  const { error } = await supabase
    .from("outreach_messages")
    .update({ handled_at: new Date().toISOString(), handled_by: handledBy })
    .in("id", ids);
  fail(error, "Couldn't mark it done");
}

export async function recentActivity(limit = 12) {
  const { data, error } = await supabase
    .from("outreach_messages")
    .select(MESSAGE_SELECT)
    .neq("kind", "test")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  fail(error, "Couldn't load recent activity");
  return data;
}

async function countMessages(filters) {
  let query = supabase.from("outreach_messages").select("id", { count: "exact", head: true });
  for (const [column, op, value] of filters) query = query[op](column, value);
  const { count, error } = await query;
  fail(error, "Couldn't load the numbers");
  return count ?? 0;
}

export async function overviewNumbers() {
  const day = 86_400_000;
  const since = (days) => new Date(Date.now() - days * day).toISOString();
  const enrolments = () => supabase.from("outreach_enrollments").select("id", { count: "exact", head: true });
  const [sent7, replies7, contacted30, bounces30, toHandle, replied30, active, errors, prospects, sequences] = await Promise.all([
    countMessages([["direction", "eq", "outbound"], ["kind", "eq", "sequence"], ["occurred_at", "gte", since(7)]]),
    countMessages([["kind", "eq", "reply"], ["occurred_at", "gte", since(7)]]),
    countMessages([["direction", "eq", "outbound"], ["kind", "eq", "sequence"], ["step_position", "eq", 1], ["occurred_at", "gte", since(30)]]),
    countMessages([["kind", "eq", "bounce"], ["occurred_at", "gte", since(30)]]),
    countMessages([["kind", "eq", "reply"], ["handled_at", "is", null]]),
    enrolments().eq("status", "replied").gte("finished_at", since(30)),
    enrolments().eq("status", "active"),
    enrolments().eq("status", "error"),
    supabase.from("outreach_prospects").select("id", { count: "exact", head: true }),
    supabase.from("outreach_sequences").select("id, status, steps:outreach_steps(count)"),
  ]);
  fail(replied30.error || active.error || errors.error || prospects.error || sequences.error, "Couldn't load the numbers");
  return {
    sent7,
    replies7,
    // Rates are per prospect first emailed in the last 30 days.
    contacted30,
    replied30: replied30.count ?? 0,
    bounces30,
    toHandle,
    active: active.count ?? 0,
    errors: errors.count ?? 0,
    prospects: prospects.count ?? 0,
    sequences: sequences.data,
  };
}

// --- do-not-contact --------------------------------------------------------------------------

export async function listSuppressions({ search = "", page = 0 } = {}) {
  let query = supabase
    .from("outreach_suppressions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  const term = searchTerm(search).toLowerCase();
  if (term) query = query.ilike("value", `%${term}%`);
  const { data, error, count } = await query;
  fail(error, "Couldn't load the do-not-contact list");
  return { rows: data, total: count ?? 0 };
}

export async function addSuppressions(values, reason = "manual", note = null) {
  const rows = [...new Set(values)].map((value) => ({ value, reason, note }));
  const { data, error } = await supabase
    .from("outreach_suppressions")
    .upsert(rows, { onConflict: "value", ignoreDuplicates: true })
    .select("id");
  fail(error, "Couldn't add to the do-not-contact list");
  return data.length;
}

export async function removeSuppression(id) {
  const { data, error } = await supabase.from("outreach_suppressions").delete().eq("id", id).select("id");
  fail(error, "Couldn't remove it");
  if (!data?.length) throw new Error("Only admins can take someone off the do-not-contact list.");
}
