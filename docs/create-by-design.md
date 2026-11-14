# Create by design (`/create/`)

A visitor picks a garment (T-Shirt, Hoodie, Sweatpants) and a colour, gives a **website** (or uploads a logo), and sees their logo
embroidered on that garment, to scale, with the stitch count, colours and size. A second click places an order. The order goes to the
Kazi dashboard (see `dashboard-link.md` for the contract); staff check it before anything is made. Nothing is paid or made automatically.

## Where things are

| File | What it does |
|---|---|
| `app/create/page.js`, `components/Create/CreatePage.jsx` | the route and its static text (heading, how it works, good to know) |
| `components/Create/CreateFlow.jsx` | the one-screen tool (client): garment, colour, logo input, progress, result, order form, success |
| `components/Create/GarmentPreview.jsx` | the Atelier's recolourable mockup with the stitched logo laid on at its real size |
| `components/Create/config.js` | per garment: stitched width (mm), cloth preset, where the logo sits, mm per mockup pixel |
| `components/Create/ink.js` | which garment colour reads against a logo (pure, tested under node) |
| `components/Create/order.js` | the files and the payload of an order; logo re-encoding (SVG and icons go as PNG, big ones are made smaller) |
| `lib/digitizer/oneClick.js` | `digitizeLogo()`: the Digitizer's own conversion, run once with its defaults, no editor |
| `lib/dashboard-orders.js` | the one client of the dashboard link: submit with retries, the outbox, logo lookup, `parseBrandInput`, health |
| `scripts/dashboard-link/check.mjs`, `replay-quotes.mjs` | is the link working; send the dashboard any quote it lacks |

## How it behaves

* The stitch engine (workers) is fetched when the person focuses the box or presses the button, never on page load.
* `people: false`: a face is not "your logo", so the person finder (30 MB of model) is never loaded. A photograph is still converted, but
  flagged ("this looks like a photograph, not a logo"); a picture under 200 px or giving under 300 stitches is flagged as small.
* The cloth is the garment colour the person picked. A logo the colour of the cloth is left out by the engine; if nothing is left the page
  says so and asks for another colour. Changing garment or colour makes the stitches again (about a second), the logo is not looked up again.
* The first click is "Make my preview" (a file chosen or dropped starts it by itself), the second is "Place order". A double click is one
  request. One uuid `key` per order is kept until the dashboard has it.
* **Instagram**: a name is looked up by the Worker, which reads the public profile page and takes the profile picture (150 x 150 px, so the
  digitizer says "this picture is small"). If the name is mistyped, or Instagram will not answer the Worker, the page shows
  the Worker's words and keeps the website box and the upload in front. Instagram's robots.txt forbids robots; reading it is the owners'
  decision (see "The legal side" in `dashboard-link.md`), and `LOGO_INSTAGRAM_DIRECT=off` on the Worker stops it.
* If the dashboard cannot be reached after three tries the order is kept in the browser (`localStorage` key `kazi.orders.outbox`) and sent
  again, quietly, the next time a page that uses the link loads (`/create/`, `/quote/`, the homepage form). The customer is told "we could
  not send it", with the order written out for WhatsApp / e-mail; they are never told it was received.
* Files in an order: one logo (PNG/JPEG/WebP/GIF, never SVG, at most 1 MB), the `.dst`, a WebP preview (at most 150 KB); all together under 3 MB.

## Configuration

`NEXT_PUBLIC_DASHBOARD_API_URL=https://kazimfg.com.np` (Cloudflare Pages build variable, origin only). Unset, the link is off: `/create/` says
it is not available and the quote forms behave exactly as before.

## Trying it without the live dashboard

Run the dashboard's local stand-in (kazi-app: `scripts/rehearse-migration/website-orders-dev.mjs --port 8791`: the real Worker code over a real
order function in an in-memory Postgres), then build with `NEXT_PUBLIC_DASHBOARD_API_URL=http://127.0.0.1:8791 npm run build` and serve `out/` from
`http://127.0.0.1:<port>`. `node scripts/dashboard-link/check.mjs --base http://127.0.0.1:8791` checks the link itself.

## Not verified

The stitch files have been read back by an independent reader (pyembroidery) and match what the page shows, but **nothing has been sewn on a
machine**: the stitch counts and sizes are estimates, which the page says. The garment pictures are flat-lay photographs recoloured in the
browser, so the logo's place and size on them are an honest illustration, not a render of the real garment.
