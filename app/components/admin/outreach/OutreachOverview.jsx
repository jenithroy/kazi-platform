"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Circle, CircleCheck, MailCheck, MailX, Play, Plus, Reply, Send, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  getWorkerState,
  listMailboxes,
  listProblemEnrollments,
  mailboxSentCounts,
  overviewNumbers,
  recentActivity,
  runWorkerNow,
  updateEnrollments,
} from "@/lib/outreach-api";
import { effectiveDailyLimit } from "@/supabase/functions/_shared/outreach/schedule";
import { Button, Card, Notice, PageHeader, Spinner, buttonClass, relativeTime } from "@/components/admin/ui";
import { MAILBOX_STATUS, StatusBadge, percent, prospectName } from "@/components/admin/outreach/parts";

const SCHEDULER_STALE_MS = 10 * 60 * 1000;

function Tile({ label, value, note, warn = false }) {
  return (
    <div className={`rounded-sm border bg-bone px-5 py-4 ${warn ? "border-amber-600/40" : "border-pine/15"}`}>
      <span className="block font-body text-xs text-pine-soft">{label}</span>
      <span className={`mt-1 block font-body text-3xl font-semibold tabular-nums ${warn ? "text-amber-800" : "text-pine"}`}>{value}</span>
      {note && <span className="mt-1 block font-body text-xs text-pine-soft">{note}</span>}
    </div>
  );
}

const ACTIVITY = {
  sequence: { icon: Send, verb: (m) => `Email ${m.step_position} sent to` },
  reply: { icon: Reply, verb: () => "Reply from" },
  auto_reply: { icon: MailCheck, verb: () => "Auto-reply from" },
  bounce: { icon: MailX, verb: () => "Bounce for" },
};

function summarise(result) {
  if (result?.skipped) return result.skipped;
  const parts = [
    `${result.sent} sent`,
    result.replies && `${result.replies} new ${result.replies === 1 ? "reply" : "replies"}`,
    result.bounces && `${result.bounces} ${result.bounces === 1 ? "bounce" : "bounces"}`,
  ].filter(Boolean);
  const checked = `Checked ${result.mailboxes} ${result.mailboxes === 1 ? "mailbox" : "mailboxes"}: ${parts.join(", ")}.`;
  return result.errors?.length ? `${checked} ${result.errors.join(" ")}` : checked;
}

export function OutreachOverview() {
  const { now, notify } = useAdmin();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([overviewNumbers(), listMailboxes(), mailboxSentCounts(), listProblemEnrollments(), recentActivity(12), getWorkerState()]).then(
        ([numbers, mailboxes, sentCounts, problems, activity, worker]) => setData({ numbers, mailboxes, sentCounts, problems, activity, worker }),
        (loadError) => setError(loadError.message),
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function runNow() {
    setRunning(true);
    try {
      const result = await runWorkerNow();
      notify(summarise(result), result.errors?.length ? "error" : "success");
      await load();
    } catch (runError) {
      notify(runError.message, "error");
    } finally {
      setRunning(false);
    }
  }

  async function retry(enrollment) {
    try {
      await updateEnrollments([enrollment.id], { status: "active", status_detail: null, next_send_at: new Date().toISOString() });
      notify(`${prospectName(enrollment.prospect)} will be retried on the next run.`);
      await load();
    } catch (retryError) {
      notify(retryError.message, "error");
    }
  }

  const header = (
    <PageHeader
      title="Outreach"
      description="Personal emails to brands, sent from your own Google Workspace mailboxes a few minutes apart. When someone replies, their sequence stops and the reply lands here and in Gmail."
      actions={
        <>
          <Button variant="outline" onClick={runNow} busy={running} title="Check for replies and send anything due now, instead of waiting for the next minute">
            {!running && <Play size={14} aria-hidden="true" />} Run now
          </Button>
          <Link href="/admin/outreach/sequence" className={buttonClass("primary")}>
            <Plus size={16} aria-hidden="true" /> New sequence
          </Link>
        </>
      }
    />
  );

  if (error) {
    return (
      <>
        {header}
        <Notice tone="error" title="Couldn't load outreach">
          <p>{error}</p>
          <p className="mt-2">If this mentions a missing table, run app/supabase/migrations/008_outreach.sql (see docs/outreach.md).</p>
        </Notice>
      </>
    );
  }
  if (!data || !now) {
    return (
      <>
        {header}
        <Spinner label="Loading outreach" />
      </>
    );
  }

  const { numbers, mailboxes, sentCounts, problems, activity, worker } = data;
  const connected = mailboxes.filter((mailbox) => ["active", "paused"].includes(mailbox.status));
  const lastRun = worker?.last_run_at ? new Date(worker.last_run_at).getTime() : null;
  const schedulerOk = lastRun && now - lastRun < SCHEDULER_STALE_MS;
  const checklist = [
    { done: connected.length > 0, label: "Connect a Google Workspace mailbox", href: "/admin/outreach/mailboxes" },
    { done: numbers.prospects > 0, label: "Import the brands you want to reach", href: "/admin/outreach/prospects/import" },
    { done: numbers.sequences.some((sequence) => sequence.steps?.[0]?.count > 0), label: "Write a sequence", href: "/admin/outreach/sequence" },
    {
      done: numbers.sequences.some((sequence) => sequence.status === "active") && (numbers.active > 0 || numbers.sent7 > 0),
      label: "Activate it and add prospects",
      href: "/admin/outreach/sequences",
    },
    { done: Boolean(schedulerOk), label: "Schedule the worker to run every minute (docs/outreach.md, step 5)", href: null },
  ];
  const setupDone = checklist.every((item) => item.done);
  const bounceRate = numbers.contacted30 ? numbers.bounces30 / numbers.contacted30 : 0;
  const attention = numbers.toHandle + problems.length + mailboxes.filter((mailbox) => mailbox.status === "error").length;

  return (
    <>
      {header}

      {!setupDone && (
        <Card title="Getting set up" description="Outreach starts sending once every step is ticked." className="mb-8">
          <ol className="m-0 list-none space-y-2.5 p-0">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 font-body text-sm">
                {item.done ? (
                  <CircleCheck size={16} className="shrink-0 text-moss" aria-hidden="true" />
                ) : (
                  <Circle size={16} className="shrink-0 text-pine-soft/50" aria-hidden="true" />
                )}
                <span className="sr-only">{item.done ? "Done: " : "To do: "}</span>
                {item.href && !item.done ? (
                  <Link href={item.href} className="text-pine underline underline-offset-2 hover:text-moss-deep">
                    {item.label}
                  </Link>
                ) : (
                  <span className={item.done ? "text-pine-soft" : "text-pine"}>{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {setupDone && !schedulerOk && (
        <Notice tone="warn" className="mb-8">
          The worker hasn&rsquo;t run {lastRun ? `since ${relativeTime(worker.last_run_at, now)}` : "yet"}, so nothing is being sent or
          read. Check its pg_cron job (docs/outreach.md, step 5).
        </Notice>
      )}

      <section aria-label="Results" className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Emails sent · 7 days" value={numbers.sent7.toLocaleString("en-GB")} note={`${numbers.active.toLocaleString("en-GB")} prospects in progress`} />
        <Tile label="Replies · 7 days" value={numbers.replies7.toLocaleString("en-GB")} />
        <Tile
          label="Reply rate · 30 days"
          value={percent(numbers.replied30, numbers.contacted30)}
          note={`${numbers.replied30} of ${numbers.contacted30} prospects contacted`}
        />
        <Tile
          label="Bounce rate · 30 days"
          value={percent(numbers.bounces30, numbers.contacted30)}
          warn={numbers.contacted30 >= 20 && bounceRate > 0.03}
          note={numbers.contacted30 >= 20 && bounceRate > 0.03 ? "Over 3% — clean the list before sending more" : "Keep it under 3%"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-6">
          <Card title={attention ? `Needs attention (${attention})` : "Needs attention"}>
            {attention === 0 ? (
              <p className="m-0 font-body text-sm text-pine-soft">Nothing right now.</p>
            ) : (
              <ul className="m-0 list-none space-y-3 p-0 font-body text-sm">
                {numbers.toHandle > 0 && (
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-pine">
                      <Reply size={14} className="text-moss-deep" aria-hidden="true" />
                      {numbers.toHandle} {numbers.toHandle === 1 ? "reply" : "replies"} to answer
                    </span>
                    <Link href="/admin/outreach/replies" className={buttonClass("outline", "sm")}>
                      Open replies <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                )}
                {mailboxes
                  .filter((mailbox) => mailbox.status === "error")
                  .map((mailbox) => (
                    <li key={mailbox.id} className="flex items-center justify-between gap-3">
                      <span className="flex items-start gap-2 text-pine">
                        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
                        {mailbox.email} needs reconnecting
                      </span>
                      <Link href="/admin/outreach/mailboxes" className={buttonClass("outline", "sm")}>
                        Mailboxes
                      </Link>
                    </li>
                  ))}
                {problems.map((enrollment) => (
                  <li key={enrollment.id} className="flex flex-col gap-2 border-t border-pine/10 pt-3 sm:flex-row sm:items-start sm:justify-between">
                    <span className="min-w-0">
                      <Link href={`/admin/outreach/prospect?id=${enrollment.prospect?.id}`} className="font-semibold text-pine hover:text-moss-deep">
                        {prospectName(enrollment.prospect)}
                      </Link>
                      <span className="text-pine-soft"> · {enrollment.sequence?.name}</span>
                      <span className="block text-xs text-red-800">{enrollment.status_detail}</span>
                    </span>
                    <Button variant="outline" size="sm" onClick={() => retry(enrollment)}>
                      Retry
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent activity">
            {activity.length === 0 ? (
              <p className="m-0 font-body text-sm text-pine-soft">No emails yet.</p>
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">
                {activity.map((message) => {
                  const meta = ACTIVITY[message.kind] ?? ACTIVITY.sequence;
                  const Icon = meta.icon;
                  return (
                    <li key={message.id} className="flex gap-3 font-body text-sm">
                      <Icon size={14} className={`mt-1 shrink-0 ${message.kind === "bounce" ? "text-red-700" : message.kind === "reply" ? "text-moss-deep" : "text-pine-soft"}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="text-pine-soft">{meta.verb(message)} </span>
                        {message.prospect ? (
                          <Link href={`/admin/outreach/prospect?id=${message.prospect.id}`} className="font-semibold text-pine hover:text-moss-deep">
                            {prospectName(message.prospect)}
                          </Link>
                        ) : (
                          <span className="text-pine">{message.to_email}</span>
                        )}
                        {message.prospect?.company && <span className="text-pine-soft"> · {message.prospect.company}</span>}
                        <span className="block truncate text-xs text-pine-soft">{message.kind === "reply" ? message.snippet : message.subject}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-xs text-pine-soft">{relativeTime(message.occurred_at, now)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card
            title="Mailboxes"
            actions={
              <Link href="/admin/outreach/mailboxes" className={buttonClass("ghost", "sm")}>
                Manage
              </Link>
            }
          >
            {connected.length === 0 ? (
              <p className="m-0 font-body text-sm text-pine-soft">
                None connected yet.{" "}
                <Link href="/admin/outreach/mailboxes" className="text-pine underline underline-offset-2">
                  Connect one
                </Link>
                .
              </p>
            ) : (
              <ul className="m-0 list-none space-y-4 p-0">
                {connected.map((mailbox) => {
                  const limit = effectiveDailyLimit(mailbox, now);
                  const used = sentCounts[mailbox.id] ?? 0;
                  const nextSend = new Date(mailbox.next_send_at).getTime();
                  return (
                    <li key={mailbox.id} className="font-body text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-pine">{mailbox.email}</span>
                        <StatusBadge map={MAILBOX_STATUS} status={mailbox.status} />
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-raised" aria-hidden="true">
                        <div className="h-full rounded-full bg-moss" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
                      </div>
                      <p className="m-0 mt-1 text-xs text-pine-soft">
                        {used} of {limit} sent in the last 24 hours
                        {mailbox.warmup_enabled && limit < mailbox.daily_limit ? " (warming up)" : ""}
                        {mailbox.status === "active" && nextSend > now ? ` · next send ${relativeTime(mailbox.next_send_at, now)}` : ""}
                      </p>
                      {mailbox.last_error && <p className="m-0 mt-1 text-xs text-amber-800">{mailbox.last_error}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Worker">
            <p className="m-0 font-body text-sm text-pine">
              {lastRun ? `Last ran ${relativeTime(worker.last_run_at, now)}` : "Hasn't run yet"}
              {worker?.last_run_summary && !worker.last_run_summary.skipped && lastRun
                ? ` — ${worker.last_run_summary.sent ?? 0} sent, ${worker.last_run_summary.replies ?? 0} new replies.`
                : "."}
            </p>
            {worker?.last_error && <p className="m-0 mt-2 font-body text-xs text-red-800">{worker.last_error}</p>}
            <p className="m-0 mt-2 font-body text-xs leading-relaxed text-pine-soft">
              It runs every minute: it reads new mail first, then sends at most one email per mailbox, inside each sequence&rsquo;s
              sending hours.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
