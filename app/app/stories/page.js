import { StoriesPage } from "@/components/StoriesPage";
import { pageMetadata } from "@/lib/seo";
import { getLiveStories } from "@/lib/cms";
import { formatStoryDate, readingMinutes, storyPath } from "@/lib/stories";

export function generateMetadata() {
  return pageMetadata("/stories");
}

export default async function StoriesRoute() {
  const stories = (await getLiveStories()).map((story) => ({
    slug: story.slug,
    href: storyPath(story.slug),
    title: story.title,
    excerpt: story.excerpt,
    category: story.category,
    featured: story.featured,
    coverUrl: story.cover_image_url,
    coverAlt: story.cover_image_alt ?? "",
    publishedAt: story.published_at,
    date: formatStoryDate(story.published_at),
    readTime: `${readingMinutes(story.content)} min read`,
  }));

  return <StoriesPage stories={stories} />;
}
