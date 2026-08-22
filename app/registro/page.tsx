'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { CartMergeDialog } from '@/components/CartMergeDialog';
import { createClient } from '@/lib/supabase/client';
import { getGuestCart } from '@/lib/cart';

export default function RegistroPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [showMerge, setShowMerge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Debes aceptar la Política de Privacidad para continuar.');
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, terms_accepted_at: new Date().toISOString() }
        }
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (getGuestCart().length > 0) {
        setShowMerge(true);
      } else {
        router.push('/tienda');
      }
    } catch {
      setError('No se pudo crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Crear cuenta</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="fullName" className="text-sm text-text-muted">
            Nombre completo
          </label>
          <input
            id="fullName"
            required
            placeholder="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <label htmlFor="email" className="text-sm text-text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <label htmlFor="password" className="text-sm text-text-muted">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <ConsentCheckbox checked={consent} onChange={setConsent} />
          {error && <p className="text-sm text-red-mid">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
          >
            CREAR CUENTA
          </button>
        </form>
      </main>
      <Footer />
      {showMerge && <CartMergeDialog onDone={() => router.push('/tienda')} />}
    </>
  );
}
