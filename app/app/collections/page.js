import { Suspense } from "react";
import { CollectionsPage, CollectionsView } from "@/components/CollectionsPage";
import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export function generateMetadata() {
  return pageMetadata("/collections");
}

export default function CollectionsRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "The Collection", path: "/collections/" },
        ])}
      />
      <Suspense fallback={<CollectionsView activeCategory="All" />}>
        <CollectionsPage />
      </Suspense>
    </>
  );
}
