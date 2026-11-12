// Class strings shared by the /merch sections. They are the same Tailwind classes the home page
// sections use (components/home/*), so the page follows the site's theme: pine on paper,
// Instrument Serif headings, Garamond body, pill buttons and rounded tiles. Nothing here is
// specific to /merch, and there is no separate stylesheet.

export const CONTAINER = "mx-auto w-full max-w-[1440px] px-5 md:px-8";

export const H2 =
  "m-0 text-balance font-display text-[clamp(2.125rem,4vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em] text-pine";

export const H3 = "m-0 font-display text-[1.75rem] font-normal leading-[1.1] tracking-[-0.01em] text-pine";

export const BODY = "font-body text-[1.1875rem] leading-snug text-pine-soft md:text-[1.3125rem]";

export const SMALL = "font-body text-[1.0625rem] leading-snug text-pine-soft";

const BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 font-body text-base font-semibold";

export const BUTTON_PRIMARY = `${BUTTON} btn-gradient text-bone hover:-translate-y-0.5 active:translate-y-0`;

export const BUTTON_SECONDARY = `${BUTTON} bg-pine/[0.06] text-pine transition-colors duration-200 hover:bg-pine/10`;

/** The rounded corners of an image tile or card. */
export const TILE = "rounded-[1.25rem] md:rounded-[1.75rem]";
