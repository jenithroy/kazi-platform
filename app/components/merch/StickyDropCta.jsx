"use client";

import { useEffect, useState } from "react";
import { FORM_HREF, FORM_ID } from "./content";
import { BUTTON_PRIMARY } from "./styles";

// How far the site's floating WhatsApp button is lifted while this bar is showing, so the two
// never overlap. components/WhatsAppButton.jsx reads it from <html> as --merch-cta-offset.
const OFFSET = "64px";

// Phones only: a "Plan your drop" bar pinned to the bottom of the screen. It stays out of the
// way while the hero (which has its own button), the form itself or the footer is on screen.
export function StickyDropCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const targets = [document.getElementById("merch-hero"), document.getElementById(FORM_ID), document.querySelector("footer")].filter(Boolean);
    const onScreen = new Set();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      setVisible(onScreen.size === 0);
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 767px)");
    const root = document.documentElement;
    function apply() {
      if (visible && phone.matches) root.style.setProperty("--merch-cta-offset", OFFSET);
      else root.style.removeProperty("--merch-cta-offset");
    }
    apply();
    phone.addEventListener("change", apply);
    return () => {
      phone.removeEventListener("change", apply);
      root.style.removeProperty("--merch-cta-offset");
    };
  }, [visible]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[39] border-t border-pine/10 bg-bone px-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 transition-[translate,visibility] duration-300 md:hidden ${
        visible ? "visible translate-y-0" : "invisible translate-y-full"
      }`}
    >
      <a href={FORM_HREF} tabIndex={visible ? undefined : -1} className={`${BUTTON_PRIMARY} w-full`}>
        Plan your drop
      </a>
    </div>
  );
}
