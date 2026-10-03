"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Search } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { listStories } from "@/lib/admin-api";
import { analyzeStory, scoreTone } from "@/lib/seo-analysis";
import { formatStoryDate, storyPath, storyState } from "@/lib/stories";
import {
  Badge,
  EmptyState,
  Notice,
  PageHeader,
  STORY_STATE_BADGE,
  ScorePill,
  Spinner,
  buttonClass,
  inputClass,
  relativeTime,
} from "@/components/admin/ui";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "scheduled", label: "Scheduled" },
  { id: "draft", label: "Drafts" },
];

export function BlogList() {
  const { now } = useAdmin();
  const [stories, setStories] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    listStories().then(
      (rows) => active && setStories(rows),
      (loadError) => active && setError(loadError.message),
    );
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      now && stories
        ? stories.map((story) => ({ story, state: storyState(story, now), seo: analyzeStory(story) }))
        : null,
    [stories, now],
  );

  const counts = useMemo(() => {
    const result = { all: rows?.length ?? 0, published: 0, scheduled: 0, draft: 0 };
    for (const row of rows ?? []) result[row.state] += 1;
    return result;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (row) =>
        (filter === "all" || row.state === filter) &&
        (!needle || `${row.story.title} ${row.story.slug} ${row.story.category ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [rows, filter, query]);

  const newPost = (
    <Link href="/admin/blog/edit" className={buttonClass("primary")}>
      <Plus size={16} aria-hidden="true" /> New post
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Blog posts"
        description="Published posts appear on the Stories page (/stories/) and in the sitemap, RSS feed and llms.txt after the next publish."
        actions={newPost}
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!error && !rows && <Spinner label="Loading posts" />}

      {rows && rows.length === 0 && (
        <EmptyState
          title="No posts yet"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {newPost}
              <Link href="/admin#ideas" className={buttonClass("outline")}>
                Browse topic ideas
              </Link>
            </div>
          }
        >
          Regular, genuinely useful posts are the most reliable way to rank for what brands search before they pick a
          manufacturer.
        </EmptyState>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Filter posts" className="flex flex-wrap gap-1">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`rounded-sm px-3 py-1.5 font-body text-sm transition-colors ${
                    filter === item.id ? "bg-pine text-bone" : "text-pine-soft hover:bg-paper-raised hover:text-pine"
                  }`}
                >
                  {item.label} <span className="tabular-nums opacity-70">{counts[item.id]}</span>
                </button>
              ))}
            </div>
            <label className="relative sm:w-64">
              <span className="sr-only">Search posts</span>
              <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pine-soft" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles"
                className={`${inputClass} pl-8`}
              />
            </label>
          </div>

          <div className="relative overflow-x-auto rounded-sm border border-pine/15 bg-bone">
            <table className="w-full min-w-[720px] border-collapse text-left font-body text-sm">
              <thead>
                <tr className="border-b border-pine/10 text-xs uppercase tracking-[0.08em] text-pine-soft">
                  <th className="px-4 py-3 font-semibold">Post</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">SEO</th>
                  <th className="px-4 py-3 font-semibold">Words</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Live link</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ story, state, seo }) => {
                  const badge = STORY_STATE_BADGE[state];
                  return (
                    <tr key={story.id} className="border-b border-pine/10 last:border-0 hover:bg-paper/60">
                      <td className="max-w-[22rem] px-4 py-3">
                        <Link href={`/admin/blog/edit?id=${story.id}`} className="block font-semibold text-pine hover:text-moss-deep">
                          {story.title}
                        </Link>
                        <span className="block truncate text-xs text-pine-soft">/stories/{story.slug}/</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {state === "scheduled" && (
                          <span className="mt-1 block text-xs text-pine-soft">{formatStoryDate(story.published_at)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-pine-soft">{story.category || "—"}</td>
                      <td className="px-4 py-3">
                        <ScorePill score={seo.score} tone={scoreTone(seo.score)} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-pine-soft">{seo.stats.words.toLocaleString("en-GB")}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-pine-soft">{relativeTime(story.updated_at, now)}</td>
                      <td className="px-4 py-3 text-right">
                        {state === "published" && (
                          <a
                            href={storyPath(story.slug)}
                            target="_blank"
                            rel="noopener"
                            className={buttonClass("ghost", "sm")}
                            aria-label={`View “${story.title}” on the live site`}
                          >
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-pine-soft">
                      No posts match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
