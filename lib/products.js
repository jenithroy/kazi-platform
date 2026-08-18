// Placeholder catalogue for /collections and /products/[slug]. Structurally correct,
// numerically fictional — every price/MOQ/sustainability figure needs a real-data pass
// before ship, same flag already used elsewhere (TrustStripe's stats, e.g.) for unverified
// placeholder content. Don't quote these prices to a customer.
//
// `garmentModel` is only set where the Atelier's 3D viewer actually has a matching mesh
// (t-shirt.glb / hoodie.glb, see GarmentViewer.tsx) — omitted for silhouettes it can't
// render, so the product page never offers a 3D toggle that would show the wrong garment.
//
// Colour hexes are drawn from the Atelier's own COLOURS palette (AtelierPage.tsx) rather
// than invented per product, so every "Customize in the Atelier" deep link resolves to a
// real, selectable colour instead of snapping to the nearest one.
//
// No per-product photography exists yet, so every product borrows its category's shared
// placeholder photo via `categoryImage()` below rather than pointing at image files that
// don't exist.

export const CATEGORIES = ["Knitwear", "Outerwear", "Denim", "Accessories", "Footwear"];

export const SIZES = ["S", "M", "L", "XL"];

const CATEGORY_IMAGE = {
  Knitwear: "collection-knitwear.jpg",
  Outerwear: "collection-outerwear.jpg",
  Denim: "collection-denim.jpg",
  Accessories: "collection-accessories.jpg",
  Footwear: "collection-footwear.jpg",
};

export function categoryImage(category) {
  return `/images/collections/${CATEGORY_IMAGE[category]}`;
}

export const products = [
  {
    slug: "organic-crew-tee",
    name: "Organic Crew Tee",
    category: "Knitwear",
    garmentModel: "t-shirt",
    price: "From £3.20 / unit",
    moq: 50,
    colors: [
      { name: "Oat", hex: "#E8E0D0" },
      { name: "Stone", hex: "#6B6560" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "White", hex: "#FFFFFF" },
    ],
    sizes: SIZES,
    description:
      "A classic crew neck cut in mid-weight organic cotton jersey — the everyday starting point most brands build a core range around.",
    specs: [
      "Classic crew neck cut",
      "Ribbed collar detailing",
      "Reinforced shoulder-to-shoulder taping",
      "Double-needle stitched hems",
    ],
    sustainability: [
      "GOTS-certified organic cotton available",
      "180 gsm mid-weight knit",
      "Low-impact, non-toxic dyes",
      "Produced in our Kathmandu workspace",
    ],
  },
  {
    slug: "dropshoulder-tee",
    name: "Dropshoulder Tee",
    category: "Knitwear",
    garmentModel: "t-shirt",
    price: "From £4.00 / unit",
    moq: 50,
    colors: [
      { name: "Pine", hex: "#1B3A2B" },
      { name: "Sand", hex: "#B8A898" },
      { name: "Espresso", hex: "#3D2B1F" },
    ],
    sizes: SIZES,
    description:
      "An oversized drape with a dropped shoulder seam, cut from a heavier knit for a relaxed, structured silhouette.",
    specs: [
      "Relaxed drop-shoulder sleeves",
      "Wide neck band detail",
      "Heavier 220 gsm knit structure",
      "Slightly boxy hemline",
    ],
    sustainability: [
      "Premium long-staple cotton",
      "220 gsm heavyweight structure",
      "Mineral-washed finish, no harsh chemical softening",
      "Fair-wage production in Kathmandu",
    ],
  },
  {
    slug: "essential-hoodie",
    name: "Essential Hoodie",
    category: "Outerwear",
    garmentModel: "hoodie",
    price: "From £8.50 / unit",
    moq: 50,
    colors: [
      { name: "Oat", hex: "#E8E0D0" },
      { name: "Stone", hex: "#6B6560" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Pine", hex: "#1B3A2B" },
    ],
    sizes: SIZES,
    description:
      "A clean-lined pullover hoodie in loopback french terry — the range's warmest core piece, built to hold shape wash after wash.",
    specs: [
      "Double-lined hood",
      "Ribbed cuffs and waistband",
      "Spacious kangaroo pocket",
      "Flatlock seam construction",
    ],
    sustainability: [
      "Organic cotton / recycled polyester fleece blend available",
      "380 gsm heavyweight brushed-back knit",
      "Durable, low-waste flatlock construction",
      "Produced in our Kathmandu workspace",
    ],
  },
  {
    slug: "quarter-zip-fleece",
    name: "Quarter-Zip Fleece",
    category: "Outerwear",
    price: "From £9.50 / unit",
    moq: 50,
    colors: [
      { name: "Stone", hex: "#6B6560" },
      { name: "Sand", hex: "#B8A898" },
      { name: "Pine", hex: "#1B3A2B" },
    ],
    sizes: SIZES,
    description:
      "A stand-collar pullover with a quarter-zip closure — warm layering piece with a cleaner line than a full hoodie.",
    specs: [
      "Stand collar design",
      "Quarter-zip closure",
      "Elasticated cuffs",
      "Concealed side pockets",
    ],
    sustainability: [
      "Recycled polyester / organic cotton blend fleece",
      "Solar-powered knitting mill production",
      "Recycled hardware",
      "Transparent production path",
    ],
  },
  {
    slug: "straight-leg-jean",
    name: "Straight-Leg Jean",
    category: "Denim",
    price: "From £11.00 / unit",
    moq: 50,
    colors: [
      { name: "Espresso", hex: "#3D2B1F" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    sizes: SIZES,
    description:
      "A straight-cut five-pocket jean in mid-weight denim, garment-washed to hold its shape through repeat wear.",
    specs: [
      "Five-pocket construction",
      "Mid-weight, garment-dyed denim",
      "Reinforced belt loops and rivets",
      "Straight leg, mid-rise fit",
    ],
    sustainability: [
      "Low-water wash process available",
      "Zero-waste pattern cutting",
      "Metal trims sourced from recycled stock",
      "Produced in our Kathmandu workspace",
    ],
  },
  {
    slug: "denim-overshirt",
    name: "Denim Overshirt",
    category: "Denim",
    price: "From £13.50 / unit",
    moq: 50,
    colors: [
      { name: "Stone", hex: "#6B6560" },
      { name: "Espresso", hex: "#3D2B1F" },
    ],
    sizes: SIZES,
    description:
      "A structured overshirt in washed denim, cut boxy enough to layer, with a chest pocket and button-through front.",
    specs: [
      "Button-through front",
      "Twin chest pockets",
      "Boxy, layer-ready fit",
      "Reinforced yoke seam",
    ],
    sustainability: [
      "Garment-washed with reduced water usage",
      "Zero-waste cutting pattern",
      "Fair-wage workshop production",
      "Recycled button hardware",
    ],
  },
  {
    slug: "canvas-tote",
    name: "Canvas Tote",
    category: "Accessories",
    price: "From £3.80 / unit",
    moq: 50,
    colors: [
      { name: "Oat", hex: "#E8E0D0" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    description:
      "A heavyweight cotton canvas tote built for daily use, with reinforced handles and a flat base that holds shape unloaded.",
    specs: [
      "12oz heavyweight cotton canvas",
      "Reinforced stitched handles",
      "Flat, structured base",
      "Blank or branded on request",
    ],
    sustainability: [
      "Undyed or low-impact dyed canvas available",
      "Zero-waste panel cutting",
      "Handcrafted in our Kathmandu workspace",
      "Biodegradable packaging option",
    ],
  },
  {
    slug: "utility-cap",
    name: "Utility Cap",
    category: "Accessories",
    price: "From £4.50 / unit",
    moq: 50,
    colors: [
      { name: "Stone", hex: "#6B6560" },
      { name: "Pine", hex: "#1B3A2B" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    description:
      "A structured six-panel cap in brushed cotton twill, with an adjustable strap back for a consistent fit across a run.",
    specs: [
      "Structured six-panel construction",
      "Brushed cotton twill",
      "Adjustable strap back",
      "Embroidery-ready front panel",
    ],
    sustainability: [
      "Organic cotton twill available",
      "Metal-free strap hardware option",
      "Produced in our Kathmandu workspace",
      "Low-impact dye process",
    ],
  },
  {
    slug: "canvas-trainer",
    name: "Canvas Trainer",
    category: "Footwear",
    price: "From £14.00 / unit",
    moq: 50,
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    // No `sizes` — footwear runs on numeric sizing, not the S–XL apparel scale used
    // elsewhere; an exact size-run gets worked out once a quote conversation starts.
    description:
      "A low-profile canvas trainer with a vulcanized rubber sole — hand-lasted, built to be re-soled rather than replaced.",
    specs: [
      "Vulcanized rubber sole",
      "Cotton canvas upper",
      "Hand-lasted construction",
      "Reinforced toe cap",
    ],
    sustainability: [
      "Natural rubber sole available",
      "Undyed canvas option",
      "Hand-lasted by Kathmandu artisans",
      "Repairable, re-solable construction",
    ],
  },
  {
    slug: "espadrille-slip-on",
    name: "Espadrille Slip-On",
    category: "Footwear",
    price: "From £12.50 / unit",
    moq: 50,
    colors: [
      { name: "Oat", hex: "#E8E0D0" },
      { name: "Espresso", hex: "#3D2B1F" },
    ],
    description:
      "A slip-on with a woven jute sole and canvas upper — a lightweight warm-weather piece for a summer-facing range.",
    specs: [
      "Woven jute sole",
      "Cotton canvas upper",
      "Slip-on construction, no laces",
      "Hand-finished edge binding",
    ],
    sustainability: [
      "Natural jute sole",
      "Undyed canvas option",
      "Hand-finished by Kathmandu artisans",
      "Biodegradable core materials",
    ],
  },
];

export function getProductBySlug(slug) {
  return products.find((p) => p.slug === slug);
}

export function getRelatedProducts(product, limit = 4) {
  return products.filter((p) => p.slug !== product.slug && p.category === product.category).slice(0, limit);
}
