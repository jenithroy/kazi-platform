import { PrivacyPolicyPage } from "@/components/PrivacyPolicyPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/privacy-policy");
}

export default function PrivacyPolicyRoute() {
  return <PrivacyPolicyPage />;
}
