import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function PrivacidadPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-cream">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Política de Privacidad</h1>

        <h2 className="mt-6 font-bold text-white-warm">Responsable del tratamiento</h2>
        <p>Diamond Squad Events, organizador de RPM Fest.</p>

        <h2 className="mt-6 font-bold text-white-warm">Finalidad y base legal</h2>
        <p>
          Tratamos tu nombre, email, dirección de envío y ciudad para gestionar y enviar tu
          pedido (ejecución del contrato de compraventa, art. 6.1.b RGPD). Si creas una cuenta,
          tratamos tus credenciales y datos de perfil con base en tu consentimiento explícito
          (art. 6.1.a RGPD). No usamos tus datos con fines de marketing.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Dónde se alojan tus datos</h2>
        <p>
          Los datos se alojan en la Unión Europea: base de datos en Supabase (Irlanda) y pagos
          procesados por Mollie (Países Bajos). No se realizan transferencias fuera del Espacio
          Económico Europeo.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Plazo de conservación</h2>
        <p>
          Los datos de pedidos se conservan mientras dure tu cuenta y, tras su eliminación o para
          compras de invitado, durante el plazo legal exigido por la normativa fiscal y mercantil
          española (mínimo 4 años a efectos tributarios, 6 años según el Código de Comercio).
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Tus derechos</h2>
        <p>
          Puedes acceder, rectificar, descargar (portabilidad) o eliminar tus datos desde{' '}
          <a href="/cuenta" className="text-gold underline">Mi cuenta</a>. Si compraste como
          invitado y no tienes cuenta, escríbenos a{' '}
          <a href="mailto:privacidad@rpmfest.example" className="text-gold underline">
            privacidad@rpmfest.example
          </a>{' '}
          indicando tu número de pedido y email para ejercer estos derechos.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Encargados de tratamiento</h2>
        <p>
          Supabase (base de datos y autenticación) y Mollie (procesamiento de pagos) tratan datos
          en nuestro nombre bajo sus respectivos Acuerdos de Encargado de Tratamiento.
        </p>
      </main>
      <Footer />
    </>
  );
}
