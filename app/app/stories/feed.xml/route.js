import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getLiveStories } from "@/lib/cms";
import { storyPath } from "@/lib/stories";

export const dynamic = "force-static";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const stories = (await getLiveStories()).filter((story) => !story.noindex).slice(0, 30);
  // The newest story's date rather than the build time, so the feed only changes when a
  // story does.
  const lastBuildDate = stories[0] ? new Date(stories[0].updated_at || stories[0].published_at) : null;

  const items = stories
    .map((story) => {
      const url = `${SITE_URL}${storyPath(story.slug)}`;
      return `
    <item>
      <title>${escapeXml(story.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(story.published_at).toUTCString()}</pubDate>${
        story.category ? `\n      <category>${escapeXml(story.category)}</category>` : ""
      }
      <description>${escapeXml(story.seo_description || story.excerpt || "")}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${SITE_NAME} — Stories`)}</title>
    <link>${SITE_URL}/stories/</link>
    <atom:link href="${SITE_URL}/stories/feed.xml" rel="self" type="application/rss+xml" />
    <description>Notes from the Kazi production floor and the brands we manufacture for.</description>
    <language>en-gb</language>${lastBuildDate ? `\n    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>` : ""}${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
