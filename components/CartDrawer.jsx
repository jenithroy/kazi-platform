"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLenis } from "lenis/react";
import { Minus, Plus, ShoppingBag, Trash, X } from "@phosphor-icons/react";
import { useCart, describeCartItems } from "@/lib/cart-context";

const filledButton =
  "inline-flex h-11 items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep";

// Sits above every other fixed/sticky layer on the site (TrustStripe and Nav top out at
// z-50/z-40, DiscountPopup at z-50) — the bag has to win that stack regardless of which page
// it's opened from.
export function CartDrawer() {
  const closeButtonRef = useRef(null);
  const { items, removeItem, updateQty, totalItems, isOpen, closeCart } = useCart();
  const lenis = useLenis();

  useEffect(() => {
    if (!isOpen) return undefined;

    // Lenis drives scroll itself via a transform, not native document scrolling — toggling
    // `overflow` alone doesn't pause it, and leaves its internal position able to drift out of
    // sync with what's on screen while this is open (surfaces later as scrolling that
    // intermittently stops responding). `lenis.stop()/.start()` is Lenis's own documented way
    // to pause it; the `overflow` toggle stays as the fallback for when Lenis isn't mounted at
    // all (prefers-reduced-motion, see SmoothScroll.tsx).
    lenis?.stop();
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") closeCart();
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      lenis?.start();
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeCart, lenis]);

  const requestQuoteHref = `/quote?details=${encodeURIComponent(describeCartItems(items))}`;

  return (
    <>
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={`fixed inset-0 z-[70] bg-pine/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bag"
        className={`fixed top-0 right-0 z-[71] flex h-full w-full flex-col bg-paper shadow-2xl transition-transform duration-300 ease-out sm:w-[420px] sm:max-w-[90vw] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-[var(--nav-height)] shrink-0 items-center justify-between border-b border-pine/15 px-6">
          <h2 className="font-display text-xl text-pine">
            Your Bag{items.length > 0 ? ` (${items.length})` : ""}
          </h2>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={closeCart}
            aria-label="Close bag"
            className="inline-flex h-9 w-9 items-center justify-center text-pine transition-colors hover:bg-bone"
          >
            <X size={20} weight="regular" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag size={40} weight="thin" className="text-pine-soft" />
            <p className="font-display text-lg text-pine">Your bag is empty</p>
            <Link href="/atelier" onClick={closeCart} className={`${filledButton} mt-2`}>
              Enter the Atelier
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <ul className="space-y-5">
                {items.map((item) => (
                  <li key={item.id} className="flex gap-3 border-b border-pine/10 pb-5 last:border-b-0 last:pb-0">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-paper-raised">
                      {item.image && (
                        <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-pine">{item.name}</p>
                      {(item.color || item.size) && (
                        <p className="mb-2 font-body text-xs text-pine-soft">
                          {[item.color, item.size].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {item.price && (
                        <p className="mb-2 font-body text-xs font-medium tabular-nums text-pine-soft">{item.price}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-sm border border-pine/15">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                            className="flex h-7 w-7 items-center justify-center text-pine transition-colors hover:bg-bone"
                          >
                            <Minus size={11} weight="regular" />
                          </button>
                          <span className="w-8 text-center font-body text-xs font-medium tabular-nums text-pine">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                            className="flex h-7 w-7 items-center justify-center text-pine transition-colors hover:bg-bone"
                          >
                            <Plus size={11} weight="regular" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name} from bag`}
                          className="text-pine-soft transition-colors hover:text-pine"
                        >
                          <Trash size={16} weight="regular" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="shrink-0 border-t border-pine/15 px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-body text-xs tracking-[0.12em] text-pine-soft uppercase">Total units</span>
                <span className="font-body text-sm font-medium tabular-nums text-pine">{totalItems}</span>
              </div>
              <Link href={requestQuoteHref} onClick={closeCart} className={`${filledButton} w-full`}>
                Request Bulk Quote
              </Link>
              <p className="mt-2 text-center font-body text-xs text-pine-soft">No obligation. We reply within 24 hours.</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
