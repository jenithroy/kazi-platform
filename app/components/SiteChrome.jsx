"use client";

import { usePathname } from "next/navigation";
import { SmoothScroll } from "@/components/SmoothScroll";
import { PageMain } from "@/components/PageMain";

// Full-screen, app-like canvases: the page IS the tool, with its controls floating over it, so they
// have no footer. Only the canvases themselves: /atelier/quote is an ordinary scrolling form page
// and keeps one.
const FOOTERLESS = new Set(["/atelier", "/digitizer"]);

// The public site's frame (nav, footer, floating buttons, smooth scrolling). /admin renders
// its own shell instead — and skips Lenis, which hijacks wheel scrolling inside the
// editor's text areas.
export function SiteChrome({ nav, footer, floating, overlays, children }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return children;

  const showFooter = !FOOTERLESS.has(pathname?.replace(/\/$/, "") ?? "");

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
