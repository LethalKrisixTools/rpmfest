import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const admin = createAdminClient();
  const { error: anonymizeError } = await admin.rpc('anonymize_customer_data', {
    p_user_id: user.id
  });
  if (anonymizeError) {
    console.error('anonymize_customer_data failed', anonymizeError);
    return NextResponse.json({ error: 'No se pudo eliminar la cuenta.' }, { status: 500 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('auth deleteUser failed', deleteError);
    return NextResponse.json({ error: 'No se pudo eliminar la cuenta.' }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
