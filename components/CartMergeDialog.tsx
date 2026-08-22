'use client';

import { useState } from 'react';
import { clearGuestCart, getGuestCart, mergeCartLines } from '@/lib/cart';
import { fetchAccountCart, replaceAccountCart } from '@/lib/cart-sync';

export function CartMergeDialog({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const guestLines = getGuestCart();

  if (guestLines.length === 0) return null;

  async function handleChoice(shouldMerge: boolean) {
    setBusy(true);
    try {
      if (shouldMerge) {
        const accountLines = await fetchAccountCart();
        await replaceAccountCart(mergeCartLines(accountLines, guestLines));
      }
      clearGuestCart();
    } finally {
      setBusy(false);
      onDone();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-sm rounded-xl border border-border-subtle bg-bg-dark p-6 text-center">
        <p className="text-white-warm">
          Tenías productos en tu cesta de invitado. ¿Quieres añadirlos a tu cesta guardada?
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleChoice(true)}
            className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
          >
            Sí, añadir
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleChoice(false)}
            className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold text-white-warm disabled:opacity-40"
          >
            No, descartar
          </button>
        </div>
      </div>
    </div>
  );
}
