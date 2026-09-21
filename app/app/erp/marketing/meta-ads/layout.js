import { Suspense } from "react";
import { MetaAdsProvider } from "@/components/Erp/MetaAds/MetaAdsProvider";

export const metadata = {
  title: "Meta Ads",
  robots: { index: false, follow: false },
};

// The provider reads the account and date range out of the URL with useSearchParams, which
// has to sit inside a Suspense boundary for the static export's prerender pass. Keeping the
// provider in the layout (rather than in each page) is what lets the selected account and
// range survive moving between the module's tabs.
export default function MetaAdsLayout({ children }) {
  return (
    <Suspense fallback={<p className="font-body text-sm text-pine-soft">Loading Meta Ads…</p>}>
      <MetaAdsProvider>{children}</MetaAdsProvider>
    </Suspense>
  );
}
