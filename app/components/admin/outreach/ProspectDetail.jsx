"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ListPlus, Mail, MailCheck, MailX, Plus, Reply, Trash2, X } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { addSuppressions, deleteProspects, getProspect, removeEnrollment, saveProspect, updateEnrollments } from "@/lib/outreach-api";
import { isValidEmail, normalizeEmail, splitTags } from "@/lib/outreach-csv";
import { normalizeKey } from "@/supabase/functions/_shared/outreach/template";
import { Button, Card, Field, Notice, PageHeader, Spinner, inputClass, relativeTime } from "@/components/admin/ui";
import {
  ENROLLMENT_STATUS,
  EnrollDialog,
  PROSPECT_STATUSES,
  ProspectStatus,
  StatusBadge,
  formatDateTime,
  gmailThreadUrl,
  prospectName,
} from "@/components/admin/outreach/parts";

const TEXT_FIELDS = [
  ["first_name", "First name"],
  ["last_name", "Last name"],
  ["company", "Company"],
  ["title", "Job title"],
  ["website", "Website"],
  ["phone", "Phone"],
  ["linkedin_url", "LinkedIn"],
  ["city", "City"],
  ["country", "Country"],
];

const toForm = (prospect) => ({
  email: prospect.email,
  ...Object.fromEntries(TEXT_FIELDS.map(([key]) => [key, prospect[key] ?? ""])),
  tags: prospect.tags.join(", "),
  notes: prospect.notes ?? "",
  status: prospect.status,
  fields: Object.entries(prospect.fields ?? {}).map(([key, value]) => ({ key, value: String(value) })),
});

const MESSAGE_ICON = { sequence: Mail, test: Mail, reply: Reply, auto_reply: MailCheck, bounce: MailX };
const MESSAGE_LABEL = {
  sequence: (m) => `Email ${m.step_position} sent`,
  test: () => "Test email",
  reply: () => "Replied",
  auto_reply: () => "Automatic reply",
  bounce: () => "Bounced",
};

function Timeline({ messages }) {
  const [open, setOpen] = useState(() => new Set());
  if (!messages.length) return <p className="m-0 font-body text-sm text-pine-soft">No emails yet.</p>;
  return (
    <ol className="m-0 list-none space-y-4 p-0">
      {messages.map((message) => {
        const Icon = MESSAGE_ICON[message.kind] ?? Mail;
        const expanded = open.has(message.id);
        return (
          <li key={message.id} className="flex gap-3 font-body text-sm">
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                message.direction === "inbound" ? (message.kind === "bounce" ? "bg-red-100 text-red-800" : "bg-moss/15 text-moss-deep") : "bg-paper-raised text-pine-soft"
              }`}
              aria-hidden="true"
            >
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-pine">
                  {MESSAGE_LABEL[message.kind]?.(message)}
                  {message.sequence?.name && <span className="font-normal text-pine-soft"> · {message.sequence.name}</span>}
                </span>
                <time dateTime={message.occurred_at} className="text-xs text-pine-soft">
                  {formatDateTime(message.occurred_at)}
                </time>
              </div>
              <p className="m-0 truncate text-xs text-pine-soft">
                {message.direction === "inbound" ? `From ${message.from_email}` : `From ${message.from_email} to ${message.to_email}`} — {message.subject}
              </p>
              {message.direction === "inbound" && message.snippet && (
                <blockquote className="m-0 mt-2 border-l-2 border-moss/40 pl-3 text-sm text-pine">{message.snippet}</blockquote>
              )}
              {message.direction === "outbound" && message.body && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setOpen((current) => {
                        const next = new Set(current);
                        if (next.has(message.id)) next.delete(message.id);
                        else next.add(message.id);
                        return next;
                      })
                    }
                    className="mt-1 font-body text-xs text-pine underline underline-offset-2"
                    aria-expanded={expanded}
                  >
                    {expanded ? "Hide email" : "Show email"}
                  </button>
                  {expanded && (
                    <pre className="m-0 mt-2 whitespace-pre-wrap rounded-sm bg-paper px-3 py-2 font-body text-sm text-pine">{message.body}</pre>
                  )}
                </>
              )}
              {message.gmail_thread_id && message.mailbox?.email && (
                <a
                  href={gmailThreadUrl(message.mailbox.email, message.gmail_thread_id)}
                  target="_blank"
                  rel="noopener"
                  className="ml-3 inline-flex items-center gap-1 font-body text-xs text-pine underline underline-offset-2"
                >
                  Open in Gmail <ArrowUpRight size={12} aria-hidden="true" />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ProspectDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const { profile, now, notify } = useAdmin();
  const [prospect, setProspect] = useState(null);
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(
    () =>
      getProspect(id).then(
        (row) => {
          if (!row) {
            setLoadError("This prospect doesn't exist any more.");
            return;
          }
          setProspect(row);
          setForm(toForm(row));
        },
        (error) => setLoadError(error.message),
      ),
    [id],
  );

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const dirty = useMemo(() => prospect && form && JSON.stringify(form) !== JSON.stringify(toForm(prospect)), [prospect, form]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setField = (index, part, value) =>
    setForm((current) => ({ ...current, fields: current.fields.map((field, i) => (i === index ? { ...field, [part]: value } : field)) }));

  async function onSubmit(event) {
    event.preventDefault();
    const email = normalizeEmail(form.email);
    if (!isValidEmail(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    const fields = {};
    for (const { key, value } of form.fields) {
      const clean = normalizeKey(key);
      if (clean && value.trim()) fields[clean] = value.trim();
    }
    setSaving(true);
    setFormError(null);
    try {
      await saveProspect(prospect.id, { ...form, email, tags: splitTags(form.tags), fields });
      await load();
      notify("Prospect saved.");
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeEnrollment(enrollment, status) {
    try {
      const values = { status };
      if (status === "active") Object.assign(values, { status_detail: null, next_send_at: enrollment.status === "error" ? new Date().toISOString() : enrollment.next_send_at });
      if (status === "stopped") values.status_detail = `Stopped by ${profile.full_name || profile.email}`;
      await updateEnrollments([enrollment.id], values);
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function remove(enrollment) {
    try {
      await removeEnrollment(enrollment.id);
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function doNotContact() {
    if (!window.confirm(`Never email ${prospect.email} again? Any sequence they're in stops now.`)) return;
    try {
      await addSuppressions([prospect.email], prospect.status === "not_interested" ? "not_interested" : "manual", `Added by ${profile.email}`);
      await load();
      notify("Added to the do-not-contact list.");
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function deleteProspect() {
    if (
      !window.confirm(
        `Delete ${prospectName(prospect)} and their email history? Their address stays on the do-not-contact list, so they're never imported and emailed again.`,
      )
    )
      return;
    try {
      await addSuppressions([prospect.email], "manual", "Prospect deleted");
      await deleteProspects([prospect.id]);
      notify("Deleted. The address stays on the do-not-contact list.");
      router.replace("/admin/outreach/prospects");
    } catch (error) {
      notify(error.message, "error");
    }
  }

  if (!id) return <Notice tone="error">No prospect chosen.</Notice>;
  if (loadError) return <Notice tone="error">{loadError}</Notice>;
  if (!prospect || !form) return <Spinner label="Loading the prospect" />;

  const inFlight = prospect.enrollments.some((enrollment) => ["active", "paused", "error"].includes(enrollment.status));

  return (
    <>
      <Link href="/admin/outreach/prospects" className="mb-4 inline-flex items-center gap-1.5 font-body text-sm text-pine-soft hover:text-pine">
        <ArrowLeft size={14} aria-hidden="true" /> Prospects
      </Link>
      <PageHeader
        title={prospectName(prospect)}
        description={[prospect.title, prospect.company, prospect.email].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="outline" onClick={() => setEnrolling(true)} disabled={inFlight} title={inFlight ? "Already in a sequence" : undefined}>
              <ListPlus size={16} aria-hidden="true" /> Add to sequence
            </Button>
            <Button variant="outline" onClick={doNotContact}>
              Do not contact
            </Button>
            <Button variant="danger" onClick={deleteProspect}>
              <Trash2 size={14} aria-hidden="true" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form onSubmit={onSubmit} noValidate className="min-w-0">
          <Card title="Details" actions={<ProspectStatus status={prospect.status} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="p-email" label="Email">
                  <input id="p-email" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} className={inputClass} />
                </Field>
              </div>
              {TEXT_FIELDS.map(([key, label]) => (
                <Field key={key} id={`p-${key}`} label={label}>
                  <input id={`p-${key}`} value={form[key]} onChange={(event) => set(key, event.target.value)} className={inputClass} />
                </Field>
              ))}
              <Field id="p-status" label="Status">
                <select id="p-status" value={form.status} onChange={(event) => set("status", event.target.value)} className={inputClass}>
                  {PROSPECT_STATUSES.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="p-tags" label="Tags" hint="Comma separated">
                <input id="p-tags" value={form.tags} onChange={(event) => set("tags", event.target.value)} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field id="p-notes" label="Notes">
                  <textarea id="p-notes" rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} className={inputClass} />
                </Field>
              </div>
            </div>

            <fieldset className="m-0 mt-5 border-0 p-0">
              <legend className="mb-2 font-body text-xs font-semibold text-pine">Custom fields</legend>
              <p className="m-0 mb-3 font-body text-xs text-pine-soft">Use them in emails as {"{{name}}"} — e.g. an icebreaker line written for this person.</p>
              <div className="space-y-2">
                {form.fields.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="w-32 shrink-0">
                      <input value={field.key} onChange={(event) => setField(index, "key", event.target.value)} placeholder="name" aria-label={`Field ${index + 1} name`} className={`${inputClass} font-mono text-xs`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <input value={field.value} onChange={(event) => setField(index, "value", event.target.value)} placeholder="value" aria-label={`Field ${index + 1} value`} className={inputClass} />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => set("fields", form.fields.filter((_, i) => i !== index))} aria-label={`Remove field ${index + 1}`}>
                      <X size={14} aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => set("fields", [...form.fields, { key: "", value: "" }])}>
                  <Plus size={14} aria-hidden="true" /> Add a field
                </Button>
              </div>
            </fieldset>

            {formError && (
              <Notice tone="error" className="mt-4">
                {formError}
              </Notice>
            )}
            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" variant="primary" busy={saving} disabled={!dirty}>
                Save
              </Button>
              {prospect.source && <span className="font-body text-xs text-pine-soft">Source: {prospect.source}</span>}
            </div>
          </Card>
        </form>

        <div className="min-w-0 space-y-6">
          <Card title="Sequences">
            {prospect.enrollments.length === 0 ? (
              <p className="m-0 font-body text-sm text-pine-soft">Not in any sequence.</p>
            ) : (
              <ul className="m-0 list-none space-y-4 p-0">
                {prospect.enrollments.map((enrollment) => (
                  <li key={enrollment.id} className="font-body text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/admin/outreach/sequence?id=${enrollment.sequence?.id}`} className="font-semibold text-pine hover:text-moss-deep">
                        {enrollment.sequence?.name ?? "Deleted sequence"}
                      </Link>
                      <StatusBadge map={ENROLLMENT_STATUS} status={enrollment.status} />
                    </div>
                    <p className="m-0 mt-1 text-xs text-pine-soft">
                      {enrollment.last_step_position ? `Sent email ${enrollment.last_step_position}` : "Nothing sent yet"}
                      {enrollment.status === "active" && ` · next email due ${relativeTime(enrollment.next_send_at, now)}`}
                    </p>
                    {enrollment.status_detail && enrollment.status_detail !== ENROLLMENT_STATUS[enrollment.status]?.label && (
                      <p className={`m-0 mt-1 text-xs ${enrollment.status === "error" ? "text-red-800" : "text-pine-soft"}`}>{enrollment.status_detail}</p>
                    )}
                    {["active", "paused", "error"].includes(enrollment.status) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {enrollment.status === "active" && (
                          <Button variant="outline" size="sm" onClick={() => changeEnrollment(enrollment, "paused")}>
                            Pause
                          </Button>
                        )}
                        {enrollment.status !== "active" && (
                          <Button variant="outline" size="sm" onClick={() => changeEnrollment(enrollment, "active")}>
                            {enrollment.status === "error" ? "Retry" : "Resume"}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => changeEnrollment(enrollment, "stopped")}>
                          Stop
                        </Button>
                        {enrollment.last_step_position === 0 && (
                          <Button variant="ghost" size="sm" onClick={() => remove(enrollment)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Emails">
            <Timeline messages={prospect.messages} />
          </Card>
        </div>
      </div>

      <EnrollDialog
        open={enrolling}
        prospectIds={[prospect.id]}
        onClose={() => setEnrolling(false)}
        onDone={(message) => {
          setEnrolling(false);
          notify(message);
          load();
        }}
      />
    </>
  );
}
