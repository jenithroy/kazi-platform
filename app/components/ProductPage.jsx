"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Box, Check, ChevronDown, ChevronUp, Image as ImageIcon, ShoppingBag } from "lucide-react";
import QtyStepper from "@/components/Atelier/QtyStepper";
import { getProductBySlug, getRelatedProducts, categoryImage } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/lib/cart-context";

// The reference build's product page swaps in a real three.js viewer here (GarmentViewer,
// see the Atelier's own 3D configurator). That component isn't part of this port — this repo's
// Atelier instead standardized on GarmentMockup2D (the same recolourable flat-lay mockup the
// Atelier's 2D editor uses), so the "3D toggle" below reuses that existing component rather
// than pointing at a module that doesn't exist here.
const GarmentMockup2D = dynamic(
  () => import("@/components/Atelier/GarmentMockup2D").then((mod) => mod.GarmentMockup2D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center font-body text-xs text-pine-soft">
        Loading preview…
      </div>
    ),
  },
);

const filledButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep sm:w-auto";
const outlineButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-pine hover:text-bone";

export function ProductPage({ slug }) {
  const product = getProductBySlug(slug);
  const { addItem } = useCart();

  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState(product?.sizes?.[0] ?? null);
  const [qty, setQty] = useState(product?.moq ?? 50);
  const [viewMode, setViewMode] = useState("image");
  const [openAccordion, setOpenAccordion] = useState("specs");

  if (!product) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-paper px-6 py-24 md:px-8">
        <div className="max-w-md text-center">
          <h1 className="mb-3 font-display text-3xl text-pine">Product not found</h1>
          <p className="mb-8 font-body text-pine-soft">
            That style may have moved or isn&rsquo;t part of the catalogue anymore.
          </p>
          <Link href="/collections" className={outlineButton}>
            <ArrowLeft size={14} strokeWidth={1.5} /> Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  const hasColors = product.colors && product.colors.length > 0;
  const activeColor = hasColors ? product.colors[colorIndex] : null;
  const relatedProducts = getRelatedProducts(product);

  const quoteHref = `/quote?details=${encodeURIComponent(
    `Inquiry for ${product.name}${activeColor ? ` (Colour: ${activeColor.name})` : ""}${size ? `, Size ${size}` : ""}, qty ${qty}`,
  )}`;
  const atelierHref = product.garmentModel
    ? `/atelier?garment=${product.garmentModel}${activeColor ? `&colour=${encodeURIComponent(activeColor.hex)}` : ""}`
    : null;

  function handleAddToBag() {
    if (!product) return;
    addItem(
      {
        id: `${product.slug}-${activeColor?.name ?? "default"}-${size ?? ""}`,
        slug: product.slug,
        name: product.name,
        image: categoryImage(product.category),
        price: product.price,
        color: activeColor?.name,
        size: size ?? undefined,
      },
      qty,
    );
  }

  return (
    <div className="bg-paper">
      <section className="px-6 pt-8 pb-4 md:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center gap-2 font-body text-[11px] tracking-[0.1em] text-pine-soft uppercase">
          <Link href="/" className="transition-colors hover:text-pine">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/collections?category=${encodeURIComponent(product.category)}`}
            className="transition-colors hover:text-pine"
          >
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-pine">{product.name}</span>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-8">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Media */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-paper-raised">
            {product.garmentModel && (
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "image" ? "3d" : "image")}
                aria-label={viewMode === "image" ? "Switch to 3D preview" : "Switch to product image"}
                className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-sm bg-pine text-bone transition-colors hover:bg-moss-deep"
              >
                {viewMode === "image" ? (
                  <Box size={16} strokeWidth={1.5} />
                ) : (
                  <ImageIcon size={16} strokeWidth={1.5} />
                )}
              </button>
            )}

            {viewMode === "image" || !product.garmentModel ? (
              <Image
                src={categoryImage(product.category)}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <GarmentMockup2D
                garment={product.garmentModel}
                side="front"
                colour={activeColor?.hex ?? "#E8E0D0"}
              />
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <span className="mb-2 font-body text-xs tracking-[0.18em] text-moss uppercase">
              {product.category}
            </span>
            <h1 className="mb-2 font-display text-3xl text-pine md:text-4xl">{product.name}</h1>
            <p className="mb-4 font-body text-base font-medium tabular-nums text-pine-soft">
              {product.price}
            </p>
            <p className="mb-6 max-w-md font-body text-sm leading-relaxed text-pine-soft">
              {product.description}
            </p>

            {hasColors && activeColor && (
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-body text-xs tracking-[0.12em] text-pine-soft uppercase">
                    Colour
                  </span>
                  <span className="font-body text-xs text-pine">{activeColor.name}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((color, index) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setColorIndex(index)}
                      title={color.name}
                      aria-label={color.name}
                      aria-pressed={colorIndex === index}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform duration-150 ${
                        colorIndex === index ? "scale-110 border-moss" : "border-pine/15 hover:border-pine/40"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {colorIndex === index && (
                        <Check
                          size={12}
                          strokeWidth={2.5}
                          className={
                            ["#FFFFFF", "#E8E0D0", "#F5F3EE"].includes(color.hex) ? "text-pine" : "text-bone"
                          }
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes && (
              <div className="mb-5">
                <span className="mb-2 block font-body text-xs tracking-[0.12em] text-pine-soft uppercase">
                  Size
                </span>
                <div className="flex gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      aria-pressed={size === s}
                      className={`h-11 w-11 rounded-sm border font-body text-sm transition-colors duration-150 ${
                        size === s ? "border-pine bg-pine text-bone" : "border-pine/15 text-pine hover:border-pine/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <span className="mb-2 block font-body text-xs tracking-[0.12em] text-pine-soft uppercase">
                Quantity <span className="text-pine-soft/70 normal-case">(MOQ {product.moq})</span>
              </span>
              <QtyStepper value={qty} onChange={setQty} min={product.moq} max={10000} step={10} />
            </div>

            <button type="button" onClick={handleAddToBag} className={`${filledButton} mb-3`}>
              <ShoppingBag size={15} strokeWidth={1.5} /> Add to Bag
            </button>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
              {atelierHref && (
                <Link href={atelierHref} className={outlineButton}>
                  Customize in the Atelier <ArrowRight size={14} strokeWidth={1.5} />
                </Link>
              )}
              <Link href={quoteHref} className={outlineButton}>
                Request Sample / Quote
              </Link>
            </div>

            <div className="border-t border-pine/15">
              <div className="border-b border-pine/15">
                <button
                  type="button"
                  onClick={() => setOpenAccordion(openAccordion === "specs" ? null : "specs")}
                  className="flex w-full items-center justify-between py-4 text-left font-body text-xs tracking-[0.12em] text-pine uppercase"
                >
                  <span>Specification &amp; Fit</span>
                  {openAccordion === "specs" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {openAccordion === "specs" && (
                  <ul className="space-y-1.5 pb-4">
                    {product.specs.map((spec) => (
                      <li key={spec} className="flex items-start gap-2 font-body text-sm text-pine-soft">
                        <span className="mt-1 text-moss">•</span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-b border-pine/15">
                <button
                  type="button"
                  onClick={() =>
                    setOpenAccordion(openAccordion === "sustainability" ? null : "sustainability")
                  }
                  className="flex w-full items-center justify-between py-4 text-left font-body text-xs tracking-[0.12em] text-pine uppercase"
                >
                  <span>Sustainability</span>
                  {openAccordion === "sustainability" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {openAccordion === "sustainability" && (
                  <ul className="space-y-1.5 pb-4">
                    {product.sustainability.map((item) => (
                      <li key={item} className="flex items-start gap-2 font-body text-sm text-pine-soft">
                        <span className="mt-1 text-moss">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="border-t border-pine/15 px-6 pt-16 pb-20 md:px-8">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="mb-6 font-display text-2xl text-pine">You might also like</h2>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.slug} product={related} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
