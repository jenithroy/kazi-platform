import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function QuoteBand() {
  return (
    <section aria-labelledby="quote-band-title" className="bg-pine px-5 py-24 md:px-8 md:py-36">
      <Reveal className="mx-auto flex max-w-[1440px] flex-col items-center text-center">
        <h2
          id="quote-band-title"
          className="m-0 max-w-[22ch] text-balance font-display text-[clamp(2rem,4vw,3.5rem)] font-normal leading-[1.06] tracking-[-0.02em] text-bone"
        >
          Already have artwork? Send it over and we will quote within 24 hours.
        </h2>
        <p className="m-0 mt-5 max-w-[44ch] text-balance font-body text-base text-bone/80">
          Any blank, any print method, from 100 pieces. Brands, creators, teams and company merch all welcome.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/quote"
            className="inline-flex h-12 items-center whitespace-nowrap rounded-md bg-bone px-8 font-body text-sm font-semibold uppercase tracking-[0.14em] text-pine transition-colors duration-200 hover:bg-white"
          >
            Get a quote
          </Link>
          <Link
            href="/atelier"
            className="inline-flex h-12 items-center whitespace-nowrap rounded-md border border-bone/60 px-8 font-body text-sm font-semibold uppercase tracking-[0.14em] text-bone transition-colors duration-200 hover:bg-bone hover:text-pine"
          >
            Start designing
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
