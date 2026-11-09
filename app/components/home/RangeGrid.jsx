import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";
import { getProductBySlug, products } from "@/lib/products";
import { priceLine } from "@/components/home/catalogue";

// Layout reference: the Antigravity case-study grid — a heading row, then rounded image tiles,
// each with its title, one line of detail and an arrow underneath (not over the picture: the
// photos are light, and a dark overlay would smear the product).
//
// One tile per product in the catalogue (lib/products.js: each has a real white-label photo, 3:4
// portraits, so nothing is cropped), each linking to its own product page, plus a closing tile
// for the full collection.
const TILES = [
  { slug: "organic-crew-tee", title: "T-shirts" },
  { slug: "long-sleeve-tee", title: "Long sleeves" },
  { slug: "essential-hoodie", title: "Hoodies" },
  { slug: "utility-vest", title: "Vests" },
  { slug: "sweatpants", title: "Pants" },
  { slug: "work-apron", title: "Aprons" },
  { slug: "canvas-tote", title: "Tote bags" },
].map((tile) => ({ ...tile, product: getProductBySlug(tile.slug) }));

const ringOnFocus =
  "has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-pine has-[a:focus-visible]:ring-offset-4";

function Tile({ tile, index }) {
  return (
    <Reveal
      as="li"
      delay={(index % 4) * 80}
      className={`group relative flex flex-col gap-3 rounded-[1.25rem] md:rounded-[1.75rem] ${ringOnFocus}`}
    >
      {/* The hairline (an overlay, so the photo can't cover it) keeps a photo with a white
          background, like the vest, reading as a tile against the white section. */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.25rem] bg-paper-raised after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-pine/10 after:content-[''] md:rounded-[1.75rem]">
        <Image
          src={tile.product.image}
          alt=""
          fill
          sizes="(min-width: 768px) 24vw, 46vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-[1.5rem] leading-none tracking-[-0.01em] text-pine md:text-[1.875rem]">
            <Link href={`/products/${tile.slug}`} className="after:absolute after:inset-0 after:content-['']">
              {tile.title}
            </Link>
          </h3>
          <p className="m-0 mt-1.5 font-body text-[0.875rem] text-pine-soft md:text-[0.9375rem]">
            {priceLine([tile.product])}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-pine text-bone transition-colors duration-200 group-hover:bg-moss-deep md:size-11"
        >
          <ArrowUpRight size={18} weight="bold" />
        </span>
      </div>
    </Reveal>
  );
}

// The last tile: stretches to the height of its row, so it lines up with the photo tiles.
function CollectionTile({ index }) {
  return (
    <Reveal
      as="li"
      delay={(index % 4) * 80}
      className={`btn-gradient group relative flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-[1.25rem] p-5 text-bone md:rounded-[1.75rem] md:p-7 ${ringOnFocus}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 font-body text-xs font-semibold uppercase tracking-[0.16em] text-bone">
          {products.length} ready-to-order styles
        </p>
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-bone text-moss-deep transition-transform duration-200 group-hover:translate-x-0.5 md:size-11"
        >
          <ArrowRight size={18} weight="bold" />
        </span>
      </div>
      <div>
        <h3 className="m-0 font-display text-[1.875rem] leading-[1.02] md:text-[2.5rem]">
          <Link href="/collections" className="after:absolute after:inset-0 after:content-['']">
            See the full collection
          </Link>
        </h3>
        <p className="m-0 mt-2 max-w-[22ch] font-body text-[0.9375rem] leading-snug text-bone">
          Or tell us what you need and we&rsquo;ll make it.
        </p>
      </div>
    </Reveal>
  );
}

export function RangeGrid() {
  return (
    <section aria-labelledby="range-title" className="bg-white pb-16 pt-24 md:pb-20 md:pt-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <Reveal className="mb-10 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-3 block font-body text-xs font-semibold uppercase tracking-[0.18em] text-moss-deep">
              The range
            </span>
            <h2
              id="range-title"
              className="m-0 max-w-[18ch] text-balance font-display text-[clamp(2.125rem,4vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em] text-pine"
            >
              A blank for every kind of label.
            </h2>
          </div>
          <Link
            href="/collections"
            className="inline-flex h-12 w-fit items-center gap-2 whitespace-nowrap rounded-full bg-pine/[0.06] px-6 font-body text-base font-semibold text-pine transition-colors duration-200 hover:bg-pine/10"
          >
            View all products
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </Reveal>

        <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 md:grid-cols-4 md:gap-x-6 md:gap-y-12">
          {TILES.map((tile, index) => (
            <Tile key={tile.slug} tile={tile} index={index} />
          ))}
          <CollectionTile index={TILES.length} />
        </ul>
      </div>
    </section>
  );
}
