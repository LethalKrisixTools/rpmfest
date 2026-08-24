'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchAccountCart } from '@/lib/cart-sync';
import { getGuestCart, guestCartCount } from '@/lib/cart';

export function Navbar() {
  const [cartCount, setCartCount] = useState(0);

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
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-bg-darkest/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/">
          <Image src="/logo-rpmfest.png" alt="RPM Fest" width={140} height={40} />
        </Link>
        <ul className="flex items-center gap-6 text-sm font-semibold text-white-warm">
          <li><Link href="/#evento">Evento</Link></li>
          <li><Link href="/#experiencias">Experiencias</Link></li>
          <li><Link href="/eventos">Próximos Eventos</Link></li>
          <li><Link href="/tienda">Tienda</Link></li>
          <li>
            <Link href="/cesta" className="flex items-center gap-1.5">
              Cesta
              {cartCount > 0 && (
                <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-bg-darkest">
                  {cartCount}
                </span>
              )}
            </Link>
          </li>
          <li><Link href="/pedido">Seguir pedido</Link></li>
          <li><Link href="/cuenta" className="text-gold">Mi cuenta</Link></li>
        </ul>
      </div>
    </nav>
  );
}
