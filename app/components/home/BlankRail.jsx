"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { getProductBySlug, products } from "@/lib/products";
import { priceLine } from "@/components/home/catalogue";

// The white-label picker at the foot of the hero. MOQs and colourways come from the catalogue
// (lib/products.js) so they can't drift from /collections; the two blank garments deep-link
// into the Atelier with the chosen colour (?garment=&colour=, see AtelierPage). Whether prices
// are printed is decided in catalogue.js.

const WHITE = { name: "White", hex: "#FFFFFF" };

// A white-label blank starts white; the rest of the colourways are the product's own. Every
// hex here is in the Atelier's palette, so the deep link lands on a real, selectable colour.
function swatchesFor(product) {
  return [WHITE, ...product.colors.filter((c) => c.hex.toUpperCase() !== WHITE.hex)].slice(0, 5);
}

const tee = getProductBySlug("organic-crew-tee");
const hoodie = getProductBySlug("essential-hoodie");

// Each shows its product's white-label photo from /collections, cropped like the picture cards
// below. The swatches only pick the colour the Atelier opens with; the photo is always the white blank.
//
// Every photo is a 3:4 portrait shown here as a 5:4 crop, so only ~60% of its height is visible:
// `position` picks that band and is set so the product sits in the middle of it. A product that sits
// off to one side of its photo is also zoomed (`zoom`) about the edge it leans away from (`origin`),
// which slides it to the middle of the card. Re-measure these if a photo is replaced.
const GARMENT_CARDS = [
  {
    garment: "t-shirt",
    title: "Tees",
    product: tee,
    swatches: swatchesFor(tee),
    position: "50% 44%",
  },
  {
    garment: "hoodie",
    title: "Hoodies",
    product: hoodie,
    swatches: swatchesFor(hoodie),
    position: "50% 61%",
    zoom: 1.12,
    origin: "0% 50%",
  },
];

// The tee and hoodie have their own cards above, so the two picture cards are Pants and
// Totes; "See every blank" covers the rest of the range. Each shows its product's own white-label
// photo (lib/products.js), framed the same way as the cards above.
const PHOTO_CARDS = [
  {
    title: "Pants",
    product: getProductBySlug("sweatpants"),
    position: "50% 44%",
    zoom: 1.12,
    origin: "1.5% 50%",
  },
  { title: "Totes", product: getProductBySlug("canvas-tote"), position: "50% 59%" },
];

// The title link is stretched over the whole card, so a keyboard-focused card gets the ring
// (the link's own outline would only wrap the title text). A white ring with a pine one outside
// it, so it shows against both the dark sky and the bright snow that can sit behind the cards.
const focusRing = "has-[a:focus-visible]:shadow-[0_0_0_3px_#fff,0_0_0_6px_#1b3a2b]";

const cardShell = `group relative flex flex-col overflow-hidden rounded-[1.25rem] bg-bone shadow-[0_22px_44px_-16px_rgba(2,24,90,0.6)] ring-1 ring-white/50 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_28px_52px_-16px_rgba(2,24,90,0.7)] motion-safe:animate-rise ${focusRing}`;

// Below xl the cards are a swipeable rail at a fixed width (five across would be ~130px each
// on a tablet and the titles collide with the arrows); from xl they share the row as a grid.
const mobileSlot = "w-[64vw] max-w-[15.5rem] shrink-0 snap-start xl:w-auto xl:max-w-none";

function ArrowChip() {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-full bg-pine text-bone transition-colors duration-200 group-hover:bg-moss-deep"
    >
      <ArrowUpRight size={16} weight="bold" />
    </span>
  );
}

function CardText({ title, href, meta, srSuffix }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="m-0 font-display text-[1.375rem] leading-none text-pine">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {title}
            <span className="sr-only"> — {srSuffix}</span>
          </Link>
        </h3>
        <p className="m-0 mt-1.5 font-body text-[0.8125rem] leading-tight text-pine-soft">{meta}</p>
      </div>
      <ArrowChip />
    </div>
  );
}

// The card's picture. The static zoom sits on a wrapper, so the hover zoom on the image itself
// still scales about the picture's own centre; `children` (the swatch pill) sit above both.
function CardPhoto({ card, children }) {
  const { zoom = 1, origin = "50% 50%" } = card;
  return (
    <div className="relative aspect-[5/4] overflow-hidden">
      <div className="absolute inset-0" style={{ transform: `scale(${zoom})`, transformOrigin: origin }}>
        <Image
          src={card.product.image}
          alt=""
          fill
          sizes="(min-width: 1280px) 20vw, 250px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: card.position }}
        />
      </div>
      {children}
    </div>
  );
}

function GarmentCard({ card, index }) {
  const [colour, setColour] = useState(card.swatches[0]);
  const href = `/atelier?garment=${card.garment}&colour=${encodeURIComponent(colour.hex)}`;

  return (
    <li className={`${cardShell} ${mobileSlot}`} style={{ animationDelay: `${index * 90 + 150}ms` }}>
      <CardPhoto card={card}>
        <SwatchPill card={card} colour={colour} onPick={setColour} />
      </CardPhoto>
      <div className="flex flex-1 flex-col px-4 pb-3.5 pt-3.5">
        <CardText
          title={card.title}
          href={href}
          meta={priceLine([card.product])}
          srSuffix="customise in the Atelier"
        />
      </div>
    </li>
  );
}

// Sits on the image, above the card's stretched link, so the swatches stay clickable.
function SwatchPill({ card, colour, onPick }) {
  return (
    <div
      role="group"
      aria-label={`${card.title} colour`}
      className="absolute bottom-2 left-2 z-10 flex items-center rounded-full bg-white/85 px-1 shadow-[0_1px_6px_rgba(60,40,10,0.18)] backdrop-blur-sm"
    >
      {card.swatches.map((swatch) => {
        const selected = swatch.hex === colour.hex;
        return (
          <button
            key={swatch.hex}
            type="button"
            onClick={() => onPick(swatch)}
            aria-label={swatch.name}
            aria-pressed={selected}
            className="grid size-6 place-items-center rounded-full"
          >
            <span
              className={`size-3.5 rounded-full border border-pine/25 transition-transform duration-150 ${
                selected ? "scale-110 ring-2 ring-pine ring-offset-1 ring-offset-white" : ""
              }`}
              style={{ backgroundColor: swatch.hex }}
            />
          </button>
        );
      })}
    </div>
  );
}

function PhotoCard({ card, index }) {
  return (
    <li className={`${cardShell} ${mobileSlot}`} style={{ animationDelay: `${index * 90 + 150}ms` }}>
      <CardPhoto card={card} />
      <div className="flex flex-1 flex-col px-4 pb-3.5 pt-3.5">
        <CardText
          title={card.title}
          href={`/products/${card.product.slug}`}
          meta={priceLine([card.product])}
          srSuffix="view the product"
        />
      </div>
    </li>
  );
}

function AllBlanksCard({ index }) {
  return (
    <li
      className={`${mobileSlot} btn-gradient group relative flex min-h-[14rem] flex-col justify-between overflow-hidden rounded-[1.25rem] p-5 text-bone shadow-[0_22px_44px_-16px_rgba(2,24,90,0.6)] hover:-translate-y-1 motion-safe:animate-rise ${focusRing}`}
      style={{ animationDelay: `${index * 90 + 150}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 font-body text-xs font-semibold uppercase tracking-[0.16em] text-bone">
          {products.length} blanks
        </p>
        {/* Top-right, because the floating WhatsApp button lives in the bottom-right corner. */}
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-bone text-moss-deep transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <ArrowRight size={16} weight="bold" />
        </span>
      </div>
      <div>
        <h3 className="m-0 font-display text-[2rem] leading-[1.02]">
          <Link href="/collections" className="after:absolute after:inset-0 after:content-['']">
            See every blank
          </Link>
        </h3>
        <p className="m-0 mt-2 max-w-[19ch] font-body text-[0.8125rem] leading-snug text-bone">
          Tees, hoodies, vests, pants, aprons and totes &mdash; all from 100 pieces.
        </p>
      </div>
    </li>
  );
}

export function BlankRail() {
  return (
    <div className="mx-auto w-full max-w-[1120px]">
      {/* Dark pills rather than bare text: behind this row the photo can be bright snow. */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="m-0 rounded-full bg-[#04102a]/60 px-3.5 py-1.5 font-body text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          Start from a blank
        </h2>
        <p className="m-0 hidden rounded-full bg-[#04102a]/60 px-3.5 py-1.5 font-body text-[0.8125rem] text-white backdrop-blur-sm sm:block">
          Pick one, add your branding &mdash; we do the rest.
        </p>
      </div>

      {/* scroll-px keeps the snapped first card inset by the same padding the rail bleeds out of. */}
      <ul className="-mx-5 m-0 flex snap-x snap-mandatory scroll-px-5 list-none gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 xl:mx-0 xl:grid xl:scroll-px-0 xl:grid-cols-5 xl:overflow-visible xl:px-0 xl:pb-0 [&::-webkit-scrollbar]:hidden">
        {GARMENT_CARDS.map((card, i) => (
          <GarmentCard key={card.garment} card={card} index={i} />
        ))}
        {PHOTO_CARDS.map((card, i) => (
          <PhotoCard key={card.title} card={card} index={GARMENT_CARDS.length + i} />
        ))}
        <AllBlanksCard index={GARMENT_CARDS.length + PHOTO_CARDS.length} />
      </ul>
    </div>
  );
}
