"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { SITE_PHONE_DIGITS } from "@/lib/site";
import { useCookieConsent } from "@/lib/cookie-consent";

const WHATSAPP_MESSAGE = "Hi Kazi Manufacturing, I'd like to talk about a custom order.";

// The cookie banner stacks its text above its buttons below this width (matches the `sm:`
// breakpoint the banner itself switches layout at), so it's taller here than on desktop.
const DESKTOP_QUERY = "(min-width: 640px)";

export function WhatsAppButton() {
  // The Atelier has its own floating dock (with its own "Get a Quote" button) anchored near
  // the bottom of the screen — sit just high enough there to clear it.
  const isAtelier = usePathname().startsWith("/atelier");
  const { bannerVisible } = useCookieConsent();
  // Starts false on both the server-prerendered pass and the client's initial hydration pass
  // (they must match), then reads the real value once mounted — same pattern SmoothScroll
  // uses for prefers-reduced-motion.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDesktop(query.matches);
    const onChange = (e) => setIsDesktop(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  let bottom = isAtelier ? 100 : 20;
  if (bannerVisible) bottom += isDesktop ? 148 : 232;

  return (
    <a
      href={`https://wa.me/${SITE_PHONE_DIGITS}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-moss-deep text-bone shadow-lg transition-all hover:scale-105 hover:bg-pine sm:right-6"
      style={{ bottom: `calc(${bottom}px + env(safe-area-inset-bottom))` }}
    >
      <WhatsappLogo size={30} weight="fill" />
    </a>
  );
}
