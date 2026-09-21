// The ERP's own navigation tree. Sections map 1:1 to route folders under /app/erp.
//
// Marketing is where every acquisition channel lives; Meta Ads is its first module. New
// channels (Google Ads, email) slot in as further children rather than new top-level
// sections, so the sidebar doesn't grow a row per vendor.
export const ERP_SECTIONS = [
  {
    label: "Overview",
    href: "/erp",
    icon: "gauge",
  },
  {
    label: "Marketing",
    href: "/erp/marketing",
    icon: "megaphone",
    children: [
      { label: "Meta Ads", href: "/erp/marketing/meta-ads" },
      { label: "Attribution", href: "/erp/marketing/meta-ads/attribution" },
    ],
  },
];

/** True when `href` is the current route or one of its ancestors, for active styling. */
export function isActive(pathname, href) {
  if (!pathname) return false;
  const clean = pathname.replace(/\/+$/, "") || "/";
  const target = href.replace(/\/+$/, "") || "/";
  if (target === "/erp") return clean === "/erp";
  return clean === target || clean.startsWith(`${target}/`);
}
