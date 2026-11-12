import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// `next dev` without Supabase is the documented local setup (docs/seo-admin.md, "Local development"),
// and the quote form, admin and unsubscribe pages each show their own "not configured" notice, so
// warning on every page load — once on the server and once in the browser — is just noise there.
// Builds and production keep the warning: a deploy without these variables can't take quotes.
if (!isSupabaseConfigured && process.env.NODE_ENV !== "development") {
  console.warn(
    "Supabase env vars are missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) — auth and quote submission will fail until they are set.",
  );
}

// createClient throws on an empty URL, and this module gets evaluated during the build's
// prerender pass even though every page that uses it is a client component — a placeholder
// keeps the build from crashing when env vars aren't set yet; real calls will just fail at
// runtime instead.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);
