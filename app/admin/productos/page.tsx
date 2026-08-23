'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCents } from '@/lib/money';
import type { Product } from '@/lib/types';

type FormState = {
  id: string | null;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  priceEuros: string;
  stock: string;
  category: string;
  images: string[];
  active: boolean;
  featured: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  slug: '',
  name: '',
  short_description: '',
  description: '',
  priceEuros: '',
  stock: '',
  category: '',
  images: [],
  active: true,
  featured: false
};

export default function AdminProductosPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts((data ?? []) as Product[]);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function editProduct(p: Product) {
    setForm({
      id: p.id,
      slug: p.slug,
      name: p.name,
      short_description: p.short_description ?? '',
      description: p.description ?? '',
      priceEuros: (p.price_cents / 100).toFixed(2),
      stock: p.stock === null ? '' : String(p.stock),
      category: p.category ?? '',
      images: p.images,
      active: p.active,
      featured: p.featured
    });
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/admin/productos/imagen', { method: 'POST', body });
    setUploading(false);
    if (!res.ok) {
      const payload = await res.json();
      setError(payload.error ?? 'Error al subir la imagen.');
      return;
    }
    const { url } = await res.json();
    setForm((f) => ({ ...f, images: [...f.images, url] }));
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.slug || !form.name || !form.priceEuros) {
      setError('Slug, nombre y precio son obligatorios.');
      return;
    }
    const payload = {
      slug: form.slug,
      name: form.name,
      short_description: form.short_description || null,
      description: form.description || null,
      price_cents: Math.round(parseFloat(form.priceEuros) * 100),
      stock: form.stock === '' ? null : parseInt(form.stock, 10),
      category: form.category || null,
      images: form.images,
      active: form.active,
      featured: form.featured
    };

    const { error: saveError } = form.id
      ? await supabase.from('products').update(payload).eq('id', form.id)
      : await supabase.from('products').insert(payload);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    setForm(EMPTY_FORM);
    await loadProducts();
  }

  async function deleteProduct(id: string) {
    if (!window.confirm('¿Eliminar este producto?')) return;
    const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadProducts();
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <h1 className="mb-4 text-xl font-black text-white-warm">Productos</h1>
        <table className="w-full text-left text-sm text-white-warm">
          <thead className="text-text-muted">
            <tr>
              <th className="pb-2">Nombre</th>
              <th className="pb-2">Precio</th>
              <th className="pb-2">Stock</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border-subtle">
                <td className="py-2">{p.name}</td>
                <td className="py-2">{formatCents(p.price_cents)}</td>
                <td className="py-2">{p.stock ?? '—'}</td>
                <td className="py-2 text-right">
                  <button onClick={() => editProduct(p)} className="mr-3 text-gold underline">
                    Editar
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-mid underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-black text-white-warm">
          {form.id ? 'Editar producto' : 'Nuevo producto'}
        </h2>
        <form onSubmit={saveProduct} className="flex flex-col gap-3">
          <input
            placeholder="Slug (ej. camiseta-oficial-2026)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Descripción corta"
            value={form.short_description}
            onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <textarea
            placeholder="Descripción completa"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            rows={4}
          />
          <input
            placeholder="Precio (€)"
            value={form.priceEuros}
            onChange={(e) => setForm((f) => ({ ...f, priceEuros: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Stock (vacío = ilimitado)"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Categoría"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            className="text-sm text-text-muted"
          />
          {form.images.length > 0 && (
            <div className="flex gap-2">
              {form.images.map((url) => (
                <img key={url} src={url} className="h-14 w-14 rounded-md border border-border-subtle" />
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-white-warm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Activo (visible en la tienda)
          </label>
          <label className="flex items-center gap-2 text-sm text-white-warm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            />
            Destacado
          </label>

          {error && <p className="text-sm text-red-mid">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
              {form.id ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
                className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold text-white-warm"
              >
                CANCELAR
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
