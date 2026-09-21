import { MetaAdsCampaignsPage } from "@/components/Erp/MetaAds/CampaignsPage";

export const metadata = {
  title: "Meta Ads campaigns",
  robots: { index: false, follow: false },
};

export default function MetaAdsCampaignsRoute() {
  return <MetaAdsCampaignsPage />;
}
