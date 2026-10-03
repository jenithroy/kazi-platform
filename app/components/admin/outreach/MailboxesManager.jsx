"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Pause, Play, Plug, Unplug } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { connectUrl, disconnectMailbox, listMailboxes, mailboxSentCounts, updateMailbox } from "@/lib/outreach-api";
import { effectiveDailyLimit } from "@/supabase/functions/_shared/outreach/schedule";
import { Button, Card, EmptyState, Field, Notice, PageHeader, Spinner, inputClass } from "@/components/admin/ui";
import { MAILBOX_STATUS, StatusBadge } from "@/components/admin/outreach/parts";

const toForm = (mailbox) => ({
  from_name: mailbox.from_name,
  signature: mailbox.signature,
  daily_limit: String(mailbox.daily_limit),
  warmup_enabled: mailbox.warmup_enabled,
  warmup_start: String(mailbox.warmup_start),
  warmup_increment: String(mailbox.warmup_increment),
  min_gap_minutes: String(Math.round(mailbox.min_gap_seconds / 60)),
  max_gap_minutes: String(Math.round(mailbox.max_gap_seconds / 60)),
});

function validate(form) {
  const number = (value) => Number.parseInt(value, 10);
  if (!form.from_name.trim()) return "Add the name prospects see in their inbox.";
  if (!(number(form.daily_limit) >= 1 && number(form.daily_limit) <= 500)) return "The daily limit must be between 1 and 500.";
  if (form.warmup_enabled && !(number(form.warmup_start) >= 1 && number(form.warmup_increment) >= 1)) return "Warm-up numbers must be at least 1.";
  const min = number(form.min_gap_minutes);
  const max = number(form.max_gap_minutes);
  if (!(min >= 1 && min <= 60)) return "The shortest gap must be between 1 and 60 minutes.";
  if (!(max >= min && max <= 120)) return "The longest gap must be at least the shortest, and at most 120 minutes.";
  return null;
}

function MailboxCard({ mailbox, sent, canEdit, now, onSaved, onDisconnect }) {
  const { notify } = useAdmin();
  const [form, setForm] = useState(() => toForm(mailbox));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const saved = useMemo(() => JSON.stringify(toForm(mailbox)), [mailbox]);
  const dirty = JSON.stringify(form) !== saved;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const connected = ["active", "paused"].includes(mailbox.status);
  const limitToday = effectiveDailyLimit(
    {
      ...mailbox,
      daily_limit: Number.parseInt(form.daily_limit, 10) || mailbox.daily_limit,
      warmup_enabled: form.warmup_enabled,
      warmup_start: Number.parseInt(form.warmup_start, 10) || mailbox.warmup_start,
      warmup_increment: Number.parseInt(form.warmup_increment, 10) || mailbox.warmup_increment,
    },
    now,
  );

  async function save(values) {
    setSaving(true);
    setError(null);
    try {
      const row = await updateMailbox(mailbox.id, values);
      onSaved(row);
      return row;
    } catch (saveError) {
      setError(saveError.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const problem = validate(form);
    setError(problem);
    if (problem) return;
    const row = await save({
      from_name: form.from_name.trim(),
      signature: form.signature.trimEnd(),
      daily_limit: Number.parseInt(form.daily_limit, 10),
      warmup_enabled: form.warmup_enabled,
      warmup_start: Number.parseInt(form.warmup_start, 10),
      warmup_increment: Number.parseInt(form.warmup_increment, 10),
      min_gap_seconds: Number.parseInt(form.min_gap_minutes, 10) * 60,
      max_gap_seconds: Number.parseInt(form.max_gap_minutes, 10) * 60,
    });
    if (row) {
      setForm(toForm(row));
      notify("Mailbox saved.");
    }
  }

  async function togglePause() {
    const row = await save({ status: mailbox.status === "paused" ? "active" : "paused" });
    if (row) notify(row.status === "paused" ? `Paused ${row.email}. Replies are still read.` : `${row.email} is sending again.`);
  }

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          <Mail size={14} aria-hidden="true" /> {mailbox.email} <StatusBadge map={MAILBOX_STATUS} status={mailbox.status} />
        </span>
      }
      description={
        connected
          ? `${sent} of ${limitToday} sent in the last 24 hours${form.warmup_enabled && limitToday < (Number.parseInt(form.daily_limit, 10) || 0) ? " — warming up" : ""}.`
          : mailbox.status === "error"
            ? "Google stopped accepting this mailbox's access. Reconnect it to carry on."
            : "Disconnected. Reconnect to send from it again; its history is kept."
      }
      actions={
        canEdit && (
          <div className="flex flex-wrap justify-end gap-2">
            {connected && (
              <Button variant="outline" size="sm" onClick={togglePause} disabled={saving}>
                {mailbox.status === "paused" ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                {mailbox.status === "paused" ? "Resume" : "Pause"}
              </Button>
            )}
            {mailbox.status !== "disconnected" && (
              <Button variant="danger" size="sm" onClick={() => onDisconnect(mailbox)}>
                <Unplug size={14} aria-hidden="true" /> Disconnect
              </Button>
            )}
          </div>
        )
      }
    >
      {mailbox.last_error && (
        <Notice tone={mailbox.status === "error" ? "error" : "warn"} className="mb-4">
          {mailbox.last_error}
        </Notice>
      )}
      {!canEdit && (
        <p className="m-0 mb-4 font-body text-xs text-pine-soft">Only the person who connected this mailbox, or an admin, can change it.</p>
      )}
      <form onSubmit={onSubmit} noValidate className="grid gap-4 md:grid-cols-2">
        <Field id={`from-${mailbox.id}`} label="Sender name" hint="Shown in the prospect's inbox — use a real person's name.">
          <input id={`from-${mailbox.id}`} value={form.from_name} onChange={(event) => set("from_name", event.target.value)} className={inputClass} disabled={!canEdit} />
        </Field>
        <Field id={`limit-${mailbox.id}`} label="Daily limit" hint="Most in any 24 hours. 30–50 keeps a mailbox's reputation safe.">
          <input id={`limit-${mailbox.id}`} type="number" min="1" max="500" value={form.daily_limit} onChange={(event) => set("daily_limit", event.target.value)} className={inputClass} disabled={!canEdit} />
        </Field>
        <div className="md:col-span-2">
          <Field id={`signature-${mailbox.id}`} label="Signature" hint="Added under every email. Plain text; {{sender_name}} and other variables work here too.">
            <textarea id={`signature-${mailbox.id}`} rows={4} value={form.signature} onChange={(event) => set("signature", event.target.value)} placeholder={"Sam Rai\nKazi Manufacturing · kazimanufacturing.com"} className={inputClass} disabled={!canEdit} />
          </Field>
        </div>
        <fieldset className="m-0 rounded-sm border border-pine/10 p-4 md:col-span-2" disabled={!canEdit}>
          <legend className="px-1 font-body text-xs font-semibold text-pine">Warm-up and pacing</legend>
          <label className="mb-3 flex items-start gap-2 font-body text-sm text-pine">
            <input type="checkbox" checked={form.warmup_enabled} onChange={(event) => set("warmup_enabled", event.target.checked)} className="mt-1 accent-moss" />
            <span>
              Warm up gradually
              <span className="block text-xs text-pine-soft">A sudden jump in volume from a mailbox looks like spam. Start low and add a few each day.</span>
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field id={`ws-${mailbox.id}`} label="Start at (per day)">
              <input id={`ws-${mailbox.id}`} type="number" min="1" value={form.warmup_start} onChange={(event) => set("warmup_start", event.target.value)} className={inputClass} disabled={!form.warmup_enabled} />
            </Field>
            <Field id={`wi-${mailbox.id}`} label="Add each day">
              <input id={`wi-${mailbox.id}`} type="number" min="1" value={form.warmup_increment} onChange={(event) => set("warmup_increment", event.target.value)} className={inputClass} disabled={!form.warmup_enabled} />
            </Field>
            <Field id={`gmin-${mailbox.id}`} label="Gap from (min)">
              <input id={`gmin-${mailbox.id}`} type="number" min="1" max="60" value={form.min_gap_minutes} onChange={(event) => set("min_gap_minutes", event.target.value)} className={inputClass} />
            </Field>
            <Field id={`gmax-${mailbox.id}`} label="Gap to (min)">
              <input id={`gmax-${mailbox.id}`} type="number" min="1" max="120" value={form.max_gap_minutes} onChange={(event) => set("max_gap_minutes", event.target.value)} className={inputClass} />
            </Field>
          </div>
          <p className="m-0 mt-3 font-body text-xs text-pine-soft">
            Today&rsquo;s limit: {limitToday}. Each email is followed by a random pause between the two gaps.
          </p>
        </fieldset>
        {error && (
          <Notice tone="error" className="md:col-span-2">
            {error}
          </Notice>
        )}
        {canEdit && (
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" busy={saving} disabled={!dirty}>
              Save
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export function MailboxesManager() {
  const { profile, isAdmin, now, notify } = useAdmin();
  const [mailboxes, setMailboxes] = useState(null);
  const [sent, setSent] = useState({});
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listMailboxes(), mailboxSentCounts()]).then(
      ([rows, counts]) => {
        if (!active) return;
        setMailboxes(rows);
        setSent(counts);
      },
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, []);

  async function connect() {
    setConnecting(true);
    try {
      window.location.assign(await connectUrl());
    } catch (connectError) {
      notify(connectError.message, "error");
      setConnecting(false);
    }
  }

  async function disconnect(mailbox) {
    if (
      !window.confirm(
        `Disconnect ${mailbox.email}? Sequences sending from it will be paused, and Kazi's access to the account is revoked. Its sent history stays.`,
      )
    )
      return;
    try {
      const result = await disconnectMailbox(mailbox.id);
      setMailboxes((current) => current.map((row) => (row.id === mailbox.id ? { ...row, status: "disconnected", last_error: null } : row)));
      notify(
        result.paused_sequences
          ? `Disconnected. ${result.paused_sequences} sequence${result.paused_sequences === 1 ? " was" : "s were"} paused — choose another mailbox for ${result.paused_sequences === 1 ? "it" : "them"}.`
          : "Disconnected.",
      );
    } catch (disconnectError) {
      notify(disconnectError.message, "error");
    }
  }

  const replace = (row) => setMailboxes((current) => current.map((mailbox) => (mailbox.id === row.id ? row : mailbox)));

  return (
    <>
      <PageHeader
        title="Mailboxes"
        description="Outreach sends from real Google Workspace accounts through the Gmail API, so emails sit in your Sent folder and replies arrive in your inbox as usual."
        actions={
          <Button variant="primary" onClick={connect} busy={connecting}>
            {!connecting && <Plug size={16} aria-hidden="true" />} Connect a Google account
          </Button>
        }
      />

      <Notice tone="info" className="mb-8" title="Before connecting">
        <p>
          Sign in with the Workspace account you want to send from. Google asks to let Kazi <strong>send email</strong> and{" "}
          <strong>read your mail</strong>. Outreach only reads it to spot replies, bounces and out-of-office messages from prospects,
          and keeps nothing else. You can disconnect at any time here or in your Google account&rsquo;s security settings.
        </p>
      </Notice>

      {error && <Notice tone="error">{error}</Notice>}
      {!error && !mailboxes && <Spinner label="Loading mailboxes" />}
      {mailboxes && mailboxes.length === 0 && (
        <EmptyState
          title="No mailboxes yet"
          action={
            <Button variant="primary" onClick={connect} busy={connecting}>
              Connect a Google account
            </Button>
          }
        >
          Each person sending outreach connects their own account, so prospects hear from a real colleague.
        </EmptyState>
      )}
      {mailboxes && mailboxes.length > 0 && (
        <div className="space-y-6">
          {mailboxes.map((mailbox) => (
            <MailboxCard
              key={`${mailbox.id}-${mailbox.updated_at}`}
              mailbox={mailbox}
              sent={sent[mailbox.id] ?? 0}
              canEdit={isAdmin || mailbox.connected_by === profile.id}
              now={now}
              onSaved={replace}
              onDisconnect={disconnect}
            />
          ))}
        </div>
      )}
    </>
  );
}
