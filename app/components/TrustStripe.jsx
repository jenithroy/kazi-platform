// Placeholder figures — swap for real numbers before launch.
const ITEMS = [
  "XX+ Years Manufacturing",
  "XX+ UK Brands Served",
  "XX,XXX+ Units Shipped",
  "XX+ Artisans in Kathmandu",
];

function StripeRow({ hidden = false }) {
  return (
    <div
      aria-hidden={hidden}
      className="flex shrink-0 items-center gap-8 pr-8"
    >
      {ITEMS.map((item) => (
        <span
          key={item}
          className="flex items-center gap-8 text-sm font-semibold tracking-wide whitespace-nowrap sm:text-base"
        >
          <span className="text-moss">•</span>
          {item}
        </span>
      ))}
    </div>
  );
}

export function TrustStripe() {
  return (
    <div
      className="sticky top-0 z-50 overflow-hidden bg-pine text-bone"
      style={{ height: "var(--stripe-height)" }}
    >
      <div className="animate-marquee flex h-full w-max items-center">
        <StripeRow />
        <StripeRow hidden />
      </div>
    </div>
  );
}
