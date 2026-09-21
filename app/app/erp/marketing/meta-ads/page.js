import { MetaAdsDashboard } from "@/components/Erp/MetaAds/DashboardPage";

export const metadata = {
  title: "Meta Ads",
  robots: { index: false, follow: false },
};

export default function MetaAdsRoute() {
  return <MetaAdsDashboard />;
}
