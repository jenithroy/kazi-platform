"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { enroll, listSequences } from "@/lib/outreach-api";
import { Badge, Button, Field, Notice, inputClass } from "@/components/admin/ui";

// Shared pieces for the /admin/outreach screens.

export const PROSPECT_STATUSES = [
  { id: "new", label: "New", tone: "neutral" },
  { id: "contacted", label: "Contacted", tone: "blue" },
  { id: "replied", label: "Replied", tone: "green" },
  { id: "interested", label: "Interested", tone: "green" },
  { id: "meeting", label: "Meeting booked", tone: "green" },
  { id: "customer", label: "Customer", tone: "green" },
  { id: "not_interested", label: "Not interested", tone: "neutral" },
  { id: "bounced", label: "Bounced", tone: "red" },
  { id: "unsubscribed", label: "Unsubscribed", tone: "amber" },
];
const PROSPECT_STATUS = Object.fromEntries(PROSPECT_STATUSES.map((status) => [status.id, status]));

export const ENROLLMENT_STATUS = {
  active: { label: "Sending", tone: "blue" },
  paused: { label: "Paused", tone: "neutral" },
  error: { label: "Needs attention", tone: "red" },
  completed: { label: "Finished, no reply", tone: "neutral" },
  replied: { label: "Replied", tone: "green" },
  bounced: { label: "Bounced", tone: "red" },
  unsubscribed: { label: "Unsubscribed", tone: "amber" },
  stopped: { label: "Stopped", tone: "neutral" },
};

export const SEQUENCE_STATUS = {
  draft: { label: "Draft", tone: "neutral" },
  active: { label: "Active", tone: "green" },
  paused: { label: "Paused", tone: "amber" },
  archived: { label: "Archived", tone: "neutral" },
};

export const MAILBOX_STATUS = {
  active: { label: "Connected", tone: "green" },
  paused: { label: "Paused", tone: "amber" },
  error: { label: "Reconnect needed", tone: "red" },
  disconnected: { label: "Disconnected", tone: "neutral" },
};

export function ProspectStatus({ status }) {
  const meta = PROSPECT_STATUS[status] ?? { label: status, tone: "neutral" };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function StatusBadge({ map, status }) {
  const meta = map[status] ?? { label: status, tone: "neutral" };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function prospectName(prospect) {
  if (!prospect) return "Deleted prospect";
  return [prospect.first_name, prospect.last_name].filter(Boolean).join(" ") || prospect.email;
}

/** Opens a thread in Gmail, in the right account when several are signed in. */
export function gmailThreadUrl(mailboxEmail, threadId) {
  const account = mailboxEmail ? `?authuser=${encodeURIComponent(mailboxEmail)}` : "";
  return `https://mail.google.com/mail/${account}#all/${threadId}`;
}

export const formatDateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
    : "";

export const percent = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

const SECTIONS = [
  { href: "/admin/outreach", label: "Overview", match: (path) => path === "/admin/outreach" },
  { href: "/admin/outreach/prospects", label: "Prospects", match: (path) => /^\/admin\/outreach\/prospect/.test(path) },
  { href: "/admin/outreach/sequences", label: "Sequences", match: (path) => /^\/admin\/outreach\/sequence/.test(path) },
  { href: "/admin/outreach/replies", label: "Replies", match: (path) => path.startsWith("/admin/outreach/replies") },
  { href: "/admin/outreach/mailboxes", label: "Mailboxes", match: (path) => /^\/admin\/outreach\/(mailboxes|connect)/.test(path) },
  { href: "/admin/outreach/do-not-contact", label: "Do not contact", match: (path) => path.startsWith("/admin/outreach/do-not-contact") },
];

export function OutreachNav() {
  const pathname = (usePathname() ?? "").replace(/\/$/, "");
  const [toHandle, setToHandle] = useState(0);

  // Refreshed on every navigation, so the count drops as replies are dealt with.
  useEffect(() => {
    let active = true;
    supabase
      .from("outreach_messages")
      .select("id", { count: "exact", head: true })
      .eq("kind", "reply")
      .is("handled_at", null)
      .then(({ count }) => active && setToHandle(count ?? 0));
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <nav aria-label="Outreach" className="-mt-2 mb-8 flex gap-1 overflow-x-auto border-b border-pine/10 pb-px">
      {SECTIONS.map((section) => {
        const active = section.match(pathname);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 font-body text-sm transition-colors ${
              active ? "border-pine font-semibold text-pine" : "border-transparent text-pine-soft hover:text-pine"
            }`}
          >
            {section.label}
            {section.label === "Replies" && toHandle > 0 && (
              <span className="rounded-full bg-moss px-1.5 font-body text-[0.65rem] font-semibold tabular-nums text-pine">
                {toHandle}
                <span className="sr-only"> to handle</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** A modal on the native <dialog> element: focus trapping, Esc to close and a backdrop for free. */
export function Dialog({ open, onClose, title, description, children, actions, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="dialog-title"
      className={`m-auto w-[calc(100vw-2rem)] ${wide ? "max-w-2xl" : "max-w-md"} rounded-sm border border-pine/15 bg-bone p-0 text-pine shadow-[0_20px_60px_rgba(10,16,14,0.25)] backdrop:bg-pine/40`}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-pine/10 px-5 py-4">
            <div>
              <h2 id="dialog-title" className="m-0 font-body text-base font-semibold text-pine">
                {title}
              </h2>
              {description && <p className="m-0 mt-1 font-body text-xs leading-relaxed text-pine-soft">{description}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X size={14} aria-hidden="true" />
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {actions && <div className="flex flex-wrap justify-end gap-2 border-t border-pine/10 px-5 py-3">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}

export function Pagination({ page, total, pageSize, onPage, label = "results" }) {
  if (total <= pageSize) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="mt-4 flex items-center justify-between gap-3 font-body text-sm text-pine-soft">
      <span className="tabular-nums">
        {from.toLocaleString("en-GB")}–{to.toLocaleString("en-GB")} of {total.toLocaleString("en-GB")} {label}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page === 0}>
          <ChevronLeft size={14} aria-hidden="true" /> Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={to >= total}>
          Next <ChevronRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function describeEnrolment(result) {
  const skipped = [
    result.suppressed && `${result.suppressed} on the do-not-contact list`,
    result.status && `${result.status} who already replied, bounced or are customers`,
    result.already && `${result.already} already in this sequence`,
    result.busy && `${result.busy} in another sequence right now`,
  ].filter(Boolean);
  const added = `Added ${result.added} ${result.added === 1 ? "prospect" : "prospects"}`;
  return skipped.length ? `${added}. Skipped ${skipped.join(", ")}.` : `${added}.`;
}

/** Choose a sequence and enrol the given prospects in it. */
export function EnrollDialog({ open, prospectIds, initialSequenceId = "", onClose, onDone }) {
  const [sequences, setSequences] = useState(null);
  const [sequenceId, setSequenceId] = useState(initialSequenceId);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    listSequences().then(
      (rows) => active && setSequences(rows),
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, [open]);

  const chosen = sequences?.find((sequence) => sequence.id === sequenceId);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await enroll(sequenceId, prospectIds);
      onDone(describeEnrolment(result), result);
    } catch (enrolError) {
      setError(enrolError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Add ${prospectIds.length.toLocaleString("en-GB")} ${prospectIds.length === 1 ? "prospect" : "prospects"} to a sequence`}
      description="People who already replied, are customers, are on the do-not-contact list or are in another sequence are skipped."
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} busy={busy} disabled={!sequenceId}>
            Add to sequence
          </Button>
        </>
      }
    >
      {error && (
        <Notice tone="error" className="mb-4">
          {error}
        </Notice>
      )}
      {sequences && sequences.length === 0 ? (
        <Notice tone="info">
          There are no sequences yet. <Link href="/admin/outreach/sequence">Write one first.</Link>
        </Notice>
      ) : (
        <Field id="enroll-sequence" label="Sequence">
          <select id="enroll-sequence" value={sequenceId} onChange={(event) => setSequenceId(event.target.value)} className={inputClass} disabled={!sequences}>
            <option value="">{sequences ? "Choose a sequence…" : "Loading…"}</option>
            {sequences?.map((sequence) => (
              <option key={sequence.id} value={sequence.id}>
                {sequence.name} ({SEQUENCE_STATUS[sequence.status]?.label ?? sequence.status})
              </option>
            ))}
          </select>
        </Field>
      )}
      {chosen && chosen.status !== "active" && (
        <Notice tone="warn" className="mt-4">
          This sequence is {chosen.status === "draft" ? "still a draft" : "paused"}. Prospects wait in it until it&rsquo;s activated.
        </Notice>
      )}
    </Dialog>
  );
}
