'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { formatCents } from '@/lib/money';
import { createClient } from '@/lib/supabase/client';
import type { Order, Profile } from '@/lib/types';

export default function CuentaPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/cuenta');
        return;
      }
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<Profile>();
      setProfile(profileRow);

      const { data: orderRows } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<Order[]>();
      setOrders(orderRows ?? []);
    }
    load();
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        default_address: profile.default_address,
        default_city: profile.default_city,
        default_postal_code: profile.default_postal_code
      })
      .eq('id', profile.id);
    setSaving(false);
    setMessage(error ? 'No se pudo guardar.' : 'Guardado.');
  }

  async function deleteAccount() {
    if (!window.confirm('¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      return;
    }
    const response = await fetch('/api/cuenta/eliminar', { method: 'POST' });
    if (response.ok) router.push('/');
  }

  if (!profile) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Mi cuenta</h1>

        <form onSubmit={saveProfile} className="flex flex-col gap-3">
          <input
            placeholder="Nombre completo"
            value={profile.full_name ?? ''}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Teléfono"
            value={profile.phone ?? ''}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Dirección"
            value={profile.default_address ?? ''}
            onChange={(e) => setProfile({ ...profile, default_address: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Ciudad"
            value={profile.default_city ?? ''}
            onChange={(e) => setProfile({ ...profile, default_city: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Código postal"
            value={profile.default_postal_code ?? ''}
            onChange={(e) => setProfile({ ...profile, default_postal_code: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <button disabled={saving} type="submit" className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
            GUARDAR
          </button>
          {message && <p className="text-sm text-text-muted">{message}</p>}
        </form>

        <h2 className="mb-3 mt-10 text-lg font-black text-white-warm">Historial de pedidos</h2>
        {orders.length === 0 && <p className="text-text-muted">Aún no has hecho ningún pedido.</p>}
        {orders.map((order) => (
          <div key={order.id} className="flex justify-between border-b border-border-subtle py-2 text-sm">
            <span className="text-cream">{order.order_number} · {order.status}</span>
            <span className="text-white-warm">{formatCents(order.amount_cents)}</span>
          </div>
        ))}

        <div className="mt-10 flex flex-col gap-2 border-t border-border-subtle pt-6">
          <h2 className="text-lg font-black text-white-warm">Tus datos (RGPD)</h2>
          <a href="/api/cuenta/export" className="rounded-md border border-border-subtle px-4 py-3 text-center text-sm font-bold text-white-warm">
            Descargar mis datos
          </a>
          <button
            type="button"
            onClick={deleteAccount}
            className="rounded-md border border-red-mid px-4 py-3 text-sm font-bold text-red-mid"
          >
            Eliminar mi cuenta
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
