import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function ConfirmacionPage({ params }: { params: { pedido: string } }) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('order_number, status, amount_cents, customer_name')
    .eq('order_number', params.pedido)
    .single();

  if (!order) notFound();

  const statusMessage: Record<string, string> = {
    pending: 'Estamos confirmando tu pago…',
    paid: '¡Pago confirmado! Gracias por tu compra.',
    failed: 'El pago no se ha podido completar.',
    canceled: 'El pago fue cancelado.',
    expired: 'El enlace de pago ha caducado.'
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="text-2xl font-black text-white-warm">Pedido {order.order_number}</h1>
        <p className="mt-3 text-text-muted">{statusMessage[order.status] ?? order.status}</p>
        <p className="mt-1 text-white-warm">Total: {formatCents(order.amount_cents)}</p>
        <p className="mt-6 text-sm text-text-muted">
          Guarda este número de pedido para consultarlo en{' '}
          <Link href="/pedido" className="text-gold underline">/pedido</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
