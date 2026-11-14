# Website orders -> the dashboard (kazi-app)

Everything a customer sends from kazimanufacturing.com (the quote forms and the new **Create by design** page) lands in the
Kazi dashboard (`github.com/jenithroy/kazi-app`, the ops app at kazimfg.com.np) as an order, marked as coming from the website.

This file is the contract between the two repos. The dashboard side (migration, Worker, screens) is described in
`kazi-app/WEBSITE_ORDERS.md`; this side is described here. If you change one, change both.

## The flow

```
customer's browser (kazimanufacturing.com)
   |  1. POST /api/website-orders          (JSON, the same `key` on every retry)
   v
dashboard Worker (kazimfg.com.np)  worker/lib/websiteOrders.js
   |  2. checks the shape and the size, stores the files in the private bucket `website-orders`
   |  3. calls the database function ingest_website_order(...)   (service key, never in the browser)
   v
dashboard database: one row in `orders` (source = 'website', number WEB-001...), its first history line and note
   |
   v
Production page: hidden by default, a "Website" button beside Filters says how many are new
```

* **Nothing is lost.** The browser keeps the order (localStorage outbox) until the Worker says `ok`, and resends it with the same
  `key`; the database stores one row per `key`, so a resend or a double click never makes a second order.
* **The site's own database still gets a copy** of every quote (the `quotes` table, as before) so the site's admin keeps working
  and there is something to compare against. `app/scripts/dashboard-link/replay-quotes.mjs` (this repo) sends any quote the
  dashboard does not have yet; it is safe to run twice, because the `key` is the quote's id.
* **The customer is never told "sent" unless one of the two stored it.** If neither did, the page shows the WhatsApp / e-mail
  fallback with the order written out, ready to send.

## Configuration

| Where | Name | Value |
|---|---|---|
| Website (Cloudflare Pages, build-time) | `NEXT_PUBLIC_DASHBOARD_API_URL` | `https://kazimfg.com.np` (origin only, no slash). Unset = the dashboard link is off and the pages say so. |
| Dashboard Worker (plain var) | `WEBSITE_ORIGINS` | comma list of allowed browser origins. Default: `https://kazimanufacturing.com,https://www.kazimanufacturing.com`. Preview deployments `https://*.kazi-view.pages.dev` are allowed too. |
| Dashboard Worker (secret) | `SUPABASE_SERVICE_KEY` | already set (the Meta Ads sync uses it) |
| Dashboard Worker (optional, plain var) | `LOGO_INSTAGRAM_DIRECT` | `off` stops the Worker reading Instagram profile pages at once (an Instagram name then answers 404 with the "couldn't reach Instagram" words). Unset = on. No key is needed. |
| Dashboard Worker (secret, optional) | `WEBSITE_ORDERS_REPLAY_SECRET` | lets the replay script skip the rate limits; without it the bypass is off |

## `POST {DASHBOARD}/api/website-orders`

Request: `Content-Type: application/json` (anything else is answered 415: a browser cannot send that across sites without asking first), at most 4.5 MB.

```jsonc
{
  "v": 1,
  "key": "0b7e3f0e-5c1d-4a52-9e0b-2f4f9a8d6c11",   // uuid v4, made in the browser once per order and reused on every retry
  "kind": "design",                                  // "design" (Create by design) | "quote" (the quote forms)
  "contact": { "name": "Ama Rai", "email": "ama@acme.com", "phone": "+44 7700 900123", "company": "Acme Coffee" },
  "items": [                                         // 1 to 10 lines; a design order has exactly one
    { "garment": "hoodie", "label": "Hoodie", "colour": { "hex": "#1B3A2B", "label": "Pine" }, "qty": 50 }
  ],
  "brand": { "handle": "acmecoffee", "website": null, "logoFrom": "instagram", "rightsConfirmed": true },
  "service": "embroidery",                           // optional: the quote form's service
  "deadline": "2026-12-20",                          // optional, YYYY-MM-DD
  "message": "Left chest, please.",                  // optional, at most 4000 characters
  "design": { "stitches": 5231, "colours": 3, "widthMm": 90, "heightMm": 38, "placement": "Left chest" },   // optional (design orders)
  "files": [                                         // optional, at most 4 (one of each kind), 3 MB in all once decoded
    { "kind": "logo",    "name": "logo.png",    "type": "image/png",               "data": "<base64>" },
    { "kind": "design",  "name": "acme.dst",    "type": "application/octet-stream", "data": "<base64>" },
    { "kind": "preview", "name": "preview.webp","type": "image/webp",              "data": "<base64>" }
  ],
  "source": { "page": "/create/" },
  "hp": ""                                           // honeypot, always empty from the real page
}
```

Rules the Worker enforces (a failure is a 400 with the field named): `contact.name` and `contact.email` are required and the e-mail
must look like one; every quantity is a whole number from 1 to 100000; text is trimmed, control characters are removed, lengths are
capped (name 120, company 160, message 4000); `brand.website` must be a public `http(s)` address; file types are checked by their
first bytes, not by the name or type the browser gave: `logo` PNG, JPEG, WebP or GIF; `preview` PNG, JPEG or WebP; `artwork` those or
PDF; `design` a `.dst` (it must start with `LA:` and its 512-byte header). **SVG is not accepted in an order** (it can carry
scripts): send the logo as a picture (the canvas the digitizer read is fine). A design order must include a `logo`. `hp` must be
empty. `rightsConfirmed` must be `true` when `brand.logoFrom` is set (the customer says the logo is theirs, or they may use it).
Unknown fields are dropped, never stored.

Responses (always JSON):

| Status | Body | Meaning / what the browser does |
|---|---|---|
| 200 | `{ "ok": true, "ref": "WEB-014", "id": "<uuid>", "duplicate": false }` | stored. `duplicate: true` = this `key` was already stored (a resend): treat as success. Clear the outbox. |
| 400 | `{ "ok": false, "error": "invalid", "field": "contact.email", "message": "..." }` | do not retry; show the message |
| 413 | `{ "ok": false, "error": "too_large" }` | do not retry; send fewer / smaller files |
| 429 | `{ "ok": false, "error": "rate_limited", "retryAfter": 600 }` | keep in the outbox, try later |
| 502 / 503 / network error | `{ "ok": false, "error": "unavailable" }` | retry with the same `key` (the page tries 3 times, 1 s / 3 s apart, then keeps it in the outbox) |

Limits (set in the database, so they hold whoever calls, and asked before any file is stored): 10 orders an hour from one address,
5 an hour for one e-mail (quotes and designs together), 120 an hour in all. They count only website orders. A resend of an order that
is already stored is answered before the limits are looked at.

CORS: the Worker answers the preflight and sets `Access-Control-Allow-Origin` to the caller's origin when it is on the list. A call with
no `Origin` header (a script) is allowed; it gets the same checks.

## `GET {DASHBOARD}/api/website-orders/logo?handle=acme` or `?site=acme.com`

Finds a brand's logo for Create by design. The browser calls this because browsers may not read other sites' pages.

* `site`: a website (`acme.com`, `https://acme.com/shop`). The Worker reads the home page (after the site's robots.txt, like the
  dashboard's contact finder does) and picks the logo from the page's own structured data, a logo in the header, the touch icon, an SVG
  icon, and so on. Checked on kazimanufacturing.com: found in half a second. This gives the best logo.
* `handle`: an Instagram name (`acme`, `@acme`, or a pasted `instagram.com/acme/` link). The Worker reads the public profile page once
  (`https://www.instagram.com/acme/`, with the same honest User-Agent, no login, no cookies, no key, no API, no go-between) and downloads the
  picture its social-share tags name. **That picture is 150 x 150 pixels** (the page offers no bigger one and the address is signed, so it
  cannot be asked for larger): the digitizer flags it as small. Checked on 2026-11-14 against the real kazimanufacturing_np profile: found in
  about a second. A name that is mistyped (or whose page comes back without its picture tag) answers 404 with "We couldn't find a profile picture for that Instagram name". An account that has no picture of its own gives Instagram's default image like any other (not told apart; the customer sees it in the preview).
  If Instagram will not answer the Worker (a pause after it pushes back, the kill switch, an outage) it answers 404 with "We couldn't reach
  Instagram just now". Build the page so that is an ordinary outcome, not an error: say it plainly and put the upload (and the website
  box) in front. See "The legal side" below for the decision behind reading Instagram at all.
* Both given: the handle is tried first, then the site.
* 200: the picture itself (`image/png|jpeg|webp|gif|svg+xml|x-icon`, at most 4 MB; SVG at most 1 MB), with `X-Logo-Source`
  (`instagram`, `website`), `X-Logo-From` (the host it came from) and `X-Logo-Size` (`WxH`, when the Worker could read it)
  exposed to the page. An SVG logo can be shown and digitized in the browser but is **not** accepted back in an order: send a
  picture.
* 404 `{ "ok": false, "error": "not_found", "tried": [...], "message": "..." }`: nothing usable. `message` is written for the
  customer ("We couldn't find a profile picture for that Instagram name", "We couldn't reach Instagram just now", "that site asks robots
  to keep out", "no logo could be found", ...). Show it, then offer the upload.
* 400 invalid input, 429 too many lookups (30 in ten minutes from one address), 502 the lookup itself failed.

The Worker only follows `http(s)` addresses on ports 80/443, refuses IP-literals, `localhost` and private names, follows at most 3
redirects (checking each), reads at most 1.5 MB of a page and 4 MB of a picture, tries at most 5 pictures, gives up after 8 s a
request and 15 s in all, and says who it is (`KaziLogoFinder/1.0 (+https://kazimanufacturing.com/create ...)`). The returned
picture is sent with `nosniff` and a sandbox Content-Security-Policy, so opening the address directly cannot run anything.

## `GET {DASHBOARD}/api/website-orders/health`

`{ "ok": true, "v": 1, "db": true }`. `db: false` means the Worker could not reach the database with its key (misconfigured or down).
`app/scripts/dashboard-link/check.mjs` (this repo) calls this, then (unless `--no-order`) sends a clearly marked test order twice (the second must come back
`duplicate: true`). Against any address that is not this computer it needs `--yes`, because the test order is a real row in the dashboard; use
`--no-order` to check health only.

To try the whole link without anything live, run the dashboard repo's local stand-in
(`kazi-app/scripts/rehearse-migration/website-orders-dev.mjs --port 8791`: the real Worker code over the real order function on an in-memory
Postgres), build the site with `NEXT_PUBLIC_DASHBOARD_API_URL=http://127.0.0.1:8791`, and serve it from localhost.

## What the dashboard stores (for reference)

`orders.source = 'website'`, `orders.order_no = 'WEB-001'...`, `orders.web_ref = key`, `orders.web_data` = the object below, `orders.web_seen_at`
(null until someone opens it). Stage "Order Received", status "Active", created by "Website", price 0, no customer link. It is an ordinary order for
every page of the dashboard (the view `fs_orders` shows it with the rest, with `source`, `webSeenAt`, `webSeenBy` and `web` added); only the
Production page hides website orders by default, behind its "Where from" filter.

```jsonc
{ "v": 1, "kind": "design", "receivedAt": "2026-11-14T10:22:31Z",
  "contact": {...}, "brand": {...}, "items": [...], "service": null, "deadline": null, "message": "...", "design": {...},
  "files": [ { "kind": "logo", "name": "logo.png", "type": "image/png", "bytes": 18211, "path": "<key>/logo.png" } ],
  "page": "/create/" }
```

The contact details and files are only readable by people who can see orders in the dashboard.

## The legal side of "scrape the logo"

* A logo that is publicly shown is not secret, and looking one up for the person who asks is a normal job (brand-kit tools do it).
* **Instagram forbids automated collection** (its robots.txt says `User-agent: *` / `Disallow: /` under a notice that automated collection
  is prohibited without written permission, read 2026-11-14), and the Worker's logo finder obeys robots.txt for every website it reads.
  **Reading an Instagram profile page is the one decided exception**: the owners decided on 2026-11-14, after the above was put to them
  twice, that the public profile picture is to be read directly, the way a link preview does, with no API and no vendor. That is the owners'
  decision, not a finding that it is allowed, and it can be stopped at once (`LOGO_INSTAGRAM_DIRECT=off` on the Worker). What is kept: one page
  and one picture per lookup, an honest User-Agent, a one-day cache, a pause when Instagram pushes back, a cap on how often it is asked, and
  nothing that gets round a refusal (no login, cookies, pretending to be a browser, proxies). What is not known: how Instagram treats the
  Worker's Cloudflare address (it was tried only from an ordinary home connection), so a handle may simply stop finding pictures one day;
  the page then says so and the website box and the upload are the way on. The name typed goes to the Worker and from there to Instagram only
  (no third party): say so in the privacy policy.
  The customer's website and an upload always work.
* Putting a name on clothes is a trademark matter. Anyone could type `nike`. So the page asks the customer to confirm the logo is
  theirs or that they may use it (`rightsConfirmed`), and **every website order is a request that staff look at before anything is made**.
* Nothing is paid or made automatically. The page says so: Kazi confirms the price and timing by e-mail.
