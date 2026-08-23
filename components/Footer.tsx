import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-bg-darkest">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap justify-between gap-8">
          <div>
            <div className="text-xl font-black">
              RPM<span className="text-gold">FEST</span>
            </div>
            <p className="mt-2 max-w-xs text-sm text-text-muted">
              Un festival del motor como ningún otro. Organizado por Diamond Squad Events.
            </p>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-bold text-white-warm">Legal</h4>
            <div className="flex flex-col gap-1 text-sm text-text-muted">
              <Link href="/privacidad">Política de Privacidad</Link>
              <Link href="/terminos">Términos de Compra</Link>
              <Link href="/cookies">Política de Cookies</Link>
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs text-text-muted">
          &copy; 2026 Diamond Squad Events. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
