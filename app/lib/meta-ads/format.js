// Number and date formatting for the Meta Ads module.

// Currency comes from the ad account, so the formatter is built per call rather than once:
// an account billed in GBP and one in NPR must never be rendered with the same symbol.
const currencyCache = new Map();

function currencyFormatter(currency, digits) {
  const key = `${currency}:${digits}`;
  let fmt = currencyCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "USD",
      // min and max are the same so a cost of 42.7 reads as £42.70 rather than £42.7 —
      // money with one decimal place looks like a bug in a table of figures.
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    currencyCache.set(key, fmt);
  }
  return fmt;
}

export function money(value, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  // Totals read better rounded; a £0.87 CPC would vanish to £1 at the same precision, so
  // small values keep two decimals.
  return currencyFormatter(currency, Math.abs(n) < 100 ? 2 : 0).format(n);
}

/**
 * Axis-tick money: always whole units, compacted past five figures.
 *
 * `money()` switches to two decimals under 100 so a £0.87 CPC stays readable, which on an
 * axis produces the mixed "£0.00, £50.00, £100, £150" ladder. Ticks want one consistent
 * shape, and the exact value is a hover or a table row away.
 */
export function moneyAxis(value, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...(Math.abs(n) >= 10_000 ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  }).format(n);
}

export function integer(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Number(value));
}

export function compact(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  if (Math.abs(n) < 10_000) return integer(n);
  return new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function percent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function ratio(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(digits)}×`;
}

export function decimal(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

/** "12 Mar" for axis ticks and tooltips; the year is implied by the selected range. */
export function shortDate(iso) {
  if (!iso) return "—";
  return new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function longDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "4 minutes ago" — used for the last-sync stamp, where exactness matters less than freshness. */
export function relativeTime(iso) {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Meta's SCREAMING_SNAKE enums, rendered as words. */
export function humanEnum(value) {
  if (!value) return "—";
  return String(value)
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
