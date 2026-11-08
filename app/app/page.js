import { HomeHero } from "@/components/home/HomeHero";
import { MerchSteps } from "@/components/home/MerchSteps";
import { RangeGrid } from "@/components/home/RangeGrid";
import { PrintMethods } from "@/components/home/PrintMethods";
import { QuoteBand } from "@/components/home/QuoteBand";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/");
}

export default function Home() {
  return (
    <>
      <HomeHero />
      <MerchSteps />
      <RangeGrid />
      <PrintMethods />
      <QuoteBand />
    </>
  );
}
