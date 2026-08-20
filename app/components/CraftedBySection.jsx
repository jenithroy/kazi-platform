"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Reveal } from "@/components/Reveal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CRAFTED_IMAGES = [
  "/images/crafted-by/hands-1.jpeg",
  "/images/crafted-by/hands-2.jpeg",
  "/images/crafted-by/hands-3.jpeg",
];

export function CraftedBySection() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const cardRefs = useRef([]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 768px)",
          noMotion: "(prefers-reduced-motion: reduce)",
        },
        ({ conditions: { isDesktop, noMotion } }) => {
          const cards = cardRefs.current.filter(Boolean);
          // Fewer than 2 cards, or a smaller/reduced-motion viewport: fall
          // back to the plain stacked layout the markup already renders.
          if (!isDesktop || noMotion || cards.length < 2) return;

          // Take the cards out of normal flow so they can stack on top of
          // one another in the same centered spot, instead of scrolling past.
          gsap.set(stage, { position: "relative", height: "70dvh" });
          gsap.set(cards, { position: "absolute", inset: 0, width: "100%", height: "100%" });
          gsap.set(cards, { opacity: 0, y: 40 });
          gsap.set(cards[0], { opacity: 1, y: 0 });

          const steps = cards.length;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => `+=${steps * window.innerHeight}`,
              scrub: 0.6,
              pin: true,
              snap: { snapTo: 1 / (steps - 1), duration: 0.35, ease: "power1.inOut" },
              invalidateOnRefresh: true,
            },
          });

          // fromTo (not to) on both sides: a plain .to() captures its "from" value
          // at construction time, when every card but the first still sits at the
          // opacity:0 set above — it would animate 0 -> 0 and never actually show.
          cards.forEach((card, i) => {
            if (i === 0) return;
            tl.fromTo(cards[i - 1], { opacity: 1 }, { opacity: 0, duration: 1 }, i - 1).fromTo(
              card,
              { opacity: 0, y: 40 },
              { opacity: 1, y: 0, duration: 1 },
              i - 1,
            );
          });

          return () => tl.scrollTrigger?.kill();
        },
      );

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} data-nav-theme="dark" className="bg-pine">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16 md:px-8 md:py-0">
        <div className="flex items-center md:sticky md:top-0 md:h-dvh">
          <Reveal
            as="h2"
            className="m-0 font-display text-3xl leading-[1.2] text-bone md:text-4xl lg:text-[2.75rem]"
          >
            Crafted By Hands that have done this for decades
          </Reveal>
        </div>

        <div ref={stageRef} className="flex flex-col gap-6 md:gap-8">
          {CRAFTED_IMAGES.map((src, index) => (
            <div
              key={src}
              ref={(el) => (cardRefs.current[index] = el)}
              className="relative aspect-[4/5] w-full shrink-0 overflow-hidden border border-bone/10 bg-bone/5 md:aspect-auto md:h-[58dvh]"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
