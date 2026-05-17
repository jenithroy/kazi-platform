'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, company_name: company, role: 'customer' } },
    });

    if (error) {
      setError(error.message);
    } else {
      fetch('/api/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName }),
      }).catch(() => {});
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <main className="min-h-screen bg-kazi-charcoal flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-8">
            <Link href="/">
              <div className="relative w-48 h-16">
                <Image src="/images/kazi-logo-white.svg" alt="Kazi Manufacturing" fill className="object-contain" priority />
              </div>
            </Link>
          </div>
          <div className="w-12 h-px bg-kazi-green mx-auto mb-8" />
          <h1 className="font-sans text-2xl font-normal text-white mb-4">Check your email</h1>
          <p className="font-sans text-sm text-white/50 mb-8 leading-relaxed">
            We&apos;ve sent you a confirmation email. Click the link to verify your account.
          </p>
          <Link href="/auth/login" className="font-sans text-sm text-white/60 hover:text-white transition-colors">
            Go to login →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-kazi-charcoal flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/">
            <div className="relative w-48 h-16">
              <Image src="/images/kazi-logo-white.svg" alt="Kazi Manufacturing" fill className="object-contain" priority />
            </div>
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-8 rounded-sm">
          <h1 className="font-sans text-2xl font-normal text-white mb-2">Create account</h1>
          <p className="font-sans text-sm text-white/50 mb-8">Start your manufacturing journey with Kazi</p>

          {error && (
            <div className="bg-kazi-green/10 border border-kazi-green/30 text-kazi-green px-4 py-3 rounded-sm mb-6 text-sm font-sans">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {[
              { label: 'Full Name', type: 'text', value: fullName, onChange: setFullName, required: true, placeholder: 'Jane Smith' },
              { label: 'Email', type: 'email', value: email, onChange: setEmail, required: true, placeholder: 'you@brand.com' },
              { label: 'Company (optional)', type: 'text', value: company, onChange: setCompany, required: false, placeholder: 'Your Brand Ltd' },
            ].map(({ label, type, value, onChange, required, placeholder }) => (
              <div key={label}>
                <label className="block font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/60 mb-2">
                  {label}
                </label>
                <input
                  type={type}
                  required={required}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 font-sans text-sm rounded-sm focus:outline-none focus:border-kazi-green transition-colors duration-300"
                />
              </div>
            ))}

            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/60 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 font-sans text-sm rounded-sm focus:outline-none focus:border-kazi-green transition-colors duration-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-kazi-green hover:bg-kazi-green-dark text-white py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.15em] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-500 mt-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-8 text-center font-sans text-sm text-white/40">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-white/60 hover:text-white transition-colors font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
