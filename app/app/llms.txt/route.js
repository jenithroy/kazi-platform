import { getLiveStories } from "@/lib/cms";
import { SITE_URL } from "@/lib/site";
import { storyPath } from "@/lib/stories";

// llms.txt (https://llmstxt.org) — a plain-text map of the site for AI search and assistants.
// Generated at build time so live stories are listed as soon as they're published.
export const dynamic = "force-static";

const BEFORE_STORIES = `# Kazi Manufacturing

> Custom apparel manufacturing for UK clothing brands, crafted in Kathmandu, Nepal. Small-batch production from 50 units, in-house sampling and quality control, an in-house video editing studio, and worldwide delivery.

Kazi Manufacturing is a garment manufacturer based in Kathmandu, Nepal, serving UK-based clothing brands end to end: pattern and sample development, cutting and sewing, quality control, private-label packaging, and shipping. Also runs an in-house editing studio producing product video, campaign films and social cut-downs for the brands it manufactures for. Minimum order quantity is 50 units per style. Contact: hello@kazimanufacturing.com or +44 7442 435738.

## Core pages

- [Home](https://kazimanufacturing.com/): Overview of services, process and the brand.
- [Manufacturing Services](https://kazimanufacturing.com/heritage): Full service catalogue — custom manufacturing, DTG, screen printing, embroidery, DTF and video editing.
- [Design Your Garment](https://kazimanufacturing.com/atelier): Interactive tool to design a custom garment — silhouette, colour and print placement — before requesting a quote.
- [Pricing](https://kazimanufacturing.com/pricing): Cost estimator by product, quantity and add-ons.
- [Request a Quote](https://kazimanufacturing.com/quote): Contact form for a firm, itemised manufacturing quote, replied to within 24 hours.
- [Video Editing](https://kazimanufacturing.com/video-editing): In-house editing studio for product video, campaign films and social cut-downs.

## Browse

- [The Collection](https://kazimanufacturing.com/collections): Illustrative ready-to-order styles across knitwear, outerwear, denim, accessories and footwear — a sample of what's possible, not a live-priced storefront; use the Quote page for actual pricing.
- [Lookbook](https://kazimanufacturing.com/lookbook): Fabric, fit and finish by category from the production floor.
- [Stories](https://kazimanufacturing.com/stories): Notes on process, sourcing and behind-the-scenes updates.

`;

const AFTER_STORIES = `## Legal

- [Privacy Policy](https://kazimanufacturing.com/privacy-policy)
- [Terms & Conditions](https://kazimanufacturing.com/terms)
- [Cookie Policy](https://kazimanufacturing.com/cookies)
- [Accessibility Statement](https://kazimanufacturing.com/accessibility)

## Optional

- [Sitemap](https://kazimanufacturing.com/sitemap.xml): Full machine-readable list of indexable URLs.
`;

export async function GET() {
  const stories = (await getLiveStories()).filter((story) => !story.noindex);
  const storyLines = stories.map((story) => {
    const summary = story.seo_description || story.excerpt;
    const line = `- [${story.title}](${SITE_URL}${storyPath(story.slug)})`;
    return summary ? `${line}: ${summary.replace(/\s+/g, " ").trim()}` : line;
  });
  const storiesSection = storyLines.length ? `## Stories\n\n${storyLines.join("\n")}\n\n` : "";

  return new Response(BEFORE_STORIES + storiesSection + AFTER_STORIES, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
