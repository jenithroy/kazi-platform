import { Suspense } from "react";
import { CollectionsPage } from "@/components/CollectionsPage";

export const metadata = {
  title: "The Collection",
  description:
    "Ready-to-order styles across knitwear, outerwear, denim, accessories and footwear, built to the same spec as a custom manufacturing run.",
  alternates: { canonical: "/collections" },
  openGraph: { url: "/collections" },
};

function CollectionsFallback() {
  return (
    <div className="bg-paper">
      <section className="px-6 pb-10 pt-16 md:px-8 md:pb-12 md:pt-20">
        <div className="mx-auto max-w-[1440px]">
          <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss-deep">Shop the Range</span>
          <h1 className="max-w-2xl font-display text-3xl text-pine md:text-4xl">The Collection</h1>
          <p className="mt-4 max-w-xl font-body leading-relaxed text-pine-soft">
            Ready-to-order styles across knitwear, outerwear, denim, accessories and footwear —
            every piece built to the same spec as a custom run.
          </p>
        </div>
      </section>
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
