import type { CartLine } from './types';

const CART_KEY = 'rpmfest_guest_cart';

export function getGuestCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function setGuestCart(lines: CartLine[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    // Storage full or unavailable (e.g. Safari private browsing) — fail silently.
  }
}

export function clearGuestCart(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CART_KEY);
}

export function addToGuestCart(productId: string, qty = 1): CartLine[] {
  const lines = getGuestCart();
  const existing = lines.find((l) => l.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    lines.push({ productId, qty });
  }
  setGuestCart(lines);
  return lines;
}

export function updateGuestCartQty(productId: string, qty: number): CartLine[] {
  let lines = getGuestCart();
  if (qty <= 0) {
    lines = lines.filter((l) => l.productId !== productId);
  } else {
    const existing = lines.find((l) => l.productId === productId);
    if (existing) existing.qty = qty;
  }
  setGuestCart(lines);
  return lines;
}

export function guestCartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

/**
 * Merges a guest's localStorage cart into an existing account cart, summing
 * quantities for products present in both. Only ever called after the
 * customer explicitly confirms the merge dialog — never automatically.
 */
export function mergeCartLines(existing: CartLine[], incoming: CartLine[]): CartLine[] {
  const map = new Map(existing.map((l) => [l.productId, l.qty]));
  for (const line of incoming) {
    map.set(line.productId, (map.get(line.productId) ?? 0) + line.qty);
  }
  return Array.from(map, ([productId, qty]) => ({ productId, qty }));
}
