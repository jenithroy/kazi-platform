export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductVariant {
  sizes: string[];
  colors: ProductColor[];
}

export interface PriceTier {
  minQty: number;
  maxQty: number | null;
  price: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: 'tshirts' | 'hoodies';
  tagline: string;
  description: string;
  details: string[];
  priceTiers: PriceTier[];
  moq: number;
  colors: ProductColor[];
  sizes: string[];
  image: string;
  badge?: string;
}

export const PRODUCTS: Product[] = [
  // ── T-SHIRTS ──
  {
    id: 'ts-001',
    slug: 'classic-crew-tee',
    name: 'Classic Crew Tee',
    category: 'tshirts',
    tagline: 'The everyday essential.',
    description: 'Our most popular blank — a 180gsm regular-fit crew neck tee in ring-spun cotton. Clean lines, reliable structure, and a finish that holds its shape wash after wash.',
    details: ['180gsm ring-spun cotton', 'Regular fit', 'Crew neck', 'Double-needle hem', 'Pre-shrunk fabric', 'Available in 8 colourways'],
    priceTiers: [
      { minQty: 50,   maxQty: 99,   price: 8.50 },
      { minQty: 100,  maxQty: 249,  price: 6.50 },
      { minQty: 250,  maxQty: 499,  price: 5.00 },
      { minQty: 500,  maxQty: 999,  price: 4.00 },
      { minQty: 1000, maxQty: null, price: 3.20 },
    ],
    moq: 50,
    colors: [
      { name: 'Black',        hex: '#1a1a1a' },
      { name: 'White',        hex: '#f5f5f5' },
      { name: 'Navy',         hex: '#1e3a5f' },
      { name: 'Forest Green', hex: '#1e4d2b' },
      { name: 'Heather Grey', hex: '#9ca3af' },
      { name: 'Bone',         hex: '#e8e0d0' },
      { name: 'Slate Blue',   hex: '#4a6fa5' },
      { name: 'Burgundy',     hex: '#6b2737' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    image: '/images/factory-1.jpg',
    badge: 'Best Seller',
  },
  {
    id: 'ts-002',
    slug: 'box-tee',
    name: 'Box Tee',
    category: 'tshirts',
    tagline: 'Boxy silhouette. Clean aesthetic.',
    description: 'A 240gsm box-cut tee with a structured boxy silhouette, dropped shoulders, and a substantial hand-feel. Made for brands building in the contemporary and streetwear spaces.',
    details: ['240gsm ring-spun cotton', 'Boxy fit', 'Dropped shoulders', 'Ribbed collar', 'Side seam construction', 'Pre-washed for minimal shrink'],
    priceTiers: [
      { minQty: 50,   maxQty: 99,   price: 11.00 },
      { minQty: 100,  maxQty: 249,  price: 8.50  },
      { minQty: 250,  maxQty: 499,  price: 7.00  },
      { minQty: 500,  maxQty: 999,  price: 5.50  },
      { minQty: 1000, maxQty: null, price: 4.50  },
    ],
    moq: 50,
    colors: [
      { name: 'Black',        hex: '#1a1a1a' },
      { name: 'White',        hex: '#f5f5f5' },
      { name: 'Washed Olive', hex: '#6b7a4a' },
      { name: 'Washed Brown', hex: '#7a5c3a' },
      { name: 'Washed Navy',  hex: '#2a3d5c' },
      { name: 'Ecru',         hex: '#d4c5a9' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    image: '/images/tshirts.jpg',
    badge: 'Premium',
  },
  {
    id: 'ts-003',
    slug: 'oversized-drop-tee',
    name: 'Oversized Drop Tee',
    category: 'tshirts',
    tagline: 'Built for the streetwear shelf.',
    description: 'A relaxed, oversized silhouette with elongated body length and dropped sleeves — designed for the brands building in the streetwear and contemporary spaces.',
    details: ['210gsm cotton-poly blend', 'Oversized fit', 'Extended body length', 'Dropped sleeve seam', 'Ribbed cuffs', 'Enzyme washed finish'],
    priceTiers: [
      { minQty: 50,   maxQty: 99,   price: 10.00 },
      { minQty: 100,  maxQty: 249,  price: 7.80  },
      { minQty: 250,  maxQty: 499,  price: 6.40  },
      { minQty: 500,  maxQty: 999,  price: 5.20  },
      { minQty: 1000, maxQty: null, price: 4.20  },
    ],
    moq: 50,
    colors: [
      { name: 'Black',       hex: '#1a1a1a' },
      { name: 'White',       hex: '#f5f5f5' },
      { name: 'Dusty Pink',  hex: '#c9a0a0' },
      { name: 'Sand',        hex: '#d4b896' },
      { name: 'Sage',        hex: '#8fa68a' },
      { name: 'Slate',       hex: '#7a8a96' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    image: '/images/factory-1.jpg',
  },

  // ── HOODIES ──
  {
    id: 'hd-001',
    slug: 'classic-pullover-hoodie',
    name: 'Classic Pullover Hoodie',
    category: 'hoodies',
    tagline: 'The hoodie your brand needs.',
    description: 'A 380gsm fleece-lined pullover with a structured hood, kangaroo pocket, and ribbed cuffs. The reliable foundation for any branded collection.',
    details: ['380gsm cotton-fleece', 'Regular fit', 'Double-lined hood', 'Kangaroo pocket', 'Ribbed hem & cuffs', 'Metal drawstring tips'],
    priceTiers: [
      { minQty: 50,   maxQty: 99,   price: 18.00 },
      { minQty: 100,  maxQty: 249,  price: 14.50 },
      { minQty: 250,  maxQty: 499,  price: 12.00 },
      { minQty: 500,  maxQty: 999,  price: 10.00 },
      { minQty: 1000, maxQty: null, price: 8.50  },
    ],
    moq: 50,
    colors: [
      { name: 'Black',        hex: '#1a1a1a' },
      { name: 'White',        hex: '#f5f5f5' },
      { name: 'Navy',         hex: '#1e3a5f' },
      { name: 'Forest Green', hex: '#1e4d2b' },
      { name: 'Heather Grey', hex: '#9ca3af' },
      { name: 'Burgundy',     hex: '#6b2737' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    image: '/images/factory-1.jpg',
    badge: 'Best Seller',
  },
  {
    id: 'hd-002',
    slug: 'zip-up-hoodie',
    name: 'Zip-Up Hoodie',
    category: 'hoodies',
    tagline: 'Versatile. Layerable. Brand-ready.',
    description: 'A full-zip fleece hoodie with a clean YKK zipper, structured hood, and side pockets. Works as a standalone piece or under outerwear.',
    details: ['350gsm cotton-fleece', 'Regular fit', 'YKK full-length zip', 'Side hand pockets', 'Ribbed cuffs & hem', 'Double-layered hood'],
    priceTiers: [
      { minQty: 50,   maxQty: 99,   price: 22.00 },
      { minQty: 100,  maxQty: 249,  price: 18.00 },
      { minQty: 250,  maxQty: 499,  price: 15.00 },
      { minQty: 500,  maxQty: 999,  price: 12.50 },
      { minQty: 1000, maxQty: null, price: 10.50 },
    ],
    moq: 50,
    colors: [
      { name: 'Black',  hex: '#1a1a1a' },
      { name: 'Navy',   hex: '#1e3a5f' },
      { name: 'Grey',   hex: '#6b7280' },
      { name: 'Khaki',  hex: '#8a7d5a' },
      { name: 'Stone',  hex: '#c4b9a8' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    image: '/images/factory-1.jpg',
    badge: 'New',
  },
  {
    id: 'hd-003',
    slug: 'oversized-hoodie',
    name: 'Oversized Hoodie',
    category: 'hoodies',
    tagline: 'The drop-shoulder statement piece.',
    description: 'A premium 420gsm garment-washed oversized hoodie with dropped shoulders, extended length, and a relaxed boxy fit. Built for the premium streetwear market.',
    details: ['420gsm garment-washed fleece', 'Oversized boxy fit', 'Dropped shoulders', 'Extended body length', 'Tonal drawcords', 'Enzyme washed finish'],
    priceTiers: [
      { minQty: 50,   maxQty: 99,   price: 26.00 },
      { minQty: 100,  maxQty: 249,  price: 21.00 },
      { minQty: 250,  maxQty: 499,  price: 17.50 },
      { minQty: 500,  maxQty: 999,  price: 14.00 },
      { minQty: 1000, maxQty: null, price: 12.00 },
    ],
    moq: 50,
    colors: [
      { name: 'Black',       hex: '#1a1a1a' },
      { name: 'Ecru',        hex: '#d4c5a9' },
      { name: 'Washed Sage', hex: '#7a9a7a' },
      { name: 'Washed Brown',hex: '#7a5c3a' },
      { name: 'Slate',       hex: '#4a5568' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    image: '/images/factory-1.jpg',
    badge: 'Premium',
  },
];

export function getProductsByCategory(category: 'tshirts' | 'hoodies') {
  return PRODUCTS.filter(p => p.category === category);
}

export function getProductBySlug(slug: string) {
  return PRODUCTS.find(p => p.slug === slug) ?? null;
}

export function getPriceForQty(product: Product, qty: number) {
  return product.priceTiers.find(t => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty))?.price ?? product.priceTiers[0].price;
}
