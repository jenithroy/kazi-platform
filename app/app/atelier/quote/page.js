import { Suspense } from "react";
import { QuotePage } from "@/components/QuotePage";

export const metadata = {
  title: "Request a Quote",
  robots: { index: false, follow: true },
  alternates: { canonical: "/quote" },
};

export default function AtelierQuoteRoute() {
  return (
    <Suspense fallback={null}>
      <QuotePage hideHeading hideArtwork />
    </Suspense>
  );
}
