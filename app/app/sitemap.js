import { SITE_URL } from "@/lib/site";
import { products } from "@/lib/products";

export const dynamic = "force-static";

const STATIC_ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/atelier", changeFrequency: "monthly", priority: 0.8 },
  { path: "/heritage", changeFrequency: "monthly", priority: 0.8 },
  { path: "/collections", changeFrequency: "weekly", priority: 0.8 },
  { path: "/lookbook", changeFrequency: "monthly", priority: 0.6 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.7 },
  { path: "/video-editing", changeFrequency: "monthly", priority: 0.7 },
  { path: "/stories", changeFrequency: "weekly", priority: 0.6 },
  { path: "/quote", changeFrequency: "monthly", priority: 0.6 },
];

export default function sitemap() {
  const lastModified = new Date();

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const productEntries = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries];
}
