import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  if (!process.env.MOLLIE_API_KEY) {
    return NextResponse.json({ error: 'Falta configurar MOLLIE_API_KEY.' }, { status: 500 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  const rawBody = await request.text();
  const paymentId = contentType.includes('application/json')
    ? JSON.parse(rawBody || '{}')?.id
    : new URLSearchParams(rawBody).get('id');

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment id' }, { status: 400 });
  }

  const paymentResponse = await fetch(
    `https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `Bearer ${process.env.MOLLIE_API_KEY}` } }
  );
  const payment = await paymentResponse.json();
  if (!paymentResponse.ok) {
    return NextResponse.json({ error: payment?.detail || 'No se pudo consultar el pago.' }, { status: 502 });
  }

  const orderId = payment.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json({ ok: true, noOrder: true });
  }

  const admin = createAdminClient();

  if (payment.status === 'paid') {
    const { error } = await admin.rpc('mark_order_paid', { p_order_id: orderId });
    if (error) {
      console.error('mollie-webhook: mark_order_paid failed', orderId, error);
      return NextResponse.json({ error: 'Failed to sync order status.' }, { status: 500 });
    }
  } else if (['failed', 'canceled', 'expired'].includes(payment.status)) {
    const { error } = await admin.rpc('restore_stock_for_order', {
      p_order_id: orderId,
      p_new_status: payment.status,
    });
    if (error) {
      console.error('mollie-webhook: restore_stock_for_order failed', orderId, error);
      return NextResponse.json({ error: 'Failed to restore stock.' }, { status: 500 });
    }
  }
  // Other statuses (open, pending, authorized) require no action yet.

  return NextResponse.json({ ok: true, status: payment.status });
}
