"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const fabricOptions = [
  "180gsm Cotton Jersey",
  "280gsm French Terry",
  "380gsm Loopback Fleece",
  "Organic Nettle Blend",
];

export default function SwatchBookSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Left column slide-in
      gsap.fromTo(
        leftColRef.current,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none none",
          },
        }
      );

      // Right column slide-in
      gsap.fromTo(
        rightColRef.current,
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleFabricToggle = (option: string) => {
    if (selectedFabrics.includes(option)) {
      setSelectedFabrics(selectedFabrics.filter((o) => o !== option));
    } else {
      setSelectedFabrics([...selectedFabrics, option]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !address) return;

    setLoading(true);
    // Simulate API request
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setName("");
      setEmail("");
      setAddress("");
      setSelectedFabrics([]);
    }, 1200);
  };

  return (
    <section
      ref={sectionRef}
      style={{
        backgroundColor: "#EBF3EC", // Cream background
        paddingTop: "96px",
        paddingBottom: "96px",
        borderTop: "1px solid #C2D6C6",
        borderBottom: "1px solid #C2D6C6",
      }}
    >
      <div className="container-pad" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* ── LEFT COLUMN: Swatch Book Image ── */}
          <div ref={leftColRef} style={{ opacity: 0 }} className="flex flex-col gap-4">
            <div
              className="relative bg-white border border-rule overflow-hidden flex items-center justify-center p-4"
              style={{ aspectRatio: "4/3", minHeight: 320 }}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-accent-warm z-10" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-accent-warm z-10" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-accent-warm z-10" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-accent-warm z-10" />

              <div className="relative w-full h-full">
                <Image
                  src="/images/textile-swatches.png"
                  alt="Organic Textile Swatches"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              </div>
            </div>

            {/* Micro Tags */}
            <div className="flex flex-wrap gap-2">
              {["GOTS Cotton", "Plant Dyed", "Nepal Sourced", "Fair Trade"].map((tag) => (
                <span
                  key={tag}
                  className="border border-[#7A9B82] px-2.5 py-0.5 rounded-full font-inter text-[9px] tracking-wider text-text-primary uppercase bg-white/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Lead Form ── */}
          <div ref={rightColRef} style={{ opacity: 0 }} className="flex flex-col">
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
              Atelier Discovery
            </p>
            <h2
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "28px",
                fontWeight: 400,
                letterSpacing: "0.08em",
                color: "#1A1A1A",
                lineHeight: 1.3,
                marginBottom: "16px",
              }}
            >
              Request Swatch Kit
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13.5px",
                fontWeight: 300,
                lineHeight: 1.7,
                color: "#4D6B55",
                marginBottom: "28px",
              }}
            >
              Examine our weaving textures, feel the raw weights, and review plant-based botanical color saturation in your own design studio before sketching.
            </p>

            {submitted ? (
              <div
                className="p-6 border border-accent-warm/40 bg-accent-warm/5 flex flex-col items-center justify-center text-center animate-fade-in"
                style={{ minHeight: "260px" }}
              >
                <div
                  className="w-10 h-10 border border-accent-warm/40 flex items-center justify-center rounded-full mb-4"
                  style={{ backgroundColor: "rgba(58, 125, 68, 0.1)" }}
                >
                  <Check className="w-5 h-5 text-accent-warm" />
                </div>
                <h3 className="font-cinzel text-base text-espresso mb-1">Request Received</h3>
                <p className="font-inter text-xs text-text-muted max-w-sm">
                  Your swatch kit request has been dispatched to our Kathmandu studio. A tracking number will be emailed shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Inputs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-rule-light px-4 py-3 font-inter text-xs tracking-wide focus:outline-none focus:border-text-light"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Studio Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-rule-light px-4 py-3 font-inter text-xs tracking-wide focus:outline-none focus:border-text-light"
                  />
                </div>

                <input
                  type="text"
                  required
                  placeholder="Studio Shipping Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-rule-light px-4 py-3 font-inter text-xs tracking-wide focus:outline-none focus:border-text-light"
                />

                {/* Fabric Selection */}
                <div>
                  <p className="font-inter text-[9px] tracking-widest text-text-light uppercase mb-2">
                    Select Fabrics of Interest
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {fabricOptions.map((opt) => {
                      const isSelected = selectedFabrics.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleFabricToggle(opt)}
                          className={`px-3 py-2.5 border text-left font-inter text-[10.5px] transition-colors ${
                            isSelected
                              ? "bg-espresso border-espresso text-cream"
                              : "bg-white border-rule-light text-text-muted hover:border-espresso/40"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-espresso text-cream font-inter text-xs tracking-button uppercase py-4 hover:bg-accent-warm disabled:opacity-50 transition-colors duration-200"
                >
                  {loading ? "Registering..." : "Order Swatch Kit"}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
