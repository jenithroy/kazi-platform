"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const outlineButtonSmall =
  "inline-flex items-center gap-2 justify-center h-9 px-4 rounded-sm border border-moss text-pine font-body text-xs font-semibold tracking-wide hover:bg-moss-deep hover:text-bone transition-colors duration-150";

// Editorial placeholders, shown only until the first story is published from /admin. They're
// stand-ins written fresh for this project, not real posts, so they don't link anywhere.
const FEATURED_POST = {
  category: "Process",
  title: "What actually happens between your tech pack and your first sample",
  excerpt:
    "A tech pack looks finished the day you send it. It rarely is. Here's what our pattern team checks for before a single piece of fabric gets cut.",
  date: "3 Feb 2026",
  readTime: "6 min read",
};

const POSTS = [
  {
    category: "Artisans",
    title: "The tailoring team behind the finish",
    excerpt:
      "Hand-finishing takes longer than machine work, and it shows in the seams. A short look at who does it and why we haven't automated it away.",
    date: "14 Jan 2026",
    readTime: "5 min read",
  },
  {
    category: "Sourcing",
    title: "Why we push back on fabric substitutions",
    excerpt:
      "Swapping a yarn mid-production is an easy way to save a supplier money. It's also an easy way to hand a brand a different garment than the one they approved.",
    date: "22 Dec 2025",
    readTime: "8 min read",
  },
  {
    category: "Design",
    title: "The case for cutting patterns by hand",
    excerpt:
      "Automated cutters are faster. For small-batch runs, our pattern-maker still reaches for the shears first — here's the argument for why.",
    date: "9 Dec 2025",
    readTime: "4 min read",
  },
  {
    category: "Operations",
    title: "How a single order moves through the atelier",
    excerpt:
      "Sampling, grading, cutting, sewing, QC, packing — traced through the floor in the order it actually happens, not the order a brief describes it.",
    date: "18 Nov 2025",
    readTime: "7 min read",
  },
  {
    category: "Community",
    title: "Training the next generation of tailors in Kathmandu",
    excerpt:
      "New hires learn the trade alongside people who taught themselves the same skills a generation earlier. Notes on how that apprenticeship actually runs.",
    date: "2 Nov 2025",
    readTime: "5 min read",
  },
];

function NewsletterStrip() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email");
      return;
    }
    if (!consent) {
      setError("Tick the box to confirm you'd like to hear from us");
      return;
    }
    setError(null);
    setSubmitting(true);
    // No backend wired up yet — simulates the round trip until a real subscribe endpoint exists.
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(false);
    setSubscribed(true);
  }

  return (
    <section className="border-t border-pine/15 bg-bone">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-8 md:py-20">
        <div>
          <h2 className="mb-1 font-display text-2xl text-pine md:text-3xl">Stories, straight to your inbox.</h2>
          <p className="font-body text-pine-soft">One email a month. No noise, no sales pitch.</p>
        </div>

        {subscribed ? (
          <div className="flex items-center gap-2.5 font-body text-sm text-pine">
            <Check size={16} strokeWidth={2} className="shrink-0 text-moss-deep" />
            You&rsquo;re subscribed.
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="w-full md:w-auto">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="sm:w-72">
                <input
                  type="email"
                  placeholder="you@brand.com"
                  aria-label="Email address"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={error ? "newsletter-error" : undefined}
                  aria-invalid={error ? "true" : undefined}
                  className="w-full rounded-sm border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-sm btn-gradient px-6 font-body text-sm font-semibold tracking-wide text-bone disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
            <label className="mt-3 flex max-w-md items-start gap-2.5 font-body text-xs leading-relaxed text-pine-soft">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-describedby={error ? "newsletter-error" : undefined}
                aria-invalid={error ? "true" : undefined}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-moss"
              />
              I&rsquo;d like to receive occasional story updates by email. You can unsubscribe any
              time — see our{" "}
              <Link href="/privacy-policy" className="text-pine underline underline-offset-2 hover:text-moss-deep">
                Privacy Policy
              </Link>
              .
            </label>
            {error && (
              <p id="newsletter-error" role="alert" className="mt-2 font-body text-xs text-red-600">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

function StoryMeta({ story }) {
  return (
    <p className="font-body text-xs tracking-wide text-pine-soft">
      <time dateTime={story.publishedAt}>{story.date}</time> · {story.readTime}
    </p>
  );
}

function FeaturedStory({ story }) {
  return (
    <article className="relative mx-auto grid max-w-[1440px] overflow-hidden rounded-sm border border-pine/15 md:grid-cols-2">
      <div className="relative flex min-h-[280px] items-end bg-pine p-8 md:min-h-[420px]">
        {story.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- images are unoptimized in the static export
          <img
            src={story.coverUrl}
            alt={story.coverAlt}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          story.category && (
            <span className="font-body text-xs tracking-[0.18em] text-bone/70 uppercase">{story.category}</span>
          )
        )}
      </div>
      <div className="flex flex-col justify-center bg-bone p-8 md:p-12">
        <span className="mb-4 font-body text-xs tracking-[0.12em] text-moss-deep uppercase">
          {story.category ? `Featured · ${story.category}` : "Featured"}
        </span>
        <h2 className="mb-4 font-display text-2xl leading-tight text-pine md:text-3xl">
          <Link href={story.href} className="after:absolute after:inset-0 hover:text-moss-deep">
            {story.title}
          </Link>
        </h2>
        {story.excerpt && <p className="mb-6 max-w-md font-body leading-relaxed text-pine-soft">{story.excerpt}</p>}
        <div className="mb-6">
          <StoryMeta story={story} />
        </div>
        <span aria-hidden="true" className={`${outlineButtonSmall} self-start`}>
          Read Story <ArrowRight size={14} strokeWidth={1.5} />
        </span>
      </div>
    </article>
  );
}

function StoryCard({ story }) {
  return (
    <article className="group relative">
      {story.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- images are unoptimized in the static export
        <img
          src={story.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="mb-5 aspect-[16/10] w-full rounded-sm object-cover"
        />
      )}
      {story.category && (
        <span className="mb-3 block font-body text-xs tracking-[0.12em] text-moss-deep uppercase">{story.category}</span>
      )}
      <h3 className="mb-3 font-display text-xl leading-snug text-pine">
        <Link href={story.href} className="after:absolute after:inset-0 group-hover:text-moss-deep">
          {story.title}
        </Link>
      </h3>
      {story.excerpt && (
        <p className="mb-4 line-clamp-3 font-body text-sm leading-relaxed text-pine-soft">{story.excerpt}</p>
      )}
      <StoryMeta story={story} />
    </article>
  );
}

function PlaceholderStories() {
  return (
    <>
      <section className="px-6 pb-16 md:px-8 md:pb-20">
        <article className="mx-auto grid max-w-[1440px] rounded-sm border border-pine/15 md:grid-cols-2">
          <div className="relative flex min-h-[280px] items-end bg-pine p-8 md:min-h-[420px]">
            <span className="font-body text-xs tracking-[0.18em] text-bone/70 uppercase">{FEATURED_POST.category}</span>
          </div>
          <div className="flex flex-col justify-center bg-bone p-8 md:p-12">
            <span className="mb-4 font-body text-xs tracking-[0.12em] text-bone/70 uppercase">Featured</span>
            <h2 className="mb-4 font-display text-2xl leading-tight text-pine md:text-3xl">{FEATURED_POST.title}</h2>
            <p className="mb-6 max-w-md font-body leading-relaxed text-pine-soft">{FEATURED_POST.excerpt}</p>
            <p className="mb-6 font-body text-xs tracking-wide text-pine-soft">
              {FEATURED_POST.date} · {FEATURED_POST.readTime}
            </p>
            <button type="button" className={`${outlineButtonSmall} self-start`}>
              Read Story <ArrowRight size={14} strokeWidth={1.5} />
            </button>
          </div>
        </article>
      </section>

      <section className="px-6 pb-20 md:px-8 md:pb-24">
        <div className="mx-auto grid max-w-[1440px] gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-3">
          {POSTS.map((post) => (
            <article key={post.title}>
              <span className="mb-3 block font-body text-xs tracking-[0.12em] text-moss-deep uppercase">{post.category}</span>
              <h3 className="mb-3 font-display text-xl leading-snug text-pine">{post.title}</h3>
              <p className="mb-4 line-clamp-3 font-body text-sm leading-relaxed text-pine-soft">{post.excerpt}</p>
              <p className="font-body text-xs tracking-wide text-pine-soft">
                {post.date} · {post.readTime}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

// `stories` are the live stories from the CMS, already shaped for display by app/stories/page.js.
export function StoriesPage({ stories = [] }) {
  const featured = stories.find((story) => story.featured) ?? stories[0];
  const rest = stories.filter((story) => story !== featured);

  return (
    <div className="bg-paper">
      <section className="px-6 pb-8 pt-16 md:px-8 md:pb-10 md:pt-20">
        <div className="mx-auto max-w-[1440px]">
          <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss-deep">Stories</span>
          <h1 className="max-w-2xl font-display text-3xl text-pine md:text-4xl">
            Notes from the floor and the brands we work with.
          </h1>
        </div>
      </section>

      {featured ? (
        <>
          <section className="px-6 pb-16 md:px-8 md:pb-20">
            <FeaturedStory story={featured} />
          </section>
          {rest.length > 0 && (
            <section aria-label="More stories" className="px-6 pb-20 md:px-8 md:pb-24">
              <div className="mx-auto grid max-w-[1440px] gap-x-8 gap-y-12 sm:grid-cols-2 md:gap-x-10 lg:grid-cols-3">
                {rest.map((story) => (
                  <StoryCard key={story.slug} story={story} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <PlaceholderStories />
      )}

      <NewsletterStrip />
    </div>
  );
}
