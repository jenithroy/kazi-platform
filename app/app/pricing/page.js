import { PricingPage } from "@/components/PricingPage";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export function generateMetadata() {
  return pageMetadata("/pricing");
}

export default function PricingRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing/" },
        ])}
      />
      <PricingPage />
    </>
  );
}
