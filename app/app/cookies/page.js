import { CookiePolicyPage } from "@/components/CookiePolicyPage";

export const metadata = {
  title: "Cookie Policy",
  description: "What kazimanufacturing.com stores in your browser, and why.",
  alternates: { canonical: "/cookies" },
  openGraph: { url: "/cookies" },
};

export default function CookiesRoute() {
  return <CookiePolicyPage />;
}
