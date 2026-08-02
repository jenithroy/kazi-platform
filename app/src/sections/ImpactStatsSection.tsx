"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Scissors, Leaf, HeartHandshake, ShieldCheck } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  {
    value: "10",
    suffix: "",
    label: "Dedicated Tailors",
    desc: "A small, focused team of master tailors in our Kathmandu partner studio hand-crafting every custom run.",
    icon: Scissors,
  },
  {
    value: "100",
    suffix: "%",
    label: "GOTS Organic Cotton",
    desc: "Fully certified organic cotton jersey, ensuring zero toxic chemicals or synthetic blends touch the earth.",
    icon: Leaf,
  },
  {
    value: "2.5",
    suffix: "x",
    label: "Living Wage Index",
    desc: "We pay our tailors well above the average living wage, directly supporting health coverage and local education.",
    icon: HeartHandshake,
  },
  {
    value: "DFQF",
    suffix: "",
    label: "Duty-Free Export",
    desc: "Fully compliant with Nepal export regulations for tariff-free customs clearance straight to your brand hub.",
    icon: ShieldCheck,
  },
];

export default function ImpactStatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Background slow Ken Burns drift + scroll parallax
      gsap.fromTo(
        bgRef.current,
        { scale: 1.08, yPercent: -4 },
        {
          yPercent: 4,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );

      // Title fade-in
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 20 },
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

      // Vertical line draws top -> bottom, stat rows animate in as it passes them
      const items = timelineRef.current?.querySelectorAll("[data-stat-item]");
      const dots = timelineRef.current?.querySelectorAll("[data-stat-dot]");
      const lineDuration = 1.4;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: timelineRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
      });

      tl.fromTo(
        lineRef.current,
        { scaleY: 0 },
        { scaleY: 1, duration: lineDuration, ease: "power2.inOut", transformOrigin: "top" }
      );

      if (items && items.length) {
        tl.fromTo(
          items,
          { opacity: 0, x: -18 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: lineDuration / items.length,
            ease: "power2.out",
          },
          "<"
        );
      }

      if (dots && dots.length) {
        tl.fromTo(
          dots,
          { scale: 0 },
          {
            scale: 1,
            duration: 0.4,
            stagger: lineDuration / dots.length,
            ease: "back.out(2)",
          },
          "<"
        );
      }

      // Animate counter values
      const counters = timelineRef.current?.querySelectorAll("[data-counter]");
      counters?.forEach((counter) => {
        const valStr = counter.getAttribute("data-value");
        const isNumeric = !isNaN(Number(valStr));
        if (isNumeric && valStr) {
          const valNum = Number(valStr);
          const obj = { value: 0 };
          const isDecimal = valStr.includes(".");

          gsap.to(obj, {
            value: valNum,
            duration: 1.8,
            ease: "power1.out",
            scrollTrigger: {
              trigger: counter,
              start: "top 85%",
              toggleActions: "play none none none",
            },
            onUpdate: () => {
              counter.textContent = isDecimal
                ? obj.value.toFixed(1)
                : Math.floor(obj.value).toString();
            },
          });
        } else if (valStr) {
          // If not numeric (like DFQF), do a simple letter fade-in / typewriter
          gsap.fromTo(
            counter,
            { opacity: 0 },
            {
              opacity: 1,
              duration: 1.2,
              ease: "power1.out",
              scrollTrigger: {
                trigger: counter,
                start: "top 85%",
              },
            }
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="flex flex-col justify-center"
      style={{
        backgroundColor: "#1B3D2A", // Brand forest green/espresso
        minHeight: "100vh",
        paddingTop: "96px",
        paddingBottom: "96px",
        color: "#EBF3EC", // Cream text
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background atelier photo */}
      <div ref={bgRef} className="absolute inset-0" style={{ zIndex: 0 }}>
        <Image
          src="/images/artisan-tailor.png"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>

      {/* Brand color wash over photo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(27,61,42,0.94) 0%, rgba(27,61,42,0.88) 45%, rgba(27,61,42,0.96) 100%)",
          zIndex: 1,
        }}
      />

      {/* Decorative grid overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#EBF3EC 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          zIndex: 1,
        }}
      />

      <div
        className="container-pad flex flex-col lg:flex-row lg:items-center gap-16 lg:gap-20"
        style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}
      >
        {/* Vertical timeline of stats (left on desktop) */}
        <div ref={timelineRef} className="relative flex-1 lg:order-1">
          {/* Animated vertical line */}
          <div
            ref={lineRef}
            className="absolute left-0 top-0 w-px"
            style={{
              height: "100%",
              backgroundColor: "rgba(235, 243, 236, 0.25)",
              transformOrigin: "top",
            }}
          />

          <div className="flex flex-col gap-10">
            {stats.map((stat) => (
              <div key={stat.label} data-stat-item className="relative pl-10">
                {/* Dot marker on the line */}
                <span
                  data-stat-dot
                  className="absolute rounded-full"
                  style={{
                    left: 0,
                    top: "6px",
                    width: "9px",
                    height: "9px",
                    backgroundColor: "#8FA89B",
                    boxShadow: "0 0 0 4px rgba(27,61,42,1), 0 0 0 5px rgba(235,243,236,0.15)",
                    transform: "translateX(-50%)",
                  }}
                />

                <div className="flex items-center gap-2 mb-1">
                  <stat.icon size={16} strokeWidth={1.5} color="#8FA89B" />
                  <h3
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      color: "#8FA89B",
                      textTransform: "uppercase",
                    }}
                  >
                    {stat.label}
                  </h3>
                </div>

                <div className="flex items-baseline mb-2">
                  <span
                    data-counter
                    data-value={stat.value}
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: "40px",
                      fontWeight: 400,
                      color: "#FFFFFF",
                      lineHeight: 1.0,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {stat.value}
                  </span>
                  {stat.suffix && (
                    <span
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: "22px",
                        fontWeight: 300,
                        color: "#8FA89B",
                        marginLeft: "2px",
                      }}
                    >
                      {stat.suffix}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 300,
                    lineHeight: 1.6,
                    color: "rgba(235, 243, 236, 0.75)",
                    maxWidth: "420px",
                  }}
                >
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Heading (right on desktop) */}
        <div ref={titleRef} className="lg:order-2 lg:w-[36%] lg:flex-shrink-0" style={{ opacity: 0 }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.25em",
              color: "#8FA89B",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Verified Impact
          </p>
          <h2
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "34px",
              fontWeight: 400,
              letterSpacing: "0.06em",
              color: "#FFFFFF",
              lineHeight: 1.3,
            }}
          >
            Atelier Standards &amp; Credentials
          </h2>
          <div
            style={{
              width: "40px",
              height: "1px",
              backgroundColor: "rgba(235, 243, 236, 0.2)",
              margin: "24px 0 0",
            }}
          />
        </div>
      </div>
    </section>
  );
}
