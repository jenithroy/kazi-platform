import { AccessibilityStatementPage } from "@/components/AccessibilityStatementPage";

export const metadata = {
  title: "Accessibility Statement",
  description: "Kazi Manufacturing's approach to an accessible website, and how to report a problem.",
  alternates: { canonical: "/accessibility" },
  openGraph: { url: "/accessibility" },
};

export default function AccessibilityRoute() {
  return <AccessibilityStatementPage />;
}
