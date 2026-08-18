"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";

const FAQS = [
  {
    q: "What's your minimum order quantity?",
    a: "We take on small-batch runs starting from 50 units per style, so new and growing brands can order without over-committing to stock.",
  },
  {
    q: "Do you make samples before full production?",
    a: "Yes — every order goes through pattern, fabric and stitch samples first. Nothing is cut at scale until you've signed off on the final sample.",
  },
  {
    q: "How long does production take?",
    a: "Timelines depend on the style, quantity and finishes, but most orders move from approved sample to packed goods within a few weeks. We'll give you a firm date in your quote.",
  },
  {
    q: "Can you handle private label and custom branding?",
    a: "Yes. Woven or printed labels, custom packaging and branded tags are all part of what we set up during sampling, so goods arrive ready for your shelves.",
  },
  {
    q: "Where is production based?",
    a: "Everything is cut and sewn in our own facility in Kathmandu, Nepal, by the same core tailoring team from first sample to final shipment.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes, we ship worldwide. Shipping, customs and packaging are quoted separately from unit pricing so there are no surprises on your invoice.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="bg-white px-6 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[760px]">
        <Reveal className="mb-14 text-center md:mb-20">
          <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss">FAQ</span>
          <h2 className="m-0 font-display text-3xl leading-[1.2] text-pine md:text-4xl lg:text-[2.75rem]">
            Common questions, answered.
          </h2>
        </Reveal>

        <div className="border-t border-pine/10">
          {FAQS.map((item, index) => {
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
                  <span
                    aria-hidden="true"
                    className={`relative h-5 w-5 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 bg-moss" />
                    <span className="absolute left-1/2 top-1/2 h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-moss" />
                  </span>
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
