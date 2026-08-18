"use client";

import Link from "next/link";
import { X } from "@phosphor-icons/react";

// Placeholder offer — swap the discount and terms for a real one before launch, same flag
// already used elsewhere (TrustStripe's stats, the product catalogue's prices) for unverified
// placeholder content.
const OFFER_HEADLINE = "10% Off Your First Bulk Order";
const OFFER_BODY =
  "Send us your project brief this week and we'll factor the discount into your quote.";

export function DiscountPopup({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pine/40 px-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-popup-heading"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-sm bg-bone p-6 shadow-lg"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center text-pine-soft transition-colors hover:text-pine"
        >
          <X size={18} weight="bold" />
        </button>

        <span className="font-body text-xs font-semibold tracking-[0.14em] text-moss-deep uppercase">
          Limited-Time Offer
        </span>
        <h3
          id="discount-popup-heading"
          className="mt-2 font-display text-2xl leading-[1.15] text-pine"
        >
          {OFFER_HEADLINE}
        </h3>
        <p className="mt-3 font-body text-sm leading-relaxed text-pine-soft">{OFFER_BODY}</p>

        <Link
          href="/quote"
          onClick={onClose}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold text-pine transition-colors hover:bg-moss-deep"
        >
          Claim the Offer
        </Link>
      </div>
    </div>
  );
}
