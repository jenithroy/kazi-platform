"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution } from "@/lib/attribution";

// Renders nothing; it exists so campaign parameters are captured on whichever page the
// visitor lands on, not only the ones with a quote form. Re-runs on navigation because
// client-side route changes don't remount the layout.
export function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttribution();
  }, [pathname]);

  return null;
}
