import { Suspense } from "react";
import { QuotePage } from "@/components/QuotePage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/quote");
}

export default function QuoteRoute() {
  return (
    <Suspense
      fallback={
        <h1 className="mx-auto max-w-[1440px] px-6 pt-40 font-display text-4xl text-pine md:px-8 md:pt-48 md:text-5xl">
          Tell us what you&rsquo;re making.
        </h1>
      }
    >
      <QuotePage />
    </Suspense>
  );
}
