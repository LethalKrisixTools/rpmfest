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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadProducts() {
    const { data, error: loadError } = await supabase.from('products').select('*').order('name');
    if (loadError) {
      console.error(loadError);
      setError('No se pudieron cargar los productos.');
      return;
    }
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
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/productos/imagen', { method: 'POST', body });
      let payload: { url?: string; error?: string } = {};
      try {
        payload = await res.json();
      } catch {
        setError('Respuesta inválida del servidor al subir la imagen.');
        return;
      }
      if (!res.ok) {
        setError(payload.error ?? 'Error al subir la imagen.');
        return;
      }
      if (!payload.url) {
        setError('Respuesta inválida del servidor al subir la imagen.');
        return;
      }
      setForm((f) => ({ ...f, images: [...f.images, payload.url as string] }));
    } catch {
      setError('No se pudo subir la imagen. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.slug || !form.name || !form.priceEuros) {
      setError('Slug, nombre y precio son obligatorios.');
      return;
    }
    const priceCents = Math.round(parseFloat(form.priceEuros) * 100);
    if (Number.isNaN(priceCents)) {
      setError('El precio introducido no es válido.');
      return;
    }
    const stock = form.stock === '' ? null : parseInt(form.stock, 10);
    if (stock !== null && Number.isNaN(stock)) {
      setError('El stock introducido no es válido.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: form.slug,
        name: form.name,
        short_description: form.short_description || null,
        description: form.description || null,
        price_cents: priceCents,
        stock,
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
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!window.confirm('¿Eliminar este producto?')) return;
    setError('');
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await loadProducts();
    } finally {
      setSaving(false);
    }
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
                  <button type="button" onClick={() => editProduct(p)} className="mr-3 text-gold underline">
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => deleteProduct(p.id)}
                    className="text-red-mid underline disabled:opacity-40"
                  >
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
          <label htmlFor="slug" className="text-sm text-text-muted">
            Slug
          </label>
          <input
            id="slug"
            placeholder="Slug (ej. camiseta-oficial-2026)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <label htmlFor="name" className="text-sm text-text-muted">
            Nombre
          </label>
          <input
            id="name"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <label htmlFor="short_description" className="text-sm text-text-muted">
            Descripción corta
          </label>
          <input
            id="short_description"
            placeholder="Descripción corta"
            value={form.short_description}
            onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <label htmlFor="description" className="text-sm text-text-muted">
            Descripción completa
          </label>
          <textarea
            id="description"
            placeholder="Descripción completa"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            rows={4}
          />
          <label htmlFor="priceEuros" className="text-sm text-text-muted">
            Precio (€)
          </label>
          <input
            id="priceEuros"
            placeholder="Precio (€)"
            value={form.priceEuros}
            onChange={(e) => setForm((f) => ({ ...f, priceEuros: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <label htmlFor="stock" className="text-sm text-text-muted">
            Stock
          </label>
          <input
            id="stock"
            placeholder="Stock (vacío = ilimitado)"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <label htmlFor="category" className="text-sm text-text-muted">
            Categoría
          </label>
          <input
            id="category"
            placeholder="Categoría"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />

          <label htmlFor="image" className="text-sm text-text-muted">
            Imagen
          </label>
          <input
            id="image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            className="text-sm text-text-muted"
          />
          {form.images.length > 0 && (
            <div className="flex gap-2">
              {form.images.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="Vista previa"
                  className="h-14 w-14 rounded-md border border-border-subtle"
                />
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
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
            >
              {form.id ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
            </button>
            {form.id && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setForm(EMPTY_FORM)}
                className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold text-white-warm disabled:opacity-40"
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
