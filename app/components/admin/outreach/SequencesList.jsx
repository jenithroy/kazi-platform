"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listSequences } from "@/lib/outreach-api";
import { EmptyState, Notice, PageHeader, Spinner, buttonClass } from "@/components/admin/ui";
import { SEQUENCE_STATUS, StatusBadge, percent } from "@/components/admin/outreach/parts";

export function SequencesList() {
  const [showArchived, setShowArchived] = useState(false);
  const [sequences, setSequences] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    listSequences({ includeArchived: showArchived }).then(
      (rows) => active && setSequences(rows),
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, [showArchived]);

  const newSequence = (
    <Link href="/admin/outreach/sequence" className={buttonClass("primary")}>
      <Plus size={16} aria-hidden="true" /> New sequence
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Sequences"
        description="A sequence is a first email plus a few follow-ups, sent days apart until the prospect replies."
        actions={newSequence}
      />
      {error && <Notice tone="error">{error}</Notice>}
      {!error && !sequences && <Spinner label="Loading sequences" />}
      {sequences && sequences.length === 0 && !showArchived && (
        <EmptyState title="No sequences yet" action={newSequence}>
          Start from the built-in template — a short introduction and two gentle follow-ups — and make it your own.
        </EmptyState>
      )}
      {sequences && (sequences.length > 0 || showArchived) && (
        <>
          <div className="relative overflow-x-auto rounded-sm border border-pine/15 bg-bone">
            <table className="w-full min-w-[760px] border-collapse text-left font-body text-sm">
              <thead>
                <tr className="border-b border-pine/10 text-xs uppercase tracking-[0.08em] text-pine-soft">
                  <th className="px-4 py-3 font-semibold">Sequence</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Prospects</th>
                  <th className="px-4 py-3 font-semibold">In progress</th>
                  <th className="px-4 py-3 font-semibold">Replied</th>
                  <th className="px-4 py-3 font-semibold">Bounced</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((sequence) => {
                  const stats = sequence.stats ?? {};
                  return (
                    <tr key={sequence.id} className="border-b border-pine/10 last:border-0 hover:bg-paper/60">
                      <td className="max-w-[22rem] px-4 py-3">
                        <Link href={`/admin/outreach/sequence?id=${sequence.id}`} className="block truncate font-semibold text-pine hover:text-moss-deep">
                          {sequence.name}
                        </Link>
                        <span className="block truncate text-xs text-pine-soft">
                          {sequence.stepCount} {sequence.stepCount === 1 ? "email" : "emails"} · {sequence.mailbox?.email ?? "no mailbox chosen"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge map={SEQUENCE_STATUS} status={sequence.status} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-pine">{(stats.enrolled ?? 0).toLocaleString("en-GB")}</td>
                      <td className="px-4 py-3 tabular-nums text-pine">{(stats.active ?? 0).toLocaleString("en-GB")}</td>
                      <td className="px-4 py-3 tabular-nums text-pine">
                        {stats.replied ?? 0} <span className="text-xs text-pine-soft">({percent(stats.replied ?? 0, stats.contacted ?? 0)})</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-pine">
                        {stats.bounced ?? 0} <span className="text-xs text-pine-soft">({percent(stats.bounced ?? 0, stats.contacted ?? 0)})</span>
                      </td>
                    </tr>
                  );
                })}
                {sequences.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-pine-soft">
                      No sequences.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 font-body text-sm text-pine-soft">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="accent-moss" />
            Show archived sequences
          </label>
        </>
      )}
    </>
  );
}
