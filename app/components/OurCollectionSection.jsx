"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function OurCollectionSection() {
  const wrapperRef = useRef(null);
  const trackRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 768px)",
          noMotion: "(prefers-reduced-motion: reduce)",
        },
        ({ conditions: { isDesktop, noMotion } }) => {
          if (!isDesktop || noMotion) return;

          const track = trackRef.current;
          const wrapper = wrapperRef.current;
          const distance = track.scrollWidth - track.parentElement.clientWidth;
          if (distance <= 0) return;

          // Set directly on the DOM node instead of through React state: ScrollTrigger
          // measures this wrapper's height synchronously, in the same tick, to work out how
          // much scroll distance to reserve for the pin. Going through `useState` instead
          // would leave the old (unset) height in place until React's next render actually
          // commits it — a tick ScrollTrigger doesn't wait for — so it would size the pin to
          // the stale, too-short height. The page then runs out of room to scroll before the
          // horizontal animation finishes, which is exactly what "scrolling stops working
          // partway down the homepage" looks like from the user's side.
          wrapper.style.height = `${window.innerHeight + distance}px`;

          const tween = gsap.to(track, {
            x: -distance,
            ease: "none",
            scrollTrigger: {
              trigger: wrapper,
              start: "top top",
              end: () => `+=${distance}`,
              scrub: true,
              invalidateOnRefresh: true,
            },
          });

          return () => {
            wrapper.style.height = "";
            tween.kill();
          };
        },
      );

      return () => mm.revert();
    },
    { scope: wrapperRef },
  );

  return (
    <div ref={wrapperRef}>
      <section
        data-nav-theme="dark"
        className="overflow-hidden bg-pine py-20 md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:py-0 md:pt-[calc(var(--nav-height)+8vh)]"
      >
        <Reveal
          as="h2"
          className="m-0 px-6 text-center font-display text-3xl text-bone md:text-4xl lg:text-[2.75rem]"
        >
          Our Collection
        </Reveal>

        <div className="mt-10 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:mt-14 md:overflow-hidden [&::-webkit-scrollbar]:hidden">
          <div ref={trackRef} className="flex w-max gap-6 px-6 md:gap-8 md:px-8">
            {products.map((product) => (
              <div key={product.slug} className="w-56 shrink-0 rounded-sm bg-paper p-4 sm:w-64 md:w-72">
                <ProductCard product={product} />
              </div>
            ))}

            <Link
              href="/collections"
              className="flex w-56 shrink-0 flex-col items-center justify-center gap-3 rounded-sm border border-bone/20 p-4 text-center transition-colors hover:bg-bone/5 sm:w-64 md:w-72"
            >
              <span className="font-display text-xl text-bone">View All</span>
              <span className="font-body text-xs uppercase tracking-[0.14em] text-bone/70">
                Browse the Collection →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
