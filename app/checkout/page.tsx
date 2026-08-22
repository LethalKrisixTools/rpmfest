'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { formatCents } from '@/lib/money';
import { computeCartTotalCents } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/client';
import { getGuestCart } from '@/lib/cart';
import { fetchAccountCart } from '@/lib/cart-sync';
import type { CartLine, Product } from '@/lib/types';

type Customer = { name: string; email: string; address: string; city: string; postalCode: string };

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountMode, setAccountMode] = useState<'guest' | 'account' | null>(null);
  const [items, setItems] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    email: '',
    address: '',
    city: '',
    postalCode: ''
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const buyNowProductId = searchParams.get('product');
      const buyNowQty = Number(searchParams.get('qty') ?? '1');

      const lines: CartLine[] = buyNowProductId
        ? [{ productId: buyNowProductId, qty: buyNowQty }]
        : user
          ? await fetchAccountCart()
          : getGuestCart();
      setItems(lines);

      if (lines.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .in('id', lines.map((l) => l.productId))
          .returns<Product[]>();
        setProducts(Object.fromEntries((data ?? []).map((p) => [p.id, p])));
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, default_address, default_city, default_postal_code')
          .eq('id', user.id)
          .single();
        setCustomer({
          name: profile?.full_name ?? '',
          email: user.email ?? '',
          address: profile?.default_address ?? '',
          city: profile?.default_city ?? '',
          postalCode: profile?.default_postal_code ?? ''
        });
        setAccountMode('account');
        setStep(2);
      }
      setReady(true);
    }
    load();
  }, [searchParams]);

  const total = computeCartTotalCents(items, products);

  async function submitPayment() {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customer,
          guestConsent: accountMode === 'guest' ? consent : undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo procesar el pago.');
      if (!data.checkoutUrl) throw new Error('No se pudo iniciar el pago. Contacta con soporte.');
      if (data.trackingUrl) {
        window.localStorage.setItem('rpmfest_last_tracking_url', data.trackingUrl);
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-5 py-10">
        <p className="mb-6 text-xs font-bold tracking-widest text-text-muted">
          PASO {step} DE 3
        </p>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <h1 className="text-xl font-black text-white-warm">¿Cómo quieres comprar?</h1>
            <button
              type="button"
              onClick={() => {
                setAccountMode('guest');
                setStep(2);
              }}
              className="rounded-md border border-border-subtle px-4 py-4 text-sm font-bold text-white-warm"
            >
              Continuar como invitado
            </button>
            <button
              type="button"
              onClick={() => router.push('/login?next=/checkout')}
              className="rounded-md border border-gold bg-bg-mid px-4 py-4 text-sm font-bold text-gold"
            >
              Iniciar sesión / Crear cuenta
            </button>
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (accountMode === 'guest' && !consent) {
                setError('Debes aceptar la Política de Privacidad para continuar.');
                return;
              }
              setError('');
              setStep(3);
            }}
            className="flex flex-col gap-3"
          >
            <h1 className="text-xl font-black text-white-warm">Datos de envío</h1>
            <label htmlFor="name" className="text-sm text-text-muted">
              Nombre completo
            </label>
            <input
              id="name"
              required
              placeholder="Nombre completo"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            <label htmlFor="email" className="text-sm text-text-muted">
              Email
            </label>
            <input
              id="email"
              required
              type="email"
              placeholder="Email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            <label htmlFor="address" className="text-sm text-text-muted">
              Dirección
            </label>
            <input
              id="address"
              required
              placeholder="Dirección"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            <label htmlFor="city" className="text-sm text-text-muted">
              Ciudad
            </label>
            <input
              id="city"
              required
              placeholder="Ciudad"
              value={customer.city}
              onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            <label htmlFor="postalCode" className="text-sm text-text-muted">
              Código postal
            </label>
            <input
              id="postalCode"
              required
              placeholder="Código postal"
              value={customer.postalCode}
              onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            {accountMode === 'guest' && <ConsentCheckbox checked={consent} onChange={setConsent} />}
            {error && <p className="text-sm text-red-mid">{error}</p>}
            <button type="submit" className="mt-2 rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
              CONTINUAR
            </button>
          </form>
        )}

        {step === 3 && (
          <div>
            <h1 className="mb-4 text-xl font-black text-white-warm">Revisar y pagar</h1>
            {items.map((line) => {
              const product = products[line.productId];
              if (!product) return null;
              return (
                <div key={line.productId} className="flex justify-between py-1 text-sm text-cream">
                  <span>{product.name} ×{line.qty}</span>
                  <span>{formatCents(product.price_cents * line.qty)}</span>
                </div>
              );
            })}
            <div className="mt-3 flex justify-between border-t border-border-subtle pt-3 text-lg font-black text-white-warm">
              <span>Total</span>
              <span>{formatCents(total)}</span>
            </div>
            {error && <p className="mt-3 text-sm text-red-mid">{error}</p>}
            <button
              type="button"
              disabled={submitting}
              onClick={submitPayment}
              className="mt-4 w-full rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
            >
              {submitting ? 'PROCESANDO…' : 'PAGAR AHORA'}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
