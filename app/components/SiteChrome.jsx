"use client";

import { usePathname } from "next/navigation";
import { SmoothScroll } from "@/components/SmoothScroll";
import { PageMain } from "@/components/PageMain";

// The public site's frame (nav, footer, floating buttons, smooth scrolling). /admin renders
// its own shell instead — and skips Lenis, which hijacks wheel scrolling inside the
// editor's text areas.
export function SiteChrome({ nav, footer, overlays, children }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return children;

  return (
    <>
      <SmoothScroll>
        {nav}
        <PageMain>{children}</PageMain>
        {footer}
      </SmoothScroll>
      {overlays}
    </>
  );
}
