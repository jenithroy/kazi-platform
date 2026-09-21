"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/SmoothScroll";
import { PageMain } from "@/components/PageMain";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";

// The root layout is shared by the public website and the internal ERP, and a nested
// layout can't remove chrome its parent rendered — so the decision has to happen here.
// The ERP is a dense, scroll-heavy admin surface: the marketing nav, footer, WhatsApp
// button, cart drawer and Lenis smooth scrolling all actively get in its way (smooth
// scrolling in particular fights sticky table headers), so /erp gets none of them.
export function SiteShell({ children }) {
  const pathname = usePathname();
  const isErp = pathname?.startsWith("/erp");

  if (isErp) {
    return (
      <main id="main-content" className="flex-1">
        {children}
      </main>
    );
  }

  return (
    <>
      <SmoothScroll>
        <Nav />
        <PageMain>{children}</PageMain>
        <Footer />
        <WhatsAppButton />
        <CartDrawer />
      </SmoothScroll>
      <CookieConsentBanner />
    </>
  );
}
