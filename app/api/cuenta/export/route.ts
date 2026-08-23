import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: orders } = await supabase.from('orders').select('*').eq('user_id', user.id);
  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: orderItems } = orderIds.length
    ? await supabase.from('order_items').select('*').in('order_id', orderIds)
    : { data: [] };

  const payload = { profile, orders, orderItems, exportedAt: new Date().toISOString() };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="rpmfest-mis-datos.json"'
    }
  });
}
