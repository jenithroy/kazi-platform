"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const outlineButtonSmall =
  "inline-flex items-center gap-2 justify-center h-9 px-4 rounded-sm border border-moss text-pine font-body text-xs font-semibold tracking-wide hover:bg-moss hover:text-pine transition-colors duration-150";

// Editorial placeholder — page shell only. These are stand-ins for real posts, written fresh
// for this project rather than reused from anywhere else. Replace with actual stories once
// they exist.
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
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email");
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
            <Check size={16} strokeWidth={2} className="shrink-0 text-moss" />
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
                  className="w-full rounded-sm border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none"
                />
                {error && <p className="mt-1 font-body text-xs text-red-600">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export function StoriesPage() {
  return (
    <main className="bg-paper">
      <section className="px-6 pt-16 pb-16 md:px-8 md:pt-20 md:pb-20">
        <article className="mx-auto grid max-w-[1440px] rounded-sm border border-pine/15 md:grid-cols-2">
          <div className="relative flex min-h-[280px] items-end bg-pine p-8 md:min-h-[420px]">
            <span className="font-body text-xs tracking-[0.18em] text-bone/70 uppercase">{FEATURED_POST.category}</span>
          </div>
          <div className="flex flex-col justify-center bg-bone p-8 md:p-12">
            <span className="mb-4 font-body text-xs tracking-[0.12em] text-moss uppercase">Featured</span>
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
              <span className="mb-3 block font-body text-xs tracking-[0.12em] text-moss uppercase">{post.category}</span>
              <h3 className="mb-3 font-display text-xl leading-snug text-pine">{post.title}</h3>
              <p className="mb-4 line-clamp-3 font-body text-sm leading-relaxed text-pine-soft">{post.excerpt}</p>
              <p className="font-body text-xs tracking-wide text-pine-soft">
                {post.date} · {post.readTime}
              </p>
            </article>
          ))}
        </div>
      </section>

      <NewsletterStrip />
    </main>
  );
}
