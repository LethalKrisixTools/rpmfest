import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError) {
    console.error('cuenta/export: profile query failed', profileError);
    return NextResponse.json({ error: 'No se pudo generar la exportación.' }, { status: 500 });
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id);
  if (ordersError) {
    console.error('cuenta/export: orders query failed', ordersError);
    return NextResponse.json({ error: 'No se pudo generar la exportación.' }, { status: 500 });
  }

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: orderItems, error: orderItemsError } = orderIds.length
    ? await supabase.from('order_items').select('*').in('order_id', orderIds)
    : { data: [], error: null };
  if (orderItemsError) {
    console.error('cuenta/export: order_items query failed', orderItemsError);
    return NextResponse.json({ error: 'No se pudo generar la exportación.' }, { status: 500 });
  }

  const payload = { profile, orders, orderItems, exportedAt: new Date().toISOString() };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="rpmfest-mis-datos.json"'
    }
  });
}
