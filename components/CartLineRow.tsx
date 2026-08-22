'use client';

import Image from 'next/image';
import { formatCents } from '@/lib/money';
import type { Product } from '@/lib/types';

export function CartLineRow({
  product,
  qty,
  onChangeQty,
  onRemove
}: {
  product: Product;
  qty: number;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[64px_1fr_auto_auto] items-center gap-4 border-b border-border-subtle py-4">
      <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-bg-mid">
        <Image
          src={product.images[0] ?? '/assets/product-placeholder.svg'}
          alt={product.name}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div>
        <div className="font-bold text-white-warm">{product.name}</div>
        <div className="text-sm text-text-muted">{formatCents(product.price_cents)} / ud.</div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChangeQty(qty - 1)} className="h-7 w-7 rounded-full border border-border-subtle text-white-warm">
          −
        </button>
        <span className="text-white-warm">{qty}</span>
        <button type="button" onClick={() => onChangeQty(qty + 1)} className="h-7 w-7 rounded-full border border-border-subtle text-white-warm">
          +
        </button>
      </div>
      <button type="button" onClick={onRemove} className="text-xs text-text-muted underline">
        Quitar
      </button>
    </div>
  );
}
