import "server-only";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getPageOverrides, getSeoSettings } from "@/lib/cms";
import { findSeoRoute } from "@/lib/seo-routes";
import { DEFAULT_OG_IMAGE, composeTitle, resolveSiteSettings } from "@/lib/seo-core";
import { storyPath } from "@/lib/stories";

const RSS_ALTERNATE = {
  "application/rss+xml": [{ url: "/stories/feed.xml", title: `${SITE_NAME} — Stories` }],
};

function ogImage(url, alt) {
  if (!url) return undefined;
  return url === DEFAULT_OG_IMAGE.url ? { ...DEFAULT_OG_IMAGE, alt } : { url, alt };
}

/**
 * Complete metadata for one page. Next replaces (rather than merges) nested objects like
 * `openGraph` between the layout and a page, so every page builds its full set here —
 * otherwise a page that sets only `openGraph.url` silently loses its og:image.
 */
export function buildMetadata({
  path,
  title,
  absoluteTitle = false,
  description,
  image,
  imageAlt,
  noindex = false,
  canonical,
  openGraph = {},
}) {
  const fullTitle = composeTitle(title, { absolute: absoluteTitle });
  const url = canonical || path;
  const socialImage = ogImage(image, imageAlt || fullTitle);

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url, types: RSS_ALTERNATE },
    openGraph: {
      type: "website",
      locale: "en_GB",
      siteName: SITE_NAME,
      url,
      title: fullTitle,
      description,
      images: socialImage ? [socialImage] : undefined,
      ...openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: socialImage ? [socialImage.url] : undefined,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Metadata for a code-defined page: defaults from lib/seo-routes.js, overrides from /admin. */
export async function pageMetadata(path) {
  const route = findSeoRoute(path);
  if (!route) throw new Error(`No SEO defaults for "${path}" — add it to lib/seo-routes.js`);

  const [overrides, settings] = await Promise.all([getPageOverrides(), getSeoSettings()]);
  const override = overrides[path] ?? {};
  const site = resolveSiteSettings(settings);

  return buildMetadata({
    path,
    title: override.title || route.title,
    absoluteTitle: path === "/",
    description: override.description || route.description,
    image: override.og_image_url || route.image || site.defaultOgImage,
    noindex: Boolean(override.noindex),
  });
}

export async function storyMetadata(story) {
  const site = resolveSiteSettings(await getSeoSettings());

  return buildMetadata({
    path: storyPath(story.slug),
    title: story.seo_title || story.title,
    description: story.seo_description || story.excerpt || site.defaultDescription,
    image: story.og_image_url || story.cover_image_url || site.defaultOgImage,
    imageAlt: story.cover_image_alt || undefined,
    noindex: story.noindex,
    canonical: story.canonical_url || undefined,
    openGraph: {
      type: "article",
      publishedTime: story.published_at,
      modifiedTime: story.updated_at || story.published_at,
      section: story.category || undefined,
      tags: story.tags?.length ? story.tags : undefined,
    },
  });
}

/** Site-wide defaults from the root layout, plus search-engine verification tags. */
export async function siteMetadata() {
  const site = resolveSiteSettings(await getSeoSettings());
  const defaultTitle = "Kazi Manufacturing | Custom Apparel Manufacturing in Nepal";
  const image = ogImage(site.defaultOgImage, SITE_NAME);

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: defaultTitle, template: `%s | ${SITE_NAME}` },
    description: site.defaultDescription,
    keywords: [
      "apparel manufacturing Nepal",
      "clothing manufacturer Kathmandu",
      "custom garment manufacturing",
      "private label clothing",
      "small batch clothing manufacturer",
      "UK clothing brand manufacturer",
    ],
    alternates: { types: RSS_ALTERNATE },
    openGraph: {
      type: "website",
      locale: "en_GB",
      siteName: SITE_NAME,
      title: defaultTitle,
      description: site.defaultDescription,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: site.defaultDescription,
      images: [image.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    verification: {
      google: site.googleVerification ?? undefined,
      other: site.bingVerification ? { "msvalidate.01": site.bingVerification } : undefined,
    },
  };
}
