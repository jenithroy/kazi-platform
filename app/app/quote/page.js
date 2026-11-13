import { Suspense } from "react";
import { QuotePage, QuotePageForm } from "@/components/QuotePage";
import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export function generateMetadata() {
  return pageMetadata("/quote");
}

export default function QuoteRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Request a Quote", path: "/quote/" },
        ])}
      />
      <Suspense fallback={<QuotePageForm />}>
        <QuotePage />
      </Suspense>
    </>
  );
}
