import { SITE_DESCRIPTION, SITE_EMAIL, SITE_NAME, SITE_PHONE, SITE_URL } from "@/lib/site";

// Title/description rules and site-settings resolution, shared by the build (lib/seo.js)
// and the /admin previews so both show exactly the same thing.

export const TITLE_SUFFIX = ` | ${SITE_NAME}`;
export const TITLE_LIMIT = 60;
export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 160;

export const DEFAULT_OG_IMAGE = { url: "/hero/hero.jpeg", width: 1600, height: 900 };

/**
 * The <title> a page ships with. The brand suffix is added when it fits inside the ~60
 * characters Google shows, and dropped (rather than truncated away) when it doesn't.
 * `absolute` titles — the homepage's — are used exactly as written.
 */
export function composeTitle(title, { absolute = false } = {}) {
  const base = (title ?? "").trim();
  if (!base) return SITE_NAME;
  if (absolute || base.includes(SITE_NAME)) return base;
  const branded = base + TITLE_SUFFIX;
  return branded.length <= TITLE_LIMIT ? branded : base;
}

export function absoluteUrl(url) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Accepts either the bare code or the whole <meta … content="code"> tag people tend to paste. */
export function verificationCode(value) {
  const text = (value ?? "").trim();
  if (!text) return null;
  const fromTag = /content\s*=\s*["']([^"']+)["']/i.exec(text);
  return fromTag ? fromTag[1].trim() : text;
}

function pick(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** The seo_settings row merged over the defaults in code — every setting is optional. */
export function resolveSiteSettings(settings = {}) {
  return {
    orgName: pick(settings.org_name, SITE_NAME),
    email: pick(settings.org_email, SITE_EMAIL),
    phone: pick(settings.org_phone, SITE_PHONE),
    streetAddress: pick(settings.org_street_address, undefined),
    locality: pick(settings.org_locality, "Kathmandu"),
    region: pick(settings.org_region, undefined),
    postalCode: pick(settings.org_postal_code, undefined),
    country: pick(settings.org_country, "NP"),
    logoUrl: pick(settings.org_logo_url, "/images/logo/kazi-logo-trimmed.png"),
    sameAs: (settings.same_as ?? []).filter(isHttpUrl),
    defaultDescription: pick(settings.default_description, SITE_DESCRIPTION),
    defaultOgImage: pick(settings.default_og_image_url, DEFAULT_OG_IMAGE.url),
    googleVerification: verificationCode(settings.google_site_verification),
    bingVerification: verificationCode(settings.bing_site_verification),
  };
}
