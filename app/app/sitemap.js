import { SITE_URL } from "@/lib/site";
import { ALL_SEO_ROUTES } from "@/lib/seo-routes";
import { getLiveStories, getPageOverrides } from "@/lib/cms";
import { storyPath } from "@/lib/stories";

export const dynamic = "force-static";

// Entries carry the trailing slash every URL is actually served at (trailingSlash in
// next.config.mjs) — without it each entry was a redirect, which Search Console reports as
// "Page with redirect" instead of indexing it. lastModified is only given where it's real
// (stories, and pages edited in /admin): a build timestamp on every URL tells Google
// nothing, and it stops trusting lastmod for the whole site.
export default async function sitemap() {
  const [stories, overrides] = await Promise.all([getLiveStories(), getPageOverrides()]);

  const indexable = stories.filter(
    (story) => !story.noindex && (!story.canonical_url || story.canonical_url === `${SITE_URL}${storyPath(story.slug)}`),
  );
  // ISO timestamps sort as strings.
  const latest = (...dates) => dates.filter(Boolean).sort().at(-1);

  const pageEntries = ALL_SEO_ROUTES.filter((route) => !overrides[route.path]?.noindex).map((route) => {
    const lastModified =
      route.path === "/stories"
        ? latest(overrides[route.path]?.updated_at, ...indexable.map((story) => story.updated_at))
        : overrides[route.path]?.updated_at;
    return {
      url: route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path}/`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    };
  });

  const storyEntries = indexable.map((story) => ({
    url: `${SITE_URL}${storyPath(story.slug)}`,
    lastModified: story.updated_at || story.published_at,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...pageEntries, ...storyEntries];
}
