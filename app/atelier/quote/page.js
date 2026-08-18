import { Suspense } from "react";
import { QuotePage } from "@/components/QuotePage";

export default function AtelierQuoteRoute() {
  return (
    <Suspense fallback={null}>
      <QuotePage hideHeading hideArtwork />
    </Suspense>
  );
}
