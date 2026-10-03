"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { addRedirect, deleteRedirect, listRedirects } from "@/lib/admin-api";
import { ALL_SEO_ROUTES } from "@/lib/seo-routes";
import { Badge, Button, Card, EmptyState, Field, Notice, PageHeader, Spinner, inputClass, relativeTime } from "@/components/admin/ui";

const PAGE_PATHS = new Set(ALL_SEO_ROUTES.map((route) => (route.path === "/" ? "/" : `${route.path}/`)));

/** Site paths are served with a trailing slash; files (feed.xml) and query strings are left alone. */
function normalizePath(path) {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || /[?#]/.test(trimmed) || /\.[a-z0-9]+$/i.test(trimmed) || trimmed.endsWith("/")) return trimmed;
  return `${trimmed}/`;
}

function validate({ from_path, to_path }) {
  if (!from_path.startsWith("/")) return "The old path must start with / — e.g. /old-page/";
  if (/\s/.test(from_path) || /\s/.test(to_path)) return "Paths can't contain spaces.";
  if (from_path === "/") return "The homepage can't be redirected.";
  if (PAGE_PATHS.has(from_path)) return "That's a live page on the site — a redirect would hide it.";
  if (!/^(\/|https?:\/\/)/.test(to_path)) return "The destination must be a path like /heritage/ or a full https:// URL.";
  if (from_path === to_path) return "The old path and the destination are the same.";
  return null;
}

const EMPTY = { from_path: "", to_path: "", status_code: 301, note: "" };

export function RedirectsManager() {
  const { isAdmin, now, notify, refreshPublishState } = useAdmin();
  const [redirects, setRedirects] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listRedirects().then(
      (rows) => active && setRedirects(rows),
      (error) => active && setLoadError(error.message),
    );
    return () => {
      active = false;
    };
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event) {
    event.preventDefault();
    const values = { ...form, from_path: normalizePath(form.from_path), to_path: normalizePath(form.to_path) };
    const error = validate(values);
    setFormError(error);
    if (error) return;
    setSaving(true);
    try {
      const row = await addRedirect(values);
      setRedirects((current) => [row, ...current]);
      setForm(EMPTY);
      notify("Redirect added — it takes effect at the next publish.");
      refreshPublishState();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(redirect) {
    if (!window.confirm(`Remove the redirect from ${redirect.from_path}?`)) return;
    try {
      await deleteRedirect(redirect.id);
      setRedirects((current) => current.filter((row) => row.id !== redirect.id));
      notify("Redirect removed.");
      refreshPublishState();
    } catch (deleteError) {
      notify(deleteError.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Redirects"
        description="Send an old or mistyped URL to the right page, so links and search rankings aren't lost. Renamed and deleted blog posts are redirected automatically."
      />

      {isAdmin ? (
        <Card title="Add a redirect" className="mb-8">
          <form onSubmit={onSubmit} noValidate className="grid gap-4 md:grid-cols-[1fr_1fr_10rem] md:items-end">
            <Field id="redirect-from" label="Old path">
              <input id="redirect-from" value={form.from_path} onChange={(event) => set("from_path", event.target.value)} placeholder="/old-page/" className={inputClass} />
            </Field>
            <Field id="redirect-to" label="Send visitors to">
              <input id="redirect-to" value={form.to_path} onChange={(event) => set("to_path", event.target.value)} placeholder="/heritage/ or https://…" className={inputClass} />
            </Field>
            <Field id="redirect-type" label="Type">
              <select id="redirect-type" value={form.status_code} onChange={(event) => set("status_code", Number(event.target.value))} className={inputClass}>
                <option value={301}>301 — permanent</option>
                <option value={302}>302 — temporary</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field id="redirect-note" label="Note (optional)">
                <input id="redirect-note" value={form.note} onChange={(event) => set("note", event.target.value)} placeholder="Why this redirect exists" className={inputClass} />
              </Field>
            </div>
            <Button type="submit" variant="primary" busy={saving}>
              Add redirect
            </Button>
          </form>
          {formError && (
            <Notice tone="error" className="mt-4">
              {formError}
            </Notice>
          )}
          <p className="m-0 mt-4 font-body text-xs text-pine-soft">
            Use 301 for pages that have moved for good — search engines transfer the old page&rsquo;s ranking to the new one.
          </p>
        </Card>
      ) : (
        <Notice tone="info" className="mb-6">
          Only admins can add or remove redirects.
        </Notice>
      )}

      {loadError && <Notice tone="error">{loadError}</Notice>}
      {!loadError && !redirects && <Spinner label="Loading redirects" />}
      {redirects && redirects.length === 0 && <EmptyState title="No redirects yet">Nothing is being redirected.</EmptyState>}

      {redirects && redirects.length > 0 && (
        <div className="relative overflow-x-auto rounded-sm border border-pine/15 bg-bone">
          <table className="w-full min-w-[640px] border-collapse text-left font-body text-sm">
            <thead>
              <tr className="border-b border-pine/10 text-xs uppercase tracking-[0.08em] text-pine-soft">
                <th className="px-4 py-3 font-semibold">From</th>
                <th className="px-4 py-3 font-semibold">To</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {redirects.map((redirect) => (
                <tr key={redirect.id} className="border-b border-pine/10 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-pine">{redirect.from_path}</td>
                  <td className="max-w-[18rem] truncate px-4 py-3 font-mono text-xs text-pine">{redirect.to_path}</td>
                  <td className="px-4 py-3">
                    <Badge tone={redirect.status_code === 301 ? "green" : "neutral"}>{redirect.status_code}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-pine-soft">{redirect.note || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-pine-soft">{relativeTime(redirect.created_at, now)}</td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => remove(redirect)} aria-label={`Remove the redirect from ${redirect.from_path}`}>
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
    </>
  );
}
