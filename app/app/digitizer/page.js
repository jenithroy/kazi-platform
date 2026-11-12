import { DigitizerPage } from "@/components/Digitizer/DigitizerPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/digitizer");
}

export default function DigitizerRoute() {
  return <DigitizerPage />;
}
