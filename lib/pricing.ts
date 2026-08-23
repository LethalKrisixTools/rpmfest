import type { CartLine, Product } from './types';

// CLIENT-SIDE ESTIMATE ONLY — for checkout review display. The trusted,
// authoritative total is always recomputed server-side in the Postgres
// function `create_pending_order`. Never use this value to charge the customer.
export function computeCartTotalCents(lines: CartLine[], products: Record<string, Product>): number {
  return lines.reduce((sum, line) => {
    const product = products[line.productId];
    return product ? sum + product.price_cents * line.qty : sum;
  }, 0);
}
