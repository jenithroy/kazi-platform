import { HeritagePage } from "@/components/HeritagePage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/heritage");
}

export default function HeritageRoute() {
  return <HeritagePage />;
}
