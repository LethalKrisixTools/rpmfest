'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { addToGuestCart } from '@/lib/cart';
import { QuantityPicker } from './QuantityPicker';
import type { Product } from '@/lib/types';

export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const soldOut = product.stock !== null && product.stock <= 0;

  return (
    <div>
      <QuantityPicker max={product.stock} onChange={setQty} />
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={soldOut}
          onClick={() => router.push(`/checkout?product=${product.id}&qty=${qty}`)}
          className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
        >
          COMPRAR YA
        </button>
        <button
          type="button"
          disabled={soldOut}
          onClick={() => addToGuestCart(product.id, qty)}
          className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold text-white-warm disabled:opacity-40"
        >
          AÑADIR AL CARRITO
        </button>
      </div>
    </div>
  );
}
