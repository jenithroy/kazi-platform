import { Suspense } from "react";
import { CollectionsPage } from "@/components/CollectionsPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/collections");
}

function CollectionsFallback() {
  return (
    <div className="bg-paper">
      <h1 className="sr-only">The Collection</h1>
    </div>
  );
}

export default function CollectionsRoute() {
  return (
    <Suspense fallback={<CollectionsFallback />}>
      <CollectionsPage />
    </Suspense>
  );
}
