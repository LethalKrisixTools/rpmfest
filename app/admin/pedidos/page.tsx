import { createClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/money';

export default async function AdminPedidosPage() {
  const supabase = createClient();
  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_number, status, customer_name, customer_email, amount_cents, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al cargar pedidos:', error);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-black text-white-warm">Pedidos</h1>
      <table className="w-full text-left text-sm text-white-warm">
        <thead className="text-text-muted">
          <tr>
            <th className="pb-2">Nº pedido</th>
            <th className="pb-2">Cliente</th>
            <th className="pb-2">Estado</th>
            <th className="pb-2">Importe</th>
            <th className="pb-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((o) => (
            <tr key={o.order_number} className="border-t border-border-subtle">
              <td className="py-2">{o.order_number}</td>
              <td className="py-2">
                {o.customer_name}
                <div className="text-xs text-text-muted">{o.customer_email}</div>
              </td>
              <td className="py-2">{o.status}</td>
              <td className="py-2">{formatCents(o.amount_cents)}</td>
              <td className="py-2">{new Date(o.created_at).toLocaleDateString('es-ES')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
