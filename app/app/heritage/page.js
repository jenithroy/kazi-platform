import { HeritagePage, HERITAGE_SERVICES } from "@/components/HeritagePage";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, serviceCatalogJsonLd } from "@/lib/structured-data";

export function generateMetadata() {
  return pageMetadata("/heritage");
}

export default function HeritageRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Manufacturing Services", path: "/heritage/" },
        ])}
      />
      <JsonLd
        data={serviceCatalogJsonLd({
          name: "Kazi Manufacturing Services",
          path: "/heritage/",
          description:
            "Low-MOQ cut-and-sew garment manufacturing, screen printing, embroidery, DTG, DTF and product video editing in Kathmandu, Nepal.",
          services: HERITAGE_SERVICES,
        })}
      />
      <HeritagePage />
    </>
  );
}
