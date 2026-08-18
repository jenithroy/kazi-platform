"use client";

import { usePathname } from "next/navigation";
import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

// TODO: replace with the real business WhatsApp number (international format, digits only,
// e.g. "447123456789" for a UK mobile) before launch.
const WHATSAPP_NUMBER = "000000000000";
const WHATSAPP_MESSAGE = "Hi Kazi Manufacturing, I'd like to talk about a custom order.";

export function WhatsAppButton() {
  // The Atelier has its own floating dock (with its own "Get a Quote" button) anchored near
  // the bottom of the screen — sit just high enough there to clear it.
  const isAtelier = usePathname().startsWith("/atelier");

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 sm:right-6"
      style={{
        bottom: isAtelier
          ? "calc(100px + env(safe-area-inset-bottom))"
          : "calc(20px + env(safe-area-inset-bottom))",
      }}
    >
      <WhatsappLogo size={30} weight="fill" />
    </a>
  );
}
