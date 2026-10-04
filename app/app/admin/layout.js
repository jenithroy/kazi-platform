import { Geist, Geist_Mono } from "next/font/google";
import { AdminShell } from "@/components/admin/AdminShell";

// Everything under /admin is a client-side app behind Supabase auth — the static export only
// ships the shell. It's also disallowed in robots.js.
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// The public site's editorial fonts read well in marketing copy but not in dense admin UI.
// Geist is scoped to /admin by re-pointing the theme's font variables on this wrapper, so every
// `font-display` / `font-body` / `font-mono` class below it picks it up without touching them.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const ADMIN_FONTS = {
  "--font-display": "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  "--font-body": "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  "--font-mono": "var(--font-geist-mono), ui-monospace, monospace",
  fontFamily: "var(--font-body)",
};

export default function AdminLayout({ children }) {
  return (
    <div className={`${geist.variable} ${geistMono.variable}`} style={ADMIN_FONTS}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
