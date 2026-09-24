# Front-end audit: Kazi Manufacturing site

**Date:** 2026-09-24 · **Commit audited:** `dddc710` · **Scope:** `app/` (Next.js 16.3.1 static export)

## How this was checked

- `next build` passes (32 static routes). `eslint` fails with **13 errors and 2 warnings**.
- Served `app/out/` locally and loaded **19 routes** in headless Chromium at desktop (1440×900) and mobile (390×844) sizes. Collected LCP, CLS, bytes transferred, console errors and horizontal overflow, and ran **axe-core** (WCAG 2.2 AA and best-practice rules) on each page.
- Scripted interaction checks: mobile menu, cart drawer keyboard focus, anchor targets, and a no‑JavaScript render.
- Read the code for every shared layout component, the homepage sections, the forms and the global styles.

Caveat: the sandbox blocks `api.fontshare.com`, so General Sans fell back to system fonts. LCP numbers come from localhost with no throttling, so they are optimistic. Bytes transferred and CLS are the more reliable figures.

---

## Summary

| # | Area | Severity | Finding |
|---|------|----------|---------|
| 1 | Performance | 🔴 High | Images ship at full camera resolution (1–4 MB each) because `images.unoptimized` is on |
| 2 | Performance | 🔴 High | `/video-editing` downloads **37 MB** of autoplaying video on load, including a 14.5 MB `.mov` |
| 3 | Rendering | 🔴 High | Hero `<h1>`, CTA and every `<Reveal>` block start at `opacity: 0` and stay invisible until JS runs |
| 4 | SEO / CLS | 🔴 High | `/quote`, `/collections`, `/atelier`, `/account/*` bail out to client-only rendering (`useSearchParams`) and ship an empty body |
| 5 | Accessibility | 🟠 Med‑High | Primary button (pine text on moss) is 3.14:1 and drops to **2.04:1** on hover. Moss eyebrow text is 3.68:1 |
| 6 | Accessibility | 🟠 Med‑High | Autoplaying looped videos and the reviews marquee have no pause control (WCAG 2.2.2) |
| 7 | UX | 🟠 Medium | The bag is unreachable on mobile: the icon is `hidden md:inline-flex` and the mobile menu has no bag entry |
| 8 | Accessibility | 🟠 Medium | Nested `<main>` elements on 10 pages |
| 9 | Accessibility | 🟠 Medium | Homepage quote form errors aren't linked to their fields or announced |
| 10 | Bugs | 🟡 Medium | Broken in-page links: hero "Explore" → `#trust`, footer logo and "Back to top" → `#top` (only exists on `/`) |
| 11 | Code health | 🟡 Medium | 13 ESLint errors, dead components and about 60 MB of unused or oversized assets in `public/` |
| 12 | Misc | 🟢 Low | Assorted ARIA, heading, 404-page and navigation issues (see below) |

---

## 1. Images aren't optimised 🔴

`next.config.mjs` sets `output: "export"` with `images: { unoptimized: true }`. Every `<Image>` therefore serves the original file, and the `sizes` props do nothing.

| Page | Transferred | Largest offenders |
|------|------------|-------------------|
| `/` | 9.7 MB | `crafted-by/1st.jpeg` 2.9 MB, `2nd.jpeg` 2.9 MB, `last.jpeg` 1.1 MB, `hero.jpeg` 0.7 MB, `wide-angle.jpeg` 3.0 MB (loads on scroll) |
| `/collections` | 20.6 MB | five `collection-*.jpg` at 3.3–4.1 MB, each used at card size |
| `/lookbook` | 20.4 MB | the same five images |
| `/products/[slug]` | 6.1 MB | product and related-product images |

On a 4G phone the homepage images alone take several seconds, and they use up visitors' data allowances.

**Fix:**
- Pre-generate resized AVIF or WebP variants at build time with `sharp` (for example 640/1024/1600/2400 px widths) and use `<picture>`/`srcset`, or use a static-export-compatible loader such as `next-image-export-optimizer`.
- Cloudflare Pages can also resize on the fly through Cloudflare Images with a custom `loader`.
- Target at most 200–300 KB for full-bleed images and at most 80 KB for cards.
- The hero is a CSS `background-image`, so the browser can't preload it or pick a responsive size. Switch it to `<Image priority fetchPriority="high">` with `object-cover`.

## 2. Video weight on `/video-editing` 🔴

- 37 MB on first load: `studio-hero.mov` (14.5 MB), `newtonian-trap.mp4` (4.6 MB), `studio-reel.mp4` (3.8 MB), `marketing-story.mp4` (1.2 MB). All four have `autoPlay` with no `poster` and no `preload` hint.
- `.mov` isn't a web delivery format. Transcode it to H.264 MP4 plus WebM/AV1 at about 720p, which should come in under 2–3 MB.
- Add `poster` images and `preload="none"` or `"metadata"`. Start playback for the reel grid only when it scrolls into view, using an IntersectionObserver.

## 3. Content is invisible until JavaScript hydrates 🔴

`Reveal` (`components/Reveal.jsx`) renders with `opacity-0 translate-y-6` until an IntersectionObserver fires after hydration. It wraps the **hero `<h1>` and "Get a Quote" CTA**, every section heading, the footer CTA and the forms.

- With JavaScript disabled, or if a chunk fails to load, the homepage shows only the background image. The H1 and CTA never appear (verified: computed `opacity: 0`).
- LCP waits on hydration, because the largest text element isn't painted until then.

**Fix:**
- Never wrap above-the-fold content (the hero) in `Reveal`.
- Make the hidden state opt-in with JS. For example, add a `js` class to `<html>` from an inline script and scope the hidden styles to `.js .reveal:not(.is-visible)`, so the no-JS default is visible.
- Also skip the transform when `prefers-reduced-motion` is set. The global CSS clamps the duration, but the observer and style churn still run.

## 4. Client-only pages: empty prerender and layout shift 🔴

Every page whose tree calls `useSearchParams` sits inside `<Suspense>`, and static export renders only the fallback (the HTML contains `BAILOUT_TO_CLIENT_SIDE_RENDERING`).

| Route | Static HTML contains | Desktop CLS |
|-------|---------------------|-------------|
| `/quote` | Just an `<h1>` fallback, no form | **0.64** |
| `/atelier/quote` | Nothing (`fallback={null}`), no `<h1>` | **0.76** |
| `/collections` | Header only, no products | **0.61** |
| `/atelier` | An sr-only `<h1>` | 0.39 |
| `/account/login`, `/account/register` | Nothing | 0.39 / 0.41 |

Any CLS above 0.25 is rated "poor" by Core Web Vitals. The footer renders first, then jumps down when the client content mounts. `/quote` and `/collections` are indexable, conversion-critical pages, and crawlers that don't run JS see no form and no products.

**Fix:** Keep the Suspense boundary as narrow as possible. Move `useSearchParams()` into a small child component that only reads the query, and prerender the rest (the form, the product grid) normally. For example, `CollectionsPage` can render all products statically and apply the category filter on the client. Where a fallback is unavoidable, give it the same height as the real content.

## 5. Brand colour contrast 🟠

axe reported **308 colour-contrast failures across all 38 page loads**. Most trace back to a few token pairings:

| Pairing | Where | Ratio | Needs |
|---------|-------|-------|-------|
| `text-pine` on `bg-moss` | Every primary button: Accept All, quote submit, Add to Bag, cart CTA, WhatsApp | 3.14 | 4.5 |
| `text-pine` on `bg-moss-deep` | The **hover** state of those buttons | **2.04** | 4.5 |
| `text-moss` on paper or white | Eyebrow labels ("FAQ", "SHOP THE RANGE"), "Forgot password?", "Create account" links | 3.68 / 3.97 | 4.5 |
| `text-bone/50` on pine | Footer column headings | 4.32 | 4.5 |
| Faded inactive steps in `ProcessSection` | Homepage | 1.5–2.0 | 4.5 |

The moss links on `/account/login` and `/account/register` also fail `link-in-text-block` (2.01:1 against the surrounding text, with no underline).

**Fix:**
- `bone` text on `moss-deep` passes at 5.99:1. Use that as the button pairing and darken on hover rather than lightening.
- Use `moss-deep` (5.68:1 on paper) for small moss-coloured text.
- Raise the footer headings to `bone/60` or higher.
- Underline inline links.

## 6. Motion with no pause control 🟠

- `/video-editing` autoplays four looping videos with no controls.
- `ReviewsSection` uses `ScrollVelocity`, an infinite marquee. It runs a `useAnimationFrame` loop forever, even under `prefers-reduced-motion`.

WCAG 2.2.2 requires a way to pause any moving content that lasts longer than 5 seconds. **Fix:** add a pause button, or stop on hover and focus. Respect `prefers-reduced-motion` by showing a static list and not autoplaying the videos.

## 7. Mobile navigation gaps 🟠

- **The bag can't be reached on mobile.** The Nav bag button is `hidden md:inline-flex`, and the mobile menu lists only Design, Services, Video Editing and Get a Quote. After "Add to Bag" the drawer auto-opens once, but there's no way to reopen it.
- Pricing, Collections, Stories and Lookbook only appear in the footer, and Collections doesn't appear anywhere in site navigation.
- The mobile menu is a disclosure that pushes nothing down and doesn't lock scroll. Tapping outside it doesn't close it.

## 8. Landmarks 🟠

`PageMain` renders `<main id="main-content">`, and then `PricingPage`, `StoriesPage`, `LookbookPage`, `HeritagePage`, `LegalPageLayout` and `QuotePage` each render their own `<main>`. That puts two nested `main` landmarks on 10 routes (axe flags `landmark-no-duplicate-main`, `landmark-main-is-top-level` and `landmark-unique`). Change the inner ones to `<div>`.

The WhatsApp button and cookie banner sit outside any landmark (`region`). This is minor, and can be fixed by giving the banner `role="region"` or putting both inside an `<aside>`.

## 9. Forms 🟠

- `QuoteRequestSection` on the homepage shows errors as plain `<span>`s. They have no `aria-invalid`, no `aria-describedby` and no `role="alert"`, and focus doesn't move to the first invalid field. `LoginPage` already does this correctly, so reuse that pattern.
- The raw Supabase `error.message` is shown to users. Map it to friendly copy.
- `submitting` never resets if `supabase.auth.getUser()` throws on a network error, so the button stays on "Sending…". Wrap the call in `try/finally`.

## 10. Broken links and anchors 🟡

- Hero "Explore" links to `#trust`, but no element on the page has that id (`TrustStripe` is no longer rendered). Point it at `#brands`.
- The footer logo (`href="#top"`) and "Back to top" only work on `/`, because `id="top"` lives on the Hero. The logo should link to `/`, and "Back to top" should scroll with `window.scrollTo`/Lenis, or the id should move to `<body>`.
- The mobile nav's first link is focused programmatically on open, which is fine. However, the `SmoothScroll` hash handler calls `document.querySelector(hash)`, which throws on hashes that aren't valid selectors (for example `#1-intro`). Guard it with `CSS.escape` or `getElementById`.

## 11. Code health 🟡

**ESLint: 13 errors, 2 warnings**
- `GarmentViewer.jsx` (8): React Compiler immutability errors from mutating refs or props inside three.js effects.
- `set-state-in-effect` in `AtelierPage.jsx`, `QtyStepper.jsx`, `cart-context.js` and `cookie-consent.js`.
- `Date.now()` flagged in `AtelierPage.jsx:277`.
- An unused disable directive, and a missing `updateQty` dependency in `cart-context.js`.

If lint isn't gating CI, the list will only grow. Fix these or explicitly disable them with a justification comment, as other files already do.

**Dead code**
- `TrustStripe.jsx` is unused. The `--stripe-height` variable it relied on is still referenced in several files.
- `DiscountPopup.jsx` is unused. It also lacks Escape handling and focus management, and uses an `h3` with no parent heading, so fix those if it's revived.

**Unused files in `public/`** (they're still deployed)
- `landing-page-images/` (5 files, about 17 MB)
- `images/crafted-by/hands-{1,2,3}.jpeg` (9.6 MB)
- `images/logo/kazi-logo.png`
- The create-next-app leftovers `file.svg`, `globe.svg`, `next.svg`, `vercel.svg` and `window.svg`

**Font loading**
- General Sans loads from a render-blocking third-party stylesheet (`api.fontshare.com`). Self-host it next to Reckless Neue, as `/font` already does, to cut a DNS/TLS round trip and a single point of failure.
- Consider preloading the one Reckless weight used above the fold (Regular).

**JS weight**
- Even `/terms` ships about 740 KB raw (about 230 KB gzipped), because GSAP, ScrollTrigger, Lenis and Motion load site-wide from the root layout.
- Lenis and ScrollTrigger are only really needed on the homepage and Atelier. Scope them to those routes to trim roughly 50 KB gzipped from every other page.

## 12. Smaller items 🟢

- **ARIA**
  - Star ratings in `ReviewsSection` and `PricingPage` put `aria-label` on a plain `div`.
  - Colour swatches put `aria-label` on a plain `span` (64 nodes). Add `role="img"`.
- **List semantics:** the `ProcessSection` `<ol>` contains `<div>` children, because `Reveal` renders a `div`. Use `<Reveal as="li">`.
- **Headings:** `/atelier/quote` has no `<h1>`.
- **404:** there's no custom `not-found.js`. The export 404 uses the default title and unbranded copy. Add a branded page with links back into the site.
- **Metadata**
  - `/account/*` pages have no canonical. That's fine because they're `noindex`.
  - `<html lang="en">` while OpenGraph declares `en_GB`. Use `lang="en-GB"` for correct spelling and pronunciation hints.
- **Touch targets:** cart quantity buttons are 28×28 px, and several inline text links fall below 24 px in height. The 24 px minimum (WCAG 2.5.8) is met by most elements, but 44 px is recommended for mobile.
- **Placeholder content still live**
  - `TrustStripe` "XX+" stats (currently unused).
  - The collection grid repeats the same photo across different products.
  - The `DiscountPopup` offer copy.
- **Floating layers:** the WhatsApp button's offset is hard-coded (`148`/`232` px) to clear the cookie banner. It will misalign if the banner copy changes. Measure the banner, or reserve space with a CSS variable.

---

## Suggested order of work

1. **Quick wins (under a day):**
   - Fix the broken anchors, nested `<main>` and missing `<h1>`.
   - Add the bag to the mobile nav.
   - Change the button colour pairing and eyebrow text colour.
   - Take the hero out of `Reveal`.
   - Delete unused assets and components.
2. **Performance pass:**
   - Set up an image pipeline (resized AVIF/WebP) and transcode the videos.
   - Add posters and lazy playback.
   - Self-host General Sans.
3. **Rendering pass:**
   - Narrow the Suspense boundaries so `/quote`, `/collections` and `/atelier` prerender real content (fixes CLS and SEO).
   - Make `Reveal` progressive-enhancement only.
4. **Accessibility polish:**
   - Pause controls for motion.
   - Form error wiring.
   - ARIA role fixes.
5. **Hygiene:**
   - Clear the ESLint errors and add `npm run lint` to CI.
