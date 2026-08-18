"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { Reveal } from "@/components/Reveal";

gsap.registerPlugin(ScrollTrigger);

const PROCESS_STEPS = [
  {
    title: "Brief & Quote",
    description:
      "Share your tech pack, fabric specs and quantities. We reply with a clear, itemised quote — no hidden costs.",
  },
  {
    title: "Sampling & Approval",
    description:
      "Pattern, fabric and stitch samples refined until every detail matches your vision — signed off by you before we cut a single yard.",
  },
  {
    title: "Production",
    description:
      "Small-batch cutting and sewing, hand-finished by our core tailoring team in Kathmandu — the same hands, start to finish.",
  },
  {
    title: "Quality Control",
    description: "Every unit checked against your approved tech pack before it's cleared for packing.",
  },
  {
    title: "Finishing & Delivery",
    description: "Pressed, tagged, packed and shipped on schedule — ready to land on your shelves.",
  },
];

export function ProcessSection() {
  const sectionRef = useRef(null);
  const listRef = useRef(null);
  const fillRef = useRef(null);
  const markerRefs = useRef([]);
  const stepRefs = useRef([]);

  // Keep ScrollTrigger's scroll position in sync with Lenis's smoothed scroll
  // (SmoothScroll.jsx drives the page with Lenis instead of native scroll).
  useLenis(ScrollTrigger.update);

  useEffect(() => {
    const list = listRef.current;
    const fill = fillRef.current;
    if (!list || !fill) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Reduced-motion users get every step fully visible and static — the
      // markup already renders that way, so this branch simply never runs.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let thresholds = [];

        const measure = () => {
          const total = list.offsetHeight;
          const listTop = list.getBoundingClientRect().top;
          thresholds = markerRefs.current.map((marker) => {
            if (!marker || !total) return 0;
            return (marker.getBoundingClientRect().top - listTop) / total;
          });
        };

        const setActive = (progress) => {
          stepRefs.current.forEach((step, i) => {
            if (!step) return;
            const isActive = progress >= thresholds[i];
            step.classList.toggle("opacity-100", isActive);
            step.classList.toggle("opacity-35", !isActive);

            const marker = markerRefs.current[i];
            if (marker) {
              marker.classList.toggle("bg-moss", isActive);
              marker.classList.toggle("border-moss", isActive);
              marker.classList.toggle("bg-white", !isActive);
              marker.classList.toggle("border-pine/20", !isActive);
            }
          });
        };

        measure();
        setActive(0);

        const trigger = ScrollTrigger.create({
          trigger: list,
          start: "top 75%",
          end: "bottom 60%",
          scrub: 0.6,
          onRefreshInit: measure,
          onUpdate: (self) => {
            fill.style.height = `${self.progress * 100}%`;
            setActive(self.progress);
          },
        });

        return () => trigger.kill();
      });

      return () => mm.revert();
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-pine to-white md:h-56"
      />

      <div className="relative mx-auto max-w-[1100px] px-6 py-24 md:px-8 md:py-32">
        <Reveal className="mb-16 max-w-xl md:mb-20">
          <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss">
            The Process Behind the Craft
          </span>
          <h2 className="m-0 font-display text-3xl leading-[1.2] text-pine md:text-4xl lg:text-[2.75rem]">
            From your first brief to garments on the shelf.
          </h2>
        </Reveal>

        <ol ref={listRef} className="relative m-0 list-none p-0 pl-10 md:pl-14">
          <div className="absolute left-0 top-1 bottom-1 w-px bg-pine/10" />
          <div ref={fillRef} className="absolute left-0 top-1 w-px bg-moss" style={{ height: 0 }}>
            <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-moss shadow-[0_0_10px_2px_rgba(63,143,92,0.55)]" />
          </div>

          {PROCESS_STEPS.map((step, index) => (
            <li
              key={step.title}
              ref={(el) => (stepRefs.current[index] = el)}
              className="relative pb-14 opacity-100 transition-opacity duration-500 last:pb-0 md:pb-16"
            >
              <span
                ref={(el) => (markerRefs.current[index] = el)}
                className="absolute -left-10 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-pine/20 bg-white transition-colors duration-500 md:-left-14"
              />
              <span className="mb-2 block font-body text-sm font-medium tabular-nums text-moss">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="m-0 mb-2 font-display text-xl text-pine md:text-2xl">{step.title}</h3>
              <p className="m-0 max-w-md font-body text-sm leading-relaxed text-pine-soft md:text-base">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
