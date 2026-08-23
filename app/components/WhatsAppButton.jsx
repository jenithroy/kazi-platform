"use client";

import { usePathname } from "next/navigation";
import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

const WHATSAPP_NUMBER = "447442435738";
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
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-moss text-pine shadow-lg transition-all hover:scale-105 hover:bg-moss-deep sm:right-6"
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
