import { AdminShell } from "@/components/admin/AdminShell";

// Everything under /admin is a client-side app behind Supabase auth — the static export only
// ships the shell. It's also disallowed in robots.js.
export const metadata = {
  title: "SEO admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
