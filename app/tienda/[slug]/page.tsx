import { notFound } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductActions } from '@/components/ProductActions';
import { createClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/money';
import type { Product } from '@/lib/types';

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .eq('active', true)
    .single<Product>();

  if (!product) notFound();

  return (
    <>
      <Navbar />
      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-2">
        <ProductGallery images={product.images} alt={product.name} />
        <div>
          <span className="text-xs font-bold tracking-widest text-gold">
            {product.category ?? 'RPM FEST STORE'}
          </span>
          <h1 className="mt-1 text-3xl font-black text-white-warm">{product.name}</h1>
          <div className="mt-2 text-2xl font-black text-gold">
            {formatCents(product.price_cents)}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {product.stock === null ? 'Disponible' : `${product.stock} uds. disponibles`}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-text-muted">{product.description}</p>
          <ProductActions product={product} />
        </div>
      </main>
      <Footer />
    </>
  );
}
