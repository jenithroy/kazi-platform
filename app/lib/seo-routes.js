import { categoryImage, products } from "@/lib/products";

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
      "Custom clothing manufacturing for UK brands, crafted in Kathmandu, Nepal. Small-batch runs from 50 units, in-house sampling, quality control and worldwide delivery.",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/heritage",
    label: "Services",
    group: "Main pages",
    title: "Manufacturing Services",
    description:
      "Custom manufacturing, DTG, screen printing, embroidery, DTF and video editing — Kazi's full service catalogue, run out of one Kathmandu atelier.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/atelier",
    label: "Design your garment",
    group: "Main pages",
    title: "Design Your Garment",
    description:
      "Build a custom garment in the Kazi Atelier — pick a silhouette, colour and print placement, then send your design straight to a manufacturing quote.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/pricing",
    label: "Pricing",
    group: "Main pages",
    title: "Pricing",
    description:
      "Estimate the cost of your order by product, quantity and add-ons, then request a firm, itemised manufacturing quote.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/video-editing",
    label: "Video editing",
    group: "Main pages",
    title: "Video Editing",
    description:
      "Kazi's in-house editing studio — product video, campaign films and social cut-downs for the brands we manufacture for.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/quote",
    label: "Request a quote",
    group: "Main pages",
    title: "Request a Quote",
    description:
      "Tell us what you're making and we'll reply within 24 hours with a clear, itemised manufacturing quote — no hidden costs.",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/collections",
    label: "The Collection",
    group: "Main pages",
    title: "The Collection",
    description:
      "Ready-to-order styles across knitwear, outerwear, denim, accessories and footwear, built to the same spec as a custom manufacturing run.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/lookbook",
    label: "Lookbook",
    group: "Main pages",
    title: "Lookbook",
    description:
      "Fabric, fit and finish by category — knitwear, outerwear, denim, accessories and footwear from the Kazi production floor.",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/stories",
    label: "Stories (blog index)",
    group: "Main pages",
    title: "Stories",
    description:
      "Notes from the Kazi production floor and the brands we manufacture for — process, sourcing and behind-the-scenes updates.",
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    path: "/privacy-policy",
    label: "Privacy Policy",
    group: "Legal",
    title: "Privacy Policy",
    description: "How Kazi Manufacturing collects, uses and protects your personal data.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/terms",
    label: "Terms & Conditions",
    group: "Legal",
    title: "Terms & Conditions",
    description: "The terms that govern your use of kazimanufacturing.com.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/cookies",
    label: "Cookie Policy",
    group: "Legal",
    title: "Cookie Policy",
    description: "What kazimanufacturing.com stores in your browser, and why.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/accessibility",
    label: "Accessibility Statement",
    group: "Legal",
    title: "Accessibility Statement",
    description: "Kazi Manufacturing's approach to an accessible website, and how to report a problem.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
];

export const PRODUCT_ROUTES = products.map((product) => ({
  path: `/products/${product.slug}`,
  label: product.name,
  group: "Products",
  title: product.name,
  description: product.description,
  image: categoryImage(product.category),
  changeFrequency: "weekly",
  priority: 0.7,
}));

export const ALL_SEO_ROUTES = [...SEO_ROUTES, ...PRODUCT_ROUTES];

export function findSeoRoute(path) {
  return ALL_SEO_ROUTES.find((route) => route.path === path) ?? null;
}
