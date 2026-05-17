'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';

export default function Navbar() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const supabase = createClient();
  const { totalItems, openCart } = useCart();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();
        setUser({ id: authUser.id, role: profile?.role || 'customer' });
      }
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80 || document.documentElement.scrollTop > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getDashboardLink = () => {
    if (!user) return '/auth/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'employee') return '/factory';
    return '/dashboard';
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-700 ease-luxury ${
          scrolled
            ? 'bg-kazi-cream/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.05)]'
            : 'bg-gradient-to-b from-black/30 to-transparent'
        }`}
      >
        <div className="flex justify-between items-center h-32 pt-8 px-6 md:px-12 lg:px-20 max-w-[1440px] mx-auto">
          {/* Left Links */}
          <div className="hidden lg:flex items-center gap-10 flex-1">
            <Link
              href="/services"
              className={`font-sans text-lg font-semibold transition-colors duration-500 ${
                scrolled ? 'text-kazi-charcoal hover:text-kazi-green' : 'text-white/90 hover:text-white'
              }`}
            >
              About Us
            </Link>
            <Link
              href="/pricing"
              className={`font-sans text-lg font-semibold transition-colors duration-500 ${
                scrolled ? 'text-kazi-charcoal hover:text-kazi-green' : 'text-white/90 hover:text-white'
              }`}
            >
              Get a Quote
            </Link>
          </div>

          {/* Center Logo */}
          <Link href="/" className="flex-shrink-0 mx-auto lg:mx-0 lg:flex-none">
            <div className="relative w-[28rem] h-28">
              <Image
                src="/images/kazi-logo-white.svg"
                alt="Kazi Manufacturing Logo"
                fill
                className={`object-contain scale-110 transition-all duration-500 ${scrolled ? 'brightness-0' : ''}`}
                priority
              />
            </div>
          </Link>

          {/* Right Links */}
          <div className="hidden lg:flex items-center gap-10 flex-1 justify-end">
            {user ? (
              <>
                <Link
                  href={getDashboardLink()}
                  className={`font-sans text-lg font-semibold transition-colors duration-500 ${
                    scrolled ? 'text-kazi-green hover:text-kazi-green-dark' : 'text-white/90 hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className={`font-sans text-lg font-semibold transition-colors duration-500 ${
                    scrolled ? 'text-kazi-slate-light hover:text-kazi-charcoal' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/quote"
                  className={`font-sans text-lg font-semibold transition-colors duration-500 ${
                    scrolled ? 'text-kazi-charcoal hover:text-kazi-green' : 'text-white/90 hover:text-white'
                  }`}
                >
                  Contact Us
                </Link>
                <Link
                  href="/auth/login"
                  className={`font-sans text-lg font-semibold transition-colors duration-500 ${
                    scrolled ? 'text-kazi-charcoal hover:text-kazi-green' : 'text-white/90 hover:text-white'
                  }`}
                >
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Cart Button */}
          <button
            onClick={openCart}
            aria-label="Open cart"
            className={`relative flex items-center justify-center w-10 h-10 transition-colors duration-500 ${
              scrolled ? 'text-kazi-charcoal hover:text-kazi-green' : 'text-white/90 hover:text-white'
            }`}
          >
            <ShoppingBag size={22} strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-kazi-green rounded-full text-white font-sans text-[10px] font-semibold flex items-center justify-center leading-none">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 relative w-8 h-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`absolute left-0 w-8 h-[1.5px] transition-all duration-500 ease-luxury ${
                scrolled ? 'bg-kazi-charcoal' : 'bg-white'
              } ${mobileMenuOpen ? 'top-[15px] rotate-45' : 'top-2'}`}
            />
            <span
              className={`absolute left-0 w-8 h-[1.5px] transition-all duration-500 ease-luxury ${
                scrolled ? 'bg-kazi-charcoal' : 'bg-white'
              } ${mobileMenuOpen ? 'opacity-0' : 'top-[15px] opacity-100'}`}
            />
            <span
              className={`absolute left-0 w-8 h-[1.5px] transition-all duration-500 ease-luxury ${
                scrolled ? 'bg-kazi-charcoal' : 'bg-white'
              } ${mobileMenuOpen ? 'top-[15px] -rotate-45' : 'top-[22px]'}`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-kazi-cream transition-all duration-700 ease-luxury ${
          mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {[
            { href: '/services', label: 'Services' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/quote', label: 'Contact' },
          ].map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-serif text-4xl text-kazi-charcoal hover:text-kazi-green transition-all duration-500 ease-luxury ${
                mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: mobileMenuOpen ? `${(i + 1) * 100}ms` : '0ms' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href={getDashboardLink()}
                className="font-sans text-sm uppercase tracking-[0.15em] text-kazi-green mt-4"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="font-sans text-sm uppercase tracking-[0.15em] text-kazi-slate-light"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="mt-4 px-8 py-4 bg-kazi-green text-white font-sans text-sm uppercase tracking-[0.15em]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
