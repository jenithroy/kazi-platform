"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power2.out",
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 75%",
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
      style={{
        backgroundColor: "#FFFFFF",
        paddingTop: "96px",
        paddingBottom: "96px",
        borderTop: "1px solid #D6E6D8",
        borderBottom: "1px solid #D6E6D8",
      }}
    >
      <div className="container-pad" style={{ maxWidth: 1200, margin: "0 auto" }}>
        
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
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {steps.map((step, index) => (
            <div
              key={step.num}
              data-step-card
              className="flex flex-col border border-rule-light bg-cream/20 p-6 relative overflow-hidden transition-all duration-300 hover:border-text-light/50"
              style={{ opacity: 0, minHeight: "420px" }}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text-light/30" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text-light/30" />

              {/* Number Overlay */}
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "48px",
                  fontWeight: 300,
                  color: "rgba(77, 107, 85, 0.15)",
                  lineHeight: 1.0,
                  marginBottom: "8px",
                }}
              >
                {step.num}
              </span>

              {/* Step Image */}
              <div
                className="relative overflow-hidden mb-6"
                style={{ width: "100%", aspectRatio: "16/10", backgroundColor: "#D6E6D8" }}
              >
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 30vw"
                />
              </div>

              {/* Title & Description */}
              <h3
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "#1A1A1A",
                  marginBottom: "12px",
                  letterSpacing: "0.04em",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12.5px",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  color: "#4D6B55",
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
