import { describe, expect, it } from 'vitest';
import { mergeCartLines } from '../lib/cart';

describe('mergeCartLines', () => {
  it('sums quantities for products present in both carts', () => {
    const existing = [{ productId: 'a', qty: 1 }];
    const incoming = [{ productId: 'a', qty: 2 }, { productId: 'b', qty: 3 }];
    expect(mergeCartLines(existing, incoming)).toEqual([
      { productId: 'a', qty: 3 },
      { productId: 'b', qty: 3 }
    ]);
  });

  it('returns the existing cart unchanged when incoming is empty', () => {
    const existing = [{ productId: 'a', qty: 1 }];
    expect(mergeCartLines(existing, [])).toEqual(existing);
  });
});
