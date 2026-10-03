"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CookieConsentContext = createContext(null);

const STORAGE_KEY = "kazi-cookie-consent";

export function CookieConsentProvider({ children }) {
  // null = no choice recorded yet (banner shows once hydrated); "accepted" | "rejected"
  // once the visitor has picked one. Starts null on both the server-prerendered pass and
  // the client's initial hydration pass so they match, then reads the real value once
  // mounted — same pattern as cart-context's hydration flag.
  const [consent, setConsent] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Post-mount read for the same reason as cart-context: no localStorage at prerender time.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "accepted" || stored === "rejected") setConsent(stored);
    } catch {
      // storage unavailable (private browsing) — banner just shows every visit
    }
    setHydrated(true);
  }, []);

  function record(choice) {
    setConsent(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // storage unavailable — choice won't survive a reload, banner will show again
    }
  }

  const value = useMemo(
    () => ({
      consent,
      bannerVisible: hydrated && consent === null,
      accept: () => record("accepted"),
      reject: () => record("rejected"),
    }),
    [consent, hydrated],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  return ctx;
}
