import { HomeHero } from "@/components/home/HomeHero";
import { ProductGrid } from "@/components/home/ProductGrid";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/");
}

export default function Home() {
  return (
    <>
      <HomeHero />
      <ProductGrid />
    </>
  );
}
