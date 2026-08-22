import { LookbookPage } from "@/components/LookbookPage";

export const metadata = {
  title: "Lookbook",
  description:
    "Fabric, fit and finish by category — knitwear, outerwear, denim, accessories and footwear from the Kazi production floor.",
  alternates: { canonical: "/lookbook" },
  openGraph: { url: "/lookbook" },
};

export default function LookbookRoute() {
  return <LookbookPage />;
}
