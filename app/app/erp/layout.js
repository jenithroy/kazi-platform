import { ErpShell } from "@/components/Erp/ErpShell";

export const metadata = {
  title: "ERP",
  // The ERP is internal; it must never show up in search results or in the sitemap.
  robots: { index: false, follow: false },
};

export default function ErpLayout({ children }) {
  return <ErpShell>{children}</ErpShell>;
}
