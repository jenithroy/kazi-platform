import { AccessibilityStatementPage } from "@/components/AccessibilityStatementPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/accessibility");
}

export default function AccessibilityRoute() {
  return <AccessibilityStatementPage />;
}
