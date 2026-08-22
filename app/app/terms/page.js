import { TermsPage } from "@/components/TermsPage";

export const metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern your use of kazimanufacturing.com.",
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms" },
};

export default function TermsRoute() {
  return <TermsPage />;
}
