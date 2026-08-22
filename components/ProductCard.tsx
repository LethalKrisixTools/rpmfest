'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addToGuestCart } from '@/lib/cart';
import { formatCents } from '@/lib/money';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const soldOut = product.stock !== null && product.stock <= 0;
  const image = product.images[0] ?? '/assets/product-placeholder.svg';

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-dark">
      <Link href={`/tienda/${product.slug}`} className="relative block aspect-square bg-bg-mid">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
        {product.featured && (
          <span className="absolute left-2 top-2 rounded bg-gold px-2 py-1 text-xs font-bold text-bg-darkest">
            DESTACADO
          </span>
        )}
        {soldOut && (
          <span className="absolute right-2 top-2 rounded bg-red-mid px-2 py-1 text-xs font-bold text-white-warm">
            AGOTADO
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/tienda/${product.slug}`} className="font-bold text-white-warm">
          {product.name}
        </Link>
        <p className="text-sm text-text-muted">{product.short_description}</p>
        <p className="font-bold text-gold">{formatCents(product.price_cents)}</p>
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={soldOut}
            onClick={() => router.push(`/checkout?product=${product.id}&qty=1`)}
            className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
          >
            COMPRAR YA
          </button>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => addToGuestCart(product.id, 1)}
            className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold text-white-warm disabled:opacity-40"
          >
            + AÑADIR AL CARRITO
          </button>
        </div>
      </div>
    </article>
  );
}
