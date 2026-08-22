import type { CartLine, Product } from './types';

export function computeCartTotalCents(lines: CartLine[], products: Record<string, Product>): number {
  return lines.reduce((sum, line) => {
    const product = products[line.productId];
    return product ? sum + product.price_cents * line.qty : sum;
  }, 0);
}
