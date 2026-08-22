import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types';

export default async function TiendaPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('featured', { ascending: false })
    .returns<Product[]>();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <span className="text-xs font-bold tracking-widest text-gold">RPM FEST STORE</span>
        <h1 className="mt-2 text-4xl font-black text-white-warm">
          MERCH <span className="text-gold">OFICIAL</span>
        </h1>
        <p className="mt-2 max-w-xl text-text-muted">
          Productos oficiales de RPM Fest. Compra de forma segura y consulta tu pedido sin crear
          una cuenta.
        </p>
        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
          {(products ?? []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {(!products || products.length === 0) && (
            <p className="col-span-full text-text-muted">
              La tienda estará disponible próximamente.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
