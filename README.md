# kazi

React + Vite project.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run Oxlint
- `npm run preview` — preview production build

## Environment variables

Copy `.env.example` to `.env` and fill in your Supabase project's values:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These also need to be set in the Cloudflare Pages project settings (Settings →
Environment variables) for the deployed site to reach Supabase.

## Database (Supabase)

Schema lives in `supabase/migrations/`. Apply with the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
