import { products } from "@/lib/products";

// Default SEO for every code-defined public page. /admin can override the title,
// description, social image and indexing per path (stored in the seo_pages table); anything
// left blank there falls back to what's written here. Paths have no trailing slash — the
// export adds one to every URL (trailingSlash in next.config.mjs).
export const SEO_ROUTES = [
  {
    path: "/",
    label: "Home",
    group: "Main pages",
    title: "Custom Apparel Manufacturing in Nepal | Kazi Manufacturing",
    description:
      "Low-MOQ custom clothing manufacturing for UK brands, crafted in Kathmandu, Nepal. Small-batch runs from 100 units, in-house sampling & worldwide shipping.",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/heritage",
    label: "Services",
    group: "Main pages",
    title: "Cut & Sew, Print & Embroidery Services",
    description:
      "Low-MOQ cut-and-sew garment manufacturing, screen printing, embroidery, DTG, DTF and video editing — run out of one Kathmandu atelier from 100 units.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/atelier",
    label: "Design your garment",
    group: "Main pages",
    title: "3D Custom Garment Designer & Studio",
    description:
      "Design custom clothing in 3D in the Kazi Atelier — choose a blank garment, fabric, colour and print or embroidery placement, then request a production quote.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/digitizer",
    label: "Embroidery digitizer",
    group: "Main pages",
    title: "Free Online Embroidery Digitizer — Image to DST & PES",
    description:
      "Free browser-based embroidery digitizer: convert any logo, PNG or text into machine stitch files (DST, PES, EXP, JEF, VP3, XXX) with 3D stitch preview.",
    image: "/images/home/digitizer-poster.webp",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/pricing",
    label: "Pricing",
    group: "Main pages",
    title: "Clothing Manufacturing Pricing",
    description:
      "Calculate custom clothing manufacturing costs by garment style, order quantity (from 100 units) and print or embroidery add-ons, then request a firm quote.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/merch",
    label: "Kazi Merch (creators)",
    group: "Main pages",
    // Used as written: with the brand suffix it would pass the 60-character limit, so
    // composeTitle (lib/seo-core.js) leaves the suffix off.
    title: "Kazi Merch — Custom Cut-and-Sew Merch for Creators",
    description:
      "Custom cut-and-sew merch for creators, handmade in Kathmandu. Low-MOQ drops from 100 pieces per style, sampled first, with custom neck labels & packaging.",
    image: "/images/collections/white-label/hoodie.webp",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/video-editing",
    label: "Video editing",
    group: "Main pages",
    title: "Apparel & Product Video Editing Studio",
    description:
      "Kazi's in-house fashion and product video editing studio — campaign films, lookbook reels and social cut-downs in 16:9, 4:5 and 9:16 for clothing brands.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/quote",
    label: "Request a quote",
    group: "Main pages",
    title: "Request a Clothing Manufacturing Quote",
    description:
      "Tell us what garments you're making and receive a clear, itemised low-MOQ manufacturing quote within 24 hours — small-batch production from 100 units.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/collections",
    label: "The Collection",
    group: "Main pages",
    title: "White-Label Blank Apparel Collection",
    description:
      "Browse customisable white-label blank apparel — organic cotton tees, heavyweight hoodies, sweatpants, vests and totes. Low-MOQ production from 100 units.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/lookbook",
    label: "Lookbook",
    group: "Main pages",
    title: "Apparel Lookbook — Fabric, Fit & Finish",
    description:
      "Explore fabric weights, silhouettes and construction details across knitwear, heavyweight outerwear, bottoms and canvas accessories from the Kazi floor.",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/stories",
    label: "Stories (blog index)",
    group: "Main pages",
    title: "Apparel Manufacturing Guides & Stories",
    description:
      "Practical guides on low-MOQ clothing manufacturing, tech packs, fabric GSM weights, sampling timelines and behind-the-scenes stories from our Kathmandu floor.",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/privacy-policy",
    label: "Privacy Policy",
    group: "Legal",
    title: "Privacy Policy",
    description:
      "Read how Kazi Manufacturing collects, processes and protects your personal data, quote enquiries and uploaded design files under UK GDPR standards.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/terms",
    label: "Terms & Conditions",
    group: "Legal",
    title: "Terms & Conditions",
    description:
      "Review the terms and conditions governing your use of kazimanufacturing.com, custom garment sampling, small-batch production orders and deliveries.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/cookies",
    label: "Cookie Policy",
    group: "Legal",
    title: "Cookie Policy",
    description:
      "Learn what cookies and local browser storage kazimanufacturing.com uses for your garment design session, quote bag and site preferences, and why.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/accessibility",
    label: "Accessibility Statement",
    group: "Legal",
    title: "Accessibility Statement",
    description:
      "Kazi Manufacturing's commitment to WCAG 2.1 AA digital accessibility across our website, 3D Atelier and embroidery digitizer, plus how to report issues.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
];

export const PRODUCT_ROUTES = products.map((product) => ({
  path: `/products/${product.slug}`,
  label: product.name,
  group: "Products",
  title: product.seoTitle || product.name,
  description: product.description,
  image: product.image,
  changeFrequency: "weekly",
  priority: 0.7,
}));

export const ALL_SEO_ROUTES = [...SEO_ROUTES, ...PRODUCT_ROUTES];

export function findSeoRoute(path) {
  return ALL_SEO_ROUTES.find((route) => route.path === path) ?? null;
}
