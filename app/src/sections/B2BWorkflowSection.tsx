"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CometCard } from "@/components/ui/comet-card";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    num: "01",
    title: "Upload Your Pattern",
    desc: "Submit your custom tech pack (DXF, AI, PDF) or customize one of our pre-made archetypes to define your base silhouette.",
    image: "/images/tech-sketch.png",
  },
  {
    num: "02",
    title: "Visualize in 3D",
    desc: "Review your garment inside our digital workshop. Toggle colors, drape fits, and verify fabric weights before stitching.",
    image: "/images/virtual-rendering.png",
  },
  {
    num: "03",
    title: "Kathmandu Sampling",
    desc: "Our master tailors craft a physical prototype from premium organic yarn to validate touch, weight, and sizing accuracy.",
    image: "/images/artisan-tailor.png",
  },
];

export default function B2BWorkflowSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header fade-in
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // Steps staggered slide-up
      const cards = gridRef.current?.querySelectorAll("[data-step-card]");
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 60, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 80%",
              toggleActions: "play none none none",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen flex-col justify-center"
      style={{
        backgroundColor: "#FFFFFF",
        paddingTop: "96px",
        paddingBottom: "96px",
        borderTop: "1px solid #D6E6D8",
        borderBottom: "1px solid #D6E6D8",
      }}
    >
      <div className="container-pad w-full" style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16" style={{ opacity: 0 }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              color: "#3A7D44",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            How We Work
          </p>
          <h2
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "28px",
              fontWeight: 400,
              letterSpacing: "0.08em",
              color: "#1A1A1A",
              lineHeight: 1.3,
            }}
          >
            Co-Creation Pipeline
          </h2>
          <div
            style={{
              width: "40px",
              height: "1px",
              backgroundColor: "#C2D6C6",
              margin: "24px auto 0",
            }}
          />
        </div>

        {/* Steps Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8"
        >
          {steps.map((step) => (
            <CometCard key={step.num} className="w-full">
              <div
                data-step-card
                className="flex w-full flex-col items-stretch rounded-[16px] border-0 bg-[#1F2121] p-3 saturate-0 md:p-4"
                style={{ opacity: 0 }}
              >
                {/* Step Image */}
                <div className="mx-1 flex-1">
                  <div className="relative mt-1 aspect-[3/4] w-full">
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className="rounded-[16px] bg-black object-cover contrast-75"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <span className="font-cinzel absolute left-4 top-4 text-5xl font-light leading-none text-white/30">
                      {step.num}
                    </span>
                  </div>
                </div>

                {/* Title & Number */}
                <div className="mt-2 flex flex-shrink-0 items-center justify-between px-1 py-4 font-mono text-white">
                  <div className="text-xs uppercase tracking-wide">{step.title}</div>
                  <div className="text-xs text-gray-300 opacity-50">#{step.num}</div>
                </div>

                {/* Description */}
                <p
                  className="font-inter px-1 pb-1 text-white/50"
                  style={{ fontSize: "12.5px", fontWeight: 300, lineHeight: 1.7 }}
                >
                  {step.desc}
                </p>
              </div>
            </CometCard>
          ))}
        </div>

      </div>
    </section>
  );
}
