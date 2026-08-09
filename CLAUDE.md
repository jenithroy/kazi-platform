# Kazi Manufacturing — Project Info

## What this is

Website for **Kazi Manufacturing**, a custom apparel manufacturing platform serving
clothing brands in the **UK**. Manufacturing operations are based in **Kathmandu, Nepal**.

- **Business**: custom/private-label clothing manufacturing (B2B)
- **Customers**: UK-based clothing brands looking to manufacture custom apparel
- **Location**: Kathmandu, Nepal (production/manufacturing base)
- **Contact**: hello@kazimanufacturing.com

Design direction, branding, page structure, and content are not decided yet —
to be planned in a later session.

## Tech stack

- **Next.js 16 (App Router) + React 19**, statically exported (`output: 'export'`
  in `app/next.config.js`) — the actual app lives in `app/`, not the repo root.
  That's also the Cloudflare Pages "root directory" setting, so `app/` is where
  `npm install` / `npm run dev` / `npm run build` need to run from. Routes are
  files under `app/src/app/**/page.jsx`; shared page components live in
  `app/src/views/<Name>Page/` — **not** `app/src/pages/`, which collides with
  Next's legacy Pages Router auto-detection and breaks the build. Static export
  can't resolve `searchParams` server-side (no per-request server exists), so
  routes that read query params (`/atelier`, `/quote`, `/account/login`,
  `/account/register`, `/collections`) wrap their view in `<Suspense>` and read
  `useSearchParams()` client-side inside the view itself, rather than a server
  wrapper awaiting `searchParams` as a prop. `/products/[slug]` is the exception
  — `generateStaticParams` + `params` work server-side under static export
  since every value is known at build time. Every page/component that uses
  hooks, motion, or browser APIs is a client component (`'use client'` at the
  top) —
  static export still prerenders client components once in Node, so anything
  reading `window`/`document`/`matchMedia` must do it inside `useEffect`, never
  in the render body (see `SmoothScroll.jsx`'s `prefersReducedMotion` state).
  The Atelier's 3D viewer (`react-three-fiber` `<Canvas>`) is loaded via
  `next/dynamic(..., { ssr: false })`, not `React.lazy`, so its WebGL/Three.js
  code never runs during the export's Node prerender pass.
- Oxlint for linting (`app/.oxlintrc.json`).
- Tailwind CSS v4 (via `@tailwindcss/postcss`, configured in
  `app/postcss.config.mjs`) — use Tailwind utility classes for new components.
  Brand tokens (`pine`, `moss`, `paper`, etc. + fonts) are registered in
  `app/src/styles/tokens.css`'s `@theme` block, imported (along with fonts.css)
  from `app/src/app/globals.css`, so e.g. `bg-moss`, `text-pine`, `font-display`
  work out of the box.
  Existing sections (Nav, Hero, ImpactStats, Heritage, Collection) still use
  CSS Modules and haven't been migrated — leave them as-is unless asked.
- Lenis (`lenis`) for smooth scrolling, wired once at the root in
  `app/src/app/layout.jsx` via `app/src/components/SmoothScroll/SmoothScroll.jsx`.
  This wraps the whole app (inside `MotionConfig`, outside `{children}`), so it
  already covers every current and future page/section — don't re-add a Lenis
  instance inside individual pages or components. It's skipped entirely
  under `prefers-reduced-motion: reduce` (falls back to native scroll).
  Anchor-link scrolling (`href="#section-id"`) is handled manually inside
  `SmoothScroll` (not Lenis's built-in `anchors` option, which doesn't call
  `preventDefault` and causes a visible native-jump-then-correct glitch).
  Scroll-target offset for the fixed nav is handled globally via
  `scroll-margin-top: var(--nav-height)` on `[id]` in `app/src/app/globals.css`
  — new sections don't need their own offset handling, just a unique `id`.
- Supabase (`@supabase/supabase-js`) for auth + the quote pipeline — client at
  `app/src/lib/supabase.js`, reading `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Schema/migrations live in
  `app/supabase/migrations/` — nested under `app/`, matching the original
  pre-Vite repo structure (and wherever the Supabase GitHub integration's
  "Supabase directory" setting points).

## Current state

Full site is built: homepage sections, Atelier 3D/2D garment configurator,
Collections/product catalog with cart, Pricing calculator, Quote/Account flows
wired to Supabase. Was originally a Vite + React Router SPA; converted to
Next.js App Router (static export) so it matches the existing Cloudflare Pages
project's build settings (root directory `app`, framework Next.js) without
needing dashboard access to change them.

## Repo notes

- `.agents/`, `.claude/`, `.codex/`, `.impeccable/`, `skills-lock.json` are local
  AI-agent/skill tooling, gitignored — not part of the site.
- `DESIGN_PLAN.md`, `COLLECTIONS_DESIGN_PLAN.md`, `LOOKBOOK_DESIGN_PLAN.md`,
  `PAGES_DESIGN_PLAN.md` are internal planning docs, gitignored — not pushed.
