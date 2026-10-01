import { PricingPage } from "@/components/PricingPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/pricing");
}

export default function PricingRoute() {
  return <PricingPage />;
}
