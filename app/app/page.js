import { HomeHero } from "@/components/home/HomeHero";
import { VideoPanel } from "@/components/home/VideoPanel";
import { ChipsStatement } from "@/components/home/ChipsStatement";
import { ProcessRows } from "@/components/home/ProcessRows";
import { RangeGrid } from "@/components/home/RangeGrid";
import { AudienceSplit } from "@/components/home/AudienceSplit";
import { BrandsSection } from "@/components/BrandsSection";
import { ReviewsSection } from "@/components/ReviewsSection";
import { FaqSection } from "@/components/FaqSection";
import { QuoteRequestSection } from "@/components/QuoteRequestSection";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/");
}

export default function Home() {
  return (
    <>
      <HomeHero />
      <VideoPanel />
      <ChipsStatement />
      <ProcessRows />
      <RangeGrid />
      <BrandsSection tone="light" />
      <AudienceSplit />
      <ReviewsSection />
      <FaqSection />
      <QuoteRequestSection />
    </>
  );
}
