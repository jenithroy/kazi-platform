import { TermsPage } from "@/components/TermsPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/terms");
}

export default function TermsRoute() {
  return <TermsPage />;
}
