import { Suspense } from "react";
import { QuotePage, QuotePageForm } from "@/components/QuotePage";

export const metadata = {
  title: "Request a Quote",
  robots: { index: false, follow: true },
  alternates: { canonical: "/quote/" },
};

export default function AtelierQuoteRoute() {
  return (
    <Suspense fallback={<QuotePageForm hideHeading hideArtwork />}>
      <QuotePage hideHeading hideArtwork />
    </Suspense>
  );
}
