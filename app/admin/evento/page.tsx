'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ConfigForm = {
  name: string;
  organizer: string;
  event_date: string;
  location: string;
  address: string;
  status: string;
  dress_code: string;
  badge: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  cta_status: string;
  desc_short: string;
  quote: string;
};

const EMPTY_CONFIG: ConfigForm = {
  name: '',
  organizer: '',
  event_date: '',
  location: '',
  address: '',
  status: '',
  dress_code: '',
  badge: '',
  title: '',
  subtitle: '',
  cta_text: '',
  cta_link: '',
  cta_status: '',
  desc_short: '',
  quote: ''
};

type ListRow = { id: string | null; values: Record<string, string> };

const CONFIG_FIELDS: { key: keyof ConfigForm; label: string; type?: 'textarea' }[] = [
  { key: 'name', label: 'Nombre del evento' },
  { key: 'organizer', label: 'Organizador' },
  { key: 'event_date', label: 'Fecha (texto libre)' },
  { key: 'location', label: 'Ubicación' },
  { key: 'address', label: 'Dirección', type: 'textarea' },
  { key: 'status', label: 'Estado' },
  { key: 'dress_code', label: 'Código de vestimenta' },
  { key: 'badge', label: 'Badge de portada' },
  { key: 'title', label: 'Título de portada' },
  { key: 'subtitle', label: 'Subtítulo de portada' },
  { key: 'cta_text', label: 'Texto del botón principal' },
  { key: 'cta_link', label: 'Enlace del botón principal' },
  { key: 'cta_status', label: 'Estado del botón secundario' },
  { key: 'desc_short', label: 'Descripción corta', type: 'textarea' },
  { key: 'quote', label: 'Cita destacada', type: 'textarea' }
];

const ACTIVITY_FIELDS = [
  { key: 'icon', label: 'Icono (emoji)' },
  { key: 'title', label: 'Título' },
  { key: 'description', label: 'Descripción', type: 'textarea' as const },
  { key: 'tag', label: 'Etiqueta' }
];

const SCHEDULE_FIELDS = [
  { key: 'time', label: 'Hora' },
  { key: 'title', label: 'Título' },
  { key: 'description', label: 'Descripción', type: 'textarea' as const }
];

const STAT_FIELDS = [
  { key: 'number', label: 'Número' },
  { key: 'label', label: 'Etiqueta' }
];

const SPONSOR_FIELDS = [
  { key: 'name', label: 'Nombre' },
  { key: 'subtitle', label: 'Subtítulo' }
];

function ListEditor({
  title,
  rows,
  fields,
  onChange,
  onAdd,
  onRemove
}: {
  title: string;
  rows: ListRow[];
  fields: { key: string; label: string; type?: 'textarea' }[];
  onChange: (index: number, key: string, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-black text-white-warm">{title}</h2>
      <div className="flex flex-col gap-4">
        {rows.map((row, i) => (
          <div key={row.id ?? `new-${i}`} className="rounded-md border border-border-subtle bg-bg-dark p-4">
            <div className="flex flex-col gap-2">
              {fields.map((f) => {
                const fieldId = `${title}-${i}-${f.key}`;
                return (
                  <div key={f.key}>
                    <label htmlFor={fieldId} className="text-sm text-text-muted">
                      {f.label}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        id={fieldId}
                        value={row.values[f.key] ?? ''}
                        onChange={(e) => onChange(i, f.key, e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-border-subtle bg-bg-darkest p-2 text-white-warm"
                      />
                    ) : (
                      <input
                        id={fieldId}
                        value={row.values[f.key] ?? ''}
                        onChange={(e) => onChange(i, f.key, e.target.value)}
                        className="w-full rounded-md border border-border-subtle bg-bg-darkest p-2 text-white-warm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => onRemove(i)} className="mt-2 text-sm text-red-mid underline">
              Eliminar
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 rounded-md border border-border-subtle px-4 py-2 text-sm font-bold text-white-warm"
      >
        + Añadir
      </button>
    </div>
  );
}

export default function AdminEventoPage() {
  const supabase = createClient();
  const [configForm, setConfigForm] = useState<ConfigForm>(EMPTY_CONFIG);
  const [activities, setActivities] = useState<ListRow[]>([]);
  const [schedule, setSchedule] = useState<ListRow[]>([]);
  const [stats, setStats] = useState<ListRow[]>([]);
  const [sponsors, setSponsors] = useState<ListRow[]>([]);
  const [originalIds, setOriginalIds] = useState<{
    activities: string[];
    schedule: string[];
    stats: string[];
    sponsors: string[];
  }>({ activities: [], schedule: [], stats: [], sponsors: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function loadAll() {
    setError('');
    const [configRes, activitiesRes, scheduleRes, statsRes, sponsorsRes] = await Promise.all([
      supabase.from('event_config').select('*').eq('id', 1).single(),
      supabase.from('event_activities').select('*').order('sort_order'),
      supabase.from('event_schedule').select('*').order('sort_order'),
      supabase.from('event_stats').select('*').order('sort_order'),
      supabase.from('event_sponsors').select('*').order('sort_order')
    ]);

    if (configRes.error || activitiesRes.error || scheduleRes.error || statsRes.error || sponsorsRes.error) {
      console.error(configRes.error, activitiesRes.error, scheduleRes.error, statsRes.error, sponsorsRes.error);
      setError('No se pudieron cargar los datos del evento.');
      return;
    }

    const c = configRes.data;
    setConfigForm({
      name: c.name,
      organizer: c.organizer,
      event_date: c.event_date,
      location: c.location,
      address: c.address,
      status: c.status,
      dress_code: c.dress_code,
      badge: c.badge,
      title: c.title,
      subtitle: c.subtitle,
      cta_text: c.cta_text,
      cta_link: c.cta_link,
      cta_status: c.cta_status,
      desc_short: c.desc_short,
      quote: c.quote
    });

    const toRows = (data: Record<string, unknown>[] | null, keys: string[]): ListRow[] =>
      (data ?? []).map((r) => ({
        id: r.id as string,
        values: Object.fromEntries(keys.map((k) => [k, String(r[k] ?? '')]))
      }));

    const activityRows = toRows(activitiesRes.data, ['icon', 'title', 'description', 'tag']);
    const scheduleRows = toRows(scheduleRes.data, ['time', 'title', 'description']);
    const statRows = toRows(statsRes.data, ['number', 'label']);
    const sponsorRows = toRows(sponsorsRes.data, ['name', 'subtitle']);

    setActivities(activityRows);
    setSchedule(scheduleRows);
    setStats(statRows);
    setSponsors(sponsorRows);
    setOriginalIds({
      activities: activityRows.map((r) => r.id as string),
      schedule: scheduleRows.map((r) => r.id as string),
      stats: statRows.map((r) => r.id as string),
      sponsors: sponsorRows.map((r) => r.id as string)
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  function updateRow(
    setter: React.Dispatch<React.SetStateAction<ListRow[]>>,
    index: number,
    key: string,
    value: string
  ) {
    setter((prev) => prev.map((row, i) => (i === index ? { ...row, values: { ...row.values, [key]: value } } : row)));
  }

  function addRow(setter: React.Dispatch<React.SetStateAction<ListRow[]>>, keys: string[]) {
    setter((prev) => [...prev, { id: null, values: Object.fromEntries(keys.map((k) => [k, ''])) }]);
  }

  function removeRow(setter: React.Dispatch<React.SetStateAction<ListRow[]>>, index: number) {
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveList(
    table: string,
    rows: ListRow[],
    original: string[],
    setter: React.Dispatch<React.SetStateAction<ListRow[]>>
  ) {
    const currentIds = rows.filter((r) => r.id).map((r) => r.id as string);
    const toDelete = original.filter((id) => !currentIds.includes(id));
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.from(table).delete().in('id', toDelete);
      if (deleteError) throw deleteError;
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const payload = { ...row.values, sort_order: i };
      if (row.id) {
        const { error: updateError } = await supabase.from(table).update(payload).eq('id', row.id);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from(table)
          .insert(payload)
          .select('id')
          .single();
        if (insertError) throw insertError;
        const newId = inserted.id as string;
        setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, id: newId } : r)));
      }
    }
  }

  async function saveAll() {
    setError('');
    setSuccess(false);

    const emptyField = CONFIG_FIELDS.find((f) => !configForm[f.key].trim());
    if (emptyField) {
      setError(`El campo "${emptyField.label}" no puede estar vacío.`);
      return;
    }

    setSaving(true);
    try {
      const { error: configError } = await supabase.from('event_config').update(configForm).eq('id', 1);
      if (configError) throw configError;

      await saveList('event_activities', activities, originalIds.activities, setActivities);
      await saveList('event_schedule', schedule, originalIds.schedule, setSchedule);
      await saveList('event_stats', stats, originalIds.stats, setStats);
      await saveList('event_sponsors', sponsors, originalIds.sponsors, setSponsors);

      await loadAll();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-black text-white-warm">Evento</h1>

      <div className="flex flex-col gap-2">
        {CONFIG_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="text-sm text-text-muted">
              {f.label}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                id={f.key}
                value={configForm[f.key]}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-border-subtle bg-bg-dark p-2 text-white-warm"
              />
            ) : (
              <input
                id={f.key}
                value={configForm[f.key]}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full rounded-md border border-border-subtle bg-bg-dark p-2 text-white-warm"
              />
            )}
          </div>
        ))}
      </div>

      <ListEditor
        title="Actividades"
        rows={activities}
        fields={ACTIVITY_FIELDS}
        onChange={(i, k, v) => updateRow(setActivities, i, k, v)}
        onAdd={() => addRow(setActivities, ['icon', 'title', 'description', 'tag'])}
        onRemove={(i) => {
          if (window.confirm('¿Eliminar este elemento?')) removeRow(setActivities, i);
        }}
      />

      <ListEditor
        title="Horario"
        rows={schedule}
        fields={SCHEDULE_FIELDS}
        onChange={(i, k, v) => updateRow(setSchedule, i, k, v)}
        onAdd={() => addRow(setSchedule, ['time', 'title', 'description'])}
        onRemove={(i) => {
          if (window.confirm('¿Eliminar este elemento?')) removeRow(setSchedule, i);
        }}
      />

      <ListEditor
        title="Estadísticas"
        rows={stats}
        fields={STAT_FIELDS}
        onChange={(i, k, v) => updateRow(setStats, i, k, v)}
        onAdd={() => addRow(setStats, ['number', 'label'])}
        onRemove={(i) => {
          if (window.confirm('¿Eliminar este elemento?')) removeRow(setStats, i);
        }}
      />

      <ListEditor
        title="Patrocinadores"
        rows={sponsors}
        fields={SPONSOR_FIELDS}
        onChange={(i, k, v) => updateRow(setSponsors, i, k, v)}
        onAdd={() => addRow(setSponsors, ['name', 'subtitle'])}
        onRemove={(i) => {
          if (window.confirm('¿Eliminar este elemento?')) removeRow(setSponsors, i);
        }}
      />

      {error && <p className="mt-4 text-sm text-red-mid">{error}</p>}
      {success && <p className="mt-4 text-sm text-gold">Cambios guardados.</p>}

      <button
        type="button"
        disabled={saving}
        onClick={saveAll}
        className="mt-6 rounded-md bg-gold px-6 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
      >
        GUARDAR CAMBIOS
      </button>
    </div>
  );
}
