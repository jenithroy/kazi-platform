"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, CircleCheck, Rocket, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { createDraft, getSettings, listPageOverrides, listRedirects, listStories } from "@/lib/admin-api";
import { CONTENT_IDEAS, ideaDraftContent } from "@/lib/content-ideas";
import { analyzePage, analyzeStory } from "@/lib/seo-analysis";
import { composeTitle, resolveSiteSettings } from "@/lib/seo-core";
import { ALL_SEO_ROUTES } from "@/lib/seo-routes";
import { SITE_URL } from "@/lib/site";
import { storyState } from "@/lib/stories";
import { Badge, Button, Card, Notice, PageHeader, Spinner, relativeTime } from "@/components/admin/ui";

const DAY = 24 * 60 * 60 * 1000;
const encodedSite = encodeURIComponent(`${SITE_URL}/`);

const TOOLS = [
  { label: "Google Search Console", href: "https://search.google.com/search-console", note: "Rankings, clicks and indexing problems" },
  { label: "Bing Webmaster Tools", href: "https://www.bing.com/webmasters", note: "Bing, DuckDuckGo and ChatGPT search" },
  { label: "PageSpeed Insights", href: `https://pagespeed.web.dev/analysis?url=${encodedSite}`, note: "Core Web Vitals for the homepage" },
  { label: "Rich Results Test", href: `https://search.google.com/test/rich-results?url=${encodedSite}`, note: "Checks the structured data" },
  { label: "Live sitemap", href: "/sitemap.xml", note: "What search engines are told to crawl" },
  { label: "Live robots.txt", href: "/robots.txt", note: "Crawler rules" },
];

function StatTile({ label, value, href }) {
  return (
    <Link href={href} className="group rounded-sm border border-pine/15 bg-bone px-5 py-4 transition-colors hover:border-pine/30">
      <span className="block font-body text-xs text-pine-soft">{label}</span>
      <span className="mt-1 block font-body text-3xl font-semibold text-pine">{value.toLocaleString("en-GB")}</span>
    </Link>
  );
}

function healthIssues({ stories, overrides, settings, now }) {
  const issues = [];
  const site = resolveSiteSettings(settings);
  const live = stories.filter((story) => storyState(story, now) === "published");

  if (!site.googleVerification)
    issues.push({ text: "Connect Google Search Console to see which searches find the site.", href: "/admin/settings", action: "Add the code" });
  if (!site.bingVerification)
    issues.push({ text: "Verify the site in Bing Webmaster Tools — it also feeds DuckDuckGo and ChatGPT search.", href: "/admin/settings", action: "Add the code" });
  if (!site.sameAs.length)
    issues.push({ text: "Add the company's social profiles so search engines link them to the site.", href: "/admin/settings", action: "Add profiles" });

  const lastPost = live[0] ? Math.max(...live.map((story) => new Date(story.published_at).getTime())) : null;
  if (!lastPost) issues.push({ text: "No posts are live yet — the Stories page is showing placeholders.", href: "/admin/blog/edit", action: "Write one" });
  else if (now - lastPost > 30 * DAY)
    issues.push({ text: `The last post went live ${relativeTime(new Date(lastPost).toISOString(), now)} — aim for two a month.`, href: "/admin/blog/edit", action: "Write one" });

  const weak = live.filter((story) => analyzeStory(story).score < 60);
  if (weak.length)
    issues.push({ text: `${weak.length} live post${weak.length === 1 ? " scores" : "s score"} under 60 for SEO.`, href: "/admin/blog", action: "Review" });

  const noKeyword = live.filter((story) => !story.focus_keyword?.trim());
  if (noKeyword.length)
    issues.push({ text: `${noKeyword.length} live post${noKeyword.length === 1 ? " has" : "s have"} no focus keyword.`, href: "/admin/blog", action: "Review" });

  const weakPages = ALL_SEO_ROUTES.filter((route) => {
    const override = overrides[route.path] ?? {};
    return analyzePage({
      title: composeTitle(override.title || route.title, { absolute: route.path === "/" }),
      description: override.description || route.description,
    }).checks.some((check) => check.status !== "pass");
  });
  if (weakPages.length)
    issues.push({
      text: `${weakPages.length} page${weakPages.length === 1 ? " has" : "s have"} a title or description outside the recommended length.`,
      href: "/admin/pages",
      action: "Fix",
    });

  return issues;
}

function PublishPanel() {
  const { publishState, publish, publishing, now } = useAdmin();
  if (!publishState) return <Spinner label="Checking the live site" />;
  if (publishState.error) return <Notice tone="error">{publishState.error}</Notice>;

  const { hasChanges, dueStories, lastPublish, deploys } = publishState;
  const pending = hasChanges || dueStories.length > 0;

  return (
    <Card
      title={pending ? "Changes waiting to go live" : "The live site is up to date"}
      description={
        lastPublish
          ? `Last published from here ${relativeTime(lastPublish.created_at, now)}.`
          : "Not yet published from the admin. Pushes to the main branch also rebuild the site."
      }
      actions={
        <Button variant={pending ? "accent" : "outline"} size="sm" busy={publishing} onClick={publish}>
          {!publishing && <Rocket size={14} aria-hidden="true" />} Publish site
        </Button>
      }
    >
      {pending ? (
        <ul className="m-0 list-none space-y-1.5 p-0 font-body text-sm text-pine">
          {hasChanges && <li>Edits made since the last publish.</li>}
          {dueStories.map((story) => (
            <li key={story.id}>“{story.title}” is due and isn&rsquo;t on the site yet.</li>
          ))}
          <li className="pt-1 text-xs text-pine-soft">Publishing rebuilds kazimanufacturing.com — it takes about 2–3 minutes.</li>
        </ul>
      ) : (
        <p className="m-0 font-body text-sm text-pine-soft">Nothing to publish.</p>
      )}
      {deploys.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-body text-xs font-semibold text-pine">Recent publishes</summary>
          <ul className="m-0 mt-2 list-none space-y-1 p-0">
            {deploys.map((deploy) => (
              <li key={deploy.created_at} className="flex items-center gap-2 font-body text-xs text-pine-soft">
                <Badge tone={deploy.ok ? "green" : "red"}>{deploy.ok ? "Started" : "Failed"}</Badge>
                {relativeTime(deploy.created_at, now)} — {deploy.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const { profile, now, notify } = useAdmin();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([listStories(), listRedirects(), listPageOverrides(), getSettings()]).then(
      ([stories, redirects, overrides, settings]) => active && setData({ stories, redirects, overrides, settings }),
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    if (!data || !now) return null;
    const states = data.stories.map((story) => storyState(story, now));
    return {
      live: states.filter((state) => state === "published").length,
      drafts: states.filter((state) => state === "draft").length,
      scheduled: states.filter((state) => state === "scheduled").length,
      redirects: data.redirects.length,
      issues: healthIssues({ ...data, now }),
    };
  }, [data, now]);

  async function startIdea(idea) {
    setStarting(idea.title);
    try {
      const story = await createDraft({
        title: idea.title,
        focusKeyword: idea.keyword,
        category: idea.category,
        content: ideaDraftContent(idea),
      });
      router.push(`/admin/blog/edit?id=${story.id}`);
    } catch (startError) {
      notify(startError.message, "error");
      setStarting(null);
    }
  }

  const firstName = profile.full_name?.split(" ")[0];
  const usedTitles = new Set((data?.stories ?? []).map((story) => story.title));

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : "Overview"}
        description="Write and publish posts, tune how each page appears in search, and keep old links working."
      />

      <div className="space-y-8">
        <PublishPanel />

        {error && <Notice tone="error">{error}</Notice>}
        {!error && !summary && <Spinner label="Loading the overview" />}

        {summary && (
          <>
            <section aria-label="Content at a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Live posts" value={summary.live} href="/admin/blog" />
              <StatTile label="Drafts" value={summary.drafts} href="/admin/blog" />
              <StatTile label="Scheduled" value={summary.scheduled} href="/admin/blog" />
              <StatTile label="Redirects" value={summary.redirects} href="/admin/redirects" />
            </section>

            <Card title="SEO health" description="The things most likely to move rankings, in order.">
              {summary.issues.length ? (
                <ul className="m-0 list-none divide-y divide-pine/10 p-0">
                  {summary.issues.map((issue) => (
                    <li key={issue.text} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex gap-2.5 font-body text-sm text-pine">
                        <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                        <span>
                          <span className="sr-only">Needs attention: </span>
                          {issue.text}
                        </span>
                      </span>
                      <Link href={issue.href} className="inline-flex shrink-0 items-center gap-1 pl-6 font-body text-xs font-semibold text-pine hover:text-moss-deep sm:pl-0">
                        {issue.action} <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 flex items-center gap-2 font-body text-sm text-pine">
                  <CircleCheck size={16} className="text-moss" aria-hidden="true" /> Nothing urgent — keep publishing.
                </p>
              )}
            </Card>
          </>
        )}

        <section id="ideas" aria-labelledby="ideas-heading" className="scroll-mt-24">
          <div className="mb-4">
            <h2 id="ideas-heading" className="m-0 font-display text-2xl text-pine">
              Post ideas
            </h2>
            <p className="m-0 mt-1 max-w-2xl font-body text-sm text-pine-soft">
              Topics UK founders search while choosing a manufacturer. Each starts a draft with a focus keyword and an outline —
              check the keyword&rsquo;s demand in Search Console or Keyword Planner first.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CONTENT_IDEAS.map((idea) => {
              const used = usedTitles.has(idea.title);
              return (
                <article key={idea.title} className="flex flex-col rounded-sm border border-pine/15 bg-bone p-4">
                  <span className="mb-2 font-body text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-moss-deep">{idea.category}</span>
                  <h3 className="m-0 font-body text-sm font-semibold leading-snug text-pine">{idea.title}</h3>
                  <p className="m-0 mt-2 flex-1 font-body text-xs leading-relaxed text-pine-soft">{idea.intent}</p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[0.7rem] text-pine-soft" title="Focus keyword">
                      {idea.keyword}
                    </span>
                    <Button
                      size="sm"
                      variant={used ? "ghost" : "outline"}
                      busy={starting === idea.title}
                      disabled={Boolean(starting) || used}
                      onClick={() => startIdea(idea)}
                    >
                      {used ? "Drafted" : "Start draft"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <Card title="Tools">
          <ul className="m-0 grid list-none gap-x-6 gap-y-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool) => (
              <li key={tool.label}>
                <a href={tool.href} target="_blank" rel="noopener" className="group inline-flex items-center gap-1 font-body text-sm font-semibold text-pine hover:text-moss-deep">
                  {tool.label} <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <span className="block font-body text-xs text-pine-soft">{tool.note}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
