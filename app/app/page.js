import { Hero } from "@/components/Hero";
import { StatementSection } from "@/components/StatementSection";
import { BrandsSection } from "@/components/BrandsSection";
import { CraftedBySection } from "@/components/CraftedBySection";
import { FaqSection } from "@/components/FaqSection";
import { DesignSection } from "@/components/DesignSection";
import { ProcessSection } from "@/components/ProcessSection";
import { ReviewsSection } from "@/components/ReviewsSection";
import { QuoteRequestSection } from "@/components/QuoteRequestSection";

export const metadata = {
  title: "Custom Apparel Manufacturing in Nepal | Kazi Manufacturing",
  description:
    "Custom clothing manufacturing for UK brands, crafted in Kathmandu, Nepal. Small-batch runs from 50 units, in-house sampling, quality control and worldwide delivery.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <BrandsSection />
      <CraftedBySection />
      <StatementSection />
      <ProcessSection />
      <FaqSection />
      <DesignSection />
      <ReviewsSection />
      <QuoteRequestSection />
    </>
  );
}
