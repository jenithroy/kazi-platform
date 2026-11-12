"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { FAQS } from "./content";
import { H2 } from "./styles";

// The same accordion as the home page's FAQ (components/FaqSection.jsx), with the merch questions.
// Each question is a real button inside a heading: Tab moves between them, Enter or Space opens
// one, and aria-expanded / aria-controls tie each button to its answer.
export function MerchFaq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-white px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[760px]">
        <Reveal className="mb-14 text-center md:mb-20">
          <h2 id="faq-title" className={H2}>
            Questions, answered.
          </h2>
        </Reveal>

        <div className="border-t border-pine/10">
          {FAQS.map((item, index) => {
            const isOpen = index === openIndex;
            return (
              <div key={item.q} className="border-b border-pine/10">
                <h3 className="m-0">
                  <button
                    type="button"
                    id={`faq-button-${index}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="font-display text-lg leading-snug text-pine md:text-xl">{item.q}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`h-5 w-5 shrink-0 text-moss transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                    >
                      <path d="M10 1.5v17M1.5 10h17" />
                    </svg>
                  </button>
                </h3>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-button-${index}`}
                  aria-hidden={!isOpen}
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="m-0 max-w-[34rem] pb-6 font-body text-base leading-relaxed text-pine-soft md:text-[1.0625rem]">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
