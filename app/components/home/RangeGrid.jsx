import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { getProductBySlug } from "@/lib/products";
import { priceLine } from "@/components/home/catalogue";

// Six tiles so the grid fills its rows evenly; the full catalogue is one click away.
const TILES = [
  { slug: "organic-crew-tee", title: "T-shirts" },
  { slug: "long-sleeve-tee", title: "Long sleeves" },
  { slug: "essential-hoodie", title: "Hoodies" },
  { slug: "utility-vest", title: "Vests" },
  { slug: "sweatpants", title: "Pants" },
  { slug: "canvas-tote", title: "Tote bags" },
].map((tile) => ({ ...tile, product: getProductBySlug(tile.slug) }));

function Tile({ tile, index }) {
  const atelierHref = tile.product.garmentModel ? `/atelier?garment=${tile.product.garmentModel}` : null;

  return (
    <Reveal
      as="li"
      delay={(index % 3) * 80}
      className="group relative flex flex-col gap-3 has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-pine has-[a:focus-visible]:ring-offset-4"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-paper-raised">
        <Image
          src={tile.product.image}
          alt=""
          fill
          sizes="(min-width: 768px) 32vw, 46vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h3 className="m-0 font-body text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-pine">
          <Link href={`/products/${tile.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {tile.title}
          </Link>
        </h3>
        <p className="m-0 whitespace-nowrap font-body text-[0.8125rem] text-pine-soft">{priceLine([tile.product])}</p>
      </div>
      {/* Sits above the title's full-tile overlay link so it stays clickable. */}
      {atelierHref && (
        <Link
          href={atelierHref}
          className="relative z-10 w-fit font-body text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-moss-deep underline decoration-moss-deep/30 underline-offset-4 transition-colors hover:decoration-moss-deep"
        >
          Design this
        </Link>
      )}
    </Reveal>
  );
}

export function RangeGrid() {
  return (
    <section aria-labelledby="blanks-title" className="bg-white px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1440px]">
        <Reveal className="mb-10 md:mb-16">
          <p className="m-0 mb-3 font-body text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-pine-soft">
            Blanks
          </p>
          <h2
            id="blanks-title"
            className="m-0 max-w-[22ch] text-balance font-display text-[clamp(2rem,3.5vw,3.25rem)] font-normal leading-[1.06] tracking-[-0.02em] text-pine"
          >
            Start with a blank, cut and sewn in Kathmandu.
          </h2>
        </Reveal>

        <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 md:grid-cols-3 md:gap-x-6 md:gap-y-12">
          {TILES.map((tile, index) => (
            <Tile key={tile.slug} tile={tile} index={index} />
          ))}
        </ul>

        <div className="mt-14 flex justify-center md:mt-20">
          <Link
            href="/collections"
            className="inline-flex h-12 items-center whitespace-nowrap border border-pine px-8 font-body text-sm font-semibold uppercase tracking-[0.14em] text-pine transition-colors duration-200 hover:bg-pine hover:text-bone"
          >
            See all blanks
          </Link>
        </div>
      </div>
    </section>
  );
}
