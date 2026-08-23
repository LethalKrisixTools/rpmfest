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
    <div className="flex items-start gap-2 text-sm text-text-muted">
      <input
        id="consent"
        name="consent"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-1"
      />
      <label htmlFor="consent">
        He leído y acepto la{' '}
        <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-gold underline">
          Política de Privacidad
        </Link>
        .
      </label>
    </div>
  );
}
