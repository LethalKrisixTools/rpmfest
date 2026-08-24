import { addToGuestCart } from './cart';
import { fetchAccountCart, upsertAccountCartLine } from './cart-sync';
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

  const currentLines = await fetchAccountCart();
  const existing = currentLines.find((l) => l.productId === productId);
  const newQty = (existing?.qty ?? 0) + qty;
  await upsertAccountCartLine(productId, newQty);
  window.dispatchEvent(new Event('rpmfest:cart-updated'));
}
