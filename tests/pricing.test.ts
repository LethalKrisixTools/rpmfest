import { describe, expect, it } from 'vitest';
import { computeCartTotalCents } from '../lib/pricing';
import type { Product } from '../lib/types';

const product = (id: string, price_cents: number): Product => ({
  id,
  slug: id,
  name: id,
  short_description: null,
  description: null,
  price_cents,
  stock: null,
  category: null,
  images: [],
  active: true,
  featured: false
});

describe('computeCartTotalCents', () => {
  it('sums price_cents * qty for each line', () => {
    const products = { a: product('a', 1000), b: product('b', 500) };
    const lines = [{ productId: 'a', qty: 2 }, { productId: 'b', qty: 3 }];
    expect(computeCartTotalCents(lines, products)).toBe(1000 * 2 + 500 * 3);
  });

  it('ignores lines whose product is missing from the map', () => {
    const products = { a: product('a', 1000) };
    const lines = [{ productId: 'a', qty: 1 }, { productId: 'missing', qty: 5 }];
    expect(computeCartTotalCents(lines, products)).toBe(1000);
  });
});
