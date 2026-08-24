'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchAccountCart } from '@/lib/cart-sync';
import { getGuestCart, guestCartCount } from '@/lib/cart';

const linkClass =
  'text-[13px] font-semibold uppercase tracking-[2px] text-text-muted transition-colors duration-200 hover:text-gold max-md:block max-md:w-full max-md:py-3 max-md:text-xs max-md:tracking-normal';

// Border goes on the <li>, not the <a>: `last:` resolves against the element's own
// parent, and since each <a> is the sole child of its <li>, putting the border/last:
// modifier on the <a> would make every link match `:last-child` and lose its border.
const navItemClass = 'max-md:w-full max-md:border-b max-md:border-border-subtle max-md:last:border-b-0';

export function Navbar() {
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshCount() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      try {
        const lines = user ? await fetchAccountCart() : getGuestCart();
        if (!cancelled) setCartCount(guestCartCount(lines));
      } catch {
        if (!cancelled) setCartCount(guestCartCount(getGuestCart()));
      }
    }

    refreshCount();
    window.addEventListener('rpmfest:cart-updated', refreshCount);
    window.addEventListener('storage', refreshCount);
    return () => {
      cancelled = true;
      window.removeEventListener('rpmfest:cart-updated', refreshCount);
      window.removeEventListener('storage', refreshCount);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-bg-darkest/95">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" onClick={() => setMenuOpen(false)}>
          <Image src="/logo-rpmfest.png" alt="RPM Fest" width={140} height={32} className="h-8 w-auto" />
        </Link>
        <button
          type="button"
          aria-label="Menú"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="hidden flex-col gap-[5px] p-1 max-md:flex"
        >
          <span className="block h-0.5 w-6 bg-cream" />
          <span className="block h-0.5 w-6 bg-cream" />
          <span className="block h-0.5 w-6 bg-cream" />
        </button>
        <ul
          className={`flex list-none items-center gap-8 max-md:absolute max-md:left-0 max-md:top-16 max-md:w-full max-md:flex-col max-md:items-stretch max-md:gap-0 max-md:border-b max-md:border-border-subtle max-md:bg-bg-darkest/95 max-md:px-6 max-md:py-4 ${
            menuOpen ? 'max-md:flex' : 'max-md:hidden'
          }`}
        >
          <li className={navItemClass}>
            <Link href="/#evento" className={linkClass} onClick={() => setMenuOpen(false)}>
              Evento
            </Link>
          </li>
          <li className={navItemClass}>
            <Link href="/#experiencias" className={linkClass} onClick={() => setMenuOpen(false)}>
              Experiencias
            </Link>
          </li>
          <li className={navItemClass}>
            <Link href="/eventos" className={linkClass} onClick={() => setMenuOpen(false)}>
              Próximos Eventos
            </Link>
          </li>
          <li className={navItemClass}>
            <Link href="/tienda" className={linkClass} onClick={() => setMenuOpen(false)}>
              Tienda
            </Link>
          </li>
          <li className={navItemClass}>
            <Link
              href="/cesta"
              className={`${linkClass} flex translate-y-px items-center gap-1.5 max-md:flex max-md:translate-y-0`}
              onClick={() => setMenuOpen(false)}
            >
              Cesta
              {cartCount > 0 && (
                <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold normal-case tracking-normal text-bg-darkest">
                  {cartCount}
                </span>
              )}
            </Link>
          </li>
          <li className={navItemClass}>
            <Link href="/pedido" className={linkClass} onClick={() => setMenuOpen(false)}>
              Seguir pedido
            </Link>
          </li>
          <li className={navItemClass}>
            <Link href="/cuenta" className={linkClass} onClick={() => setMenuOpen(false)}>
              Mi cuenta
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
