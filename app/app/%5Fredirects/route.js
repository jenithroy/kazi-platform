import { getLiveStories, getRedirects } from "@/lib/cms";
import { storyPath } from "@/lib/stories";

// Emits Cloudflare Pages' _redirects file into the export root from the redirects managed
// in /admin. (The folder is "%5Fredirects" because Next treats folders starting with "_" as
// private and leaves them out of routing.)
export const dynamic = "force-static";

// Directory-style paths are served with a trailing slash, but people link both ways.
function variants(path) {
  if (path.endsWith("/")) return [path, path.slice(0, -1)];
  if (/\.[a-z0-9]+$/i.test(path)) return [path];
  return [path, `${path}/`];
}

export async function GET() {
  const [redirects, stories] = await Promise.all([getRedirects(), getLiveStories()]);
  // A redirect sitting on a live story's URL would hide the story; the database clears
  // these when a story goes live, this is the belt to that brace.
  const livePaths = new Set(stories.flatMap((story) => variants(storyPath(story.slug))));

  const seen = new Set();
  const lines = [];
  for (const redirect of redirects) {
    for (const from of variants(redirect.from_path)) {
      if (from === "/" || from === redirect.to_path || livePaths.has(from) || seen.has(from)) continue;
      seen.add(from);
      lines.push(`${from} ${redirect.to_path} ${redirect.status_code}`);
    }
  }

  const body = [
    "# Generated at build time from /admin → Redirects. Edits made here are overwritten.",
    ...lines,
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
