"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BaseballCap,
  CoatHanger,
  Dress,
  Handbag,
  Hoodie,
  Needle,
  Package,
  Palette,
  Pants,
  Ruler,
  Scissors,
  Sneaker,
  Stamp,
  Tag,
  TShirt,
  Yarn,
} from "@phosphor-icons/react/dist/ssr";
import { ScrollReveal } from "@/components/ScrollReveal";

// A drifting row of round garment/tool chips above a large statement (layout reference: the
// Antigravity homepage). Sixteen chips, repeated twice in the track, with a sine-wave offset
// whose period divides sixteen — so when the track has moved one copy the pattern lines up
// again and the loop restarts invisibly.
const CHIPS = [
  TShirt, Scissors, Hoodie, Ruler, BaseballCap, Needle, Pants, Tag,
  Handbag, Yarn, Sneaker, Stamp, CoatHanger, Package, Dress, Palette,
];

const WAVE_PX = 26;

function Chip({ Icon, index }) {
  const lift = Math.round(Math.sin((index / CHIPS.length) * Math.PI * 4) * WAVE_PX);
  return (
    <li
      className="grid size-24 shrink-0 place-items-center rounded-full bg-pine/[0.05] text-pine"
      style={{ transform: `translateY(${lift}px)` }}
    >
      <Icon size={34} weight="light" />
    </li>
  );
}

const EDGE_FADE = "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)";

export function ChipsStatement() {
  const sectionRef = useRef(null);

  return (
    <section ref={sectionRef} className="overflow-hidden bg-paper pb-24 pt-20 md:pb-36 md:pt-28">
      {/* Decorative: the statement below carries the meaning. */}
      <div
        aria-hidden="true"
        className="py-8"
        style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
      >
        <ul className="m-0 flex w-max list-none gap-6 p-0 pr-6 motion-safe:animate-marquee">
          {[0, 1].map((copy) =>
            CHIPS.map((Icon, i) => <Chip key={`${copy}-${i}`} Icon={Icon} index={i} />),
          )}
        </ul>
      </div>

      <div className="mx-auto mt-14 max-w-[1440px] px-5 md:mt-24 md:px-8">
        <ScrollReveal
          as="p"
          triggerRef={sectionRef}
          baseOpacity={0.12}
          baseRotation={0}
          blurStrength={6}
          className="m-0 max-w-[26ch] font-display text-[clamp(2rem,4vw,3.75rem)] leading-[1.08] tracking-[-0.02em] text-pine md:max-w-[31ch]"
        >
          Kazi is the Kathmandu workshop behind small and growing clothing brands. Pick a blank, add your label, and
          we&rsquo;ll make it by hand &mdash; from just 100 pieces.
        </ScrollReveal>

        <div className="mt-10 flex flex-wrap items-center gap-3 md:mt-14">
          <Link
            href="/collections"
            className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-pine px-6 font-body text-base font-semibold text-bone transition-colors duration-200 hover:bg-pine-soft"
          >
            Browse the blanks
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
          <Link
            href="/heritage"
            className="inline-flex h-12 items-center whitespace-nowrap rounded-full bg-pine/[0.06] px-6 font-body text-base font-semibold text-pine transition-colors duration-200 hover:bg-pine/10"
          >
            See our services
          </Link>
        </div>
      </div>
    </section>
  );
}
