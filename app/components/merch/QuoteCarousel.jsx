"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";

const arrowButton =
  "grid size-11 place-items-center rounded-full bg-pine/[0.06] text-pine transition-colors duration-200 hover:bg-pine/10";

// One quote at a time, moved by the two buttons only (nothing auto-advances, so there is
// nothing to pause). The quote is a live region, so a screen reader hears the new one.
export function QuoteCarousel({ quotes }) {
  const [index, setIndex] = useState(0);
  const quote = quotes[index];
  const last = quotes.length - 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What creators say"
      className="mt-14 grid gap-8 border-t border-pine/10 pt-10 md:mt-20 md:grid-cols-[1fr_auto] md:items-end md:gap-12 md:pt-14"
    >
      <figure aria-live="polite" aria-atomic="true" className="m-0 min-h-[10rem]">
        <blockquote className="m-0 max-w-[44rem] text-balance font-display text-[1.75rem] leading-[1.2] text-pine md:text-[2.25rem]">
          &ldquo;{quote.quote}&rdquo;
        </blockquote>
        <figcaption className="mt-5 font-body text-[1.0625rem] text-pine-soft">
          {quote.name}, {quote.role}
        </figcaption>
      </figure>

      <div className="flex items-center gap-3">
        <span className="mr-1 font-body text-[1rem] text-pine-soft">
          {index + 1} / {quotes.length}
        </span>
        <button type="button" aria-label="Previous quote" onClick={() => setIndex(index === 0 ? last : index - 1)} className={arrowButton}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Next quote" onClick={() => setIndex(index === last ? 0 : index + 1)} className={arrowButton}>
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
