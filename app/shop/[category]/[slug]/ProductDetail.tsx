'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ChevronDown } from 'lucide-react';
import type { Product } from '@/lib/products';
import { getPriceForQty } from '@/lib/products';
import { useCart } from '@/contexts/CartContext';

export default function ProductDetail({ product }: { product: Product }) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[2] ?? product.sizes[0]);
  const [quantity, setQuantity] = useState(product.moq);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const unitPrice = getPriceForQty(product, quantity);
  const totalPrice = unitPrice * quantity;

  const activeTierIndex = product.priceTiers.findIndex(
    (t) => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty)
  );

  const handleAddToCart = () => {
    addItem({ product, quantity, color: selectedColor, size: selectedSize });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleQtyChange = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) setQuantity(n);
  };

  const categoryLabel = product.category === 'tshirts' ? 'T-Shirts' : 'Hoodies';
  const categoryHref = `/shop/${product.category}`;

  return (
    <div className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-20 py-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-sans text-xs text-kazi-slate/60 mb-10 uppercase tracking-[0.12em]">
        <Link href="/" className="hover:text-kazi-charcoal transition-colors">Home</Link>
        <span>/</span>
        <Link href={categoryHref} className="hover:text-kazi-charcoal transition-colors">{categoryLabel}</Link>
        <span>/</span>
        <span className="text-kazi-charcoal">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-kazi-cream-dark">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
          {product.badge && (
            <span className="absolute top-5 left-5 px-3 py-1.5 bg-kazi-charcoal text-white font-sans text-[10px] font-semibold uppercase tracking-[0.12em] rounded-sm">
              {product.badge}
            </span>
          )}
          {/* Color preview overlay */}
          <div
            className="absolute bottom-5 right-5 w-10 h-10 rounded-full border-2 border-white shadow-lg transition-all duration-300"
            style={{ backgroundColor: selectedColor.hex }}
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-8">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-kazi-green mb-3">{categoryLabel}</p>
            <h1 className="font-sans text-3xl md:text-4xl font-normal text-kazi-charcoal mb-2">{product.name}</h1>
            <p className="font-sans text-lg text-kazi-slate mb-6">{product.tagline}</p>
            <p className="font-sans text-sm text-kazi-slate leading-relaxed">{product.description}</p>
          </div>

          {/* Price Tiers */}
          <div className="mb-8">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-slate mb-3">Volume Pricing</p>
            <div className="grid grid-cols-5 gap-px bg-kazi-sand border border-kazi-sand rounded-sm overflow-hidden">
              {product.priceTiers.map((tier, idx) => (
                <div
                  key={tier.minQty}
                  className={`px-2 py-3 text-center transition-colors duration-300 ${
                    idx === activeTierIndex
                      ? 'bg-kazi-green text-white'
                      : 'bg-white text-kazi-charcoal'
                  }`}
                >
                  <p className={`font-sans text-[10px] uppercase tracking-[0.1em] mb-1 ${
                    idx === activeTierIndex ? 'text-white/70' : 'text-kazi-slate/60'
                  }`}>
                    {tier.maxQty ? `${tier.minQty}–${tier.maxQty}` : `${tier.minQty}+`}
                  </p>
                  <p className="font-sans text-sm font-semibold">£{tier.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="mb-6">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-slate mb-3">
              Colour — <span className="font-normal normal-case tracking-normal text-kazi-charcoal">{selectedColor.name}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <button
                  key={color.name}
                  title={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                    selectedColor.name === color.name
                      ? 'border-kazi-charcoal scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex, boxShadow: selectedColor.name === color.name ? `0 0 0 2px white, 0 0 0 4px ${color.hex}` : undefined }}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-slate mb-3">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.1em] border rounded-sm transition-all duration-300 ${
                    selectedSize === size
                      ? 'border-kazi-charcoal bg-kazi-charcoal text-white'
                      : 'border-kazi-sand text-kazi-slate hover:border-kazi-charcoal hover:text-kazi-charcoal'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-8">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-slate mb-3">
              Quantity <span className="font-normal normal-case tracking-normal text-kazi-slate/60">(Min. {product.moq})</span>
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={product.moq}
                step={1}
                value={quantity}
                onChange={(e) => handleQtyChange(e.target.value)}
                className="w-28 px-4 py-3 bg-kazi-cream border border-kazi-sand text-kazi-charcoal font-sans text-sm rounded-sm focus:outline-none focus:border-kazi-green transition-colors duration-300"
              />
              <div className="text-right">
                <p className="font-sans text-2xl font-semibold text-kazi-charcoal">£{totalPrice.toFixed(2)}</p>
                <p className="font-sans text-xs text-kazi-slate/60">£{unitPrice.toFixed(2)}/unit</p>
              </div>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            className={`w-full py-4 rounded-sm font-sans text-sm font-semibold uppercase tracking-[0.12em] transition-all duration-500 flex items-center justify-center gap-2 ${
              added
                ? 'bg-kazi-green-dark text-white'
                : 'bg-kazi-green hover:bg-kazi-green-dark text-white'
            }`}
          >
            {added ? (
              <>
                <Check size={16} strokeWidth={2.5} />
                Added to Cart
              </>
            ) : (
              'Add to Cart'
            )}
          </button>

          <p className="font-sans text-xs text-kazi-slate/60 text-center mt-3">
            Prices are for blank garments. Print decoration quoted separately.
          </p>

          {/* Separator */}
          <div className="border-t border-kazi-sand my-8" />

          {/* Details */}
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-slate mb-4">Product Details</p>
            <ul className="space-y-2">
              {product.details.map((detail) => (
                <li key={detail} className="flex items-center gap-3 font-sans text-sm text-kazi-slate">
                  <span className="w-1 h-1 rounded-full bg-kazi-green flex-shrink-0" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
