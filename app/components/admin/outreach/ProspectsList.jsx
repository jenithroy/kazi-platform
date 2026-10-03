"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Ban, ListPlus, Plus, Search, Tag, Trash2, Upload } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  PAGE_SIZE,
  addSuppressions,
  addTags,
  deleteProspects,
  listProspects,
  prospectEmails,
  saveProspect,
  setProspectStatus,
  tagCounts,
} from "@/lib/outreach-api";
import { isValidEmail, normalizeEmail, splitTags } from "@/lib/outreach-csv";
import { Button, EmptyState, Field, Notice, PageHeader, Spinner, buttonClass, inputClass, relativeTime } from "@/components/admin/ui";
import { Dialog, EnrollDialog, PROSPECT_STATUSES, Pagination, ProspectStatus, prospectName } from "@/components/admin/outreach/parts";

const EMPTY_PROSPECT = { email: "", first_name: "", last_name: "", company: "", title: "", website: "", tags: "" };

function AddProspectDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_PROSPECT);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    const email = normalizeEmail(form.email);
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const row = await saveProspect(null, { ...form, email, tags: splitTags(form.tags), source: "Added by hand" });
      setForm(EMPTY_PROSPECT);
      onSaved(row);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a prospect"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="add-prospect" busy={saving}>
            Add prospect
          </Button>
        </>
      }
    >
      <form id="add-prospect" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field id="new-email" label="Email">
            <input id="new-email" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} className={inputClass} autoComplete="off" />
          </Field>
        </div>
        <Field id="new-first" label="First name">
          <input id="new-first" value={form.first_name} onChange={(event) => set("first_name", event.target.value)} className={inputClass} />
        </Field>
        <Field id="new-last" label="Last name">
          <input id="new-last" value={form.last_name} onChange={(event) => set("last_name", event.target.value)} className={inputClass} />
        </Field>
        <Field id="new-company" label="Company">
          <input id="new-company" value={form.company} onChange={(event) => set("company", event.target.value)} className={inputClass} />
        </Field>
        <Field id="new-title" label="Job title">
          <input id="new-title" value={form.title} onChange={(event) => set("title", event.target.value)} className={inputClass} />
        </Field>
        <Field id="new-website" label="Website">
          <input id="new-website" value={form.website} onChange={(event) => set("website", event.target.value)} className={inputClass} />
        </Field>
        <Field id="new-tags" label="Tags" hint="Comma separated">
          <input id="new-tags" value={form.tags} onChange={(event) => set("tags", event.target.value)} placeholder="streetwear, uk" className={inputClass} />
        </Field>
        {error && (
          <Notice tone="error" className="sm:col-span-2">
            {error}
          </Notice>
        )}
      </form>
    </Dialog>
  );
}

function TagDialog({ open, count, onClose, onSubmit }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Tag ${count} ${count === 1 ? "prospect" : "prospects"}`}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            busy={busy}
            disabled={!splitTags(value).length}
            onClick={async () => {
              setBusy(true);
              await onSubmit(splitTags(value));
              setBusy(false);
              setValue("");
            }}
          >
            Add tags
          </Button>
        </>
      }
    >
      <Field id="bulk-tags" label="Tags" hint="Comma separated, e.g. “streetwear, london”. Use tags to group prospects for a sequence.">
        <input id="bulk-tags" value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} />
      </Field>
    </Dialog>
  );
}

export function ProspectsList() {
  const { profile, notify } = useAdmin();
  const params = useSearchParams();
  const forSequence = params.get("sequence") ?? "";
  const [filters, setFilters] = useState({ search: "", status: "", tag: params.get("tag") ?? "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dialog, setDialog] = useState(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  // Search as you type, a moment after typing stops.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((current) => (current.search === search ? current : { ...current, search }));
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;
    listProspects({ ...filters, page }).then(
      (data) => {
        if (!active) return;
        setResult(data);
        setError(null);
      },
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, [filters, page, version]);

  useEffect(() => {
    let active = true;
    tagCounts().then(
      (rows) => active && setTags(rows),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [version]);

  const rows = useMemo(() => result?.rows ?? [], [result]);
  const ids = [...selected];
  const allOnPage = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of rows) {
        if (allOnPage) next.delete(row.id);
        else next.add(row.id);
      }
      return next;
    });
  }
  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  async function bulk(action, message) {
    try {
      await action();
      notify(message);
      setSelected(new Set());
      reload();
    } catch (actionError) {
      notify(actionError.message, "error");
    }
  }

  async function doNotContact() {
    if (!window.confirm(`Add ${ids.length} ${ids.length === 1 ? "person" : "people"} to the do-not-contact list? Their sequences stop now.`)) return;
    await bulk(
      async () => addSuppressions(await prospectEmails(ids), "manual", `Added by ${profile.email}`),
      "Added to the do-not-contact list.",
    );
  }

  async function remove() {
    if (!window.confirm(`Delete ${ids.length} ${ids.length === 1 ? "prospect" : "prospects"} and their email history? This can't be undone.`)) return;
    await bulk(() => deleteProspects(ids), `Deleted ${ids.length} ${ids.length === 1 ? "prospect" : "prospects"}.`);
  }

  const hasFilters = filters.search || filters.status || filters.tag;

  return (
    <>
      <PageHeader
        title="Prospects"
        description="The people at brands you want to reach. Import a spreadsheet, then add them to a sequence."
        actions={
          <>
            <Button variant="outline" onClick={() => setDialog("add")}>
              <Plus size={16} aria-hidden="true" /> Add prospect
            </Button>
            <Link href="/admin/outreach/prospects/import" className={buttonClass("primary")}>
              <Upload size={16} aria-hidden="true" /> Import CSV
            </Link>
          </>
        }
      />

      {forSequence && (
        <Notice tone="info" className="mb-6">
          Tick the prospects to add, then choose <strong>Add to sequence</strong>.
        </Notice>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label className="relative">
          <span className="sr-only">Search prospects</span>
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pine-soft" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or company" className={`${inputClass} pl-8`} />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select value={filters.status} onChange={(event) => setFilter("status", event.target.value)} className={inputClass}>
            <option value="">All statuses</option>
            {PROSPECT_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Tag</span>
          <select value={filters.tag} onChange={(event) => setFilter("tag", event.target.value)} className={inputClass}>
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.tag} value={tag.tag}>
                {tag.tag} ({tag.prospects})
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-30 mb-4 flex flex-wrap items-center gap-2 rounded-sm border border-pine/20 bg-pine px-4 py-2.5 text-bone shadow-sm">
          <span className="mr-2 font-body text-sm font-semibold">{selected.size} selected</span>
          <Button variant="accent" size="sm" onClick={() => setDialog("enroll")}>
            <ListPlus size={14} aria-hidden="true" /> Add to sequence
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDialog("tag")}>
            <Tag size={14} aria-hidden="true" /> Tag
          </Button>
          <label className="inline-flex">
            <span className="sr-only">Set status</span>
            <select
              value=""
              onChange={(event) =>
                event.target.value &&
                bulk(() => setProspectStatus(ids, event.target.value), "Status updated.")
              }
              className="h-8 rounded-sm border border-pine/25 bg-bone px-2 font-body text-xs font-semibold text-pine"
            >
              <option value="">Set status…</option>
              {PROSPECT_STATUSES.filter((status) => !["bounced", "unsubscribed"].includes(status.id)).map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" size="sm" onClick={doNotContact}>
            <Ban size={14} aria-hidden="true" /> Do not contact
          </Button>
          <Button variant="danger" size="sm" onClick={remove}>
            <Trash2 size={14} aria-hidden="true" /> Delete
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto font-body text-xs text-bone/80 underline underline-offset-2 hover:text-bone">
            Clear selection
          </button>
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {!error && !result && <Spinner label="Loading prospects" />}

      {result && result.total === 0 && !hasFilters && (
        <EmptyState
          title="No prospects yet"
          action={
            <Link href="/admin/outreach/prospects/import" className={buttonClass("primary")}>
              Import a CSV
            </Link>
          }
        >
          Export a list from Google Sheets, LinkedIn Sales Navigator, Apollo or anywhere else. All it needs is an email column.
        </EmptyState>
      )}

      {result && (result.total > 0 || hasFilters) && (
        <>
          <div className="relative overflow-x-auto rounded-sm border border-pine/15 bg-bone">
            <table className="w-full min-w-[760px] border-collapse text-left font-body text-sm">
              <thead>
                <tr className="border-b border-pine/10 text-xs uppercase tracking-[0.08em] text-pine-soft">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select every prospect on this page" className="accent-moss" />
                  </th>
                  <th className="px-4 py-3 font-semibold">Prospect</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Tags</th>
                  <th className="px-4 py-3 font-semibold">Last emailed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((prospect) => (
                  <tr key={prospect.id} className={`border-b border-pine/10 last:border-0 ${selected.has(prospect.id) ? "bg-moss/10" : "hover:bg-paper/60"}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(prospect.id)}
                        onChange={() => toggle(prospect.id)}
                        aria-label={`Select ${prospectName(prospect)}`}
                        className="accent-moss"
                      />
                    </td>
                    <td className="max-w-[18rem] px-4 py-3">
                      <Link href={`/admin/outreach/prospect?id=${prospect.id}`} className="block truncate font-semibold text-pine hover:text-moss-deep">
                        {prospectName(prospect)}
                      </Link>
                      <span className="block truncate text-xs text-pine-soft">{prospect.email}</span>
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-pine-soft">{prospect.company || "—"}</td>
                    <td className="px-4 py-3">
                      <ProspectStatus status={prospect.status} />
                    </td>
                    <td className="max-w-[14rem] px-4 py-3">
                      <span className="flex flex-wrap gap-1">
                        {prospect.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-sm bg-paper-raised px-1.5 py-0.5 text-[0.7rem] text-pine-soft">
                            {tag}
                          </span>
                        ))}
                        {prospect.tags.length > 3 && <span className="text-[0.7rem] text-pine-soft">+{prospect.tags.length - 3}</span>}
                      </span>
                    </td>
                    <ProspectContacted prospect={prospect} />
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-pine-soft">
                      No prospects match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={result.total} pageSize={PAGE_SIZE} onPage={setPage} label="prospects" />
        </>
      )}

      <AddProspectDialog
        open={dialog === "add"}
        onClose={() => setDialog(null)}
        onSaved={(row) => {
          setDialog(null);
          notify(`Added ${prospectName(row)}.`);
          reload();
        }}
      />
      <TagDialog
        open={dialog === "tag"}
        count={selected.size}
        onClose={() => setDialog(null)}
        onSubmit={async (newTags) => {
          setDialog(null);
          await bulk(() => addTags(ids, newTags), "Tags added.");
        }}
      />
      <EnrollDialog
        open={dialog === "enroll"}
        prospectIds={ids}
        initialSequenceId={forSequence}
        onClose={() => setDialog(null)}
        onDone={(message) => {
          setDialog(null);
          notify(message);
          setSelected(new Set());
          reload();
        }}
      />
    </>
  );
}

function ProspectContacted({ prospect }) {
  const { now } = useAdmin();
  return (
    <td className="whitespace-nowrap px-4 py-3 text-xs text-pine-soft">
      {prospect.last_contacted_at ? relativeTime(prospect.last_contacted_at, now) : "Never"}
    </td>
  );
}
