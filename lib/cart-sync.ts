import { createClient } from './supabase/client';
import type { CartLine } from './types';

export async function fetchAccountCart(): Promise<CartLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('cart_items').select('product_id, qty');
  if (error) throw error;
  return (data ?? []).map((row) => ({ productId: row.product_id, qty: row.qty }));
}

export async function upsertAccountCartLine(productId: string, qty: number): Promise<void> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  if (qty <= 0) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('product_id', productId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('cart_items')
    .upsert({ user_id: user.id, product_id: productId, qty }, { onConflict: 'user_id,product_id' });
  if (error) throw error;
}

export async function replaceAccountCart(lines: CartLine[]): Promise<void> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  await supabase.from('cart_items').delete().eq('user_id', user.id);
  if (lines.length === 0) return;

  const rows = lines.map((l) => ({ user_id: user.id, product_id: l.productId, qty: l.qty }));
  const { error } = await supabase.from('cart_items').insert(rows);
  if (error) throw error;
}
