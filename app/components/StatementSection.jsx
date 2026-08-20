"use client";

import { useRef } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";

export function StatementSection() {
  const sectionRef = useRef(null);

  return (
    <section ref={sectionRef} className="flex min-h-screen items-center justify-center bg-paper px-6 py-24">
      <ScrollReveal
        as="p"
        triggerRef={sectionRef}
        baseOpacity={0}
        baseRotation={0}
        blurStrength={10}
        className="m-0 max-w-4xl text-center font-display text-2xl leading-[1.5] text-pine sm:text-3xl md:text-4xl lg:text-[2.75rem]"
      >
        Not just a factory. A creative partner who treats your brand&rsquo;s vision as carefully as we treat the fabric it&rsquo;s made from.
      </ScrollReveal>
    </section>
  );
}
