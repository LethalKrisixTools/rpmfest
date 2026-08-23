'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Winner = {
  id: string;
  category_id: string;
  person_name: string;
  car_name: string;
  car_info: string;
  image_url: string | null;
};

type Category = { id: string; edition_id: string; name: string; sort_order: number };
type Edition = { id: string; name: string; year: number; sort_order: number };

type WinnerDraft = { person_name: string; car_name: string; car_info: string; image_url: string | null };

const EMPTY_WINNER_DRAFT: WinnerDraft = { person_name: '', car_name: '', car_info: '', image_url: null };

export default function AdminGanadoresPage() {
  const supabase = createClient();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingCategoryId, setUploadingCategoryId] = useState<string | null>(null);

  const [newEditionName, setNewEditionName] = useState('');
  const [newEditionYear, setNewEditionYear] = useState('');
  const [newCategoryName, setNewCategoryName] = useState<Record<string, string>>({});
  const [winnerDrafts, setWinnerDrafts] = useState<Record<string, WinnerDraft>>({});

  async function loadAll() {
    setError('');
    const [editionsRes, categoriesRes, winnersRes] = await Promise.all([
      supabase.from('award_editions').select('*').order('year', { ascending: false }),
      supabase.from('award_categories').select('*').order('sort_order'),
      supabase.from('award_winners').select('*')
    ]);

    if (editionsRes.error || categoriesRes.error || winnersRes.error) {
      console.error(editionsRes.error, categoriesRes.error, winnersRes.error);
      setError('No se pudieron cargar los ganadores.');
      return;
    }

    const editionRows = (editionsRes.data ?? []) as Edition[];
    const categoryRows = (categoriesRes.data ?? []) as Category[];
    const winnerRows = (winnersRes.data ?? []) as Winner[];

    setEditions(editionRows);
    setCategories(categoryRows);
    setWinners(winnerRows);

    const drafts: Record<string, WinnerDraft> = {};
    for (const w of winnerRows) {
      drafts[w.category_id] = {
        person_name: w.person_name,
        car_name: w.car_name,
        car_info: w.car_info,
        image_url: w.image_url
      };
    }
    setWinnerDrafts(drafts);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function draftFor(categoryId: string): WinnerDraft {
    return winnerDrafts[categoryId] ?? EMPTY_WINNER_DRAFT;
  }

  function updateDraft(categoryId: string, patch: Partial<WinnerDraft>) {
    setWinnerDrafts((prev) => ({ ...prev, [categoryId]: { ...draftFor(categoryId), ...patch } }));
  }

  async function createEdition(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const year = parseInt(newEditionYear, 10);
    if (!newEditionName || Number.isNaN(year)) {
      setError('Nombre y año de la edición son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const { error: insertError } = await supabase
        .from('award_editions')
        .insert({ name: newEditionName, year, sort_order: 0 });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setNewEditionName('');
      setNewEditionYear('');
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteEdition(id: string) {
    if (!window.confirm('¿Eliminar esta edición y todas sus categorías y ganadores?')) return;
    setError('');
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('award_editions').delete().eq('id', id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function createCategory(editionId: string) {
    const name = (newCategoryName[editionId] ?? '').trim();
    if (!name) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const { error: insertError } = await supabase
        .from('award_categories')
        .insert({ edition_id: editionId, name, sort_order: 0 });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setNewCategoryName((prev) => ({ ...prev, [editionId]: '' }));
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm('¿Eliminar esta categoría y su ganador?')) return;
    setError('');
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('award_categories').delete().eq('id', id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleWinnerImageUpload(categoryId: string, file: File) {
    setUploadingCategoryId(categoryId);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/ganadores/imagen', { method: 'POST', body });
      let payload: { url?: string; error?: string } = {};
      try {
        payload = await res.json();
      } catch {
        setError('Respuesta inválida del servidor al subir la imagen.');
        return;
      }
      if (!res.ok || !payload.url) {
        setError(payload.error ?? 'Error al subir la imagen.');
        return;
      }
      updateDraft(categoryId, { image_url: payload.url });
    } catch {
      setError('No se pudo subir la imagen. Inténtalo de nuevo.');
    } finally {
      setUploadingCategoryId(null);
    }
  }

  async function saveWinner(categoryId: string) {
    const draft = draftFor(categoryId);
    if (!draft.person_name || !draft.car_name) {
      setError('Nombre del ganador y coche son obligatorios.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const existing = winners.find((w) => w.category_id === categoryId);
      const payload = {
        category_id: categoryId,
        person_name: draft.person_name,
        car_name: draft.car_name,
        car_info: draft.car_info,
        image_url: draft.image_url,
        rank: 1
      };
      const { error: saveError } = existing
        ? await supabase.from('award_winners').update(payload).eq('id', existing.id)
        : await supabase.from('award_winners').insert(payload);
      if (saveError) {
        setError(saveError.message);
        return;
      }
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteWinner(winnerId: string) {
    if (!window.confirm('¿Eliminar este ganador?')) return;
    setError('');
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('award_winners').delete().eq('id', winnerId);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-black text-white-warm">Ganadores</h1>

      {error && <p className="mb-4 text-sm text-red-mid">{error}</p>}

      <form onSubmit={createEdition} className="mb-8 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="newEditionName" className="text-sm text-text-muted">
            Nueva edición
          </label>
          <input
            id="newEditionName"
            placeholder="Nombre (ej. RPM Fest 2026)"
            value={newEditionName}
            onChange={(e) => setNewEditionName(e.target.value)}
            className="block rounded-md border border-border-subtle bg-bg-dark p-2 text-white-warm"
          />
        </div>
        <div>
          <label htmlFor="newEditionYear" className="text-sm text-text-muted">
            Año
          </label>
          <input
            id="newEditionYear"
            placeholder="Año"
            value={newEditionYear}
            onChange={(e) => setNewEditionYear(e.target.value)}
            className="block w-24 rounded-md border border-border-subtle bg-bg-dark p-2 text-white-warm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gold px-4 py-2 text-sm font-bold text-bg-darkest disabled:opacity-40"
        >
          + Añadir edición
        </button>
      </form>

      <div className="flex flex-col gap-8">
        {editions.map((edition) => (
          <div key={edition.id} className="rounded-md border border-border-subtle bg-bg-dark p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-white-warm">
                {edition.name} ({edition.year})
              </h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => deleteEdition(edition.id)}
                className="text-sm text-red-mid underline disabled:opacity-40"
              >
                Eliminar edición
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {categories
                .filter((c) => c.edition_id === edition.id)
                .map((category) => {
                  const winner = winners.find((w) => w.category_id === category.id);
                  const draft = draftFor(category.id);
                  return (
                    <div key={category.id} className="rounded-md border border-border-subtle bg-bg-darkest p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-bold text-white-warm">{category.name}</h3>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => deleteCategory(category.id)}
                          className="text-sm text-red-mid underline disabled:opacity-40"
                        >
                          Eliminar categoría
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label htmlFor={`person-${category.id}`} className="text-sm text-text-muted">
                          Nombre del ganador
                        </label>
                        <input
                          id={`person-${category.id}`}
                          value={draft.person_name}
                          onChange={(e) => updateDraft(category.id, { person_name: e.target.value })}
                          className="rounded-md border border-border-subtle bg-bg-dark p-2 text-white-warm"
                        />
                        <label htmlFor={`car-${category.id}`} className="text-sm text-text-muted">
                          Coche
                        </label>
                        <input
                          id={`car-${category.id}`}
                          value={draft.car_name}
                          onChange={(e) => updateDraft(category.id, { car_name: e.target.value })}
                          className="rounded-md border border-border-subtle bg-bg-dark p-2 text-white-warm"
                        />
                        <label htmlFor={`carinfo-${category.id}`} className="text-sm text-text-muted">
                          Info básica del coche
                        </label>
                        <textarea
                          id={`carinfo-${category.id}`}
                          value={draft.car_info}
                          onChange={(e) => updateDraft(category.id, { car_info: e.target.value })}
                          rows={2}
                          className="rounded-md border border-border-subtle bg-bg-dark p-2 text-white-warm"
                        />
                        <label htmlFor={`photo-${category.id}`} className="text-sm text-text-muted">
                          Foto
                        </label>
                        <input
                          id={`photo-${category.id}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          disabled={uploadingCategoryId === category.id}
                          onChange={(e) => e.target.files?.[0] && handleWinnerImageUpload(category.id, e.target.files[0])}
                          className="text-sm text-text-muted"
                        />
                        {draft.image_url && (
                          <img
                            src={draft.image_url}
                            alt="Vista previa"
                            className="h-20 w-20 rounded-md border border-border-subtle object-cover"
                          />
                        )}
                        <div className="mt-2 flex gap-3">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => saveWinner(category.id)}
                            className="rounded-md bg-gold px-4 py-2 text-sm font-bold text-bg-darkest disabled:opacity-40"
                          >
                            Guardar ganador
                          </button>
                          {winner && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => deleteWinner(winner.id)}
                              className="text-sm text-red-mid underline disabled:opacity-40"
                            >
                              Eliminar ganador
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              <div className="flex items-end gap-3">
                <div>
                  <label htmlFor={`newcat-${edition.id}`} className="text-sm text-text-muted">
                    Nueva categoría
                  </label>
                  <input
                    id={`newcat-${edition.id}`}
                    placeholder="Nombre de la categoría"
                    value={newCategoryName[edition.id] ?? ''}
                    onChange={(e) => setNewCategoryName((prev) => ({ ...prev, [edition.id]: e.target.value }))}
                    className="block rounded-md border border-border-subtle bg-bg-darkest p-2 text-white-warm"
                  />
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => createCategory(edition.id)}
                  className="rounded-md border border-border-subtle px-4 py-2 text-sm font-bold text-white-warm disabled:opacity-40"
                >
                  + Añadir categoría
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
