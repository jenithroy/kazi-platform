"use client";

import { useRef } from "react";
import Image from "next/image";
import { ScrollReveal } from "@/components/ScrollReveal";

export function StatementSection() {
  const sectionRef = useRef(null);

  return (
    <section
      ref={sectionRef}
      data-nav-theme="dark"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-24"
    >
      <Image
        src="/images/wide-angle.jpeg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />

      <ScrollReveal
        as="p"
        triggerRef={sectionRef}
        baseOpacity={0}
        baseRotation={0}
        blurStrength={10}
        className="relative z-10 m-0 max-w-4xl text-center font-display text-2xl leading-[1.5] text-bone sm:text-3xl md:text-4xl lg:text-[2.75rem]"
      >
        Not just a factory. A creative partner who treats your brand&rsquo;s vision as carefully as we treat the fabric it&rsquo;s made from.
      </ScrollReveal>
    </section>
  );
}
