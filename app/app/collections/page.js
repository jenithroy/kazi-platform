import { Suspense } from "react";
import { CollectionsPage } from "@/components/CollectionsPage";

export default function CollectionsRoute() {
  return (
    <Suspense fallback={null}>
      <CollectionsPage />
    </Suspense>
  );
}
