'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { formatCents } from '@/lib/money';

type OrderSummary = {
  orderNumber: string;
  status: string;
  amount: number;
  customerName: string;
  items: { product_name: string; unit_price_cents: number; qty: number }[];
};

export default function PedidoPage() {
  return (
    <Suspense>
      <PedidoPageInner />
    </Suspense>
  );
}

function PedidoPageInner() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState('');
  const [lastTrackingUrl, setLastTrackingUrl] = useState<string | null>(null);

  async function lookup(query: string) {
    setError('');
    setOrder(null);
    const response = await fetch(`/api/pedido?${query}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'No se encontró el pedido.');
      return;
    }
    setOrder(data);
  }

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) lookup(`token=${encodeURIComponent(token)}`);
    setLastTrackingUrl(window.localStorage.getItem('rpmfest_last_tracking_url'));
  }, [searchParams]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-5 py-16">
        <h1 className="text-2xl font-black text-white-warm">Seguir mi pedido</h1>

        {lastTrackingUrl && !order && (
          <a href={lastTrackingUrl} className="mt-2 block text-sm text-gold underline">
            Ver mi último pedido
          </a>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(`order=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
          }}
          className="mt-6 flex flex-col gap-3"
        >
          <input
            required
            placeholder="Número de pedido (RPM-2026-XXXXX)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            required
            type="email"
            placeholder="Email usado en la compra"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <button type="submit" className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
            BUSCAR PEDIDO
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-mid">{error}</p>}

        {order && (
          <div className="mt-6 rounded-xl border border-border-subtle bg-bg-dark p-5">
            <h2 className="font-bold text-white-warm">Pedido {order.orderNumber}</h2>
            <p className="text-sm text-text-muted">Estado: {order.status}</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between py-1 text-sm text-cream">
                <span>{item.product_name} ×{item.qty}</span>
                <span>{formatCents(item.unit_price_cents * item.qty)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border-subtle pt-2 font-bold text-white-warm">
              <span>Total</span>
              <span>{formatCents(order.amount)}</span>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
