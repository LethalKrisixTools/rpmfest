import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generateOrderNumber } from '@/lib/order-number';
import { createTrackingToken } from '@/lib/tracking-token';

const checkoutSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(99) }))
    .min(1),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    address: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1)
  }),
  guestConsent: z.boolean().optional(),
  idempotencyKey: z.string().uuid().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de pedido inválidos.' }, { status: 400 });
  }
  const { items, customer, guestConsent, idempotencyKey } = parsed.data;

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && !guestConsent) {
    return NextResponse.json(
      { error: 'Debes aceptar la Política de Privacidad para continuar.' },
      { status: 400 }
    );
  }
  if (!process.env.MOLLIE_API_KEY) {
    return NextResponse.json({ error: 'Falta configurar MOLLIE_API_KEY.' }, { status: 500 });
  }

  const admin = createAdminClient();
  const privacyConsentAt = new Date().toISOString();

  let order: { id: string; order_number: string; amount_cents: number; currency: string } | null = null;
  let lastErrorMessage = '';

  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const { data, error } = await admin.rpc('create_pending_order', {
      p_order_number: generateOrderNumber(),
      p_items: items.map((i) => ({ product_id: i.productId, qty: i.qty })),
      p_customer_name: customer.name,
      p_customer_email: customer.email,
      p_shipping_address: customer.address,
      p_shipping_city: customer.city,
      p_shipping_postal_code: customer.postalCode,
      p_user_id: user?.id ?? null,
      p_privacy_consent_at: privacyConsentAt,
      p_clear_cart: !!user,
      p_idempotency_key: idempotencyKey ?? null
    });

    if (error) {
      lastErrorMessage = error.message;
      if (error.code === '23505') continue; // order_number collision — retry with a new one
      break;
    }
    order = data;
  }

  if (!order) {
    if (lastErrorMessage.startsWith('OUT_OF_STOCK')) {
      return NextResponse.json({ error: 'No hay stock suficiente de uno de los productos.' }, { status: 400 });
    }
    if (lastErrorMessage.startsWith('PRODUCT_NOT_FOUND')) {
      return NextResponse.json({ error: 'Uno de los productos ya no está disponible.' }, { status: 400 });
    }
    if (lastErrorMessage.startsWith('AMOUNT_TOO_LOW')) {
      return NextResponse.json({ error: 'El importe mínimo de pago es 0,50 €.' }, { status: 400 });
    }
    console.error('checkout: create_pending_order failed', lastErrorMessage);
    return NextResponse.json({ error: 'No se pudo crear el pedido.' }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const amount = (order.amount_cents / 100).toFixed(2);
  const trackingToken = createTrackingToken(order.id);

  let payment: { id?: string; detail?: string; _links?: { checkout?: { href?: string } } } | null = null;
  let paymentOk = false;

  try {
    const paymentResponse = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: { currency: order.currency, value: amount },
        description: `RPM Fest · Pedido ${order.order_number}`,
        redirectUrl: `${origin}/checkout/confirmacion/${trackingToken}`,
        webhookUrl: `${origin}/api/mollie-webhook`,
        metadata: { orderId: order.id, orderNumber: order.order_number }
      })
    });
    payment = await paymentResponse.json();
    paymentOk = paymentResponse.ok;
  } catch (err) {
    console.error('checkout: Mollie payment request failed', order.id, err);
  }

  if (!paymentOk) {
    const { error: restoreStockError } = await admin.rpc('restore_stock_for_order', {
      p_order_id: order.id,
      p_new_status: 'failed'
    });
    if (restoreStockError) {
      console.error('checkout: restore_stock_for_order failed', order.id, restoreStockError);
    }
    return NextResponse.json({ error: payment?.detail || 'No se pudo crear el pago.' }, { status: 502 });
  }

  const { error: updatePaymentIdError } = await admin
    .from('orders')
    .update({ mollie_payment_id: payment?.id })
    .eq('id', order.id);
  if (updatePaymentIdError) {
    console.error('checkout: failed to store mollie_payment_id', order.id, updatePaymentIdError);
  }

  return NextResponse.json({
    checkoutUrl: payment?._links?.checkout?.href,
    orderNumber: order.order_number,
    trackingToken,
    trackingUrl: `${origin}/pedido?token=${encodeURIComponent(trackingToken)}`
  });
}
