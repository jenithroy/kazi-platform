import { MetaAdsConnectCallbackPage } from "@/components/Erp/MetaAds/ConnectCallbackPage";

export const metadata = {
  title: "Connecting Meta",
  robots: { index: false, follow: false },
};

export default function MetaAdsConnectRoute() {
  return <MetaAdsConnectCallbackPage />;
}
