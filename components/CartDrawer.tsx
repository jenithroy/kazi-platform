'use client';

import Link from 'next/link';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { getPriceForQty } from '@/lib/products';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, totalItems, totalPrice } = useCart();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[420px] bg-white flex flex-col shadow-2xl transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-kazi-sand">
          <div>
            <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.15em] text-kazi-charcoal">
              Your Cart
            </h2>
            {totalItems > 0 && (
              <p className="font-sans text-xs text-kazi-slate mt-0.5">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
            )}
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 flex items-center justify-center text-kazi-slate hover:text-kazi-charcoal transition-colors"
            aria-label="Close cart"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <ShoppingBag size={36} strokeWidth={1} className="text-kazi-sand" />
              <p className="font-sans text-sm text-kazi-slate">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-green hover:text-kazi-green-dark transition-colors"
              >
                Continue shopping →
              </button>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map((item) => {
                const unitPrice = getPriceForQty(item.product, item.quantity);
                const lineTotal = unitPrice * item.quantity;
                return (
                  <li key={`${item.product.id}-${item.color.name}-${item.size}`}
                    className="flex gap-4 py-4 border-b border-kazi-sand/60 last:border-0">
                    {/* Color swatch as visual */}
                    <div
                      className="w-14 h-14 rounded-sm flex-shrink-0 border border-kazi-sand"
                      style={{ backgroundColor: item.color.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-sans text-sm font-semibold text-kazi-charcoal leading-tight">{item.product.name}</p>
                          <p className="font-sans text-xs text-kazi-slate mt-0.5">
                            {item.color.name} · {item.size}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id, item.color.name, item.size)}
                          className="text-kazi-slate/50 hover:text-kazi-charcoal transition-colors flex-shrink-0"
                          aria-label="Remove item"
                        >
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity controls */}
                        <div className="flex items-center border border-kazi-sand rounded-sm">
                          <button
                            onClick={() => updateQty(item.product.id, item.color.name, item.size, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-kazi-slate hover:text-kazi-charcoal transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} strokeWidth={2} />
                          </button>
                          <span className="w-8 text-center font-sans text-xs font-semibold text-kazi-charcoal">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.product.id, item.color.name, item.size, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-kazi-slate hover:text-kazi-charcoal transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} strokeWidth={2} />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-sans text-sm font-semibold text-kazi-charcoal">
                            £{lineTotal.toFixed(2)}
                          </p>
                          <p className="font-sans text-xs text-kazi-slate/60">
                            £{unitPrice.toFixed(2)}/unit
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-kazi-sand bg-kazi-cream/50">
            <div className="flex justify-between items-center mb-1">
              <span className="font-sans text-xs uppercase tracking-[0.15em] text-kazi-slate">Subtotal</span>
              <span className="font-sans text-lg font-semibold text-kazi-charcoal">£{totalPrice.toFixed(2)}</span>
            </div>
            <p className="font-sans text-xs text-kazi-slate/60 mb-5">Shipping & duties calculated at checkout</p>
            <Link
              href="/shop/checkout"
              onClick={closeCart}
              className="block w-full text-center bg-kazi-green hover:bg-kazi-green-dark text-white font-sans text-xs font-semibold uppercase tracking-[0.15em] py-4 rounded-sm transition-colors duration-500"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={closeCart}
              className="block w-full text-center mt-3 font-sans text-xs uppercase tracking-[0.15em] text-kazi-slate hover:text-kazi-charcoal transition-colors py-2"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
