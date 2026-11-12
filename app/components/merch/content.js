// All copy and data for /merch, in one place so it can be edited without touching the layout.
//
// Anything marked TODO is a placeholder or a draft that Kazi needs to confirm before launch:
// search this file for "TODO" for the full list (prices, creator case studies, FAQ answers).
//
// Photos: every image slot names the file it expects in public/merch/ (`src`) and an existing
// site photo to show until that file exists (`fallback`). Drop the real photo in with that name
// and the next build uses it, with no code change (lib/public-assets.js, existingOr).

export const HERO_PHOTO = {
  src: "/merch/hero-model-hoodie.jpg", // TODO: model wearing a Kazi hoodie, portrait 4:5, 1200x1500
  fallback: "/images/collections/white-label/hoodie.webp",
  alt: "A heavyweight hoodie made by Kazi, with the Kazi logo on the chest",
};

export const FORM_ID = "drop-form";
export const FORM_HREF = `#${FORM_ID}`;

export const HERO_FACTS = ["From 100 pieces per style", "Free 3D preview", "Ships worldwide"];

// Print-on-demand vs Kazi --------------------------------------------------------------------

export const POD_POINTS = [
  "Thin, generic blanks everyone else prints on",
  "Someone else's tag in the neck",
  "Turns up in a plain polybag",
  "No sample, no say in how it's made",
];

export const KAZI_POINTS = [
  "Heavyweight cut-and-sew, made to your spec",
  "Your woven label in the neck",
  "Custom, branded packaging",
  "A sample you approve before we sew",
];

// Product range -------------------------------------------------------------------------------
// `garment` is the garment's id in the Atelier (lib/garments.js), used for the "Customise" deep
// link. Photos are the site's existing white-label product shots.

const PHOTO_DIR = "/images/collections/white-label";

export const PRODUCTS = [
  { garment: "t-shirt", name: "Tees", image: `${PHOTO_DIR}/tshirt.webp` },
  { garment: "hoodie", name: "Hoodies", image: `${PHOTO_DIR}/hoodie.webp` },
  { garment: "long-sleeve", name: "Long sleeves", image: `${PHOTO_DIR}/long-sleeve.webp` },
  { garment: "vest", name: "Vests", image: `${PHOTO_DIR}/vest.webp` },
  { garment: "sweatpants", name: "Pants", image: `${PHOTO_DIR}/pants.webp` },
  { garment: "apron", name: "Aprons", image: `${PHOTO_DIR}/apron.webp` },
  { garment: "tote", name: "Totes", image: `${PHOTO_DIR}/tote.webp` },
];

export const CUSTOM_PRODUCTS = "Knitwear, outerwear, denim, accessories.";

// Make it yours -------------------------------------------------------------------------------

export const CALLOUTS = [
  { title: "Neck label", text: "Woven or printed, with your name where the blank's used to be." },
  { title: "Hang tag", text: "A branded swing tag on every piece." },
  { title: "Your logo", text: "Printed or embroidered, placed where you want it." },
  // TODO: confirm which trims Kazi offers as standard (drawcords, ribbing, zips, thread colour).
  { title: "Trims", text: "Cords, ribbing and stitching chosen to match your look." },
  // TODO: confirm packaging options (mailer bags, boxes, tissue, stickers).
  { title: "Packaging", text: "Custom packaging, so the unboxing is part of the drop." },
];

// How a drop works ----------------------------------------------------------------------------

export const STEPS = [
  { title: "Brief & quote", text: "Tell us what you're dropping. We reply within 24 hours with a quote and a firm delivery date." },
  { title: "Sample & approve", text: "We make a sample first. Nothing is cut at scale until you've signed it off." },
  { title: "Production", text: "Cut and sewn by hand in Kathmandu, by the same team that made your sample." },
  { title: "Quality check", text: "Every piece is checked against your tech pack before it's packed." },
  { title: "Packed & shipped", text: "Labelled, tagged and packed your way, then shipped worldwide." },
];

// Made in Kathmandu ---------------------------------------------------------------------------

// TODO (optional): merch-specific workshop shots. Until then these show the site's own workshop
// photos. When you add a real file, update its `alt` to describe the new photo.
export const WORKSHOP_PHOTOS = [
  {
    src: "/merch/workshop-sewing.jpg", // portrait, 1200x1600
    fallback: "/images/home/step-production.webp",
    alt: "A tailor's hands guiding fabric through a sewing machine at the Kazi workshop in Kathmandu",
  },
  {
    src: "/merch/workshop-floor.jpg", // landscape, 1200x900
    fallback: "/images/home/audience-established.webp",
    alt: "The Kazi workshop floor with rows of sewing stations",
  },
  {
    src: "/merch/workshop-quality-check.jpg", // landscape, 1200x900
    fallback: "/images/home/step-quality.webp",
    alt: "A member of the Kazi team checking a finished garment",
  },
];

export const STATS = [
  { value: "100", label: "piece minimum" },
  { value: "24h", label: "reply" },
  { value: "1", label: "team, sample to shipment" },
];

// Creator drops -------------------------------------------------------------------------------
// TODO: every entry below is placeholder data. Replace with real creators, drops and numbers
// (with their permission), then set CREATOR_DROPS_ARE_PLACEHOLDERS to false to remove the
// "Sample data" labels. Do not launch with invented names or figures.
export const CREATOR_DROPS_ARE_PLACEHOLDERS = true;

export const CREATOR_DROPS = [
  {
    creator: "[Creator name]", // TODO: real creator
    drop: "[Drop name 01]", // TODO
    units: "000 pieces", // TODO
    soldOut: "00 hours", // TODO
    image: "/merch/creator-drop-01.jpg", // TODO: real photo, portrait 4:5, 1200x1500
    fallback: `${PHOTO_DIR}/hoodie.webp`,
  },
  {
    creator: "[Creator name]", // TODO
    drop: "[Drop name 02]", // TODO
    units: "000 pieces", // TODO
    soldOut: "00 hours", // TODO
    image: "/merch/creator-drop-02.jpg", // TODO
    fallback: `${PHOTO_DIR}/tshirt.webp`,
  },
  {
    creator: "[Creator name]", // TODO
    drop: "[Drop name 03]", // TODO
    units: "000 pieces", // TODO
    soldOut: "00 days", // TODO
    image: "/merch/creator-drop-03.jpg", // TODO
    fallback: `${PHOTO_DIR}/tote.webp`,
  },
];

export const CREATOR_QUOTES = [
  // TODO: replace all three with real, approved quotes.
  { quote: "[Placeholder quote: what the creator's fans said when the drop arrived.]", name: "[Creator name]", role: "[Platform, followers]" },
  { quote: "[Placeholder quote: how the quality compared with their old print-on-demand merch.]", name: "[Creator name]", role: "[Platform, followers]" },
  { quote: "[Placeholder quote: a manager on how easy the process was to run.]", name: "[Manager name]", role: "[Agency]" },
];

// Pricing -------------------------------------------------------------------------------------
// TODO: prices. `price` is shown as "From £{price} / unit"; "__" is a visible placeholder.
// TODO: confirm what each option includes before launch.

export const PASSES = [
  {
    name: "Starter Drop",
    summary: "100 pieces, one style.",
    price: "__", // TODO: real "from" price per unit
    includes: ["One style, 100 pieces", "Sample with sign-off", "Your neck label", "Firm delivery date"],
  },
  {
    name: "Collection",
    summary: "Multiple styles in one run.",
    price: "__", // TODO
    featured: true,
    includes: ["Two or more styles", "A sample of every style", "Labels and branded tags", "One delivery date for the lot"],
  },
  {
    name: "Signature Line",
    summary: "Repeat production and full custom packaging.",
    price: "__", // TODO
    includes: ["Repeat production runs", "Full custom packaging", "Labels, tags and trims", "The same team every run"],
  },
];

// FAQ -----------------------------------------------------------------------------------------
// Drafted from Kazi's business info. Entries with `confirm: true` contain a detail that still
// needs checking (see the TODO beside each) — the answer shown is deliberately cautious.

export const FAQS = [
  {
    q: "What's the minimum order?",
    a: "100 pieces per style. That's enough for a real drop without sitting on boxes of unsold stock.",
  },
  {
    q: "How long does a drop take?",
    // TODO: add a typical lead time in weeks once confirmed.
    confirm: true,
    a: "It depends on the style, quantity and finishes. Every quote comes with a firm delivery date, so you know when your drop lands before you commit to anything.",
  },
  {
    q: "What does sampling cost?",
    // TODO: confirm sample pricing, and whether it's credited against the production order.
    confirm: true,
    a: "We make a sample of every style and nothing goes into production until you've signed it off. The sample cost is set out in your quote, so there are no surprises.",
  },
  {
    q: "Do you ship to my fans, or to me?",
    // TODO: confirm whether direct-to-fan shipping is offered, or bulk delivery only.
    confirm: true,
    a: "We ship your finished drop in bulk, anywhere in the world: to you, your warehouse or your fulfilment partner. Shipping and customs are quoted separately from your unit price.",
  },
  {
    q: "Can I mix sizes and colours?",
    // TODO: confirm whether each colourway counts as its own style for the 100-piece minimum.
    confirm: true,
    a: "Yes to sizes: split your 100 pieces across the size run your audience actually wears. Tell us the colours you have in mind and we'll confirm how they fit into the minimum in your quote.",
  },
  {
    q: "Do you handle fulfilment?",
    // TODO: confirm. Drafted as "we make and ship in bulk; individual orders go through your own store/3PL".
    confirm: true,
    a: "We make, pack and ship your drop. Sending individual orders out to fans is usually handled by your own store or a fulfilment partner, and we'll pack the drop so it's ready for them.",
  },
  {
    q: "Can my manager or agency handle it?",
    a: "Yes. A manager or agency can run the whole drop for you: the brief, the sample approval and the sign-off. Just tell us who has the final say.",
  },
  {
    q: "Who owns the designs?",
    // TODO: confirm wording against Kazi's terms.
    confirm: true,
    a: "You do. Your artwork, name and designs stay yours. We make them for you and nobody else.",
  },
];

// Form options --------------------------------------------------------------------------------

export const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Twitch", "X", "Other"];

export const FOLLOWER_RANGES = ["Under 10k", "10k – 50k", "50k – 250k", "250k – 1M", "1M – 10M", "10M+"];

export const PRODUCT_INTERESTS = [...PRODUCTS.map((p) => p.name), "Something custom"];

export const WHATSAPP_MESSAGE = "Hi Kazi, I'd like to plan a merch drop.";
