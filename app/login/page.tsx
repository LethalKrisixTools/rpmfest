'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartMergeDialog } from '@/components/CartMergeDialog';
import { createClient } from '@/lib/supabase/client';
import { getGuestCart } from '@/lib/cart';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/tienda';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showMerge, setShowMerge] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('Email o contraseña incorrectos.');
      return;
    }
    if (getGuestCart().length > 0) {
      setShowMerge(true);
    } else {
      router.push(next);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          {error && <p className="text-sm text-red-mid">{error}</p>}
          <button type="submit" className="mt-2 rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
            ENTRAR
          </button>
        </form>
        <p className="mt-4 text-sm text-text-muted">
          ¿No tienes cuenta? <Link href="/registro" className="text-gold">Crear cuenta</Link>
        </p>
      </main>
      <Footer />
      {showMerge && <CartMergeDialog onDone={() => router.push(next)} />}
    </>
  );
}
