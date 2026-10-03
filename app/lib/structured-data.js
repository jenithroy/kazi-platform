import { SITE_NAME, SITE_URL } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo-core";
import { storyFaqs, storyPath, wordCount } from "@/lib/stories";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * JSON for a <script type="application/ld+json">. JSON.stringify leaves "</script>" intact,
 * so "<" is escaped — titles and copy written in /admin can't close the tag early.
 */
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Organization + WebSite, on every page. `site` is resolveSiteSettings() output. */
export function siteJsonLd(site) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: site.orgName,
        url: `${SITE_URL}/`,
        description: site.defaultDescription,
        logo: absoluteUrl(site.logoUrl),
        image: absoluteUrl(site.defaultOgImage),
        email: site.email,
        telephone: site.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: site.streetAddress,
          addressLocality: site.locality,
          addressRegion: site.region,
          postalCode: site.postalCode,
          addressCountry: site.country,
        },
        areaServed: "GB",
        sameAs: site.sameAs.length ? site.sameAs : undefined,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: "en-GB",
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function storyJsonLd(story, site) {
  const url = absoluteUrl(storyPath(story.slug));
  const image = absoluteUrl(story.og_image_url || story.cover_image_url || site.defaultOgImage);
  const publisher = {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: site.orgName,
    logo: { "@type": "ImageObject", url: absoluteUrl(site.logoUrl) },
  };

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: story.title.slice(0, 110),
    description: story.seo_description || story.excerpt || undefined,
    image: image ? [image] : undefined,
    datePublished: story.published_at,
    dateModified: story.updated_at || story.published_at,
    author: story.author_name ? { "@type": "Person", name: story.author_name } : publisher,
    publisher,
    articleSection: story.category || undefined,
    keywords: story.tags?.length ? story.tags.join(", ") : undefined,
    wordCount: wordCount(story.content),
    inLanguage: "en-GB",
  };
}

export function faqJsonLd(story) {
  const faqs = storyFaqs(story);
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question.trim(),
      acceptedAnswer: { "@type": "Answer", text: faq.answer.trim() },
    })),
  };
}
