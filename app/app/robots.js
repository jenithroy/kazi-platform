import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// The "*" wildcard already allows every crawler, AI ones included — these are listed
// explicitly anyway so the allow is visible by name (not just implied by the wildcard) and
// stays in force if the wildcard rule is ever tightened later.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "CCBot",
  "Bytespider",
  "cohere-ai",
  "Diffbot",
  "meta-externalagent",
];

export default function robots() {
  return {
    rules: {
      userAgent: ["*", ...AI_CRAWLERS],
      allow: "/",
      disallow: ["/account/", "/atelier/quote"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
