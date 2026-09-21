"use client";

import { readStoredConsent } from "@/lib/cookie-consent";

// Marketing attribution for the ERP's Meta Ads module.
//
// A visitor who clicks an ad lands on a campaign URL carrying utm_* parameters, then
// usually browses a few pages before submitting a quote — by which point those parameters
// are long gone from the address bar. So they are captured on arrival and replayed onto the
// quote row, which is what lets the ERP tie an order back to the campaign that paid for it.
//
// Privacy posture: this is first-party, single-session data used to attribute one form
// submission. It lives in sessionStorage (gone when the tab closes), never localStorage, and
// is not written at all if the visitor rejected cookies — in that case only parameters still
// present in the URL at submit time are used, which requires no storage.

const STORAGE_KEY = "kazi-attribution";

const PARAM_MAP = {
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  utm_content: "utm_content",
  utm_term: "utm_term",
  fbclid: "fbclid",
  // Meta's URL parameters, which can be added to an ad's destination URL as
  // `?kz_campaign={{campaign.id}}&kz_ad={{ad.id}}` to get an exact id join instead of
  // matching on campaign name.
  kz_campaign: "meta_campaign_id",
  kz_ad: "meta_ad_id",
};

function readFromUrl() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out = {};
  for (const [param, column] of Object.entries(PARAM_MAP)) {
    const value = params.get(param);
    // Values land in a database column, so they are length-capped here rather than
    // trusting whatever a crafted link puts in the query string.
    if (value) out[column] = value.slice(0, 200);
  }
  if (Object.keys(out).length === 0) return {};
  out.landing_path = window.location.pathname.slice(0, 200);
  // Only the referring origin, not the full referring URL — the path can carry a
  // stranger's search terms and the ERP has no use for it.
  try {
    if (document.referrer) out.referrer = new URL(document.referrer).origin;
  } catch {
    // malformed referrer — not worth reporting
  }
  return out;
}

/** Called once per page load. Stores the landing parameters if there are any new ones. */
export function captureAttribution() {
  const fresh = readFromUrl();
  if (Object.keys(fresh).length === 0) return;
  if (readStoredConsent() === "rejected") return;
  try {
    // First touch wins: if the visitor already arrived through a campaign this session,
    // an internal link that happens to carry utm params must not overwrite it.
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // storage unavailable — falls back to the URL-only read in getAttribution()
  }
}

/** The columns to merge into a `quotes` insert. Always safe to spread, even when empty. */
export function getAttribution() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore and fall through to the URL
  }
  return readFromUrl();
}
