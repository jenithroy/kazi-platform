// Placeholder catalogue for /collections and /products/[slug]. Structurally correct,
// numerically fictional — every price/MOQ/sustainability figure needs a real-data pass
// before ship, same flag used for any other unverified
// placeholder content. Don't quote these prices to a customer.
//
// `garmentModel` names the product's garment in the Atelier (lib/garments.js), which has a
// 3D model and a 2D mockup for each — so every product page offers "Customize in the Atelier".
// Leave it out for a product the Atelier can't render, so no page offers a preview or a
// customiser that would show the wrong garment.
//
// Colour hexes are drawn from the Atelier's own COLOURS palette (lib/garments.js) rather
// than invented per product, so every "Customize in the Atelier" deep link resolves to a
// real, selectable colour instead of snapping to the nearest one.
//
// Every product has its own `image`: a white-label product photo (a blank white product, no
// logo on it) in public/images/collections/white-label/ — 3:4 portraits, WebP copies of the
// supplied photos (the "Remove_logo_from_image_*_2K.jpg" set, Nov 2026). One product per photo, so no
// two products share a picture, and a product without a real photo is not listed (the Canvas
// Trainer was removed for that reason, along with the Footwear category). To add a product,
// drop its photo in that folder and add an entry here; a new category goes in CATEGORIES too.

export const CATEGORIES = ["Knitwear", "Outerwear", "Bottoms", "Accessories"];

export const SIZES = ["S", "M", "L", "XL"];

const WHITE_LABEL_DIR = "/images/collections/white-label";

/** A white-label photo by file name, e.g. whiteLabelPhoto("vest"). */
export function whiteLabelPhoto(name) {
  return `${WHITE_LABEL_DIR}/${name}.webp`;
}

export const products = [
  {
    slug: "organic-crew-tee",
    name: "Organic Crew Tee",
    category: "Knitwear",
    garmentModel: "t-shirt",
    image: whiteLabelPhoto("tshirt"),
    price: "From £3.20 / unit",
    moq: 100,
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
    slug: "long-sleeve-tee",
    name: "Long-Sleeve Tee",
    category: "Knitwear",
    garmentModel: "long-sleeve",
    image: whiteLabelPhoto("long-sleeve"),
    price: "From £4.80 / unit",
    moq: 100,
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Oat", hex: "#E8E0D0" },
      { name: "Stone", hex: "#6B6560" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    sizes: SIZES,
    description:
      "The crew-neck tee with sleeves — a relaxed, boxy cut in mid-weight organic cotton jersey with plain hemmed cuffs, a layering staple that carries a left-chest print or a full back graphic equally well.",
    specs: [
      "Relaxed crew neck cut with a ribbed collar",
      "Plain hemmed cuffs",
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
    slug: "essential-hoodie",
    name: "Essential Hoodie",
    category: "Outerwear",
    garmentModel: "hoodie",
    image: whiteLabelPhoto("hoodie"),
    price: "From £8.50 / unit",
    moq: 100,
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
    slug: "utility-vest",
    name: "Utility Vest",
    category: "Outerwear",
    garmentModel: "vest",
    image: whiteLabelPhoto("vest"),
    price: "From £14.50 / unit",
    moq: 100,
    colors: [
      { name: "Oat", hex: "#E8E0D0" },
      { name: "Stone", hex: "#6B6560" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Pine", hex: "#1B3A2B" },
    ],
    sizes: SIZES,
    description:
      "A sleeveless utility layer with a V-neck, centre zip and four flap pockets — made for workwear, field and studio ranges that need a brand mark on the chest.",
    specs: [
      "V-neck with centre zip front",
      "Four flap pockets: two chest, two lower",
      "Solid shoulder yoke with bound armholes",
      "Open-weave mesh body",
    ],
    sustainability: [
      "Organic cotton canvas available",
      "Garment-dyed in small batches",
      "Hardware from recycled stock",
      "Produced in our Kathmandu workspace",
    ],
  },
  {
    slug: "sweatpants",
    name: "Sweatpants",
    category: "Bottoms",
    garmentModel: "sweatpants",
    image: whiteLabelPhoto("pants"),
    price: "From £9.80 / unit",
    moq: 100,
    colors: [
      { name: "Oat", hex: "#E8E0D0" },
      { name: "Stone", hex: "#6B6560" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Pine", hex: "#1B3A2B" },
    ],
    sizes: SIZES,
    description:
      "Relaxed wide-leg sweatpants in brushed loopback fleece — a flat elasticated waistband, side pockets and plain hemmed ankles, with room on the thigh for a print or embroidery.",
    specs: [
      "Flat elasticated waistband",
      "Side pockets",
      "Wide straight leg with plain hems",
      "Brushed-back loopback fleece",
    ],
    sustainability: [
      "Organic cotton fleece available",
      "320 gsm mid-heavyweight knit",
      "Low-impact, non-toxic dyes",
      "Produced in our Kathmandu workspace",
    ],
  },
  {
    slug: "canvas-tote",
    name: "Canvas Tote",
    category: "Accessories",
    garmentModel: "tote",
    image: whiteLabelPhoto("tote"),
    price: "From £3.80 / unit",
    moq: 100,
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
    slug: "work-apron",
    name: "Work Apron",
    category: "Accessories",
    garmentModel: "apron",
    image: whiteLabelPhoto("apron"),
    price: "From £5.20 / unit",
    moq: 100,
    colors: [
      { name: "Oat", hex: "#E8E0D0" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Pine", hex: "#1B3A2B" },
    ],
    // No `sizes` — one size, with an adjustable neck strap and long waist ties.
    description:
      "A hard-wearing bib apron in cotton twill — adjustable neck strap, long waist ties and a generous bib that shows off a printed or embroidered logo.",
    specs: [
      "Mid-weight cotton twill",
      "Adjustable neck strap with buckle",
      "Long waist ties",
      "One size fits most",
    ],
    sustainability: [
      "Organic cotton twill available",
      "Low-impact dye process",
      "Zero-waste panel cutting",
      "Produced in our Kathmandu workspace",
    ],
  },
];

export function getProductBySlug(slug) {
  return products.find((p) => p.slug === slug);
}

/** Same-category products first, then the rest of the range, so every product page has a row. */
export function getRelatedProducts(product, limit = 4) {
  const others = products.filter((p) => p.slug !== product.slug);
  const sameCategory = others.filter((p) => p.category === product.category);
  const rest = others.filter((p) => p.category !== product.category);
  return [...sameCategory, ...rest].slice(0, limit);
}
