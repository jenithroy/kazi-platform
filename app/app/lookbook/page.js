import { LookbookPage } from "@/components/LookbookPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/lookbook");
}

export default function LookbookRoute() {
  return <LookbookPage />;
}
