import { Suspense } from "react";
import { QuotePage } from "@/components/QuotePage";

export default function QuoteRoute() {
  return (
    <Suspense fallback={null}>
      <QuotePage />
    </Suspense>
  );
}
