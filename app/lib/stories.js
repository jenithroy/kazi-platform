// Pure helpers for stories (blog posts), shared by the public pages and the /admin editor.

export const STORIES_PATH = "/stories";

/** Story slugs are lowercase words joined by single hyphens (enforced by the database too). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function storyPath(slug) {
  return `${STORIES_PATH}/${slug}/`;
}

export function slugify(text, maxLength = 80) {
  return (text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

/** Markdown reduced to the words a reader actually sees. */
export function plainText(markdown) {
  return (markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[*_~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(markdown) {
  const text = plainText(markdown);
  return text ? text.split(" ").filter((word) => /[\p{L}\p{N}]/u.test(word)).length : 0;
}

export function readingMinutes(markdown) {
  return Math.max(1, Math.round(wordCount(markdown) / 220));
}

/** "draft" | "scheduled" | "published" */
export function storyState(story, now = Date.now()) {
  if (story.status !== "published" || !story.published_at) return "draft";
  return new Date(story.published_at).getTime() > now ? "scheduled" : "published";
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

export function formatStoryDate(iso) {
  return iso ? DATE_FORMAT.format(new Date(iso)) : "";
}

/** Heading text → the id used for in-page anchors, e.g. "Why MOQ matters?" → "why-moq-matters". */
export function headingId(text) {
  return slugify(text, 60) || "section";
}

/**
 * Hands out heading ids in document order, suffixing repeats ("faq", "faq-2"). The story
 * renderer and storyHeadings() both use it, so table-of-contents links always match.
 */
export function createHeadingIds() {
  const used = new Map();
  return (text) => {
    const base = headingId(text);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}

/** Headings in document order, for the table of contents and SEO checks. */
export function storyHeadings(markdown) {
  const nextId = createHeadingIds();
  const headings = [];
  let inFence = false;
  for (const line of (markdown ?? "").split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const text = plainText(match[2]);
      headings.push({ level: match[1].length, text, id: nextId(text) });
    }
  }
  return headings;
}

/** Valid FAQ entries only — half-filled rows in the editor are ignored everywhere else. */
export function storyFaqs(story) {
  return (Array.isArray(story?.faqs) ? story.faqs : []).filter(
    (faq) => faq?.question?.trim() && faq?.answer?.trim(),
  );
}
