import Image from 'next/image';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-bg-darkest/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/">
          <Image src="/logo-rpmfest.png" alt="RPM Fest" width={140} height={40} />
        </Link>
        <ul className="flex items-center gap-6 text-sm font-semibold text-white-warm">
          <li><Link href="/#evento">Evento</Link></li>
          <li><Link href="/#experiencias">Experiencias</Link></li>
          <li><Link href="/eventos">Próximos Eventos</Link></li>
          <li><Link href="/tienda">Tienda</Link></li>
          <li><Link href="/pedido">Seguir pedido</Link></li>
          <li><Link href="/cuenta" className="text-gold">Mi cuenta</Link></li>
        </ul>
      </div>
    </nav>
  );
}
