'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useCart } from '@/contexts/CartContext';
import { getPriceForQty } from '@/lib/products';

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputClass = 'w-full px-4 py-3 bg-kazi-cream border border-kazi-sand text-kazi-charcoal font-sans text-sm rounded-sm focus:outline-none focus:border-kazi-green transition-colors duration-300 placeholder-kazi-slate/40';
  const labelClass = 'block font-sans text-xs font-semibold uppercase tracking-[0.12em] text-kazi-slate mb-1.5';

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/cart-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, email, name, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-kazi-cream text-kazi-charcoal">
        <Navbar />
        <div className="pt-32 flex flex-col items-center justify-center py-32 px-6 text-center">
          <ShoppingBag size={48} strokeWidth={1} className="text-kazi-sand mb-6" />
          <h1 className="font-sans text-2xl font-normal text-kazi-charcoal mb-4">Your cart is empty</h1>
          <p className="font-sans text-sm text-kazi-slate mb-8">Add some products before checking out.</p>
          <Link href="/shop/tshirts" className="btn-primary">Browse Products</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-kazi-cream text-kazi-charcoal">
      <Navbar />

      <div className="pt-32 max-w-[1100px] mx-auto px-6 md:px-12 lg:px-20 py-16">
        {/* Header */}
        <div className="mb-12">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-kazi-slate mb-2">Checkout</p>
          <h1 className="font-sans text-3xl font-normal text-kazi-charcoal">Complete your order</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
          {/* Left: Form */}
          <div>
            {error && (
              <div className="bg-kazi-green/10 border border-kazi-green/30 text-kazi-charcoal px-4 py-3 rounded-sm mb-6 font-sans text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCheckout} className="space-y-6">
              <div>
                <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.15em] text-kazi-slate mb-6">Contact Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Order Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any special requirements, branding notes, or questions..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-kazi-green hover:bg-kazi-green-dark text-white py-4 rounded-sm font-sans font-semibold text-sm uppercase tracking-[0.12em] disabled:opacity-50 transition-colors duration-500"
                >
                  <Lock size={14} strokeWidth={2} />
                  {loading ? 'Redirecting to payment…' : `Pay £${totalPrice.toFixed(2)}`}
                </button>
                <p className="font-sans text-xs text-kazi-slate/60 text-center mt-3 flex items-center justify-center gap-1.5">
                  <Lock size={11} strokeWidth={2} />
                  Secure payment via Stripe. Blank garment prices — print decoration quoted separately.
                </p>
              </div>
            </form>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:self-start">
            <div className="bg-kazi-charcoal rounded-sm p-6 text-white">
              <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-6">Order Summary</h2>
              <ul className="space-y-4 mb-6">
                {items.map((item) => {
                  const unitPrice = getPriceForQty(item.product, item.quantity);
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <li key={`${item.product.id}-${item.color.name}-${item.size}`}
                      className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-sm flex-shrink-0 border border-white/20"
                        style={{ backgroundColor: item.color.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-sm font-semibold text-white leading-tight truncate">{item.product.name}</p>
                        <p className="font-sans text-xs text-white/50">
                          {item.color.name} · {item.size} · ×{item.quantity}
                        </p>
                      </div>
                      <p className="font-sans text-sm font-semibold text-white flex-shrink-0">
                        £{lineTotal.toFixed(2)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-sans text-xs text-white/50 uppercase tracking-[0.12em]">Subtotal</span>
                  <span className="font-sans text-xl font-semibold text-white">£{totalPrice.toFixed(2)}</span>
                </div>
                <p className="font-sans text-xs text-white/30">Shipping calculated at payment</p>
              </div>
            </div>

            <div className="mt-4 bg-white border border-kazi-sand rounded-sm p-5">
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-kazi-slate mb-3">What happens next</p>
              <ol className="space-y-2">
                {[
                  'Payment confirmed via Stripe',
                  'We contact you within 24hrs',
                  'Samples & print mockups',
                  'Production & delivery',
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-3 font-sans text-xs text-kazi-slate">
                    <span className="w-4 h-4 rounded-full bg-kazi-green text-white font-semibold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-10 px-6 border-t border-kazi-sand mt-16">
        <div className="max-w-[1200px] mx-auto text-center font-sans text-sm text-kazi-slate">
          <p>&copy; 2026 Kazi Manufacturing. Kathmandu, Nepal.</p>
        </div>
      </footer>
    </main>
  );
}
