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

  if (lines.length === 0) {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id);
    if (error) throw error;
    return;
  }

  // Upsert the new/kept lines first so the account cart is never left in a
  // fully-empty transient state between the two round-trips. Only after the
  // new state is durably written do we delete stale rows that are no longer
  // present in `lines`.
  const rows = lines.map((l) => ({ user_id: user.id, product_id: l.productId, qty: l.qty }));
  const { error: upsertError } = await supabase
    .from('cart_items')
    .upsert(rows, { onConflict: 'user_id,product_id' });
  if (upsertError) throw upsertError;

  // Quote each id so PostgREST parses them as string literals regardless of
  // content, matching how the underlying `.in()`/`.notIn()` helpers in
  // postgrest-js escape values that contain reserved characters.
  const productIds = lines.map((l) => `"${l.productId}"`);
  const { error: deleteError } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)
    .not('product_id', 'in', `(${productIds.join(',')})`);
  if (deleteError) throw deleteError;
}
