"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, products } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

const filledButton =
  "inline-flex h-11 items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep";
const outlineButton =
  "inline-flex h-11 items-center justify-center rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-pine hover:text-bone";

const FILTERS = ["All", ...CATEGORIES];

export function CollectionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requestedCategory = searchParams.get("category");
  const activeCategory = FILTERS.includes(requestedCategory ?? "") ? requestedCategory : "All";

  const filtered = useMemo(
    () => (activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory)),
    [activeCategory],
  );

  function selectCategory(category) {
    const params = new URLSearchParams(searchParams);
    if (category === "All") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="bg-paper">
      <section className="px-6 pb-10 pt-16 md:px-8 md:pb-12 md:pt-20">
        <div className="mx-auto max-w-[1440px]">
          <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss">Shop the Range</span>
          <h1 className="max-w-2xl font-display text-3xl text-pine md:text-4xl">The Collection</h1>
          <p className="mt-4 max-w-xl font-body leading-relaxed text-pine-soft">
            Ready-to-order styles across knitwear, outerwear, denim, accessories and footwear —
            every piece built to the same spec as a custom run.
          </p>
        </div>
      </section>

      <div
        className="sticky z-10 border-y border-pine/15 bg-paper/95 backdrop-blur"
        style={{ top: "calc(var(--stripe-height) + var(--nav-height))" }}
      >
        <div className="mx-auto flex max-w-[1440px] gap-3 overflow-x-auto px-6 py-4 md:px-8">
          {FILTERS.map((category) => {
            const active = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => selectCategory(category)}
                className={`inline-flex h-9 shrink-0 items-center rounded-sm px-4 font-body text-xs font-semibold tracking-wide transition-colors duration-150 ${
                  active ? "bg-moss text-pine" : "border border-pine text-pine hover:bg-bone"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <section className="px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="border-t border-pine/15 py-20">
        <div className="mx-auto max-w-[1440px] px-6 text-center md:px-8">
          <h2 className="mb-3 font-display text-3xl text-pine md:text-4xl">
            Want something that isn&rsquo;t here yet?
          </h2>
          <p className="mb-8 font-body text-pine-soft">
            These are starting points, not the limit — build a garment from scratch in the
            Atelier, or send us the brief directly.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/atelier" className={outlineButton}>
              Enter the Atelier
            </Link>
            <Link href="/quote" className={filledButton}>
              Get a Quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
