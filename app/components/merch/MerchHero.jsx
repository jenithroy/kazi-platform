import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { existingOr } from "@/lib/public-assets";
import { FORM_HREF, HERO_FACTS, HERO_PHOTO } from "./content";
import { BODY, BUTTON_PRIMARY, BUTTON_SECONDARY, CONTAINER, TILE } from "./styles";

export function MerchHero() {
  return (
    <section id="merch-hero" aria-labelledby="merch-hero-title" className="bg-paper pb-20 pt-10 md:pb-28 md:pt-16">
      <div className={`${CONTAINER} grid gap-10 md:grid-cols-2 md:items-center md:gap-16`}>
        <div>
          <h1
            id="merch-hero-title"
            className="m-0 text-balance font-display text-[clamp(2.75rem,6.2vw,5.25rem)] font-normal leading-[1.02] tracking-[-0.02em] text-pine"
          >
            Your merch. Made by <em className="italic">hand</em>.
          </h1>

          <p className={`${BODY} m-0 mt-6 max-w-[34rem] text-pretty`}>
            Cut-and-sew merch for creators who care what their fans wear. From 100 pieces, sampled before we sew,
            shipped worldwide.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={FORM_HREF} className={BUTTON_PRIMARY}>
              Plan your drop
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </a>
            <Link href="/atelier" className={BUTTON_SECONDARY}>
              Design it in 3D
            </Link>
          </div>

          <ul className="m-0 mt-9 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
            {HERO_FACTS.map((fact) => (
              <li key={fact} className="flex items-center gap-2 font-body text-[1.0625rem] text-pine-soft">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-moss" />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className={`relative aspect-[4/5] overflow-hidden bg-paper-raised md:justify-self-end md:w-full md:max-w-[34rem] ${TILE}`}>
          {/* Shows public/merch/hero-model-hoodie.jpg once it exists; until then the site's hoodie photo. */}
          <Image
            src={existingOr(HERO_PHOTO.src, HERO_PHOTO.fallback)}
            alt={HERO_PHOTO.alt}
            fill
            preload
            sizes="(min-width: 768px) 544px, 92vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
