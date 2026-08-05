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

- React 19 + Vite
- Oxlint for linting
- Tailwind CSS v4 (via `@tailwindcss/vite`) — use Tailwind utility classes for
  new components. Brand tokens (`pine`, `moss`, `paper`, etc. + fonts) are
  registered in `src/styles/tokens.css`'s `@theme` block, so e.g. `bg-moss`,
  `text-pine`, `font-display` work out of the box.
  Existing sections (Nav, Hero, ImpactStats, Heritage, Collection) still use
  CSS Modules and haven't been migrated — leave them as-is unless asked.
- Lenis (`lenis`) for smooth scrolling, wired once at the root in
  `src/main.jsx` via `src/components/SmoothScroll/SmoothScroll.jsx`. This
  wraps the whole app (inside `MotionConfig`, outside `App`), so it already
  covers every current and future page/section — don't re-add a Lenis
  instance inside individual pages or components. It's skipped entirely
  under `prefers-reduced-motion: reduce` (falls back to native scroll).
  Anchor-link scrolling (`href="#section-id"`) is handled manually inside
  `SmoothScroll` (not Lenis's built-in `anchors` option, which doesn't call
  `preventDefault` and causes a visible native-jump-then-correct glitch).
  Scroll-target offset for the fixed nav is handled globally via
  `scroll-margin-top: var(--nav-height)` on `[id]` in `src/index.css` — new
  sections don't need their own offset handling, just a unique `id`.

## Current state

Project is a bare Vite + React scaffold (template demo content stripped out).
No pages, sections, or design system exist yet.

## Repo notes

- Not yet a git repository.
- `.agents/`, `.claude/`, `.codex/`, `.impeccable/`, `skills-lock.json` are local
  AI-agent/skill tooling, gitignored — not part of the site.
