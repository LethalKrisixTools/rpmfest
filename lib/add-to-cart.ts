import { addToGuestCart } from './cart';
import { createClient } from './supabase/client';

/**
 * Adds `qty` of a product to whichever cart is active (account cart if the
 * customer is logged in, guest localStorage cart otherwise), incrementing
 * any existing quantity for that product rather than overwriting it.
 */
export async function addToCart(productId: string, qty: number): Promise<void> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    addToGuestCart(productId, qty);
    return;
  }

  const { error } = await supabase.rpc('increment_cart_item', {
    p_product_id: productId,
    p_qty: qty
  });
  if (error) throw error;
  window.dispatchEvent(new Event('rpmfest:cart-updated'));
}
