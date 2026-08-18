"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { categoryImage } from "@/lib/products";

const filledButton =
  "inline-flex h-11 items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep";
const outlineButton =
  "inline-flex h-11 items-center justify-center rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-pine hover:text-bone";

// Only one photo per category exists today (the same set the homepage Collection section and
// /collections use) — a real lookbook needs several per category to read as a gallery rather
// than this set repeated with padding. Add more entries per category once photography exists.
const GALLERY = [
  { category: "Knitwear", caption: "Jersey, rib and cable-knit, cut and finished to spec.", tall: true },
  { category: "Outerwear", caption: "Shells, quilted jackets and technical layers." },
  { category: "Denim", caption: "Washed, raw and garment-dyed, made to hold shape.", tall: true },
  { category: "Accessories", caption: "Bags, caps and small leather goods." },
  { category: "Footwear", caption: "Canvas and leather uppers, hand-lasted.", tall: true },
];

const CATEGORIES = ["All", "Knitwear", "Outerwear", "Denim", "Accessories", "Footwear"];

export function LookbookPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const filtered =
    activeCategory === "All" ? GALLERY : GALLERY.filter((item) => item.category === activeCategory);

  return (
    <main className="bg-paper">
      <div
        className="sticky z-10 border-y border-pine/15 bg-paper/95 backdrop-blur"
        style={{ top: "calc(var(--stripe-height) + var(--nav-height))" }}
      >
        <div className="mx-auto flex max-w-[1440px] gap-3 overflow-x-auto px-6 py-4 md:px-8">
          {CATEGORIES.map((category) => {
            const active = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
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
        <div className="mx-auto columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:max-w-full">
          {filtered.map((item) => (
            <figure
              key={item.category}
              className={`group relative mb-6 overflow-hidden rounded-sm break-inside-avoid ${item.tall ? "aspect-[3/4]" : "aspect-[4/3]"}`}
            >
              <Image
                src={categoryImage(item.category)}
                alt={`${item.category} product shot`}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
              <figcaption className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-pine/85 via-pine/0 to-pine/0 p-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="font-display text-lg text-bone">{item.category}</span>
                <span className="font-body text-sm text-bone/85">{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-t border-pine/15 py-20">
        <div className="mx-auto max-w-[1440px] px-6 text-center md:px-8">
          <h2 className="mb-3 font-display text-3xl text-pine md:text-4xl">
            Seen something close to what you&rsquo;re picturing?
          </h2>
          <p className="mb-8 font-body text-pine-soft">
            Bring it into the Atelier to customize it, or send us the details directly.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/atelier" className={outlineButton}>
              Enter the Atelier
            </Link>
            <Link href="/quote" className={filledButton}>
              Get a Quote
            </Link>
          </div>
          <p className="mt-8 font-body text-sm text-pine-soft">
            Ready to start an order? Browse priced, shoppable styles in the{" "}
            <Link href="/collections" className="text-pine underline transition-colors hover:text-moss">
              Collection
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
