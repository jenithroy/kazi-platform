import { Hero } from "@/components/Hero";
import { StatementSection } from "@/components/StatementSection";
import { BrandsSection } from "@/components/BrandsSection";
import { CraftedBySection } from "@/components/CraftedBySection";
import { FaqSection } from "@/components/FaqSection";
import { DesignSection } from "@/components/DesignSection";
import { ProcessSection } from "@/components/ProcessSection";
import { OurCollectionSection } from "@/components/OurCollectionSection";
import { ReviewsSection } from "@/components/ReviewsSection";
import { QuoteRequestSection } from "@/components/QuoteRequestSection";

export default function Home() {
  return (
    <>
      <Hero />
      <BrandsSection />
      <CraftedBySection />
      <StatementSection />
      <OurCollectionSection />
      <ProcessSection />
      <FaqSection />
      <DesignSection />
      <ReviewsSection />
      <QuoteRequestSection />
    </>
  );
}
