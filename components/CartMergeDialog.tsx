'use client';

import { useEffect, useRef, useState } from 'react';
import { clearGuestCart, getGuestCart, mergeCartLines } from '@/lib/cart';
import { fetchAccountCart, replaceAccountCart } from '@/lib/cart-sync';
import type { CartLine } from '@/lib/types';

export function CartMergeDialog({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestLines, setGuestLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const mergeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setGuestLines(getGuestCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && guestLines.length > 0) {
      mergeButtonRef.current?.focus();
    }
  }, [ready, guestLines.length]);

  if (!ready || guestLines.length === 0) return null;

  async function handleChoice(shouldMerge: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (shouldMerge) {
        const accountLines = await fetchAccountCart();
        await replaceAccountCart(mergeCartLines(accountLines, guestLines));
      }
      clearGuestCart();
      onDone();
    } catch {
      setError('No se pudo actualizar tu cesta. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-merge-dialog-title"
    >
      <div className="max-w-sm rounded-xl border border-border-subtle bg-bg-dark p-6 text-center">
        <h2 id="cart-merge-dialog-title" className="text-white-warm">
          Tenías productos en tu cesta de invitado. ¿Quieres añadirlos a tu cesta guardada?
        </h2>
        {error && <p className="mt-2 text-sm text-red-mid">{error}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={mergeButtonRef}
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
