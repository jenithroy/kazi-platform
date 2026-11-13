import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqListJsonLd, serviceCatalogJsonLd } from "@/lib/structured-data";
import { VideoPanel } from "@/components/home/VideoPanel";
import { MerchHero } from "@/components/merch/MerchHero";
import { PodVsKazi } from "@/components/merch/PodVsKazi";
import { ProductGrid } from "@/components/merch/ProductGrid";
import { MakeItYours } from "@/components/merch/MakeItYours";
import { DropSteps } from "@/components/merch/DropSteps";
import { MadeInKathmandu } from "@/components/merch/MadeInKathmandu";
import { CreatorDrops } from "@/components/merch/CreatorDrops";
import { DropPasses } from "@/components/merch/DropPasses";
import { MerchFaq } from "@/components/merch/MerchFaq";
import { FinalCta } from "@/components/merch/FinalCta";
import { StickyDropCta } from "@/components/merch/StickyDropCta";
import { FAQS, PASSES } from "@/components/merch/content";

// Title, description and social image live in lib/seo-routes.js (and can be overridden in /admin).
export function generateMetadata() {
  return pageMetadata("/merch");
}

// Kazi Merch: a landing page for creators, in the site's own theme. It sits inside the normal
// site frame (main nav, footer) like every other page; the Atelier section is the home page's
// own VideoPanel, reused as it is.
export default function MerchRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Kazi Merch", path: "/merch/" },
        ])}
      />
      <JsonLd
        data={serviceCatalogJsonLd({
          name: "Kazi Merch — Custom Cut-and-Sew Creator Merch",
          path: "/merch/",
          description:
            "Custom cut-and-sew merch manufacturing for creators, influencers and talent managers from 100 pieces per style, handmade in Kathmandu with custom labels and packaging.",
          services: PASSES.map((p) => ({ name: p.name, description: `${p.summary} (${p.includes.join(", ")})` })),
        })}
      />
      <JsonLd data={faqListJsonLd(FAQS)} />
      <MerchHero />
      <PodVsKazi />
      <ProductGrid />
      <MakeItYours />
      <DropSteps />
      <VideoPanel />
      <MadeInKathmandu />
      <CreatorDrops />
      <DropPasses />
      <MerchFaq />
      <FinalCta />
      <StickyDropCta />
    </>
  );
}
