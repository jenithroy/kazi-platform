import { getLiveStories } from "@/lib/cms";
import { SITE_URL } from "@/lib/site";
import { storyPath } from "@/lib/stories";

// llms.txt (https://llmstxt.org) — a plain-text map of the site for AI search and assistants.
// Generated at build time so live stories are listed as soon as they're published.
export const dynamic = "force-static";

const BEFORE_STORIES = `# Kazi Manufacturing

> Low-MOQ custom apparel manufacturing for UK and global clothing brands, crafted in Kathmandu, Nepal. Small-batch cut-and-sew production from 100 units per style, in-house sampling and quality control, private-label branding, a free online embroidery digitizer, an in-house video editing studio, and worldwide delivery.

Kazi Manufacturing is a full-service garment manufacturer based in Kathmandu, Nepal, serving UK and international clothing brands and creators end to end: pattern and sample development, cutting and sewing, screen printing, DTG, DTF, embroidery, quality control, private-label neck tags and packaging, and global shipping. Minimum order quantity (MOQ) is 100 units per style, making custom manufacturing accessible to emerging labels and creator drops as well as established brands. Contact: hello@kazimanufacturing.com or +44 7442 435738.

## Core pages

- [Home](https://kazimanufacturing.com/): Overview of low-MOQ custom clothing manufacturing, white-label blanks, process and the brand.
- [Manufacturing Services](https://kazimanufacturing.com/heritage/): Full service catalogue — custom cut-and-sew manufacturing (MOQ 100), DTG, screen printing, embroidery, DTF and video editing.
- [Design Your Garment](https://kazimanufacturing.com/atelier/): Interactive 3D & 2D garment configurator to customise silhouettes, fabrics, colours and artwork placement before requesting a quote.
- [Pricing Calculator](https://kazimanufacturing.com/pricing/): Instant per-unit cost estimator by garment type, quantity tier (from 100 units) and print/embroidery add-ons.
- [Free Online Embroidery Digitizer](https://kazimanufacturing.com/digitizer/): Browser-based tool that converts a logo, PNG or lettering into machine embroidery stitch files (DST, PES, EXP, JEF, VP3, XXX) with a real-time stitch preview. Runs locally on the visitor's device.
- [Request a Quote](https://kazimanufacturing.com/quote/): Direct project brief and tech-pack upload form for an itemised manufacturing quote within 24 hours.
- [Kazi Merch for Creators](https://kazimanufacturing.com/merch/): Custom cut-and-sew merch drops for creators, influencers and talent managers — from 100 pieces per style, sampled before production, with custom woven labels and packaging.
- [Video Editing Studio](https://kazimanufacturing.com/video-editing/): In-house fashion and product video editing studio for campaign films, lookbook reels and social cut-downs.

## Browse

- [The Collection](https://kazimanufacturing.com/collections/): White-label blank garments across knitwear, outerwear, bottoms and canvas accessories (180 gsm organic tees, 380 gsm hoodies, 320 gsm sweatpants, utility vests, 12oz canvas totes, work aprons) ready for custom branding from 100 units.
- [Lookbook](https://kazimanufacturing.com/lookbook/): Fabric, fit and finish by category from the Kathmandu production floor.
- [Stories & Guides](https://kazimanufacturing.com/stories/): Practical guides on low-MOQ clothing manufacturing, tech packs, GSM fabric weights, sampling and sourcing.

`;

const AFTER_STORIES = `## Legal

- [Privacy Policy](https://kazimanufacturing.com/privacy-policy/)
- [Terms & Conditions](https://kazimanufacturing.com/terms/)
- [Cookie Policy](https://kazimanufacturing.com/cookies/)
- [Accessibility Statement](https://kazimanufacturing.com/accessibility/)

## Optional

- [Sitemap](https://kazimanufacturing.com/sitemap.xml): Full machine-readable list of indexable URLs.
- [Stories RSS Feed](https://kazimanufacturing.com/stories/feed.xml): RSS 2.0 feed of published manufacturing guides and stories.
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
