"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { ImageField, SerpPreview } from "@/components/admin/editor-parts";
import { deletePageOverride, listPageOverrides, savePageOverride } from "@/lib/admin-api";
import { analyzePage, scoreTone } from "@/lib/seo-analysis";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_LIMIT, composeTitle } from "@/lib/seo-core";
import { ALL_SEO_ROUTES } from "@/lib/seo-routes";
import { Badge, Button, CharCount, Field, Notice, PageHeader, ScorePill, Spinner, inputClass } from "@/components/admin/ui";

const GROUPS = ["Main pages", "Legal", "Products"];

function effective(route, override = {}) {
  const title = composeTitle(override.title || route.title, { absolute: route.path === "/" });
  const description = override.description || route.description;
  return { title, description, ...analyzePage({ title, description, noindex: override.noindex }) };
}

function PageEditor({ route, override, onSaved, onCancel }) {
  const { notify, refreshPublishState } = useAdmin();
  const [form, setForm] = useState({
    title: override?.title ?? "",
    description: override?.description ?? "",
    og_image_url: override?.og_image_url ?? "",
    noindex: Boolean(override?.noindex),
  });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const preview = effective(route, form);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function run(action) {
    setBusy(action);
    setError(null);
    try {
      if (action === "reset") {
        await deletePageOverride(route.path);
        onSaved(route.path, null);
        notify(`${route.label} reset to its default SEO.`);
      } else {
        const saved = await savePageOverride(route.path, form);
        onSaved(route.path, saved);
        notify(`${route.label} saved — live after the next publish.`);
      }
      refreshPublishState();
    } catch (runError) {
      setError(runError.message);
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 border-t border-pine/10 bg-paper/70 px-4 py-5 lg:grid-cols-2">
      <div className="space-y-4">
        <Field
          id={`title-${route.path}`}
          label="Title"
          hint={route.path === "/" ? "Used exactly as written." : "“| Kazi Manufacturing” is added when it fits in 60 characters."}
          counter={<CharCount length={preview.title.length} min={30} max={TITLE_LIMIT} />}
        >
          <input id={`title-${route.path}`} value={form.title} onChange={(event) => set("title", event.target.value)} placeholder={route.title} className={inputClass} />
        </Field>
        <Field
          id={`description-${route.path}`}
          label="Meta description"
          counter={<CharCount length={preview.description.length} min={DESCRIPTION_MIN} max={DESCRIPTION_MAX} />}
        >
          <textarea
            id={`description-${route.path}`}
            rows={3}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder={route.description}
            className={inputClass}
          />
        </Field>
        <label className="flex items-start gap-2.5 font-body text-sm text-pine">
          <input type="checkbox" checked={form.noindex} onChange={(event) => set("noindex", event.target.checked)} className="mt-0.5 h-4 w-4 accent-moss" />
          <span>
            Hide from search engines
            <span className="block text-xs text-pine-soft">Adds noindex and removes the page from the sitemap.</span>
          </span>
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" busy={busy === "save"} disabled={Boolean(busy)} onClick={() => run("save")}>
            Save
          </Button>
          <Button variant="ghost" disabled={Boolean(busy)} onClick={onCancel}>
            Cancel
          </Button>
          {override && (
            <Button variant="danger" busy={busy === "reset"} disabled={Boolean(busy)} onClick={() => run("reset")} className="ml-auto">
              Reset to default
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <SerpPreview title={preview.title} description={preview.description} path={route.path} />
        <ImageField
          label="Social share image"
          value={form.og_image_url}
          onChange={(value) => set("og_image_url", value)}
          maxWidth={1200}
          hint={route.image ? "Defaults to the product photo." : "Defaults to the site-wide image in Settings. 1200×630 is ideal."}
        />
      </div>
    </div>
  );
}

export function PagesSeo() {
  const { isAdmin } = useAdmin();
  const [overrides, setOverrides] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let active = true;
    listPageOverrides().then(
      (rows) => active && setOverrides(rows),
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    if (!overrides) return null;
    const pages = ALL_SEO_ROUTES.map((route) => effective(route, overrides[route.path]));
    return {
      total: pages.length,
      custom: Object.keys(overrides).length,
      attention: pages.filter((page) => page.checks.some((check) => check.status !== "pass")).length,
    };
  }, [overrides]);

  function onSaved(path, row) {
    setOverrides((current) => {
      const next = { ...current };
      if (row) next[path] = row;
      else delete next[path];
      return next;
    });
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        title="Page SEO"
        description="Titles, descriptions and share images for the site's built-in pages. Anything you leave blank keeps the default written into the site."
      />
      {!isAdmin && (
        <Notice tone="info" className="mb-6">
          Only admins can change page SEO — you can review it here.
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {!error && !overrides && <Spinner label="Loading pages" />}

      {summary && (
        <p className="m-0 mb-6 font-body text-sm text-pine-soft">
          {summary.total} pages · {summary.custom} customised ·{" "}
          <span className={summary.attention ? "text-amber-800" : ""}>{summary.attention} with something to improve</span>
        </p>
      )}

      {overrides &&
        GROUPS.map((group) => (
          <section key={group} className="mb-8">
            <h2 className="m-0 mb-3 font-body text-xs font-semibold uppercase tracking-[0.12em] text-pine-soft">{group}</h2>
            <div className="overflow-hidden rounded-sm border border-pine/15 bg-bone">
              {ALL_SEO_ROUTES.filter((route) => route.group === group).map((route, index) => {
                const override = overrides[route.path];
                const page = effective(route, override);
                const open = editing === route.path;
                return (
                  <Fragment key={route.path}>
                    <div className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center ${index ? "border-t border-pine/10" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-body text-sm font-semibold text-pine">{route.label}</span>
                          <span className="font-mono text-xs text-pine-soft">{route.path === "/" ? "/" : `${route.path}/`}</span>
                          {override && <Badge tone="blue">Custom</Badge>}
                          {override?.noindex && <Badge tone="amber">Hidden from search</Badge>}
                        </div>
                        <p className="m-0 mt-1 truncate font-body text-xs text-pine">{page.title}</p>
                        <p className="m-0 truncate font-body text-xs text-pine-soft">{page.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <ScorePill score={page.score} tone={scoreTone(page.score)} />
                        {isAdmin && (
                          <Button size="sm" variant={open ? "ghost" : "outline"} onClick={() => setEditing(open ? null : route.path)} aria-expanded={open}>
                            {open ? "Close" : "Edit"}
                          </Button>
                        )}
                      </div>
                    </div>
                    {open && <PageEditor route={route} override={override} onSaved={onSaved} onCancel={() => setEditing(null)} />}
                  </Fragment>
                );
              })}
            </div>
          </section>
        ))}
    </>
  );
}
