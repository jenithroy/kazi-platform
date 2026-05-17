'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Check } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to send');
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again or email us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-kazi-cream border border-kazi-sand text-kazi-charcoal font-sans text-sm rounded-sm focus:outline-none focus:border-kazi-green transition-colors duration-300 placeholder-kazi-slate/40';
  const labelClass = 'block font-sans text-xs font-semibold uppercase tracking-[0.12em] text-kazi-slate mb-1.5';

  if (success) {
    return (
      <main className="min-h-screen bg-kazi-cream">
        <Navbar />
        <div className="max-w-xl mx-auto px-6 py-32 text-center">
          <div className="w-14 h-14 rounded-full bg-kazi-green flex items-center justify-center mx-auto mb-8">
            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="w-10 h-px bg-white/30 mx-auto mb-6" />
          <h1 className="font-serif text-3xl text-kazi-charcoal mb-4">Message sent</h1>
          <p className="font-sans text-kazi-slate mb-8">We'll get back to you within 24 hours.</p>
          <Link href="/" className="font-sans text-sm text-kazi-green hover:text-kazi-green-dark transition-colors">
            Return to homepage →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-kazi-cream text-kazi-charcoal">
      <Navbar />

      {/* Header */}
      <div className="pt-32 bg-kazi-charcoal text-white py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-4">Get in touch</p>
          <h1 className="font-sans text-4xl md:text-5xl font-normal mb-4">Contact Us</h1>
          <p className="font-sans text-lg text-white/70">We respond within 24 hours</p>
        </div>
      </div>

      <section className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-2xl mx-auto">

          {/* Contact details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16 text-center">
            {[
              { label: 'Email', value: 'hello@kazimanufacturing.com', href: 'mailto:hello@kazimanufacturing.com' },
              { label: 'Location', value: 'Kathmandu, Nepal' },
              { label: 'Response time', value: 'Within 24 hours' },
            ].map(({ label, value, href }) => (
              <div key={label}>
                <div className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-slate mb-2">{label}</div>
                {href
                  ? <a href={href} className="font-sans text-sm text-kazi-green hover:text-kazi-green-dark transition-colors">{value}</a>
                  : <div className="font-sans text-sm text-kazi-charcoal">{value}</div>
                }
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="bg-white border border-kazi-sand rounded-sm p-8">
            {error && (
              <div className="bg-kazi-green/10 border border-kazi-green/30 text-kazi-green px-4 py-3 rounded-sm mb-6 font-sans text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input type="text" required value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" required value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Company</label>
                <input type="text" value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Message *</label>
                <textarea required rows={6} value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your project — product type, quantity, timeline, any questions..."
                  className={`${inputClass} resize-none`} />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-kazi-green hover:bg-kazi-green-dark text-white py-4 rounded-sm font-sans font-semibold text-sm uppercase tracking-[0.12em] disabled:opacity-50 transition-colors duration-500">
                {submitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </div>

          <p className="text-center font-sans text-sm text-kazi-slate mt-8">
            Need a detailed quote?{' '}
            <Link href="/pricing" className="text-kazi-green hover:text-kazi-green-dark transition-colors font-semibold">
              Use our quote form →
            </Link>
          </p>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-kazi-sand">
        <div className="max-w-[1200px] mx-auto text-center font-sans text-sm text-kazi-slate">
          <p>&copy; 2026 Kazi Manufacturing. Kathmandu, Nepal.</p>
        </div>
      </footer>
    </main>
  );
}
