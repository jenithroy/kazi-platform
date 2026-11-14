"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { HOME_FAQS } from "@/lib/home-faqs";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="bg-white px-6 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[760px]">
        <Reveal className="mb-14 text-center md:mb-20">
          <h2 className="m-0 font-display text-3xl leading-[1.2] text-pine md:text-4xl lg:text-[2.75rem]">
            Common questions, answered.
          </h2>
        </Reveal>

        <div className="border-t border-pine/10">
          {HOME_FAQS.map((item, index) => {
            const isOpen = index === openIndex;
            return (
              <Reveal key={item.q} as="div" delay={index * 60} className="border-b border-pine/10">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span className="font-display text-lg leading-snug text-pine md:text-xl">{item.q}</span>
                  {/* A plus that turns into an ×. It is a stroked vector, not two 1px-thin divs: those
                      are centred with a half-pixel offset, so depending on where a row lands on the
                      pixel grid (window width, display scaling) one bar could render faint or vanish. */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={`h-5 w-5 shrink-0 text-moss transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    <path d="M10 1.5v17M1.5 10h17" />
                  </svg>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="m-0 max-w-[34rem] pb-6 font-body text-sm leading-relaxed text-pine-soft md:text-base">
                      {item.a}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
