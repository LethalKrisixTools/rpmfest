'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartLineRow } from '@/components/CartLineRow';
import { formatCents } from '@/lib/money';
import { createClient } from '@/lib/supabase/client';
import { getGuestCart, updateGuestCartQty } from '@/lib/cart';
import { fetchAccountCart, upsertAccountCartLine } from '@/lib/cart-sync';
import type { CartLine, Product } from '@/lib/types';

export default function CestaPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setLoggedIn(!!user);

      const cartLines = user ? await fetchAccountCart() : getGuestCart();
      setLines(cartLines);

      if (cartLines.length > 0) {
        const { data, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', cartLines.map((l) => l.productId))
          .returns<Product[]>();
        if (productsError) throw productsError;
        setProducts(Object.fromEntries((data ?? []).map((p) => [p.id, p])));
      } else {
        setProducts({});
      }
      setError(null);
    } catch {
      setError('No se pudo cargar tu cesta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeQty(productId: string, qty: number) {
    setPendingIds((prev) => new Set(prev).add(productId));
    try {
      if (loggedIn) {
        await upsertAccountCartLine(productId, qty);
      } else {
        updateGuestCartQty(productId, qty);
      }
      setError(null);
    } catch {
      setError('No se pudo actualizar tu cesta. Inténtalo de nuevo.');
    } finally {
      await load();
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }

  const total = lines.reduce((sum, l) => {
    const product = products[l.productId];
    return product ? sum + product.price_cents * l.qty : sum;
  }, 0);

  if (loading) return null;

  return (
    <>
      <Navbar />
      {error && <p className="mx-auto max-w-6xl px-5 pt-6 text-sm text-red-mid">{error}</p>}
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1.6fr_1fr]">
        <div>
          <h1 className="mb-4 text-2xl font-black text-white-warm">Tu cesta</h1>
          {lines.length === 0 && <p className="text-text-muted">Tu cesta está vacía.</p>}
          {lines.map((line) => {
            const product = products[line.productId];
            if (!product) return null;
            return (
              <CartLineRow
                key={line.productId}
                product={product}
                qty={line.qty}
                onChangeQty={(qty) => changeQty(line.productId, qty)}
                onRemove={() => changeQty(line.productId, 0)}
                disabled={pendingIds.has(line.productId)}
              />
            );
          })}
        </div>
        <div className="h-fit rounded-xl border border-border-subtle bg-bg-dark p-5 md:sticky md:top-20">
          <div className="text-xs font-bold tracking-widest text-text-muted">RESUMEN</div>
          <div className="mt-3 flex justify-between text-xl font-black text-white-warm">
            <span>Total</span>
            <span>{formatCents(total)}</span>
          </div>
          <button
            type="button"
            disabled={lines.length === 0}
            onClick={() => router.push('/checkout')}
            className="mt-4 w-full rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
          >
            CONTINUAR A LA COMPRA
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
