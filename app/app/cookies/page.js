import { CookiePolicyPage } from "@/components/CookiePolicyPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/cookies");
}

export default function CookiesRoute() {
  return <CookiePolicyPage />;
}
