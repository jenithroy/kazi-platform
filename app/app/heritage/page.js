import { HeritagePage } from "@/components/HeritagePage";

export const metadata = {
  title: "Manufacturing Services",
  description:
    "Custom manufacturing, DTG, screen printing, embroidery, DTF and video editing — Kazi's full service catalogue, run out of one Kathmandu atelier.",
  alternates: { canonical: "/heritage" },
  openGraph: { url: "/heritage" },
};

export default function HeritageRoute() {
  return <HeritagePage />;
}
