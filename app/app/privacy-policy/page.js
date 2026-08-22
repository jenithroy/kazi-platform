import { PrivacyPolicyPage } from "@/components/PrivacyPolicyPage";

export const metadata = {
  title: "Privacy Policy",
  description: "How Kazi Manufacturing collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: { url: "/privacy-policy" },
};

export default function PrivacyPolicyRoute() {
  return <PrivacyPolicyPage />;
}
