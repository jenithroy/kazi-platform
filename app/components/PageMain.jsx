"use client";

import { usePathname } from "next/navigation";

// Our Nav (components/Nav.jsx) is `position: fixed`, so it's removed from normal document
// flow — every route's content needs to be pushed down by the nav's own height to avoid
// sitting underneath it. Home is the one exception: its Hero section already reserves that
// space itself via its own top padding (`pt-[calc(var(--nav-height)+64px)]`, see Hero.jsx),
// so adding it again here would double the gap under the fixed nav.
export function PageMain({ children }) {
  const isHome = usePathname() === "/";

  return (
    <main className="flex-1" style={{ paddingTop: isHome ? 0 : "var(--nav-height)" }}>
      {children}
    </main>
  );
}
