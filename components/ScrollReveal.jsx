"use client";

import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";

gsap.registerPlugin(ScrollTrigger);

export function ScrollReveal({
  children,
  as: Tag = "p",
  className = "",
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
  // Element whose scroll range drives the animation. Defaults to the text
  // itself, but that's often too short to scrub smoothly over — pass the
  // ref of a taller ancestor (e.g. a fullscreen section) for a longer,
  // more visible reveal as the user scrolls past it.
  triggerRef,
}) {
  const containerRef = useRef(null);

  // Keep ScrollTrigger's scroll position in sync with Lenis's smoothed scroll
  // (SmoothScroll.jsx drives the page with Lenis instead of native scroll).
  useLenis(ScrollTrigger.update);

  const words = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    return text.split(/(\s+)/).map((word, index) =>
      /^\s+$/.test(word) ? (
        word
      ) : (
        <span className="word inline-block" key={index}>
          {word}
        </span>
      ),
    );
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const trigger = triggerRef?.current || el;
    const wordElements = el.querySelectorAll(".word");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { transformOrigin: "0% 50%", rotate: baseRotation },
        {
          ease: "none",
          rotate: 0,
          scrollTrigger: { trigger, start: "top bottom", end: rotationEnd, scrub: true },
        },
      );

      gsap.fromTo(
        wordElements,
        { opacity: baseOpacity },
        {
          ease: "none",
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: { trigger, start: "top bottom-=20%", end: wordAnimationEnd, scrub: true },
        },
      );

      if (enableBlur) {
        gsap.fromTo(
          wordElements,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: "none",
            filter: "blur(0px)",
            stagger: 0.05,
            scrollTrigger: { trigger, start: "top bottom-=20%", end: wordAnimationEnd, scrub: true },
          },
        );
      }
    }, el);

    return () => ctx.revert();
  }, [baseOpacity, baseRotation, blurStrength, enableBlur, rotationEnd, wordAnimationEnd, triggerRef]);

  return (
    <Tag ref={containerRef} className={className}>
      {words}
    </Tag>
  );
}
