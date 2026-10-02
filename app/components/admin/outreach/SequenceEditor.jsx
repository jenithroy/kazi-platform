"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Archive, Copy, Pause, Play, Plus, Send, Trash2, UserPlus } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  PAGE_SIZE,
  deleteSequence,
  getSequence,
  listEnrollments,
  listMailboxes,
  listProspects,
  saveSequence,
  sendTestEmail,
  setSequenceStatus,
  updateEnrollments,
} from "@/lib/outreach-api";
import { checkStep } from "@/lib/outreach-checks";
import { TEMPLATE_FIELDS, composeEmail } from "@/supabase/functions/_shared/outreach/template";
import { WEEKDAY_LABELS, describeWindow, timeToMinutes } from "@/supabase/functions/_shared/outreach/schedule";
import { Button, Card, CheckList, Field, Notice, PageHeader, Spinner, buttonClass, inputClass, relativeTime } from "@/components/admin/ui";
import {
  ENROLLMENT_STATUS,
  Pagination,
  SEQUENCE_STATUS,
  StatusBadge,
  percent,
  prospectName,
} from "@/components/admin/outreach/parts";

const FALLBACK_ZONES = ["Europe/London", "Asia/Kathmandu", "America/New_York", "America/Los_Angeles", "Europe/Paris", "Australia/Sydney", "UTC"];
const TIME_ZONES = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : FALLBACK_ZONES;

const SAMPLE = {
  id: "sample",
  email: "anna@example.com",
  fields: { icebreaker: "Loved the heavyweight hoodies in your latest drop." },
  ...Object.fromEntries(TEMPLATE_FIELDS.filter((field) => !field.key.startsWith("sender_")).map((field) => [field.key, field.sample])),
};

const STARTER_STEPS = [
  {
    wait_days: 0,
    subject: "Production for {{company}}",
    body:
      "Hi {{first_name|there}},\n\n" +
      "{{icebreaker|I came across your brand and liked what you're making.}}\n\n" +
      "I'm {{sender_first_name}} from Kazi Manufacturing. We cut, sew and print clothing in Kathmandu for independent brands — from 50 pieces per style, with photos from the floor at every stage.\n\n" +
      "Would it help if I sent our price list and a few examples of recent work?\n\n" +
      "If this isn't relevant, just let me know and I won't follow up.",
  },
  {
    wait_days: 3,
    subject: "",
    body: "Hi {{first_name|there}}, bringing this back to the top of your inbox. Happy to send a sample garment so you can check the quality before committing to anything.",
  },
  {
    wait_days: 5,
    subject: "",
    body:
      "Hi {{first_name|there}},\n\n" +
      "I'll leave it here for now. If production comes up later in the year, you can get a quote at kazimanufacturing.com/quote — or just reply to this email.",
  },
];

let keyCounter = 0;
const withKey = (step) => ({ ...step, key: step.id ?? `new-${++keyCounter}` });

const emptyForm = () => ({
  name: "",
  mailbox_id: "",
  timezone: "Europe/London",
  send_days: [1, 2, 3, 4, 5],
  send_from: "09:00",
  send_until: "17:00",
  stop_on_domain_reply: true,
  unsubscribe_link: false,
  steps: STARTER_STEPS.map(withKey),
});

const toForm = (sequence) => ({
  name: sequence.name,
  mailbox_id: sequence.mailbox_id ?? "",
  timezone: sequence.timezone,
  send_days: [...sequence.send_days].map(Number).sort(),
  send_from: sequence.send_from.slice(0, 5),
  send_until: sequence.send_until.slice(0, 5),
  stop_on_domain_reply: sequence.stop_on_domain_reply,
  unsubscribe_link: sequence.unsubscribe_link,
  // `position` is where the email was when loaded; emails already sent stay there.
  steps: sequence.steps.map((step) =>
    withKey({ id: step.id, position: step.position, wait_days: step.position === 1 ? 0 : step.wait_days, subject: step.subject ?? "", body: step.body }),
  ),
});

const snapshot = (form) =>
  JSON.stringify({ ...form, steps: form.steps.map(({ id, wait_days, subject, body }) => ({ id: id ?? null, wait_days: Number(wait_days), subject, body })) });

const settingsFrom = (form) => ({
  name: form.name.trim(),
  mailbox_id: form.mailbox_id || "",
  timezone: form.timezone,
  send_days: form.send_days,
  send_from: form.send_from,
  send_until: form.send_until,
  stop_on_domain_reply: form.stop_on_domain_reply,
  unsubscribe_link: form.unsubscribe_link,
});

function validate(form) {
  if (!form.name.trim()) return "Give the sequence a name.";
  if (!form.send_days.length) return "Choose at least one sending day.";
  if (timeToMinutes(form.send_until) <= timeToMinutes(form.send_from)) return "The sending hours must end after they start.";
  if (!form.steps.length) return "Add at least one email.";
  if (!form.steps[0].subject.trim()) return "The first email needs a subject.";
  const empty = form.steps.findIndex((step) => !step.body.trim());
  if (empty !== -1) return `Email ${empty + 1} is empty.`;
  const badWait = form.steps.findIndex((step, index) => index > 0 && !(Number(step.wait_days) >= 0 && Number(step.wait_days) <= 60));
  if (badWait !== -1) return `Email ${badWait + 1}: the wait must be between 0 and 60 days.`;
  return null;
}

function VariableButtons({ onInsert }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="font-body text-[0.7rem] text-pine-soft">Insert:</span>
      {TEMPLATE_FIELDS.map((field) => (
        <button
          key={field.key}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsert(field.key === "first_name" ? "{{first_name|there}}" : `{{${field.key}}}`)}
          className="rounded-sm border border-pine/15 bg-paper px-1.5 py-0.5 font-body text-[0.7rem] text-pine hover:border-pine/40"
        >
          {field.label}
        </button>
      ))}
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onInsert("{{random: Hi|Hello}}")}
        className="rounded-sm border border-pine/15 bg-paper px-1.5 py-0.5 font-body text-[0.7rem] text-pine hover:border-pine/40"
        title="Picks one option per prospect, so emails aren't identical"
      >
        Random choice
      </button>
    </div>
  );
}

function StepCard({ step, index, locked, canMoveUp, canMoveDown, canRemove, stats, unsubscribeLink, canTest, onChange, onMove, onRemove, onTest, registerField }) {
  const checks = useMemo(
    () => checkStep({ subject: step.subject, body: step.body, position: index + 1, unsubscribeLink }),
    [step.subject, step.body, index, unsubscribeLink],
  );
  const title = index === 0 ? "Email 1" : `Email ${index + 1} — follow-up`;
  const description =
    index === 0
      ? "Sent as soon as a prospect starts the sequence, inside its sending hours."
      : `Sent ${step.wait_days} ${Number(step.wait_days) === 1 ? "day" : "days"} after email ${index}, unless they've replied.`;

  return (
    <Card
      title={title}
      description={description}
      actions={
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onMove(index, -1)} disabled={!canMoveUp} aria-label={`Move email ${index + 1} up`}>
            <ArrowUp size={14} aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMove(index, 1)} disabled={!canMoveDown} aria-label={`Move email ${index + 1} down`}>
            <ArrowDown size={14} aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)} disabled={!canRemove} aria-label={`Remove email ${index + 1}`}>
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </div>
      }
    >
      {stats && stats.sent > 0 && (
        <p className="m-0 mb-4 font-body text-xs text-pine-soft">
          Sent {stats.sent.toLocaleString("en-GB")} · {stats.replied} {stats.replied === 1 ? "reply" : "replies"} after this email ({percent(stats.replied, stats.sent)})
          {locked && " · already sent to prospects still in the sequence, so it can be edited but not moved or removed"}
        </p>
      )}
      <div className="grid gap-4">
        {index > 0 && (
          <Field id={`wait-${step.key}`} label="Wait (days after the previous email)">
            <input
              id={`wait-${step.key}`}
              type="number"
              min="0"
              max="60"
              value={step.wait_days}
              onChange={(event) => onChange(index, "wait_days", event.target.value)}
              className={`${inputClass} w-28`}
            />
          </Field>
        )}
        <Field
          id={`subject-${step.key}`}
          label="Subject"
          hint={index > 0 ? "Leave empty to reply in the same thread (“Re: …”) — usually the best choice for follow-ups." : undefined}
        >
          <input
            id={`subject-${step.key}`}
            ref={(element) => registerField(`${step.key}:subject`, element)}
            value={step.subject}
            onChange={(event) => onChange(index, "subject", event.target.value)}
            placeholder={index > 0 ? "Re: (same thread)" : ""}
            className={inputClass}
          />
        </Field>
        <Field id={`body-${step.key}`} label="Message" hint="Your mailbox signature is added underneath.">
          <textarea
            id={`body-${step.key}`}
            ref={(element) => registerField(`${step.key}:body`, element)}
            rows={index === 0 ? 11 : 6}
            value={step.body}
            onChange={(event) => onChange(index, "body", event.target.value)}
            className={inputClass}
          />
          <VariableButtons onInsert={(text) => onChange(index, "insert", text)} />
        </Field>
        {checks.length > 0 && (
          <div className="rounded-sm bg-paper px-4 py-3">
            <CheckList checks={checks} />
          </div>
        )}
        <div>
          <Button variant="outline" size="sm" onClick={() => onTest(index + 1)} disabled={!canTest} title={canTest ? undefined : "Save the sequence and choose a mailbox first"}>
            <Send size={14} aria-hidden="true" /> Send me a test
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Preview({ form, mailbox, enrolled }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [prospectId, setProspectId] = useState("sample");
  const [search, setSearch] = useState("");
  const [found, setFound] = useState([]);

  useEffect(() => {
    if (search.trim().length < 2) return;
    let active = true;
    const timeout = setTimeout(() => {
      listProspects({ search }).then(
        (result) => active && setFound(result.rows.slice(0, 10)),
        () => undefined,
      );
    }, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search]);

  const options = useMemo(() => {
    const seen = new Map([["sample", SAMPLE]]);
    for (const prospect of [...enrolled, ...found]) if (prospect && !seen.has(prospect.id)) seen.set(prospect.id, prospect);
    return [...seen.values()];
  }, [enrolled, found]);
  const prospect = options.find((option) => option.id === prospectId) ?? SAMPLE;
  const index = Math.min(stepIndex, form.steps.length - 1);
  const step = form.steps[index];
  const sender = { name: mailbox?.from_name || "Your name", email: mailbox?.email || "you@kazimanufacturing.com" };
  const threadSubject = index > 0 ? composeEmail({ subjectTemplate: form.steps[0].subject, bodyTemplate: "", prospect, sender, seed: `preview:${prospect.id}:1` }).subject : null;
  const email = composeEmail({
    subjectTemplate: step.subject,
    bodyTemplate: step.body,
    threadSubject,
    inThread: true,
    prospect,
    sender,
    signature: mailbox?.signature ?? "",
    unsubscribeUrl: form.unsubscribe_link ? "https://kazimanufacturing.com/unsubscribe/?t=…" : null,
    seed: `preview:${prospect.id}:${index + 1}`,
  });

  return (
    <Card title="Preview" description="Exactly what a prospect receives, including your mailbox signature.">
      <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Email to preview">
        {form.steps.map((item, i) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => setStepIndex(i)}
            className={`rounded-sm px-2.5 py-1 font-body text-xs ${i === index ? "bg-pine text-bone" : "text-pine-soft hover:bg-paper-raised"}`}
          >
            Email {i + 1}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="font-body text-xs text-pine-soft">
          Prospect
          <select value={prospect.id} onChange={(event) => setProspectId(event.target.value)} className={`${inputClass} mt-1`}>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.id === "sample" ? "Sample prospect" : `${prospectName(option)}${option.company ? ` · ${option.company}` : ""}`}
              </option>
            ))}
          </select>
        </label>
        <label className="font-body text-xs text-pine-soft">
          Find another
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or company" className={`${inputClass} mt-1`} />
        </label>
      </div>
      <div className="mt-4 rounded-sm border border-pine/15 bg-paper font-body text-sm">
        <dl className="m-0 grid grid-cols-[4rem_minmax(0,1fr)] gap-x-2 gap-y-1 border-b border-pine/10 px-4 py-3 text-xs">
          <dt className="text-pine-soft">From</dt>
          <dd className="m-0 truncate text-pine">
            {sender.name} &lt;{sender.email}&gt;
          </dd>
          <dt className="text-pine-soft">To</dt>
          <dd className="m-0 truncate text-pine">{prospect.email}</dd>
          <dt className="text-pine-soft">Subject</dt>
          <dd className="m-0 font-semibold text-pine">{email.subject || <em className="font-normal text-red-700">No subject</em>}</dd>
        </dl>
        <pre className="m-0 whitespace-pre-wrap px-4 py-3 font-body text-sm leading-relaxed text-pine">{email.body}</pre>
      </div>
      {email.missing.length > 0 && (
        <Notice tone="warn" className="mt-3">
          This prospect has nothing for {email.missing.map((key) => `{{${key}}}`).join(", ")}. Their email won&rsquo;t send until it&rsquo;s filled in —
          or give the variable a fallback, like {`{{${email.missing[0]}|there}}`}.
        </Notice>
      )}
      {!mailbox && <p className="m-0 mt-3 font-body text-xs text-pine-soft">Choose a mailbox to preview its sender name and signature.</p>}
    </Card>
  );
}

const ENROLLMENT_FILTERS = [
  { id: "", label: "All" },
  { id: "active", label: "Sending" },
  { id: "error", label: "Needs attention" },
  { id: "replied", label: "Replied" },
  { id: "completed", label: "Finished" },
  { id: "paused", label: "Paused" },
  { id: "bounced,unsubscribed,stopped", label: "Stopped" },
];

function SequenceProspects({ sequenceId, stepCount, onEnrolledLoaded }) {
  const { now, notify } = useAdmin();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    listEnrollments(sequenceId, { status: filter, page }).then(
      (data) => {
        if (!active) return;
        setResult(data);
        if (!filter && page === 0) onEnrolledLoaded(data.rows.map((row) => row.prospect).filter(Boolean));
      },
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, [sequenceId, filter, page, version, onEnrolledLoaded]);

  async function change(enrollment, status) {
    try {
      const values = { status };
      if (status === "active" && enrollment.status === "error") Object.assign(values, { status_detail: null, next_send_at: new Date().toISOString() });
      if (status === "stopped") values.status_detail = "Stopped by hand";
      await updateEnrollments([enrollment.id], values);
      setVersion((value) => value + 1);
    } catch (changeError) {
      notify(changeError.message, "error");
    }
  }

  return (
    <Card
      title="Prospects in this sequence"
      actions={
        <Link href={`/admin/outreach/prospects?sequence=${sequenceId}`} className={buttonClass("outline", "sm")}>
          <UserPlus size={14} aria-hidden="true" /> Add prospects
        </Link>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
        {ENROLLMENT_FILTERS.map((item) => (
          <button
            key={item.id || "all"}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => {
              setFilter(item.id);
              setPage(0);
            }}
            className={`rounded-sm px-2.5 py-1 font-body text-xs ${filter === item.id ? "bg-pine text-bone" : "text-pine-soft hover:bg-paper-raised"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!error && !result && <Spinner label="Loading" />}
      {result && result.rows.length === 0 && (
        <p className="m-0 font-body text-sm text-pine-soft">{filter ? "Nobody here." : "No prospects yet — add some from the Prospects page."}</p>
      )}
      {result && result.rows.length > 0 && (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left font-body text-sm">
            <thead>
              <tr className="border-b border-pine/10 text-xs uppercase tracking-[0.08em] text-pine-soft">
                <th className="py-2 pr-3 font-semibold">Prospect</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Progress</th>
                <th className="py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((enrollment) => (
                <tr key={enrollment.id} className="border-b border-pine/10 last:border-0 align-top">
                  <td className="max-w-[16rem] py-2.5 pr-3">
                    <Link href={`/admin/outreach/prospect?id=${enrollment.prospect?.id}`} className="block truncate font-semibold text-pine hover:text-moss-deep">
                      {prospectName(enrollment.prospect)}
                    </Link>
                    <span className="block truncate text-xs text-pine-soft">{enrollment.prospect?.company || enrollment.prospect?.email}</span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge map={ENROLLMENT_STATUS} status={enrollment.status} />
                    {enrollment.status_detail && enrollment.status !== "completed" && (
                      <span className={`mt-1 block max-w-[16rem] text-xs ${enrollment.status === "error" ? "text-red-800" : "text-pine-soft"}`}>{enrollment.status_detail}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-pine-soft">
                    {enrollment.last_step_position} of {stepCount} sent
                    {enrollment.status === "active" && <span className="block">next {relativeTime(enrollment.next_send_at, now)}</span>}
                  </td>
                  <td className="py-2.5 text-right">
                    {enrollment.status === "active" && (
                      <Button variant="ghost" size="sm" onClick={() => change(enrollment, "paused")}>
                        Pause
                      </Button>
                    )}
                    {["paused", "error"].includes(enrollment.status) && (
                      <Button variant="ghost" size="sm" onClick={() => change(enrollment, "active")}>
                        {enrollment.status === "error" ? "Retry" : "Resume"}
                      </Button>
                    )}
                    {["active", "paused", "error"].includes(enrollment.status) && (
                      <Button variant="ghost" size="sm" onClick={() => change(enrollment, "stopped")}>
                        Stop
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result && <Pagination page={page} total={result.total} pageSize={PAGE_SIZE} onPage={setPage} label="prospects" />}
    </Card>
  );
}

/** Keyed by id, so switching to another sequence (or a new one) starts from a clean slate. */
export function SequenceEditorPage() {
  const id = useSearchParams().get("id");
  return <SequenceEditor key={id ?? "new"} id={id} />;
}

function SequenceEditor({ id }) {
  const router = useRouter();
  const { notify } = useAdmin();
  const [sequence, setSequence] = useState(null);
  const [form, setForm] = useState(id ? null : emptyForm);
  const [saved, setSaved] = useState(id ? null : snapshot(emptyForm()));
  const [mailboxes, setMailboxes] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(null);
  const fields = useRef(new Map());
  const pendingCursor = useRef(null);

  const load = useCallback(
    () =>
      getSequence(id).then(
        (row) => {
          if (!row) {
            setLoadError("This sequence doesn't exist any more.");
            return;
          }
          const next = toForm(row);
          setSequence(row);
          setForm(next);
          setSaved(snapshot(next));
        },
        (error) => setLoadError(error.message),
      ),
    [id],
  );

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  useEffect(() => {
    let active = true;
    listMailboxes().then(
      (rows) => active && setMailboxes(rows.filter((mailbox) => mailbox.status !== "disconnected")),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  const dirty = form && saved !== null && snapshot(form) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Put the cursor back after a variable is inserted.
  useEffect(() => {
    const pending = pendingCursor.current;
    if (!pending) return;
    pendingCursor.current = null;
    const element = fields.current.get(pending.field);
    if (element) {
      element.focus();
      element.setSelectionRange(pending.position, pending.position);
    }
  });

  const registerField = useCallback((key, element) => {
    if (element) fields.current.set(key, element);
    else fields.current.delete(key);
  }, []);
  const onEnrolledLoaded = useCallback((rows) => setEnrolled(rows), []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function changeStep(index, key, value) {
    if (key === "insert") {
      const step = form.steps[index];
      // Insert into whichever of this step's fields was focused last, else the message.
      const subject = fields.current.get(`${step.key}:subject`);
      const target = document.activeElement === subject ? "subject" : "body";
      const element = fields.current.get(`${step.key}:${target}`);
      const current = step[target];
      const start = element?.selectionStart ?? current.length;
      const end = element?.selectionEnd ?? current.length;
      const next = current.slice(0, start) + value + current.slice(end);
      pendingCursor.current = { field: `${step.key}:${target}`, position: start + value.length };
      setForm((currentForm) => ({
        ...currentForm,
        steps: currentForm.steps.map((item, i) => (i === index ? { ...item, [target]: next } : item)),
      }));
      return;
    }
    setForm((current) => ({ ...current, steps: current.steps.map((item, i) => (i === index ? { ...item, [key]: value } : item)) }));
  }

  function moveStep(index, direction) {
    setForm((current) => {
      const steps = [...current.steps];
      const target = index + direction;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...current, steps };
    });
  }

  function removeStep(index) {
    if (!window.confirm(`Remove email ${index + 1}?`)) return;
    setForm((current) => ({ ...current, steps: current.steps.filter((_, i) => i !== index) }));
  }

  async function save() {
    const problem = validate(form);
    setFormError(problem);
    if (problem) return null;
    setBusy("save");
    try {
      const savedId = await saveSequence(id, settingsFrom(form), form.steps);
      notify("Sequence saved.");
      if (!id) {
        setSaved(snapshot(form));
        router.replace(`/admin/outreach/sequence?id=${savedId}`);
      } else {
        await load();
      }
      return savedId;
    } catch (error) {
      setFormError(error.message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(status) {
    const mailbox = mailboxes.find((row) => row.id === form.mailbox_id);
    if (status === "active") {
      if (dirty) return setFormError("Save your changes before activating.");
      if (!mailbox) return setFormError("Choose the mailbox this sequence sends from, then save.");
      if (mailbox.status === "error") return setFormError(`${mailbox.email} needs reconnecting first (Mailboxes).`);
    }
    setBusy(status);
    try {
      await setSequenceStatus(id, status);
      notify(
        status === "active"
          ? `Active. Emails go out ${describeWindow(form).replace(/^Every day/, "every day")}${mailbox?.status === "paused" ? " once the mailbox is resumed" : ""}.`
          : status === "paused"
            ? sequence?.status === "archived"
              ? "Restored as paused. Activate it when you're ready."
              : "Paused. Nobody gets another email until you resume — replies are still tracked."
            : "Archived. Nothing more is sent from it.",
      );
      await load();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    setBusy("duplicate");
    try {
      const copyId = await saveSequence(
        null,
        { ...settingsFrom(form), name: `${form.name.trim()} (copy)` },
        form.steps.map(({ wait_days, subject, body }) => ({ wait_days, subject, body })),
      );
      notify("Copied. You're now editing the copy.");
      router.push(`/admin/outreach/sequence?id=${copyId}`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${form.name}”? Its prospects are taken out of it. This can't be undone.`)) return;
    try {
      await deleteSequence(id);
      notify("Sequence deleted.");
      router.replace("/admin/outreach/sequences");
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function test(position) {
    setBusy(`test-${position}`);
    try {
      const result = await sendTestEmail(id, position, enrolled[0]?.id ?? null);
      notify(`Test of email ${position} sent to ${result.to}${enrolled[0] ? `, filled in for ${prospectName(enrolled[0])}` : " with sample details"}.`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(null);
    }
  }

  if (loadError) return <Notice tone="error">{loadError}</Notice>;
  if (!form) return <Spinner label="Loading the sequence" />;

  const status = sequence?.status ?? "draft";
  const mailbox = mailboxes.find((row) => row.id === form.mailbox_id);
  const lockedThrough = sequence?.lockedThrough ?? 0;
  const isLocked = (step) => Boolean(step.position) && step.position <= lockedThrough;
  const stepStats = new Map((sequence?.stepStats ?? []).map((row) => [row.step_position, row]));
  const zones = TIME_ZONES.includes(form.timezone) ? TIME_ZONES : [form.timezone, ...TIME_ZONES];
  const stats = sequence?.stats;

  return (
    <>
      <Link href="/admin/outreach/sequences" className="mb-4 inline-flex items-center gap-1.5 font-body text-sm text-pine-soft hover:text-pine">
        <ArrowLeft size={14} aria-hidden="true" /> Sequences
      </Link>
      <PageHeader
        title={id ? form.name || "Untitled sequence" : "New sequence"}
        description={
          stats
            ? `${stats.enrolled} prospects · ${stats.active} in progress · ${stats.replied} replied (${percent(stats.replied, stats.contacted)}) · ${stats.bounced} bounced`
            : "Write the emails, choose who they come from and when they go out, then add prospects."
        }
        actions={
          <>
            {id && <StatusBadge map={SEQUENCE_STATUS} status={status} />}
            {id && status !== "active" && status !== "archived" && (
              <Button variant="accent" onClick={() => changeStatus("active")} busy={busy === "active"}>
                <Play size={14} aria-hidden="true" /> Activate
              </Button>
            )}
            {id && status === "active" && (
              <Button variant="outline" onClick={() => changeStatus("paused")} busy={busy === "paused"}>
                <Pause size={14} aria-hidden="true" /> Pause
              </Button>
            )}
            <Button variant="primary" onClick={save} busy={busy === "save"} disabled={!dirty && Boolean(id)}>
              Save
            </Button>
          </>
        }
      />

      {formError && (
        <Notice tone="error" className="mb-6">
          {formError}
        </Notice>
      )}
      {id && status === "active" && !mailbox && (
        <Notice tone="warn" className="mb-6">
          This sequence has no mailbox, so nothing is being sent. Choose one and save.
        </Notice>
      )}
      {id && status === "active" && mailbox && mailbox.status !== "active" && (
        <Notice tone="warn" className="mb-6">
          {mailbox.email} is {mailbox.status === "paused" ? "paused" : "not connected"}, so this sequence isn&rsquo;t sending.
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-6">
          <Field id="sequence-name" label="Sequence name">
            <input id="sequence-name" value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. UK streetwear brands — autumn" className={inputClass} />
          </Field>

          {form.steps.map((step, index) => (
            <StepCard
              key={step.key}
              step={step}
              index={index}
              locked={isLocked(step)}
              canMoveUp={index > 0 && !isLocked(step) && !isLocked(form.steps[index - 1])}
              canMoveDown={index < form.steps.length - 1 && !isLocked(step) && !isLocked(form.steps[index + 1])}
              canRemove={form.steps.length > 1 && !isLocked(step)}
              stats={stepStats.get(index + 1)}
              unsubscribeLink={form.unsubscribe_link}
              canTest={Boolean(id) && !dirty && Boolean(form.mailbox_id) && !busy}
              onChange={changeStep}
              onMove={moveStep}
              onRemove={removeStep}
              onTest={test}
              registerField={registerField}
            />
          ))}
          <Button
            variant="outline"
            onClick={() => set("steps", [...form.steps, withKey({ wait_days: 4, subject: "", body: "" })])}
            disabled={form.steps.length >= 20}
          >
            <Plus size={14} aria-hidden="true" /> Add a follow-up
          </Button>
          <p className="m-0 font-body text-xs text-pine-soft">
            Two or three follow-ups get most of the replies a sequence will ever get. Prospects who reply, bounce or opt out never
            receive the next one.
          </p>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Sending">
            <div className="grid gap-4">
              <Field
                id="sequence-mailbox"
                label="Send from"
                hint={mailboxes.length ? undefined : "No mailboxes yet — connect one under Mailboxes."}
              >
                <select id="sequence-mailbox" value={form.mailbox_id} onChange={(event) => set("mailbox_id", event.target.value)} className={inputClass}>
                  <option value="">Choose a mailbox…</option>
                  {mailboxes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.from_name ? `${row.from_name} <${row.email}>` : row.email}
                      {row.status !== "active" ? ` (${row.status})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-1.5 font-body text-xs font-semibold tracking-wide text-pine">Sending days</legend>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAY_LABELS.map((label, i) => {
                    const day = i + 1;
                    const on = form.send_days.includes(day);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("send_days", on ? form.send_days.filter((d) => d !== day) : [...form.send_days, day].sort())}
                        className={`h-8 w-11 rounded-sm border font-body text-xs ${on ? "border-pine bg-pine text-bone" : "border-pine/20 bg-paper text-pine-soft"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <Field id="send-from" label="From">
                  <input id="send-from" type="time" value={form.send_from} onChange={(event) => set("send_from", event.target.value)} className={inputClass} />
                </Field>
                <Field id="send-until" label="Until">
                  <input id="send-until" type="time" value={form.send_until} onChange={(event) => set("send_until", event.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field id="send-zone" label="Time zone" hint="Use the prospects' time zone, so emails arrive in their working day.">
                <select id="send-zone" value={form.timezone} onChange={(event) => set("timezone", event.target.value)} className={inputClass}>
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-start gap-2 font-body text-sm text-pine">
                <input type="checkbox" checked={form.stop_on_domain_reply} onChange={(event) => set("stop_on_domain_reply", event.target.checked)} className="mt-1 accent-moss" />
                <span>
                  Stop for the whole company when anyone there replies
                  <span className="block text-xs text-pine-soft">So colleagues don&rsquo;t keep getting follow-ups after someone has answered.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 font-body text-sm text-pine">
                <input type="checkbox" checked={form.unsubscribe_link} onChange={(event) => set("unsubscribe_link", event.target.checked)} className="mt-1 accent-moss" />
                <span>
                  Add an unsubscribe link
                  <span className="block text-xs text-pine-soft">
                    Adds a link and one-click unsubscribe headers. Without it, make sure the first email says how to opt out — replies like
                    &ldquo;remove me&rdquo; are always honoured.
                  </span>
                </span>
              </label>
            </div>
          </Card>

          <Preview form={form} mailbox={mailbox} enrolled={enrolled} />

          {id && (
            <Card title="More">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={duplicate} busy={busy === "duplicate"}>
                  <Copy size={14} aria-hidden="true" /> Duplicate
                </Button>
                {status !== "archived" ? (
                  <Button variant="outline" size="sm" onClick={() => changeStatus("archived")}>
                    <Archive size={14} aria-hidden="true" /> Archive
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => changeStatus("paused")}>
                    <Archive size={14} aria-hidden="true" /> Restore
                  </Button>
                )}
                {!stats?.contacted && (
                  <Button variant="danger" size="sm" onClick={remove}>
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </Button>
                )}
              </div>
              <p className="m-0 mt-3 font-body text-xs text-pine-soft">
                Archiving stops all sending and hides the sequence from lists. Sequences that have sent emails can&rsquo;t be deleted, so their
                history stays.
              </p>
            </Card>
          )}
        </div>
      </div>

      {id && (
        <div className="mt-8">
          <SequenceProspects sequenceId={id} stepCount={form.steps.length} onEnrolledLoaded={onEnrolledLoaded} />
        </div>
      )}
    </>
  );
}
