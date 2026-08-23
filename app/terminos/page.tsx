import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function TerminosPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-cream">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Términos de Compra</h1>

        <h2 className="mt-6 font-bold text-white-warm">Precios y disponibilidad</h2>
        <p>
          Los precios se muestran en euros, impuestos incluidos. El stock se reserva en el
          momento de confirmar el pedido; si un producto se agota antes de completar el pago, el
          pedido no se procesa y no se realiza ningún cargo.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Pago</h2>
        <p>
          Los pagos se procesan de forma segura a través de Mollie (tarjeta, Bizum, PayPal). RPM
          Fest no almacena datos de tarjetas de pago.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Envíos</h2>
        <p>
          Los plazos de envío se comunican tras la compra. Puedes consultar el estado de tu
          pedido en <Link href="/pedido" className="text-gold underline">/pedido</Link> o desde{' '}
          <Link href="/cuenta" className="text-gold underline">Mi cuenta</Link>.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Devoluciones</h2>
        <p>
          Para gestionar una devolución, contacta con nosotros indicando tu número de pedido
          dentro de los 14 días naturales siguientes a la recepción del producto.
        </p>
      </main>
      <Footer />
    </>
  );
}
