import { PricingPage } from "@/components/PricingPage";

export const metadata = {
  title: "Pricing",
  description:
    "Estimate the cost of your order by product, quantity and add-ons, then request a firm, itemised manufacturing quote.",
  alternates: { canonical: "/pricing" },
  openGraph: { url: "/pricing" },
};

export default function PricingRoute() {
  return <PricingPage />;
}
