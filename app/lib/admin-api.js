import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/stories";

// Browser-side reads and writes for /admin, made as the signed-in user — row level security
// (supabase/migrations/007_seo_cms.sql) decides what each role may touch.

const STORY_COLUMNS =
  "id, slug, title, excerpt, content, cover_image_url, cover_image_alt, category, tags, author_name, status, published_at, featured, seo_title, seo_description, focus_keyword, canonical_url, og_image_url, noindex, faqs, created_at, updated_at";

function fail(error, fallback) {
  if (!error) return;
  if (error.code === "23505") throw new Error("Another story already uses that URL — change the slug.");
  if (error.code === "42501") throw new Error("Your account doesn't have permission to do that.");
  throw new Error(error.message || fallback);
}

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .single();
  fail(error, "Couldn't load your profile");
  return data;
}

// --- stories -------------------------------------------------------------------------------

export async function listStories() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(STORY_COLUMNS)
    .order("updated_at", { ascending: false });
  fail(error, "Couldn't load stories");
  return data;
}

export async function getStory(id) {
  const { data, error } = await supabase.from("blog_posts").select(STORY_COLUMNS).eq("id", id).maybeSingle();
  fail(error, "Couldn't load the story");
  return data;
}

const EDITABLE = [
  "slug",
  "title",
  "excerpt",
  "content",
  "cover_image_url",
  "cover_image_alt",
  "category",
  "tags",
  "author_name",
  "status",
  "published_at",
  "featured",
  "seo_title",
  "seo_description",
  "focus_keyword",
  "canonical_url",
  "og_image_url",
  "noindex",
  "faqs",
];

const blankToNull = (value) => (typeof value === "string" && !value.trim() ? null : value);

/** Insert (no id) or update a story; returns the saved row. */
export async function saveStory(id, values) {
  const row = {};
  for (const key of EDITABLE) if (key in values) row[key] = blankToNull(values[key]);
  row.title = (values.title ?? "").trim();
  row.content = values.content ?? "";
  row.tags = values.tags ?? [];
  row.faqs = values.faqs ?? [];

  const query = id
    ? supabase.from("blog_posts").update(row).eq("id", id)
    : supabase.from("blog_posts").insert(row);
  const { data, error } = await query.select(STORY_COLUMNS).single();
  fail(error, "Couldn't save the story");
  return data;
}

export async function deleteStory(id) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  fail(error, "Couldn't delete the story");
}

/** A new draft from a title (and optional starter content); slug made unique with a suffix if taken. */
export async function createDraft({ title, focusKeyword = null, category = null, content = "" }) {
  const base = slugify(title) || "untitled-story";
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt ? `${base}-${attempt + 1}` : base;
    try {
      return await saveStory(null, { title, slug, focus_keyword: focusKeyword, category, content, status: "draft" });
    } catch (error) {
      if (!/already uses that URL/.test(error.message)) throw error;
    }
  }
  throw new Error("Couldn't find a free URL for this story — rename it and try again.");
}

// --- page SEO overrides --------------------------------------------------------------------

export async function listPageOverrides() {
  const { data, error } = await supabase.from("seo_pages").select("*");
  fail(error, "Couldn't load page settings");
  return Object.fromEntries(data.map((row) => [row.path, row]));
}

export async function savePageOverride(path, values) {
  const row = {
    path,
    title: blankToNull(values.title),
    description: blankToNull(values.description),
    og_image_url: blankToNull(values.og_image_url),
    noindex: Boolean(values.noindex),
  };
  const { data, error } = await supabase.from("seo_pages").upsert(row).select("*").single();
  fail(error, "Couldn't save the page settings");
  return data;
}

export async function deletePageOverride(path) {
  const { error } = await supabase.from("seo_pages").delete().eq("path", path);
  fail(error, "Couldn't reset the page");
}

// --- redirects -----------------------------------------------------------------------------

export async function listRedirects() {
  const { data, error } = await supabase.from("redirects").select("*").order("created_at", { ascending: false });
  fail(error, "Couldn't load redirects");
  return data;
}

export async function addRedirect(values) {
  const { data, error } = await supabase
    .from("redirects")
    .insert({
      from_path: values.from_path,
      to_path: values.to_path,
      status_code: values.status_code,
      note: blankToNull(values.note),
    })
    .select("*")
    .single();
  if (error?.code === "23505") throw new Error("There's already a redirect from that path.");
  fail(error, "Couldn't add the redirect");
  return data;
}

export async function deleteRedirect(id) {
  const { error } = await supabase.from("redirects").delete().eq("id", id);
  fail(error, "Couldn't delete the redirect");
}

// --- site settings -------------------------------------------------------------------------

export async function getSettings() {
  const { data, error } = await supabase.from("seo_settings").select("*").maybeSingle();
  fail(error, "Couldn't load settings");
  return data ?? {};
}

export async function saveSettings(values) {
  const row = {};
  for (const [key, value] of Object.entries(values)) row[key] = Array.isArray(value) ? value : blankToNull(value);
  const { data, error } = await supabase.from("seo_settings").update(row).eq("id", true).select("*").single();
  fail(error, "Couldn't save settings");
  return data;
}

// --- publishing ----------------------------------------------------------------------------

/** What the live build is missing: edits since the last publish, and scheduled stories now due. */
export async function getPublishState() {
  const [status, deploys, scheduled] = await Promise.all([
    supabase.from("site_status").select("content_updated_at").maybeSingle(),
    supabase.from("site_deploys").select("created_at, ok, message").order("created_at", { ascending: false }).limit(8),
    supabase
      .from("blog_posts")
      .select("id, title, published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(20),
  ]);
  fail(status.error || deploys.error || scheduled.error, "Couldn't load publish status");

  const lastPublish = deploys.data.find((deploy) => deploy.ok) ?? null;
  const contentUpdatedAt = status.data?.content_updated_at ?? null;
  const since = lastPublish ? new Date(lastPublish.created_at).getTime() : 0;

  return {
    deploys: deploys.data,
    lastPublish,
    contentUpdatedAt,
    hasChanges: Boolean(contentUpdatedAt) && new Date(contentUpdatedAt).getTime() > since,
    // Scheduled stories whose time came after the last publish (or ever, if never published).
    dueStories: scheduled.data.filter((story) => new Date(story.published_at).getTime() > since),
  };
}

export async function requestPublish() {
  const { data, error } = await supabase.functions.invoke("request-deploy", { method: "POST" });
  if (error) {
    let message = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // not a JSON error body — keep the generic message
    }
    throw new Error(message);
  }
  return data;
}
