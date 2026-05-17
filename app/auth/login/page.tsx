'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      if (redirect === '/') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile?.role === 'admin') window.location.href = '/admin';
          else if (profile?.role === 'employee') window.location.href = '/factory';
          else window.location.href = '/dashboard';
        } else {
          window.location.href = '/';
        }
      } else {
        window.location.href = redirect;
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-kazi-charcoal flex items-center justify-center px-4">
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
          <h1 className="font-sans text-2xl font-normal text-white mb-2">Sign in</h1>
          <p className="font-sans text-sm text-white/50 mb-8">Welcome back to Kazi Manufacturing</p>

          {error && (
            <div className="bg-kazi-green/10 border border-kazi-green/30 text-kazi-green px-4 py-3 rounded-sm mb-6 text-sm font-sans">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/60 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 font-sans text-sm rounded-sm focus:outline-none focus:border-kazi-green transition-colors duration-300"
                placeholder="you@brand.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="font-sans text-xs text-white/60 hover:text-white transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 font-sans text-sm rounded-sm focus:outline-none focus:border-kazi-green transition-colors duration-300"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-kazi-green hover:bg-kazi-green-dark text-white py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.15em] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-500 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center font-sans text-sm text-white/40">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-white/60 hover:text-white transition-colors font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-kazi-charcoal flex items-center justify-center"><span className="text-white/40 font-sans text-sm">Loading…</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
