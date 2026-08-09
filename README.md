# kazi

Next.js project, statically exported. The app lives in `app/` — that's the
directory Cloudflare Pages builds from.

## Getting started

```bash
cd app
npm install
npm run dev
```

## Scripts (run from `app/`)

- `npm run dev` — start dev server
- `npm run build` — static export build (writes to `app/out/`)
- `npm run lint` — run Oxlint

## Environment variables

Copy `app/.env.example` to `app/.env.local` and fill in your Supabase project's
values (or set them directly in the Cloudflare Pages project settings):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These need to be set in the Cloudflare Pages project settings (Settings →
Environment variables) for the deployed site to reach Supabase.

## Database (Supabase)

Schema lives in `app/supabase/migrations/`. Apply with the Supabase CLI:

```bash
cd app
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
