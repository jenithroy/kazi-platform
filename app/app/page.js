import { HomeHero } from "@/components/home/HomeHero";
import { VideoPanel } from "@/components/home/VideoPanel";
import { ChipsStatement } from "@/components/home/ChipsStatement";
import { ProcessRows } from "@/components/home/ProcessRows";
import { RangeGrid } from "@/components/home/RangeGrid";
import { DigitizerPromo } from "@/components/home/DigitizerPromo";
import { AudienceSplit } from "@/components/home/AudienceSplit";
import { BrandsSection } from "@/components/BrandsSection";
import { ReviewsSection } from "@/components/ReviewsSection";
import { FaqSection, HOME_FAQS } from "@/components/FaqSection";
import { QuoteRequestSection } from "@/components/QuoteRequestSection";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { faqListJsonLd } from "@/lib/structured-data";

export function generateMetadata() {
  return pageMetadata("/");
}

export default function Home() {
  return (
    <>
      <JsonLd data={faqListJsonLd(HOME_FAQS)} />
      <HomeHero />
      <VideoPanel />
      <ChipsStatement />
      <RangeGrid />
      <DigitizerPromo />
      <ProcessRows />
      <BrandsSection tone="light" />
      <AudienceSplit />
      <ReviewsSection />
      <FaqSection />
      <QuoteRequestSection />
    </>
  );
}
