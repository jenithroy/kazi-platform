"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileUp, ListPlus } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { existingProspects, suppressedEmails, upsertProspects } from "@/lib/outreach-api";
import { IMPORT_FIELDS, guessMapping, parseCsv, rowsToProspects, splitTags } from "@/lib/outreach-csv";
import { normalizeKey } from "@/supabase/functions/_shared/outreach/template";
import { Button, Card, Field, Notice, PageHeader, buttonClass, inputClass } from "@/components/admin/ui";
import { EnrollDialog } from "@/components/admin/outreach/parts";

const SAMPLE_CSV =
  "email,first_name,last_name,company,website,icebreaker\n" +
  "anna@northbound.co.uk,Anna,Kowalski,Northbound Apparel,northbound.co.uk,Loved the heavyweight hoodies in your SS26 drop\n";

const today = () => new Date().toISOString().slice(0, 10);

/** Existing prospect + file row: the file's values win where it has them; tags and fields merge. */
function merge(existing, incoming) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "tags") merged.tags = [...new Set([...(existing.tags ?? []), ...value])];
    else if (key === "fields") merged.fields = { ...(existing.fields ?? {}), ...value };
    else if (key === "source") merged.source = existing.source ?? value;
    else if (value) merged[key] = value;
  }
  return merged;
}

export function ProspectImport() {
  const { notify } = useAdmin();
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState([]);
  const [tags, setTags] = useState(`import-${today()}`);
  const [existingMode, setExistingMode] = useState("skip");
  const [review, setReview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  function load(text, name) {
    const result = parseCsv(text);
    if (!result.headers.length) {
      setError("That file looks empty.");
      return;
    }
    setError(null);
    setParsed(result);
    setFileName(name);
    setMapping(guessMapping(result.headers));
    setReview(null);
    setDone(null);
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("That file is over 10 MB — split it into smaller files.");
      return;
    }
    load(await file.text(), file.name);
    event.target.value = "";
  }

  const samples = useMemo(
    () => parsed?.headers.map((_, column) => parsed.rows.map((row) => row[column]).filter(Boolean).slice(0, 2).join(" · ")) ?? [],
    [parsed],
  );
  const emailColumns = mapping.filter((target) => target === "email").length;

  async function check() {
    if (emailColumns !== 1) {
      setError("Choose exactly one column as Email.");
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const converted = rowsToProspects({ headers: parsed.headers, rows: parsed.rows, mapping, tags: splitTags(tags), source: fileName || "Pasted list" });
      const emails = converted.prospects.map((prospect) => prospect.email);
      const [existing, suppressed] = await Promise.all([existingProspects(emails), suppressedEmails(emails)]);
      const fresh = [];
      const updates = [];
      for (const prospect of converted.prospects) {
        if (suppressed.has(prospect.email)) continue;
        const current = existing.get(prospect.email);
        if (!current) fresh.push(prospect);
        else if (existingMode === "update") updates.push(merge(current, prospect));
      }
      setReview({ ...converted, fresh, updates, existing: existing.size, suppressed: suppressed.size });
    } catch (checkError) {
      setError(checkError.message);
    } finally {
      setChecking(false);
    }
  }

  async function runImport() {
    setError(null);
    const records = [...review.fresh, ...review.updates];
    setProgress({ done: 0, total: records.length });
    try {
      const saved = await upsertProspects(records, (count, total) => setProgress({ done: count, total }));
      setDone({ ids: saved.map((row) => row.id), added: review.fresh.length, updated: review.updates.length });
      notify(`Imported ${review.fresh.length} new ${review.fresh.length === 1 ? "prospect" : "prospects"}.`);
    } catch (importError) {
      setError(importError.message);
    } finally {
      setProgress(null);
    }
  }

  if (done) {
    return (
      <>
        <PageHeader title="Import finished" />
        <Notice tone="success" className="mb-6">
          <p>
            Added {done.added.toLocaleString("en-GB")} new {done.added === 1 ? "prospect" : "prospects"}
            {done.updated ? ` and updated ${done.updated.toLocaleString("en-GB")}` : ""}. They&rsquo;re tagged{" "}
            <strong>{splitTags(tags).join(", ") || "(no tags)"}</strong>.
          </p>
        </Notice>
        <div className="flex flex-wrap gap-2">
          {done.ids.length > 0 && (
            <Button variant="primary" onClick={() => setEnrolling(true)}>
              <ListPlus size={16} aria-hidden="true" /> Add them to a sequence
            </Button>
          )}
          <Link href="/admin/outreach/prospects" className={buttonClass("outline")}>
            View prospects
          </Link>
          <Button variant="ghost" onClick={() => { setDone(null); setParsed(null); setReview(null); }}>
            Import another file
          </Button>
        </div>
        <EnrollDialog
          open={enrolling}
          prospectIds={done.ids}
          onClose={() => setEnrolling(false)}
          onDone={(message) => {
            setEnrolling(false);
            notify(message);
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Import prospects"
        description="Upload a CSV exported from Google Sheets, Excel, LinkedIn Sales Navigator, Apollo or similar. It needs an email column; any other column can become a personalisation field."
      />

      {error && (
        <Notice tone="error" className="mb-6">
          {error}
        </Notice>
      )}

      <Card title="1. Choose a file" className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className={`${buttonClass("primary")} cursor-pointer`}>
            <FileUp size={16} aria-hidden="true" /> Choose CSV file
            <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={onFile} className="sr-only" />
          </label>
          <span className="font-body text-sm text-pine-soft">
            {parsed ? `${fileName || "Pasted list"} — ${parsed.rows.length.toLocaleString("en-GB")} rows` : "No file chosen."}
          </span>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`}
            download="kazi-prospects-template.csv"
            className="font-body text-xs text-pine underline underline-offset-2 sm:ml-auto"
          >
            Download a template
          </a>
        </div>
        <details className="mt-4 font-body text-sm text-pine-soft">
          <summary className="cursor-pointer text-pine">Or paste the rows instead</summary>
          <textarea
            rows={5}
            className={`${inputClass} mt-2 font-mono text-xs`}
            placeholder={"email,first_name,company\nanna@brand.co,Anna,Brand Co"}
            onBlur={(event) => event.target.value.trim() && load(event.target.value, "Pasted list")}
            aria-label="Paste CSV rows"
          />
          <span className="mt-1 block text-xs">Include the header row. The rows are read when you click outside the box.</span>
        </details>
      </Card>

      {parsed && (
        <Card
          title="2. Match the columns"
          description="Columns marked Custom field can be used in emails, e.g. a column called “Icebreaker” becomes {{icebreaker}}."
          className="mb-6"
        >
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left font-body text-sm">
              <thead>
                <tr className="border-b border-pine/10 text-xs uppercase tracking-[0.08em] text-pine-soft">
                  <th className="py-2 pr-4 font-semibold">Column in file</th>
                  <th className="py-2 pr-4 font-semibold">Example</th>
                  <th className="py-2 font-semibold">Import as</th>
                </tr>
              </thead>
              <tbody>
                {parsed.headers.map((header, column) => (
                  <tr key={`${header}-${column}`} className="border-b border-pine/10 last:border-0">
                    <td className="py-2 pr-4 font-semibold text-pine">{header || <em className="text-pine-soft">(no name)</em>}</td>
                    <td className="max-w-[16rem] truncate py-2 pr-4 text-xs text-pine-soft">{samples[column] || "—"}</td>
                    <td className="py-2">
                      <select
                        value={mapping[column]}
                        onChange={(event) => {
                          const next = [...mapping];
                          next[column] = event.target.value;
                          setMapping(next);
                          setReview(null);
                        }}
                        aria-label={`Import “${header}” as`}
                        className={inputClass}
                      >
                        {IMPORT_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                        {normalizeKey(header) && <option value="custom">Custom field {`{{${normalizeKey(header)}}}`}</option>}
                        <option value="skip">Don&rsquo;t import</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field id="import-tags" label="Tag everyone in this file" hint="Comma separated. Tags make it easy to pick these people for a sequence later.">
              <input id="import-tags" value={tags} onChange={(event) => { setTags(event.target.value); setReview(null); }} className={inputClass} />
            </Field>
            <Field id="import-existing" label="People who are already prospects">
              <select id="import-existing" value={existingMode} onChange={(event) => { setExistingMode(event.target.value); setReview(null); }} className={inputClass}>
                <option value="skip">Leave them as they are</option>
                <option value="update">Update them with this file&rsquo;s details</option>
              </select>
            </Field>
          </div>
          {emailColumns !== 1 && (
            <Notice tone="warn" className="mt-4">
              {emailColumns === 0 ? "Choose which column holds the email address." : "Only one column can be the email address."}
            </Notice>
          )}
          <Button variant="primary" className="mt-6" onClick={check} busy={checking} disabled={emailColumns !== 1}>
            Check the file
          </Button>
        </Card>
      )}

      {review && (
        <Card title="3. Review and import">
          <ul className="m-0 list-none space-y-1.5 p-0 font-body text-sm text-pine">
            <li>
              <strong>{review.fresh.length.toLocaleString("en-GB")}</strong> new {review.fresh.length === 1 ? "prospect" : "prospects"} to add
            </li>
            {review.existing > 0 && (
              <li>
                {review.existing.toLocaleString("en-GB")} already in your prospects —{" "}
                {existingMode === "update" ? `${review.updates.length} will be updated` : "left as they are"}
              </li>
            )}
            {review.suppressed > 0 && <li>{review.suppressed.toLocaleString("en-GB")} on the do-not-contact list — skipped</li>}
            {review.duplicates > 0 && (
              <li>
                {review.duplicates.toLocaleString("en-GB")} repeated {review.duplicates === 1 ? "row" : "rows"} in the file — imported once
              </li>
            )}
            {review.invalid.length > 0 && (
              <li className="text-amber-900">
                {review.invalid.length.toLocaleString("en-GB")} {review.invalid.length === 1 ? "row" : "rows"} without a usable email — skipped
              </li>
            )}
          </ul>
          {review.invalid.length > 0 && (
            <details className="mt-3 font-body text-xs text-pine-soft">
              <summary className="cursor-pointer text-pine">Show skipped rows</summary>
              <ul className="m-0 mt-2 max-h-48 list-none space-y-1 overflow-y-auto p-0">
                {review.invalid.map((row) => (
                  <li key={row.line}>
                    Row {row.line}: {row.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {review.fresh.length > 0 && (
            <div className="relative mt-4 overflow-x-auto rounded-sm border border-pine/10">
              <table className="w-full min-w-[560px] border-collapse text-left font-body text-xs">
                <caption className="sr-only">First few prospects</caption>
                <thead>
                  <tr className="border-b border-pine/10 text-pine-soft">
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Company</th>
                    <th className="px-3 py-2 font-semibold">Custom fields</th>
                  </tr>
                </thead>
                <tbody>
                  {review.fresh.slice(0, 5).map((prospect) => (
                    <tr key={prospect.email} className="border-b border-pine/10 last:border-0">
                      <td className="px-3 py-2 text-pine">{prospect.email}</td>
                      <td className="px-3 py-2 text-pine">{[prospect.first_name, prospect.last_name].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-3 py-2 text-pine">{prospect.company || "—"}</td>
                      <td className="max-w-[16rem] truncate px-3 py-2 text-pine-soft">
                        {Object.entries(prospect.fields).map(([key, value]) => `${key}: ${value}`).join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={runImport} busy={Boolean(progress)} disabled={review.fresh.length + review.updates.length === 0}>
              Import {(review.fresh.length + review.updates.length).toLocaleString("en-GB")}
            </Button>
            {progress && (
              <span role="status" className="font-body text-sm text-pine-soft">
                Saving {progress.done.toLocaleString("en-GB")} of {progress.total.toLocaleString("en-GB")}…
              </span>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
