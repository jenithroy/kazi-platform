"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { whiteLabelPhoto } from "@/lib/products";

const filledButton =
  "inline-flex h-11 items-center justify-center rounded-sm btn-solid px-6 font-body text-sm font-semibold tracking-wide text-bone";
const outlineButton =
  "inline-flex h-11 items-center justify-center rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-pine hover:text-bone";

// The white-label photos from public/images/collections/white-label/ (see lib/products.js): all
// 3:4 portraits, with more than one for a category where there is more than one product shot.
// Add an entry here when a new photo is dropped into that folder.
const GALLERY = [
  {
    category: "Knitwear",
    image: whiteLabelPhoto("tshirt"),
    alt: "A plain white crew-neck T-shirt laid flat",
    caption: "Jersey, rib and cable-knit, cut and finished to spec.",
  },
  {
    category: "Knitwear",
    image: whiteLabelPhoto("long-sleeve"),
    alt: "A plain white long-sleeve T-shirt laid flat",
    caption: "Long-sleeve jersey, printed or embroidered to your artwork.",
  },
  {
    category: "Outerwear",
    image: whiteLabelPhoto("hoodie"),
    alt: "A plain white hoodie with a front pouch pocket, laid flat",
    caption: "Hoodies, shells and technical layers.",
  },
  {
    category: "Outerwear",
    image: whiteLabelPhoto("vest"),
    alt: "A white mesh utility vest with a zip and four flap pockets, laid flat",
    caption: "Utility vests with zips and flap pockets.",
  },
  {
    category: "Bottoms",
    image: whiteLabelPhoto("pants"),
    alt: "Plain white wide-leg sweatpants with an elastic waist, laid flat",
    caption: "Sweatpants, pants and denim, cut and finished to hold their shape.",
  },
  {
    category: "Accessories",
    image: whiteLabelPhoto("tote"),
    alt: "A plain white canvas tote bag with two shoulder handles",
    caption: "Bags, caps and small leather goods.",
  },
  {
    category: "Accessories",
    image: whiteLabelPhoto("apron"),
    alt: "A plain white bib apron with a patch pocket and waist ties",
    caption: "Aprons and workwear, branded to order.",
  },
];

const CATEGORIES = ["All", "Knitwear", "Outerwear", "Bottoms", "Accessories"];

export function LookbookPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const filtered =
    activeCategory === "All" ? GALLERY : GALLERY.filter((item) => item.category === activeCategory);

  return (
    <div className="bg-paper">
      <section className="px-6 pb-10 pt-16 md:px-8 md:pb-12 md:pt-20">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="max-w-2xl font-display text-3xl text-pine md:text-4xl">
            Fabric, fit and finish, by category.
          </h1>
        </div>
      </section>

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
                  active ? "bg-moss-deep text-bone" : "border border-pine text-pine hover:bg-bone"
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
              key={item.image}
              className="group relative mb-6 aspect-[3/4] overflow-hidden rounded-sm break-inside-avoid"
            >
              <Image
                src={item.image}
                alt={item.alt}
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
            <Link href="/collections" className="text-pine underline transition-colors hover:text-moss-deep">
              Collection
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
