import { SITE_URL } from "@/lib/site";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_LIMIT, composeTitle } from "@/lib/seo-core";
import { plainText, slugify, storyHeadings, wordCount } from "@/lib/stories";

// On-page SEO checks for the /admin editor: each check passes, warns or fails, and the score
// is the share of points earned (warn = half). The thresholds are rules of thumb, not rules —
// a check marked "warn" is something to look at, not something that blocks publishing.

export const PASS = "pass";
export const WARN = "warn";
export const FAIL = "fail";

function occurrences(text, phrase) {
  if (!phrase) return 0;
  const haystack = text.toLowerCase();
  const needle = phrase.toLowerCase();
  let count = 0;
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + needle.length)) count++;
  return count;
}

function markdownLinks(markdown) {
  const links = [];
  const images = [];
  for (const match of (markdown ?? "").matchAll(/(!?)\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g)) {
    (match[1] ? images : links).push({ text: match[2], href: match[3] });
  }
  return { links, images };
}

function isInternal(href) {
  return href.startsWith("/") ? !href.startsWith("//") : href.startsWith(SITE_URL);
}

function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => /[\p{L}\p{N}]/u.test(sentence));
}

export function lengthStatus(length, min, max) {
  if (!length) return FAIL;
  return length >= min && length <= max ? PASS : WARN;
}

function score(checks) {
  if (!checks.length) return 100;
  const points = checks.reduce((sum, check) => sum + (check.status === PASS ? 1 : check.status === WARN ? 0.5 : 0), 0);
  return Math.round((points / checks.length) * 100);
}

export function scoreTone(value) {
  return value >= 80 ? "good" : value >= 50 ? "ok" : "poor";
}

/** Checks for a story as currently edited (unsaved values included). */
export function analyzeStory(story) {
  const content = story.content ?? "";
  const text = plainText(content);
  const words = wordCount(content);
  const title = composeTitle(story.seo_title || story.title);
  const description = (story.seo_description || story.excerpt || "").trim();
  const keyword = (story.focus_keyword ?? "").trim().toLowerCase();
  const headings = storyHeadings(content);
  const subheadings = headings.filter((heading) => heading.level >= 2 && heading.level <= 3);
  const { links, images } = markdownLinks(content);
  const internalLinks = links.filter((link) => isInternal(link.href));
  const checks = [];
  const add = (id, status, label, hint) => checks.push({ id, status, label, hint });

  add(
    "title-length",
    title.length >= 30 && title.length <= TITLE_LIMIT ? PASS : WARN,
    `Search title is ${title.length} characters`,
    title.length > TITLE_LIMIT
      ? `Google cuts titles off around ${TITLE_LIMIT} characters — shorten the SEO title.`
      : title.length < 30
        ? "Short titles waste space in results — add what the reader gets (30–60 characters)."
        : "Fits in search results.",
  );

  const descriptionStatus = lengthStatus(description.length, DESCRIPTION_MIN, DESCRIPTION_MAX);
  add(
    "description-length",
    descriptionStatus,
    description ? `Meta description is ${description.length} characters` : "No meta description or excerpt",
    descriptionStatus === PASS
      ? "A good length for the snippet under your title."
      : `Write ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters that sell the click — otherwise Google improvises one.`,
  );

  if (!keyword) {
    add("keyword-set", WARN, "No focus keyword", "Pick the phrase a brand would search for, e.g. “low MOQ clothing manufacturer”.");
  } else {
    const slugWords = new Set((story.slug ?? "").split("-"));
    const keywordWords = slugify(keyword).split("-").filter((word) => word.length > 2);
    const intro = text.split(" ").slice(0, 120).join(" ");
    const density = words ? (occurrences(text, keyword) * keyword.split(/\s+/).length * 100) / words : 0;

    add(
      "keyword-title",
      title.toLowerCase().includes(keyword) ? PASS : FAIL,
      "Focus keyword in the search title",
      "The strongest single signal of what the page is about.",
    );
    add(
      "keyword-description",
      description.toLowerCase().includes(keyword) ? PASS : WARN,
      "Focus keyword in the meta description",
      "Google bolds matching words in the snippet.",
    );
    add(
      "keyword-slug",
      keywordWords.length && keywordWords.every((word) => slugWords.has(word)) ? PASS : WARN,
      "Focus keyword in the URL",
      "Short URLs that contain the keyword do best.",
    );
    add(
      "keyword-intro",
      intro.toLowerCase().includes(keyword) ? PASS : WARN,
      "Focus keyword in the opening paragraph",
      "Say what the story covers early, in the reader's words.",
    );
    add(
      "keyword-subheading",
      subheadings.some((heading) => heading.text.toLowerCase().includes(keyword)) ? PASS : WARN,
      "Focus keyword in a subheading",
      "Use it (or a close variant) in at least one ## heading.",
    );
    add(
      "keyword-density",
      density > 3 ? FAIL : density >= 0.5 && density <= 2.5 ? PASS : WARN,
      `Keyword density ${density.toFixed(1)}%`,
      density > 3
        ? "Reads as keyword stuffing — vary the wording."
        : density < 0.5
          ? "Mention the keyword a few more times, naturally."
          : "Natural.",
    );
  }

  add(
    "length",
    words >= 800 ? PASS : words >= 300 ? WARN : FAIL,
    `${words} words`,
    words >= 800 ? "Enough depth to compete for search." : "Guides that rank for manufacturing topics usually run 800–1,500 words.",
  );

  if (words > 300) {
    add(
      "subheadings",
      subheadings.length >= 2 ? PASS : FAIL,
      `${subheadings.length} subheading${subheadings.length === 1 ? "" : "s"}`,
      "Break the story up with ## headings — readers scan, and Google uses them to understand sections.",
    );
  }

  if (headings.some((heading) => heading.level === 1)) {
    add("single-h1", WARN, "Body contains a top-level (#) heading", "The title is already the page's H1 — use ## for sections.");
  }

  add(
    "internal-links",
    internalLinks.length >= 2 ? PASS : internalLinks.length === 1 ? WARN : FAIL,
    `${internalLinks.length} link${internalLinks.length === 1 ? "" : "s"} to other pages on the site`,
    "Link to related services and stories — it spreads ranking strength and keeps readers on the site.",
  );

  add(
    "conversion-link",
    internalLinks.some((link) => /^(https?:\/\/[^/]+)?\/(quote|atelier)\b/.test(link.href)) ? PASS : WARN,
    "Links to the quote form or Atelier",
    "Give interested readers a next step: [request a quote](/quote).",
  );

  if (!story.cover_image_url) {
    add("cover-image", WARN, "No cover image", "Stories with an image get more clicks on the Stories page and when shared.");
  } else {
    add(
      "cover-alt",
      story.cover_image_alt?.trim() ? PASS : WARN,
      "Cover image has alt text",
      "Describe the photo — it's read aloud by screen readers and indexed by image search.",
    );
  }

  const missingAlt = images.filter((image) => !image.text.trim()).length;
  if (images.length) {
    add(
      "image-alt",
      missingAlt ? WARN : PASS,
      missingAlt ? `${missingAlt} image${missingAlt === 1 ? "" : "s"} without alt text` : "All images have alt text",
      "Write ![what the photo shows](url).",
    );
  }

  const sentenceList = sentences(text);
  if (sentenceList.length >= 5) {
    const average = words / sentenceList.length;
    add(
      "readability",
      average <= 20 ? PASS : WARN,
      `Average sentence: ${Math.round(average)} words`,
      average <= 20 ? "Easy to read." : "Split long sentences — aim for 20 words or fewer on average.",
    );
  }

  add(
    "excerpt",
    story.excerpt?.trim() ? PASS : WARN,
    story.excerpt?.trim() ? "Has an excerpt" : "No excerpt",
    "Shown under the title on the Stories page.",
  );

  return {
    score: score(checks),
    checks,
    stats: {
      words,
      internalLinks: internalLinks.length,
      externalLinks: links.length - internalLinks.length,
      images: images.length,
    },
  };
}

/** Checks for a code-defined page's effective title/description. */
export function analyzePage({ title, description, noindex }) {
  const checks = [];
  checks.push({
    id: "title-length",
    status: title.length >= 30 && title.length <= TITLE_LIMIT ? PASS : WARN,
    label: `Title is ${title.length} characters`,
    hint: `Aim for 30–${TITLE_LIMIT}.`,
  });
  checks.push({
    id: "description-length",
    status: lengthStatus(description.length, DESCRIPTION_MIN, DESCRIPTION_MAX),
    label: `Description is ${description.length} characters`,
    hint: `Aim for ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}.`,
  });
  if (noindex) checks.push({ id: "noindex", status: WARN, label: "Hidden from search engines", hint: "This page won't appear in Google." });
  return { score: score(checks), checks };
}
