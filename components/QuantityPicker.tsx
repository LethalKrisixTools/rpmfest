'use client';

import { useState } from 'react';

export function QuantityPicker({
  max,
  onChange
}: {
  max: number | null;
  onChange: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);

  function update(next: number) {
    const clamped = Math.max(1, max ? Math.min(next, max) : next);
    setQty(clamped);
    onChange(clamped);
  }

  return (
    <div className="my-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => update(qty - 1)}
        className="h-8 w-8 rounded-full border border-border-subtle text-white-warm"
      >
        −
      </button>
      <span className="w-6 text-center text-white-warm">{qty}</span>
      <button
        type="button"
        onClick={() => update(qty + 1)}
        className="h-8 w-8 rounded-full border border-border-subtle text-white-warm"
      >
        +
      </button>
    </div>
  );
}
