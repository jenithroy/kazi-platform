"use client";

import { usePathname } from "next/navigation";
import { SmoothScroll } from "@/components/SmoothScroll";
import { PageMain } from "@/components/PageMain";

// The public site's frame (nav, footer, floating buttons, smooth scrolling). /admin renders
// its own shell instead — and skips Lenis, which hijacks wheel scrolling inside the
// editor's text areas.
export function SiteChrome({ nav, footer, floating, overlays, children }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return children;

  // The Atelier is a full-screen, app-like canvas with its own floating dock, so it has no footer.
  // (Only the canvas itself: /atelier/quote is an ordinary scrolling form page and keeps one.)
  const showFooter = pathname?.replace(/\/$/, "") !== "/atelier";

  return (
    <>
      <SmoothScroll>
        {nav}
        <PageMain>{children}</PageMain>
        {showFooter && footer}
        {floating}
      </SmoothScroll>
      {overlays}
    </>
  );
}
