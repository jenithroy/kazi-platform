"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Rocket } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { FaqField, ImageField, MarkdownField, SerpPreview } from "@/components/admin/editor-parts";
import { deleteStory, getStory, saveStory } from "@/lib/admin-api";
import { analyzeStory, scoreTone } from "@/lib/seo-analysis";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_LIMIT, composeTitle } from "@/lib/seo-core";
import { SLUG_PATTERN, formatStoryDate, readingMinutes, slugify, storyPath, storyState } from "@/lib/stories";
import {
  Badge,
  Button,
  Card,
  CharCount,
  CheckList,
  Field,
  Notice,
  STORY_STATE_BADGE,
  ScorePill,
  Spinner,
  inputClass,
} from "@/components/admin/ui";

const CATEGORY_SUGGESTIONS = ["Guides", "Process", "Sourcing", "Materials", "Printing", "Pricing", "Design", "Case studies", "News"];

// <input type="datetime-local"> speaks local wall-clock time without a zone.
function toLocalInput(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : null;
}

function formFromStory(story) {
  return {
    title: story.title ?? "",
    slug: story.slug ?? "",
    excerpt: story.excerpt ?? "",
    content: story.content ?? "",
    cover_image_url: story.cover_image_url ?? "",
    cover_image_alt: story.cover_image_alt ?? "",
    category: story.category ?? "",
    tags: (story.tags ?? []).join(", "),
    author_name: story.author_name ?? "",
    status: story.status ?? "draft",
    published_at: toLocalInput(story.published_at),
    featured: Boolean(story.featured),
    seo_title: story.seo_title ?? "",
    seo_description: story.seo_description ?? "",
    focus_keyword: story.focus_keyword ?? "",
    canonical_url: story.canonical_url ?? "",
    og_image_url: story.og_image_url ?? "",
    noindex: Boolean(story.noindex),
    faqs: (story.faqs ?? []).map((faq) => ({ question: faq.question ?? "", answer: faq.answer ?? "" })),
  };
}

function payloadFromForm(form) {
  return {
    ...form,
    title: form.title.trim(),
    slug: form.slug.trim(),
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    published_at: fromLocalInput(form.published_at),
    faqs: form.faqs.filter((faq) => faq.question.trim() || faq.answer.trim()),
  };
}

function validate(form, publishing) {
  if (!form.title.trim()) return "Give the post a title.";
  if (!SLUG_PATTERN.test(form.slug)) return "The URL can only use lowercase letters, numbers and single hyphens.";
  if (form.canonical_url && !/^https?:\/\//.test(form.canonical_url)) return "The canonical URL must start with https://";
  if (publishing && !form.content.trim()) return "Write the post before publishing it.";
  return null;
}

export function StoryEditor() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { profile, now, notify, publishState, refreshPublishState, publish, publishing } = useAdmin();

  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(() => formFromStory({ author_name: profile.full_name }));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(payloadFromForm(formFromStory({ author_name: profile.full_name }))));
  const [slugTouched, setSlugTouched] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [formError, setFormError] = useState(null);
  const [savedAt, setSavedAt] = useState(0);
  const recordIdRef = useRef(null);
  const saveRef = useRef(null);

  // Load the post named in ?id=. A post created here already has its id in recordIdRef, so
  // the ?id= added after its first save doesn't reload (and reset) the form.
  useEffect(() => {
    if (!id || id === recordIdRef.current) return;
    let active = true;
    getStory(id).then(
      (story) => {
        if (!active) return;
        if (!story) {
          setLoadError("This post doesn't exist — it may have been deleted.");
          return;
        }
        recordIdRef.current = story.id;
        const loaded = formFromStory(story);
        setRecord(story);
        setForm(loaded);
        setSavedSnapshot(JSON.stringify(payloadFromForm(loaded)));
        setSlugTouched(true);
      },
      (error) => active && setLoadError(error.message),
    );
    return () => {
      active = false;
    };
  }, [id]);

  const loading = Boolean(id) && record?.id !== id && !loadError;
  const payload = useMemo(() => payloadFromForm(form), [form]);
  const dirty = JSON.stringify(payload) !== savedSnapshot;
  // The shell's clock ticks once a minute; a post published moments ago must not read as scheduled.
  const clock = Math.max(now, savedAt);
  const state = record && clock ? storyState(record, clock) : "draft";
  const isLive = state === "published";
  const deferredPayload = useDeferredValue(payload);
  const seo = useMemo(() => analyzeStory(deferredPayload), [deferredPayload]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Cmd/Ctrl+S saves without changing the post's status.
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function set(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      // The URL follows the title until someone edits it, or the post has been live.
      if (key === "title" && !slugTouched && !record?.published_at) next.slug = slugify(value);
      return next;
    });
  }

  async function save(action = "save") {
    const publishing = action === "publish";
    const error = validate(form, publishing || form.status === "published");
    setFormError(error);
    if (error) return;

    const values = { ...payload };
    if (publishing) {
      values.status = "published";
      values.published_at = values.published_at ?? new Date().toISOString();
    } else if (action === "unpublish") {
      values.status = "draft";
    }

    setSaving(action);
    try {
      const saved = await saveStory(record?.id ?? null, values);
      const savedTime = Date.now();
      const isNew = !record;
      recordIdRef.current = saved.id;
      setRecord(saved);
      setSlugTouched(true);
      setSavedAt(savedTime);
      setForm((current) => ({ ...current, status: saved.status, published_at: toLocalInput(saved.published_at) }));
      setSavedSnapshot(JSON.stringify(payloadFromForm(formFromStory(saved))));
      if (isNew) router.replace(`/admin/blog/edit?id=${saved.id}`);

      const savedState = storyState(saved, savedTime);
      notify(
        action === "unpublish"
          ? "Unpublished — it comes off the site at the next publish."
          : savedState === "scheduled"
            ? `Scheduled for ${formatStoryDate(saved.published_at)}. It goes live at the first site publish after that.`
            : savedState === "published"
              ? "Saved. Press “Publish site” to put it live."
              : "Draft saved.",
      );
      refreshPublishState();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setSaving(null);
    }
  }

  useEffect(() => {
    saveRef.current = () => save();
  });

  async function remove() {
    const message = isLive
      ? "Delete this post? Its URL will redirect to the Stories page after the next publish."
      : "Delete this post? This can't be undone.";
    if (!window.confirm(message)) return;
    try {
      await deleteStory(record.id);
      notify("Post deleted.");
      refreshPublishState();
      router.push("/admin/blog");
    } catch (deleteError) {
      setFormError(deleteError.message);
    }
  }

  if (loadError) {
    return (
      <div className="max-w-xl">
        <Notice tone="error">{loadError}</Notice>
        <Link href="/admin/blog" className="mt-4 inline-flex items-center gap-2 font-body text-sm text-pine-soft hover:text-pine">
          <ArrowLeft size={14} aria-hidden="true" /> All posts
        </Link>
      </div>
    );
  }
  if (loading) return <Spinner label="Loading post" />;

  const badge = STORY_STATE_BADGE[record ? state : "draft"];
  const searchTitle = composeTitle(form.seo_title || form.title || "Untitled post");
  const searchDescription = form.seo_description || form.excerpt;
  const sitePending = publishState && !publishState.error && publishState.hasChanges;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/blog" className="inline-flex items-center gap-2 font-body text-sm text-pine-soft hover:text-pine">
          <ArrowLeft size={14} aria-hidden="true" /> All posts
        </Link>
        <div className="flex items-center gap-3 font-body text-xs text-pine-soft">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <span>
            {seo.stats.words.toLocaleString("en-GB")} words · {readingMinutes(form.content)} min read
          </span>
          {dirty && <span className="font-semibold text-amber-800">Unsaved changes</span>}
        </div>
      </div>

      {formError && (
        <Notice tone="error" className="mb-6">
          {formError}
        </Notice>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <div>
            <label htmlFor="story-title" className="sr-only">
              Title
            </label>
            <textarea
              id="story-title"
              rows={2}
              value={form.title}
              onChange={(event) => set("title", event.target.value.replace(/\n/g, " "))}
              placeholder="Post title"
              className="block w-full resize-none border-0 bg-transparent p-0 font-display text-3xl leading-tight text-pine placeholder:text-pine-soft/40 focus:outline-none md:text-4xl"
            />
            <div className="mt-3 flex flex-wrap items-center gap-1 font-body text-xs text-pine-soft">
              <label htmlFor="story-slug">kazimanufacturing.com/stories/</label>
              <input
                id="story-slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
                onBlur={() => set("slug", slugify(form.slug))}
                className="min-w-[12rem] flex-1 rounded-sm border border-pine/20 bg-paper px-2 py-1 font-mono text-xs text-pine focus:border-pine focus:outline-none"
              />
              <span>/</span>
            </div>
            {record?.slug && form.slug !== record.slug && isLive && (
              <p className="m-0 mt-2 font-body text-xs text-amber-800">
                The old URL will 301-redirect here automatically, so existing links and rankings carry over.
              </p>
            )}
          </div>

          <Field
            id="story-excerpt"
            label="Excerpt"
            hint="One or two sentences under the title on the Stories page. Also used as the meta description if you don't write one."
            counter={<span className="font-body text-[0.7rem] tabular-nums text-pine-soft">{form.excerpt.length}</span>}
          >
            <textarea id="story-excerpt" rows={2} value={form.excerpt} onChange={(event) => set("excerpt", event.target.value)} className={inputClass} />
          </Field>

          <div>
            <p className="m-0 mb-1.5 font-body text-xs font-semibold tracking-wide text-pine">
              <label htmlFor="story-content">Post</label>{" "}
              <span className="font-normal text-pine-soft">— Markdown: ## for sections, [text](/link) for links</span>
            </p>
            <MarkdownField id="story-content" value={form.content} onChange={(value) => set("content", value)} />
          </div>

          <Card
            title="FAQs"
            description="Questions brands ask about this topic, answered directly. Shown at the end of the post and marked up for search engines and AI assistants."
          >
            <FaqField value={form.faqs} onChange={(value) => set("faqs", value)} />
          </Card>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Post settings">
          <Card title="Publishing">
            <div className="space-y-4">
              <Field
                id="story-date"
                label="Publish date"
                hint={record ? "Set a future date to schedule the post." : "Leave empty to use the moment you publish. A future date schedules it."}
              >
                <input id="story-date" type="datetime-local" value={form.published_at} onChange={(event) => set("published_at", event.target.value)} className={inputClass} />
              </Field>

              <div className="flex flex-wrap gap-2">
                {form.status === "published" ? (
                  <>
                    <Button variant="primary" busy={saving === "save"} disabled={Boolean(saving)} onClick={() => save()}>
                      Save changes
                    </Button>
                    <Button variant="outline" busy={saving === "unpublish"} disabled={Boolean(saving)} onClick={() => save("unpublish")}>
                      Unpublish
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="primary" busy={saving === "publish"} disabled={Boolean(saving)} onClick={() => save("publish")}>
                      {form.published_at && new Date(form.published_at).getTime() > clock ? "Schedule" : "Publish post"}
                    </Button>
                    <Button variant="outline" busy={saving === "save"} disabled={Boolean(saving)} onClick={() => save()}>
                      Save draft
                    </Button>
                  </>
                )}
              </div>

              {isLive && (
                <a href={storyPath(record.slug)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-body text-xs text-pine underline-offset-2 hover:underline">
                  View on the live site <ArrowUpRight size={12} aria-hidden="true" />
                </a>
              )}

              {sitePending && (
                <Notice tone="warn">
                  <p>The live site doesn&rsquo;t have your latest changes yet.</p>
                  <Button variant="accent" size="sm" className="mt-2" busy={publishing} onClick={publish}>
                    {!publishing && <Rocket size={14} aria-hidden="true" />} Publish site now
                  </Button>
                </Notice>
              )}

              {record && (
                <button type="button" onClick={remove} className="font-body text-xs text-red-700 underline-offset-2 hover:underline">
                  Delete post
                </button>
              )}
            </div>
          </Card>

          <Card title="Search" actions={<ScorePill score={seo.score} tone={scoreTone(seo.score)} />}>
            <div className="space-y-4">
              <SerpPreview title={searchTitle} description={searchDescription} path={storyPath(form.slug || "your-post")} />
              <Field
                id="story-keyword"
                label="Focus keyword"
                hint="The phrase you want this post to rank for."
              >
                <input id="story-keyword" value={form.focus_keyword} onChange={(event) => set("focus_keyword", event.target.value)} placeholder="e.g. low MOQ clothing manufacturer" className={inputClass} />
              </Field>
              <Field
                id="story-seo-title"
                label="SEO title"
                hint={form.seo_title ? `Shows as “${searchTitle}”` : "Defaults to the post title."}
                counter={<CharCount length={searchTitle.length} min={30} max={TITLE_LIMIT} />}
              >
                <input id="story-seo-title" value={form.seo_title} onChange={(event) => set("seo_title", event.target.value)} placeholder={form.title} className={inputClass} />
              </Field>
              <Field
                id="story-seo-description"
                label="Meta description"
                hint="Defaults to the excerpt."
                counter={<CharCount length={searchDescription.length} min={DESCRIPTION_MIN} max={DESCRIPTION_MAX} />}
              >
                <textarea id="story-seo-description" rows={3} value={form.seo_description} onChange={(event) => set("seo_description", event.target.value)} placeholder={form.excerpt} className={inputClass} />
              </Field>
              <details className="group">
                <summary className="cursor-pointer font-body text-xs font-semibold text-pine">
                  {seo.checks.filter((check) => check.status !== "pass").length} things to improve · {seo.checks.filter((check) => check.status === "pass").length} done
                </summary>
                <div className="mt-3">
                  <CheckList checks={[...seo.checks].sort((a, b) => ["fail", "warn", "pass"].indexOf(a.status) - ["fail", "warn", "pass"].indexOf(b.status))} />
                </div>
              </details>
            </div>
          </Card>

          <Card title="Cover image">
            <div className="space-y-4">
              <ImageField
                label="Image"
                value={form.cover_image_url}
                onChange={(value) => set("cover_image_url", value)}
                hint="Landscape works best. Resized and converted to WebP on upload."
              />
              <Field id="story-cover-alt" label="Alt text" hint="What the photo shows, for screen readers and image search.">
                <input id="story-cover-alt" value={form.cover_image_alt} onChange={(event) => set("cover_image_alt", event.target.value)} className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card title="Details">
            <div className="space-y-4">
              <Field id="story-category" label="Category">
                <input id="story-category" list="story-categories" value={form.category} onChange={(event) => set("category", event.target.value)} className={inputClass} />
                <datalist id="story-categories">
                  {CATEGORY_SUGGESTIONS.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </Field>
              <Field id="story-tags" label="Tags" hint="Comma-separated.">
                <input id="story-tags" value={form.tags} onChange={(event) => set("tags", event.target.value)} className={inputClass} />
              </Field>
              <Field id="story-author" label="Author" hint="A named author helps readers (and Google) trust the advice.">
                <input id="story-author" value={form.author_name} onChange={(event) => set("author_name", event.target.value)} className={inputClass} />
              </Field>
              <label className="flex items-start gap-2.5 font-body text-sm text-pine">
                <input type="checkbox" checked={form.featured} onChange={(event) => set("featured", event.target.checked)} className="mt-0.5 h-4 w-4 accent-moss" />
                Feature at the top of the Stories page
              </label>
            </div>
          </Card>

          <Card title="Advanced">
            <div className="space-y-4">
              <ImageField
                label="Social share image"
                value={form.og_image_url}
                onChange={(value) => set("og_image_url", value)}
                maxWidth={1200}
                hint="Shown when the post is shared on LinkedIn, WhatsApp and others. Defaults to the cover image. 1200×630 is ideal."
              />
              <Field id="story-canonical" label="Canonical URL" hint="Only if this post was first published on another site.">
                <input id="story-canonical" type="url" value={form.canonical_url} onChange={(event) => set("canonical_url", event.target.value)} placeholder="https://" className={inputClass} />
              </Field>
              <label className="flex items-start gap-2.5 font-body text-sm text-pine">
                <input type="checkbox" checked={form.noindex} onChange={(event) => set("noindex", event.target.checked)} className="mt-0.5 h-4 w-4 accent-moss" />
                <span>
                  Hide from search engines
                  <span className="block text-xs text-pine-soft">Adds noindex and leaves it out of the sitemap.</span>
                </span>
              </label>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
