import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-bg-darkest">
      <header className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        <nav className="flex gap-6 text-sm font-bold text-white-warm">
          <Link href="/admin/productos" className="hover:text-gold">
            Productos
          </Link>
          <Link href="/admin/pedidos" className="hover:text-gold">
            Pedidos
          </Link>
          <Link href="/admin/evento" className="hover:text-gold">
            Evento
          </Link>
          <Link href="/admin/ganadores" className="hover:text-gold">
            Ganadores
          </Link>
        </nav>
        <span className="text-xs text-text-muted">{user?.email}</span>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
