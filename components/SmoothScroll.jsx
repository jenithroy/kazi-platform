"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";

const LENIS_OPTIONS = {
  lerp: 0.1,
  duration: 1.2,
  smoothWheel: true,
};

export function SmoothScroll({ children }) {
  const lenisRef = useRef(null);
  const pathname = usePathname();
  // Starts false on both the server-prerendered pass and the client's initial hydration pass
  // (they must match), then reads the real value once mounted.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // window.matchMedia doesn't exist during SSR, so this can't be a lazy useState
    // initializer — same legitimate post-mount-read exception as cart-context.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Cross-route navigation (e.g. Nav's "Our Heritage" link) should land at the top of the
  // new page, not wherever the previous page happened to be scrolled to.
  useEffect(() => {
    if (prefersReducedMotion) return;
    lenisRef.current?.lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [pathname, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    // Lenis's own `anchors` option doesn't call preventDefault, so the browser's instant
    // native jump fires first and Lenis's animation visibly corrects it a frame later.
    // Handling the click ourselves avoids that double-motion.
    function handleClick(event) {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;

      const hash = anchor.getAttribute("href");
      if (!hash || hash.length < 2) return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      lenisRef.current?.lenis?.scrollTo(target);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return children;
  }

  return (
    <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
