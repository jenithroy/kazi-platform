"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { PAGE_SIZE, addSuppressions, listInbound, markHandled, setProspectStatus } from "@/lib/outreach-api";
import { Button, EmptyState, Notice, PageHeader, Spinner, relativeTime } from "@/components/admin/ui";
import { Pagination, ProspectStatus, formatDateTime, gmailThreadUrl, prospectName } from "@/components/admin/outreach/parts";

const VIEWS = [
  { id: "todo", label: "To handle" },
  { id: "replies", label: "All replies" },
  { id: "auto", label: "Auto-replies" },
  { id: "bounces", label: "Bounces" },
];

const OUTCOMES = [
  { status: "interested", label: "Interested" },
  { status: "meeting", label: "Meeting booked" },
  { status: "not_interested", label: "Not interested" },
];

export function RepliesInbox() {
  const { profile, now, notify } = useAdmin();
  const [view, setView] = useState("todo");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    listInbound({ view, page }).then(
      (data) => active && setResult(data),
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, [view, page, version]);

  async function resolve(message, status) {
    try {
      if (status) {
        await setProspectStatus([message.prospect.id], status);
        if (status === "not_interested") await addSuppressions([message.prospect.email], "not_interested", `Replied: ${message.snippet?.slice(0, 120) ?? ""}`);
      }
      if (!message.handled_at) await markHandled([message.id], profile.id);
      notify(
        status === "not_interested"
          ? `${prospectName(message.prospect)} won't be emailed again.`
          : status
            ? `Marked ${prospectName(message.prospect)} as ${OUTCOMES.find((outcome) => outcome.status === status).label.toLowerCase()}.`
            : "Marked as handled.",
      );
      setVersion((value) => value + 1);
    } catch (resolveError) {
      notify(resolveError.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Replies"
        description="Everything prospects sent back. Answer in Gmail as usual — then record the outcome here so the pipeline stays accurate."
      />
      <div role="tablist" aria-label="Show" className="mb-4 flex flex-wrap gap-1">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            onClick={() => {
              setView(item.id);
              setPage(0);
              setResult(null);
            }}
            className={`rounded-sm px-3 py-1.5 font-body text-sm transition-colors ${view === item.id ? "bg-pine text-bone" : "text-pine-soft hover:bg-paper-raised hover:text-pine"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!error && !result && <Spinner label="Loading replies" />}
      {result && result.rows.length === 0 && (
        <EmptyState title={view === "todo" ? "All caught up" : "Nothing here yet"}>
          {view === "todo" ? "New replies appear here within a minute of arriving in Gmail." : "Messages will appear as they arrive."}
        </EmptyState>
      )}
      {result && result.rows.length > 0 && (
        <ul className="m-0 list-none space-y-3 p-0">
          {result.rows.map((message) => (
            <li key={message.id} className="rounded-sm border border-pine/15 bg-bone px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/outreach/prospect?id=${message.prospect?.id}`} className="font-body text-sm font-semibold text-pine hover:text-moss-deep">
                    {prospectName(message.prospect)}
                  </Link>
                  {message.prospect?.company && <span className="font-body text-sm text-pine-soft"> · {message.prospect.company}</span>}
                  <span className="ml-2 align-middle">{message.prospect && <ProspectStatus status={message.prospect.status} />}</span>
                  <p className="m-0 mt-0.5 font-body text-xs text-pine-soft">
                    {message.from_email !== message.prospect?.email && `${message.from_email} · `}
                    {message.sequence?.name ? `${message.sequence.name} · ` : ""}
                    <time dateTime={message.occurred_at} title={formatDateTime(message.occurred_at)}>
                      {relativeTime(message.occurred_at, now)}
                    </time>
                  </p>
                </div>
                {message.gmail_thread_id && (
                  <a href={gmailThreadUrl(message.mailbox?.email, message.gmail_thread_id)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-body text-xs text-pine underline underline-offset-2">
                    Open in Gmail <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                )}
              </div>
              <p className="m-0 mt-2 font-body text-xs font-semibold text-pine">{message.subject}</p>
              <blockquote className="m-0 mt-1 border-l-2 border-moss/40 pl-3 font-body text-sm text-pine">{message.snippet || "(no preview)"}</blockquote>
              {message.kind === "reply" && message.prospect && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {OUTCOMES.map((outcome) => (
                    <Button key={outcome.status} variant={outcome.status === "not_interested" ? "ghost" : "outline"} size="sm" onClick={() => resolve(message, outcome.status)}>
                      {outcome.label}
                    </Button>
                  ))}
                  {!message.handled_at ? (
                    <Button variant="ghost" size="sm" onClick={() => resolve(message, null)}>
                      <Check size={14} aria-hidden="true" /> Done
                    </Button>
                  ) : (
                    <span className="font-body text-xs text-pine-soft">Handled {relativeTime(message.handled_at, now)}</span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {result && <Pagination page={page} total={result.total} pageSize={PAGE_SIZE} onPage={setPage} label="messages" />}
    </>
  );
}
