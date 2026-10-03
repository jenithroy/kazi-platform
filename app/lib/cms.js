import "server-only";
import { createClient } from "@supabase/supabase-js";

// Build-time reads of the content managed in /admin (stories, page SEO overrides, site SEO
// settings, redirects). The site is a static export, so these run during `next build` with
// the public anon key — row level security only lets that key see live content.
//
// Failure policy, so a hiccup can't quietly ship a site with its stories missing:
//   * Supabase isn't configured (no env vars) or migration 007 hasn't been applied yet:
//     return empty content and let every page fall back to the defaults written in code.
//   * Anything else (network, permissions, server errors): retry, then fail the build.
//     Cloudflare Pages keeps the previous deployment live when a build fails.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const REQUEST_TIMEOUT_MS = 20_000;

const client =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init = {}) => {
            const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
            const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
            return fetch(input, { ...init, signal });
          },
        },
      })
    : null;

// PostgREST's codes for "that table doesn't exist (yet)".
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

const warned = new Set();
function warnOnce(message) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[cms] ${message}`);
}

// Several build workers render pages in parallel, each in its own process; memoising per
// process keeps it to one request per table per worker. In dev, entries expire quickly so
// edits made in /admin show up on refresh.
const CACHE_TTL_MS = process.env.NODE_ENV === "production" ? Infinity : 5_000;
const cache = new Map();

function memo(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;
  const promise = load();
  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key));
  return promise;
}

async function query(table, build, fallback) {
  if (!client) {
    warnOnce("Supabase isn't configured — building with the default SEO and no stories.");
    return fallback;
  }

  for (let attempt = 1; ; attempt++) {
    const { data, error } = await build(client.from(table));
    if (!error) return data ?? fallback;

    if (MISSING_TABLE_CODES.has(error.code)) {
      warnOnce(`"${table}" doesn't exist yet — apply supabase/migrations/007_seo_cms.sql to enable /admin content.`);
      return fallback;
    }
    if (attempt >= 3) {
      throw new Error(
        `Couldn't load "${table}" from Supabase (${error.code || "network"}: ${error.message}). ` +
          "Stopping the build so the live site keeps its current content — if the Supabase " +
          "project is paused, restore it from the Supabase dashboard and retry the deploy.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
}

const STORY_FIELDS = [
  "id",
  "slug",
  "title",
  "excerpt",
  "content",
  "cover_image_url",
  "cover_image_alt",
  "category",
  "tags",
  "author_name",
  "published_at",
  "updated_at",
  "featured",
  "seo_title",
  "seo_description",
  "canonical_url",
  "og_image_url",
  "noindex",
  "faqs",
].join(", ");

/** Live stories, newest first. Scheduled stories appear once their time has passed and the site rebuilds. */
export function getLiveStories() {
  return memo("stories", () =>
    query(
      "blog_posts",
      (q) =>
        q
          .select(STORY_FIELDS)
          .eq("status", "published")
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false }),
      [],
    ),
  );
}

export async function getLiveStory(slug) {
  const stories = await getLiveStories();
  return stories.find((story) => story.slug === slug) ?? null;
}

/** Per-page overrides keyed by path ("/heritage"). */
export function getPageOverrides() {
  return memo("seo_pages", async () => {
    const rows = await query(
      "seo_pages",
      (q) => q.select("path, title, description, og_image_url, noindex, updated_at"),
      [],
    );
    return Object.fromEntries(rows.map((row) => [row.path, row]));
  });
}

/** The single settings row, or {} — every field is optional and falls back to code defaults. */
export function getSeoSettings() {
  return memo("seo_settings", async () => {
    const rows = await query("seo_settings", (q) => q.select("*").limit(1), []);
    return rows[0] ?? {};
  });
}

export function getRedirects() {
  return memo("redirects", () =>
    query(
      "redirects",
      (q) => q.select("from_path, to_path, status_code").order("from_path"),
      [],
    ),
  );
}
