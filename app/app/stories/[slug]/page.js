import { notFound } from "next/navigation";
import { StoryArticle } from "@/components/blog/StoryArticle";
import { getLiveStories, getLiveStory, getSeoSettings } from "@/lib/cms";
import { storyMetadata } from "@/lib/seo";
import { resolveSiteSettings } from "@/lib/seo-core";

// Every story page is generated at build time; any other slug is a 404.
export const dynamicParams = false;

// `output: "export"` refuses to build a dynamic route whose generateStaticParams returns
// nothing, so until the first story is live this placeholder renders the 404 page instead.
const NO_STORIES_YET = "no-stories-yet";

export async function generateStaticParams() {
  const stories = await getLiveStories();
  return stories.length ? stories.map((story) => ({ slug: story.slug })) : [{ slug: NO_STORIES_YET }];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const story = await getLiveStory(slug);
  return story ? storyMetadata(story) : {};
}

// Same category first, then the most recent.
function relatedStories(story, stories, limit = 3) {
  const others = stories.filter((other) => other.slug !== story.slug);
  const sameCategory = story.category ? others.filter((other) => other.category === story.category) : [];
  return [...new Set([...sameCategory, ...others])].slice(0, limit);
}

export default async function StoryRoute({ params }) {
  const { slug } = await params;
  const story = await getLiveStory(slug);
  if (!story) notFound();

  const [stories, settings] = await Promise.all([getLiveStories(), getSeoSettings()]);

  return (
    <StoryArticle
      story={story}
      related={relatedStories(story, stories)}
      site={resolveSiteSettings(settings)}
    />
  );
}
