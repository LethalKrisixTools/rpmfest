'use client';

import Link from 'next/link';

export function ConsentCheckbox({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-1"
      />
      <span>
        He leído y acepto la{' '}
        <Link href="/privacidad" target="_blank" className="text-gold underline">
          Política de Privacidad
        </Link>
        .
      </span>
    </label>
  );
}
