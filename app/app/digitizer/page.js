import { DigitizerPage } from "@/components/Digitizer/DigitizerPage";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, webAppJsonLd } from "@/lib/structured-data";

export function generateMetadata() {
  return pageMetadata("/digitizer");
}

export default function DigitizerRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Embroidery Digitizer", path: "/digitizer/" },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          name: "Kazi Free Online Embroidery Digitizer",
          path: "/digitizer/",
          description:
            "Free browser-based embroidery digitizer that converts logos, images and lettering into machine embroidery stitch files (DST, PES, EXP, JEF, VP3, XXX) locally on your device.",
          image: "/images/home/digitizer-poster.webp",
          featureList: [
            "Convert PNG, JPG, WebP and SVG logos to embroidery stitches",
            "Export machine stitch files in DST, PES, EXP, JEF, VP3 and XXX formats",
            "Interactive stitch simulation, density, angle and underlay controls",
            "100% client-side in-browser processing with no sign-up required",
          ],
        })}
      />
      <DigitizerPage />
    </>
  );
}
