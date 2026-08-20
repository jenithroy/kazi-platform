"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LENIS_OPTIONS = {
  lerp: 0.1,
  duration: 1.2,
  smoothWheel: true,
};

// GSAP ScrollTrigger and Lenis each keep their own idea of "current scroll" in sync by
// default — fine until something (e.g. CraftedBySection's `snap`) makes ScrollTrigger
// *write* a scroll position. Without this bridge that write goes straight to the native
// `window.scrollTo`, which Lenis's independent rAF loop doesn't know about; on the very
// next frame Lenis overwrites it back to its own stale target, and the two loops fight —
// visible as scrolling that intermittently locks up around pinned/snapped sections. Routing
// GSAP's scroll reads/writes through Lenis (scrollerProxy) and driving Lenis off GSAP's own
// ticker (instead of a second, independent requestAnimationFrame loop) keeps both in lockstep.
function LenisScrollTriggerBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value, { immediate: true, force: true });
          return;
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
      pinType: "fixed",
    });

    function onLenisScroll() {
      ScrollTrigger.update();
    }
    lenis.on("scroll", onLenisScroll);

    function onGsapTick(time) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(onGsapTick);
    gsap.ticker.lagSmoothing(0);

    function onRefresh() {
      lenis.resize();
    }
    ScrollTrigger.addEventListener("refresh", onRefresh);
    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onLenisScroll);
      gsap.ticker.remove(onGsapTick);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
    };
  }, [lenis]);

  return null;
}

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
    <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS} autoRaf={false}>
      <LenisScrollTriggerBridge />
      {children}
    </ReactLenis>
  );
}
