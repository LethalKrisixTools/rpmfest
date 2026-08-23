import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-cream">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Política de Cookies</h1>
        <p>
          RPM Fest utiliza únicamente cookies técnicas/esenciales, estrictamente necesarias para
          el funcionamiento del sitio:
        </p>
        <ul className="mt-4 list-disc pl-5">
          <li>Cookies de sesión de Supabase Auth, para mantenerte identificado tras iniciar sesión.</li>
          <li>Estado de la cesta de invitado, guardado en tu navegador (localStorage), no en cookies de terceros.</li>
        </ul>
        <p className="mt-4">
          Al ser cookies estrictamente necesarias, no requieren un banner de consentimiento previo
          según el RGPD y la LSSI-CE. No utilizamos cookies de analítica ni de publicidad. Si en
          el futuro se incorporaran, se solicitaría tu consentimiento explícito antes de
          activarlas.
        </p>
      </main>
      <Footer />
    </>
  );
}
