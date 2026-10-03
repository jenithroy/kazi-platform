import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/components/blog/Markdown";
import { breadcrumbJsonLd, faqJsonLd, storyJsonLd } from "@/lib/structured-data";
import { formatStoryDate, readingMinutes, storyFaqs, storyHeadings, storyPath } from "@/lib/stories";

const filledButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep";
const outlineButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-bone/30 px-6 font-body text-sm font-semibold tracking-wide text-bone transition-colors hover:bg-bone hover:text-pine";

function Breadcrumbs({ story }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 font-body text-xs text-pine-soft">
        <li>
          <Link href="/" className="hover:text-moss-deep">
            Home
          </Link>
          <span aria-hidden="true" className="ml-2">/</span>
        </li>
        <li>
          <Link href="/stories" className="hover:text-moss-deep">
            Stories
          </Link>
          <span aria-hidden="true" className="ml-2">/</span>
        </li>
        <li aria-current="page" className="line-clamp-1 max-w-[16rem] text-pine">
          {story.title}
        </li>
      </ol>
    </nav>
  );
}

function TableOfContents({ headings }) {
  return (
    <nav aria-labelledby="toc-heading" className="mb-10 rounded-sm border border-pine/15 bg-bone p-6">
      <h2 id="toc-heading" className="m-0 mb-3 font-body text-xs font-semibold tracking-[0.12em] text-pine-soft uppercase">
        In this story
      </h2>
      <ol className="m-0 list-none space-y-2 p-0">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a href={`#${heading.id}`} className="font-body text-sm text-pine underline-offset-2 hover:text-moss-deep hover:underline">
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Faqs({ faqs }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-14 border-t border-pine/15 pt-10">
      <h2 id="faq-heading" className="m-0 mb-6 font-display text-2xl text-pine md:text-[1.75rem]">
        Questions brands ask us
      </h2>
      <div className="space-y-8">
        {faqs.map((faq, index) => (
          <div key={index}>
            <h3 className="m-0 font-body text-base font-semibold text-pine">{faq.question}</h3>
            <div className="[&>p:first-child]:mt-2 [&>p:last-child]:mb-0">
              <Markdown>{faq.answer}</Markdown>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuoteCta() {
  return (
    <section data-nav-theme="dark" className="bg-pine px-6 py-16 md:px-8 md:py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="m-0 mb-3 font-display text-2xl text-bone md:text-3xl">Planning a production run?</h2>
          <p className="m-0 max-w-md font-body leading-relaxed text-bone/80">
            Tell us what you&rsquo;re making — we reply within 24 hours with a clear, itemised quote. Runs start at 50
            units per style.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link href="/quote" className={filledButton}>
            Get a Quote <ArrowRight size={14} strokeWidth={1.75} />
          </Link>
          <Link href="/atelier" className={outlineButton}>
            Design a Garment
          </Link>
        </div>
      </div>
    </section>
  );
}

function RelatedStories({ stories }) {
  return (
    <section aria-labelledby="related-heading" className="px-6 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1440px]">
        <h2 id="related-heading" className="m-0 mb-8 font-display text-2xl text-pine">
          More stories
        </h2>
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 md:gap-x-10 lg:grid-cols-3">
          {stories.map((story) => (
            <article key={story.slug} className="group relative">
              {story.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element -- images are unoptimized in the static export
                <img
                  src={story.cover_image_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="mb-5 aspect-[16/10] w-full rounded-sm object-cover"
                />
              )}
              {story.category && (
                <span className="mb-3 block font-body text-xs tracking-[0.12em] text-moss uppercase">{story.category}</span>
              )}
              <h3 className="mb-3 font-display text-xl leading-snug text-pine">
                <Link href={storyPath(story.slug)} className="after:absolute after:inset-0 group-hover:text-moss-deep">
                  {story.title}
                </Link>
              </h3>
              <p className="font-body text-xs tracking-wide text-pine-soft">
                <time dateTime={story.published_at}>{formatStoryDate(story.published_at)}</time> ·{" "}
                {readingMinutes(story.content)} min read
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StoryArticle({ story, related, site }) {
  const sections = storyHeadings(story.content).filter((heading) => heading.level <= 2);
  const faqs = storyFaqs(story);

  return (
    <>
      <JsonLd data={storyJsonLd(story, site)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Stories", path: "/stories/" },
          { name: story.title, path: storyPath(story.slug) },
        ])}
      />
      <JsonLd data={faqJsonLd(story)} />

      <article className="bg-paper">
        <header className="px-6 pt-12 md:px-8 md:pt-16">
          <div className="mx-auto max-w-3xl">
            <Breadcrumbs story={story} />
            {story.category && (
              <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss">{story.category}</span>
            )}
            <h1 className="m-0 font-display text-3xl leading-tight text-pine md:text-5xl md:leading-[1.1]">{story.title}</h1>
            {story.excerpt && (
              <p className="mt-5 max-w-2xl font-body text-lg leading-relaxed text-pine-soft">{story.excerpt}</p>
            )}
            <p className="mt-6 font-body text-sm text-pine-soft">
              <time dateTime={story.published_at}>{formatStoryDate(story.published_at)}</time>
              {" · "}
              {readingMinutes(story.content)} min read
              {story.author_name && <> · By {story.author_name}</>}
            </p>
          </div>
        </header>

        {story.cover_image_url && (
          <div className="mx-auto mt-10 max-w-5xl px-6 md:px-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- images are unoptimized in the static export */}
            <img
              src={story.cover_image_url}
              alt={story.cover_image_alt ?? ""}
              fetchPriority="high"
              className="aspect-[16/9] w-full rounded-sm object-cover"
            />
          </div>
        )}

        <div className="px-6 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-3xl">
            {sections.length >= 3 && <TableOfContents headings={sections} />}
            <Markdown>{story.content}</Markdown>
            {faqs.length > 0 && <Faqs faqs={faqs} />}
            {story.tags?.length > 0 && (
              <p className="mt-12 font-body text-xs tracking-wide text-pine-soft">Filed under: {story.tags.join(", ")}</p>
            )}
            <Link
              href="/stories"
              className="mt-10 inline-flex items-center gap-2 font-body text-sm text-pine-soft transition-colors hover:text-moss-deep"
            >
              <ArrowLeft size={14} strokeWidth={1.5} /> All stories
            </Link>
          </div>
        </div>

        <QuoteCta />
      </article>

      {related.length > 0 && <RelatedStories stories={related} />}
    </>
  );
}
