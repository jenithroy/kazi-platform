# SEO admin

`/admin` is where the site's search presence is managed without touching code:

- **Blog** — write, schedule and publish posts. They appear at `/stories/<slug>/`, on the Stories page, and in the sitemap, RSS feed (`/stories/feed.xml`) and `llms.txt`.
- **Pages** — override the title, meta description, share image and indexing of every built-in page and product page.
- **Redirects** — 301/302 old URLs to new ones. Renamed and deleted posts are redirected automatically.
- **Settings** — business details for Organization structured data, social profiles, default description and share image, and Google/Bing verification codes.
- **Publish site** — rebuilds the live site so the changes go out.

## How it works

The site is a static export on Cloudflare Pages, so nothing on it runs on a server. Content edited in `/admin` is saved to Supabase, and the next build reads it and bakes it into plain HTML:

```
/admin (browser) ──writes──▶ Supabase ◀──reads at build── next build ──▶ Cloudflare Pages
        │                                                        ▲
        └──"Publish site"──▶ request-deploy edge function ──deploy hook──┘
```

What the build generates from Supabase:

| Output | Source |
| --- | --- |
| `/stories/` and one page per live post | `blog_posts` (status `published`, publish date in the past) |
| `<title>`, description, Open Graph and Twitter tags on every page | `lib/seo-routes.js` defaults, overridden by `seo_pages` |
| Organization + WebSite JSON-LD, Google/Bing verification tags | `seo_settings` |
| BlogPosting, BreadcrumbList and FAQPage JSON-LD on posts | `blog_posts` |
| `sitemap.xml`, `stories/feed.xml`, `llms.txt` | all of the above |
| `_redirects` (Cloudflare's redirect file) | `redirects` |

**Who can do what.** Accounts with the `employee` or `admin` role can write posts, upload images and publish the site. Page SEO, redirects and settings are admin-only. Everyone else is turned away. Row level security in `app/supabase/migrations/007_seo_cms.sql` enforces this; the screens only reflect it.

**If Supabase can't be reached during a build,** the build fails on purpose and Cloudflare keeps the previous deployment live. A site that silently lost its posts would be worse. If Supabase isn't configured at all, or the migration hasn't run yet, the build succeeds with the defaults written in code.

## Setup

### 1. Apply the database migration

In the Supabase dashboard, open **SQL Editor** and run `app/supabase/migrations/007_seo_cms.sql`. Run 001–006 first if this project doesn't have them yet. With the Supabase CLI linked to the project, `supabase db push` does the same.

007 also closes two holes in the existing account setup that the admin would otherwise inherit:

- New sign-ups could make themselves admins by sending `role: "admin"` in their sign-up metadata.
- Signed-in users could change their own `role`.

It also fixes the `profiles` policies, which failed with "infinite recursion detected" for any signed-in user.

### 2. Connect the site to Supabase

The live build currently has no Supabase configuration, so the quote form can't submit either. In the Cloudflare dashboard, open **Workers & Pages → the project → Settings → Variables and Secrets** ("Environment variables" in older dashboards). Add these for Production, and for Preview if you use preview deploys:

| Variable | Value (Supabase → Project Settings → API / API Keys) |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The `anon` (or `publishable`) key — never the `service_role`/secret key |

Then redeploy.

In Supabase, go to **Authentication → URL Configuration**. Set the Site URL to `https://kazimanufacturing.com` and add `https://kazimanufacturing.com/**` to the redirect URLs.

### 3. Make yourself an admin

Create an account at `/account/register/`, confirm the email, then run this in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Use `'employee'` instead for someone who should only write and publish posts. Sign in, then open `/admin/`.

### 4. Wire up the "Publish site" button

1. In the Cloudflare Pages project, open **Settings → Build** ("Builds & deployments" in older dashboards) → **Deploy hooks**. Add a hook for the production branch (`main`) and copy its URL.
2. Deploy the edge function and store the hook as a secret, which keeps it out of the browser:

   ```sh
   cd app
   supabase functions deploy request-deploy --project-ref <project-ref>
   supabase secrets set CLOUDFLARE_DEPLOY_HOOK_URL='<deploy hook URL>' --project-ref <project-ref>
   ```

   Without the CLI, use **Edge Functions → Deploy a new function**: name it `request-deploy` and paste `app/supabase/functions/request-deploy/index.ts`. Then add the secret under **Edge Functions → Secrets**.

Until this is set up, publishing still happens on every push to `main`, or with **Retry deployment** in Cloudflare.

### 5. Scheduled posts

A post with a future publish date goes live at the first build after that time. To have that happen without anyone pressing Publish, trigger the deploy hook once a day. For example, with a GitHub Actions workflow at `.github/workflows/daily-rebuild.yml` and the hook URL saved as the `CLOUDFLARE_DEPLOY_HOOK_URL` repository secret:

```yaml
name: Daily rebuild
on:
  schedule:
    - cron: "15 6 * * *" # 06:15 UTC
  workflow_dispatch:
jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -X POST "$HOOK"
        env:
          HOOK: ${{ secrets.CLOUDFLARE_DEPLOY_HOOK_URL }}
```

### 6. Tell the search engines

1. In [Google Search Console](https://search.google.com/search-console), add a URL-prefix property for `https://kazimanufacturing.com/` and choose **HTML tag**. Paste the code into **/admin → Settings**, publish, then click Verify. Submit `https://kazimanufacturing.com/sitemap.xml` under **Sitemaps**.
2. In [Bing Webmaster Tools](https://www.bing.com/webmasters), import the site from Search Console, or verify with its meta tag the same way. Bing also feeds DuckDuckGo, Yahoo and ChatGPT search.

## Writing posts that rank

The editor scores each post as you write. The scores are pointers, not rules. The things that matter most:

- **One topic per post, aimed at a real search.** Pick the focus keyword first (e.g. "low MOQ clothing manufacturer"). Use it in the title, the first paragraph, one `##` heading and the URL.
- **Answer the question fully.** Competitive manufacturing topics usually need 800–1,500 words, with sections, specifics, numbers and photos from the floor.
- **Link internally.** Link to the relevant service pages and other posts, and end with a next step: `[request a quote](/quote)`. The toolbar's **Link to a page…** menu inserts these.
- **Add FAQs** for the questions brands ask on calls. They're shown on the post and marked up for search engines and AI assistants.
- **Use real images with alt text.** Uploads are resized to 1600px and converted to WebP in the browser, so they stay fast.

The dashboard's **Post ideas** each start a draft with a keyword and an outline.

## Local development

`npm run dev` works without Supabase: pages use their code defaults and `/stories/` shows its placeholders. To work on the admin, put the two `NEXT_PUBLIC_SUPABASE_*` variables for a development project in `app/.env.local`.
