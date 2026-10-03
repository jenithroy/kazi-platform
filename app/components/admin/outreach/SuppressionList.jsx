"use client";

import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { PAGE_SIZE, addSuppressions, listSuppressions, removeSuppression } from "@/lib/outreach-api";
import { normalizeEmail } from "@/lib/outreach-csv";
import { Badge, Button, Card, EmptyState, Field, Notice, PageHeader, Spinner, inputClass, relativeTime } from "@/components/admin/ui";
import { Pagination } from "@/components/admin/outreach/parts";

const REASONS = {
  unsubscribed: { label: "Unsubscribed", tone: "amber" },
  bounced: { label: "Bounced", tone: "red" },
  not_interested: { label: "Not interested", tone: "neutral" },
  complained: { label: "Complained", tone: "red" },
  manual: { label: "Added by hand", tone: "neutral" },
};

const VALUE = /^([^@\s]+@)?[^@\s]+\.[^@\s]+$/;

export function SuppressionList() {
  const { isAdmin, profile, now, notify } = useAdmin();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;
    listSuppressions({ search: query, page }).then(
      (data) => active && setResult(data),
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, [query, page, version]);

  async function add(event) {
    event.preventDefault();
    const values = text
      .split(/[\s,;]+/)
      .map((value) => normalizeEmail(value).replace(/^@/, ""))
      .filter(Boolean);
    const invalid = values.filter((value) => !VALUE.test(value));
    if (!values.length) return setFormError("Enter at least one email address or domain.");
    if (invalid.length) return setFormError(`These don't look like an email address or a domain: ${invalid.slice(0, 5).join(", ")}`);
    setFormError(null);
    setAdding(true);
    try {
      const added = await addSuppressions(values, "manual", note.trim() || `Added by ${profile.email}`);
      notify(`Added ${added} to the list${added < values.length ? ` (${values.length - added} were already on it)` : ""}.`);
      setText("");
      setNote("");
      setVersion((value) => value + 1);
    } catch (addError) {
      setFormError(addError.message);
    } finally {
      setAdding(false);
    }
  }

  async function remove(entry) {
    if (!window.confirm(`Take ${entry.value} off the do-not-contact list? They could then be emailed again.`)) return;
    try {
      await removeSuppression(entry.id);
      notify("Removed from the list.");
      setVersion((value) => value + 1);
    } catch (removeError) {
      notify(removeError.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Do not contact"
        description="Nobody on this list is ever emailed by outreach — enrolments skip them and any sequence they're in stops at once. Unsubscribes, bounces and “remove me” replies are added automatically."
      />

      <Card title="Add to the list" className="mb-8">
        <form onSubmit={add} noValidate className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start">
          <Field id="dnc-values" label="Email addresses or domains" hint="One per line, or separated by commas. A domain (brand.com) blocks everyone there.">
            <textarea id="dnc-values" rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder={"someone@brand.com\ncompetitor.com"} className={inputClass} />
          </Field>
          <div className="grid gap-4">
            <Field id="dnc-note" label="Note (optional)">
              <input id="dnc-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Asked on a call" className={inputClass} />
            </Field>
            <Button type="submit" variant="primary" busy={adding}>
              Add
            </Button>
          </div>
        </form>
        {formError && (
          <Notice tone="error" className="mt-4">
            {formError}
          </Notice>
        )}
      </Card>

      <label className="relative mb-4 block sm:w-80">
        <span className="sr-only">Search the list</span>
        <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pine-soft" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className={`${inputClass} pl-8`} />
      </label>

      {error && <Notice tone="error">{error}</Notice>}
      {!error && !result && <Spinner label="Loading the list" />}
      {result && result.rows.length === 0 && <EmptyState title={query ? "No matches" : "The list is empty"} />}
      {result && result.rows.length > 0 && (
        <div className="relative overflow-x-auto rounded-sm border border-pine/15 bg-bone">
          <table className="w-full min-w-[640px] border-collapse text-left font-body text-sm">
            <thead>
              <tr className="border-b border-pine/10 text-xs uppercase tracking-[0.08em] text-pine-soft">
                <th className="px-4 py-3 font-semibold">Address or domain</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((entry) => (
                <tr key={entry.id} className="border-b border-pine/10 last:border-0">
                  <td className="px-4 py-3 text-pine">
                    {entry.value}
                    {!entry.value.includes("@") && <span className="ml-2 text-xs text-pine-soft">(whole domain)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={REASONS[entry.reason]?.tone}>{REASONS[entry.reason]?.label ?? entry.reason}</Badge>
                  </td>
                  <td className="max-w-[18rem] truncate px-4 py-3 text-xs text-pine-soft">{entry.note || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-pine-soft">{relativeTime(entry.created_at, now)}</td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => remove(entry)} aria-label={`Remove ${entry.value}`}>
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result && <Pagination page={page} total={result.total} pageSize={PAGE_SIZE} onPage={setPage} label="entries" />}
    </>
  );
}
