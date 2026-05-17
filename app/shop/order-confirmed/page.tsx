import Link from 'next/link';
import { Check } from 'lucide-react';
import Navbar from '@/components/Navbar';

export const metadata = { title: 'Order Confirmed | Kazi Manufacturing' };

export default function OrderConfirmedPage() {
  return (
    <main className="min-h-screen bg-kazi-cream">
      <Navbar />
      <div className="pt-32 max-w-xl mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-kazi-green flex items-center justify-center mx-auto mb-8">
          <Check size={28} strokeWidth={2.5} className="text-white" />
        </div>
        <div className="w-10 h-px bg-kazi-green mx-auto mb-8" />
        <h1 className="font-sans text-3xl font-normal text-kazi-charcoal mb-4">Order confirmed</h1>
        <p className="font-sans text-kazi-slate mb-3">
          Thank you for your order. We&apos;ll be in touch within 24 hours to confirm details and next steps.
        </p>
        <p className="font-sans text-sm text-kazi-slate/60 mb-10">
          A confirmation email is on its way.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="btn-primary">Return to Homepage</Link>
          <Link href="/shop/tshirts" className="btn-outline">Continue Shopping</Link>
        </div>
      </div>
    </main>
  );
}
