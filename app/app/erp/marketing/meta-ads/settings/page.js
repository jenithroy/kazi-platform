import { MetaAdsSettingsPage } from "@/components/Erp/MetaAds/SettingsPage";

export const metadata = {
  title: "Meta Ads settings",
  robots: { index: false, follow: false },
};

export default function MetaAdsSettingsRoute() {
  return <MetaAdsSettingsPage />;
}
