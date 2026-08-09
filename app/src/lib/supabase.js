import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars are missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) — auth and quote submission will fail until they are set.'
  )
}

// createClient throws on an empty URL, and this module is evaluated once in Node during
// the static export's prerender pass (every page here is a client component, but Next still
// renders them once server-side to produce the static HTML shell) — a placeholder keeps the
// build from crashing when env vars aren't set yet; real calls will just fail at runtime.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
