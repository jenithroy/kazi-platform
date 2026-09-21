import { ErpOverviewPage } from "@/components/Erp/OverviewPage";

export const metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

export default function ErpOverviewRoute() {
  return <ErpOverviewPage />;
}
