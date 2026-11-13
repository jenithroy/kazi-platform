import { LookbookPage } from "@/components/LookbookPage";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export function generateMetadata() {
  return pageMetadata("/lookbook");
}

export default function LookbookRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Lookbook", path: "/lookbook/" },
        ])}
      />
      <LookbookPage />
    </>
  );
}
