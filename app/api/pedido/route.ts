import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTrackingToken } from '@/lib/tracking-token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const orderNumber = searchParams.get('order');
  const email = searchParams.get('email')?.toLowerCase();

  const admin = createAdminClient();
  let query = admin
    .from('orders')
    .select('id, order_number, status, amount_cents, customer_name, customer_email, created_at, paid_at');

  if (token) {
    const verified = verifyTrackingToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Enlace de seguimiento inválido.' }, { status: 400 });
    }
    query = query.eq('id', verified.orderId);
  } else if (orderNumber && email) {
    query = query.eq('order_number', orderNumber);
  } else {
    return NextResponse.json(
      { error: 'Necesitas el enlace de seguimiento o el número de pedido y email.' },
      { status: 400 }
    );
  }

  const { data: order, error: orderError } = await query.single();
  if (orderError) {
    console.error('pedido lookup: order query failed', orderError);
  }
  if (!order) return NextResponse.json({ error: 'No se encontró el pedido.' }, { status: 404 });

  if (!token && orderNumber && email && order.customer_email?.toLowerCase() !== email) {
    return NextResponse.json({ error: 'No se encontró el pedido.' }, { status: 404 });
  }

  const { data: items, error: itemsError } = await admin
    .from('order_items')
    .select('product_name, unit_price_cents, image, qty')
    .eq('order_id', order.id);
  if (itemsError) {
    console.error('pedido lookup: order_items query failed', itemsError);
  }

  return NextResponse.json({
    orderNumber: order.order_number,
    status: order.status,
    amount: order.amount_cents,
    customerName: order.customer_name,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    items: items ?? []
  });
}
