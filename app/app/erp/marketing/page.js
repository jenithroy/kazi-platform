import { MarketingHubPage } from "@/components/Erp/MarketingHubPage";

export const metadata = {
  title: "Marketing",
  robots: { index: false, follow: false },
};

export default function MarketingRoute() {
  return <MarketingHubPage />;
}
