import { Suspense } from "react";
import { QuotePage } from "@/components/QuotePage";

export const metadata = {
  title: "Request a Quote",
  description:
    "Tell us what you're making and we'll reply within 24 hours with a clear, itemised manufacturing quote — no hidden costs.",
  alternates: { canonical: "/quote" },
  openGraph: { url: "/quote" },
};

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
