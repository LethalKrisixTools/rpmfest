# Panel de Evento y Ganadores — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recuperar la edición del contenido del evento (`/admin/evento`) sin GitHub-write, y añadir una página pública nueva de ganadores de ediciones pasadas (`/ganadores`) con su propio panel de administración (`/admin/ganadores`).

**Architecture:** 8 tablas nuevas en Supabase (5 para el evento, 3 para ganadores) con RLS lectura-pública/escritura-solo-admin. Dos Route Handlers públicos (`/api/evento`, `/api/ganadores`) sirven JSON leído de esas tablas. `/` y `/eventos` siguen siendo HTML estático — solo cambia la URL desde la que `data-loader.js` obtiene los datos. Dos páginas cliente nuevas bajo `/admin` (mismo patrón que `/admin/productos`) para editar todo desde el navegador. Una página HTML estática nueva (`/ganadores`) con su propio loader JS, igual que `/` y `/eventos`.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS + Storage), TypeScript, Tailwind. Sin dependencias nuevas.

Ver el diseño completo en `docs/superpowers/specs/2026-08-23-evento-ganadores-admin-design.md`.

---

### Task 1: Migración — tablas del evento + RLS

**Files:**
- Create: `supabase/migrations/0008_event_content.sql`

- [ ] **Step 1: Escribir la migración**

```sql
create table public.event_config (
  id smallint primary key default 1 check (id = 1),
  name text not null default '',
  organizer text not null default '',
  event_date text not null default '',
  location text not null default '',
  address text not null default '',
  status text not null default '',
  dress_code text not null default '',
  badge text not null default '',
  title text not null default '',
  subtitle text not null default '',
  cta_text text not null default '',
  cta_link text not null default '',
  cta_status text not null default '',
  desc_short text not null default '',
  quote text not null default '',
  updated_at timestamptz not null default now()
);

create table public.event_activities (
  id uuid primary key default gen_random_uuid(),
  icon text not null default '',
  title text not null default '',
  description text not null default '',
  tag text not null default '',
  sort_order integer not null default 0
);

create table public.event_schedule (
  id uuid primary key default gen_random_uuid(),
  time text not null default '',
  title text not null default '',
  description text not null default '',
  sort_order integer not null default 0
);

create table public.event_stats (
  id uuid primary key default gen_random_uuid(),
  number text not null default '',
  label text not null default '',
  sort_order integer not null default 0
);

create table public.event_sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  subtitle text not null default '',
  sort_order integer not null default 0
);

alter table public.event_config enable row level security;
alter table public.event_activities enable row level security;
alter table public.event_schedule enable row level security;
alter table public.event_stats enable row level security;
alter table public.event_sponsors enable row level security;

create policy "event_config_public_read" on public.event_config for select using (true);
create policy "event_config_admin_write" on public.event_config for insert with check (public.is_admin());
create policy "event_config_admin_update" on public.event_config for update using (public.is_admin()) with check (public.is_admin());
create policy "event_config_admin_delete" on public.event_config for delete using (public.is_admin());

create policy "event_activities_public_read" on public.event_activities for select using (true);
create policy "event_activities_admin_write" on public.event_activities for insert with check (public.is_admin());
create policy "event_activities_admin_update" on public.event_activities for update using (public.is_admin()) with check (public.is_admin());
create policy "event_activities_admin_delete" on public.event_activities for delete using (public.is_admin());

create policy "event_schedule_public_read" on public.event_schedule for select using (true);
create policy "event_schedule_admin_write" on public.event_schedule for insert with check (public.is_admin());
create policy "event_schedule_admin_update" on public.event_schedule for update using (public.is_admin()) with check (public.is_admin());
create policy "event_schedule_admin_delete" on public.event_schedule for delete using (public.is_admin());

create policy "event_stats_public_read" on public.event_stats for select using (true);
create policy "event_stats_admin_write" on public.event_stats for insert with check (public.is_admin());
create policy "event_stats_admin_update" on public.event_stats for update using (public.is_admin()) with check (public.is_admin());
create policy "event_stats_admin_delete" on public.event_stats for delete using (public.is_admin());

create policy "event_sponsors_public_read" on public.event_sponsors for select using (true);
create policy "event_sponsors_admin_write" on public.event_sponsors for insert with check (public.is_admin());
create policy "event_sponsors_admin_update" on public.event_sponsors for update using (public.is_admin()) with check (public.is_admin());
create policy "event_sponsors_admin_delete" on public.event_sponsors for delete using (public.is_admin());
```

- [ ] **Step 2: Aplicar la migración al proyecto Supabase real** (mismo mecanismo usado durante toda la migración de la tienda: herramienta MCP `apply_migration` de Supabase, proyecto `zykhabeftqddreitrnbc`)

- [ ] **Step 3: Verificación manual** — confirmar que las 5 tablas existen (`list_tables`) y que `get_advisors` no reporta ninguna tabla pública sin RLS entre estas 5.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0008_event_content.sql
git commit -m "feat(db): add event content tables (config, activities, schedule, stats, sponsors)"
```

---

### Task 2: Migración — semilla de datos del evento

**Files:**
- Create: `supabase/migrations/0009_event_content_seed.sql`

- [ ] **Step 1: Escribir la migración** (copia exacta del contenido actual de `public/data/data.json`)

```sql
insert into public.event_config (id, name, organizer, event_date, location, address, status, dress_code, badge, title, subtitle, cta_text, cta_link, cta_status, desc_short, quote)
values (
  1,
  'RPM FEST',
  'Diamond Squad Events',
  'Sábado 16 de Mayo · 10:00',
  'Circuito Internacional FK1',
  E'Ctra. Comarcal, 602, 47465\nVillaverde de Medina, Valladolid',
  'finalizado',
  'Casual',
  'DIAMOND SQUAD EVENTS',
  'RPM FEST',
  'Sábado 16 de Mayo · 10:00 · Circuito FK1',
  'EXPLORAR EVENTO',
  '#experiencias',
  'FINALIZADO',
  'RPM Fest no es solo una concentración de coches. Es un festival donde el rugido de los motores, la música en directo y el ambiente brutal se fusionan en un día inolvidable en el Circuito FK1.',
  'RPM Fest no es solo una concentración… es un festival del motor.'
)
on conflict (id) do nothing;

insert into public.event_activities (icon, title, description, tag, sort_order) values
  ('🎤', 'Escenario en Directo', 'Artistas en vivo durante toda la jornada. Música y actuaciones para que el festival no pare ni un momento.', 'MÚSICA', 0),
  ('🚗', 'Zona Expo', 'Coches preparados, deportivos, clásicos y proyectos exclusivos. Ideal para inspirarte, hacer fotos y conocer a otros apasionados.', 'EXPOSICIÓN', 1),
  ('🏆', 'Batalla de Clubs', 'Los clubs compiten por demostrar quién tiene el mejor proyecto, más estilo y presencia. Pasión por el motor en estado puro.', 'COMPETICIÓN', 2),
  ('🚀', 'Lanzadas', 'Potencia pura en acción. Aceleraciones que ponen los pelos de punta y máquinas sacando todo su potencial en pista.', 'VELOCIDAD', 3),
  ('🔥', 'Grip & Drift', 'Tandas de agarre y derrapes espectaculares. Humo, ruido, técnica y espectáculo asegurado para los fans del drifting.', 'DRIFT', 4),
  ('🎁', 'Shows & Sorpresas', 'Animación constante, exhibiciones y regalos para el público. Aquí siempre están pasando cosas.', 'SHOW', 5);

insert into public.event_schedule (time, title, description, sort_order) values
  ('10:00', 'Apertura de Puertas', 'Comienza la fiesta. Acceso al recinto, acreditaciones y primer contacto con la zona expo.', 0),
  ('11:00', 'Inicio Zona Expo', 'Apertura oficial de la exposición de coches. Primeros pases por la pista.', 1),
  ('12:00', 'Lanzadas — Sesión 1', 'Primeras aceleraciones en pista. Potencia pura en acción.', 2),
  ('14:00', 'Música en Directo', 'Actuaciones musicales. El escenario principal cobra vida.', 3),
  ('16:00', 'Batalla de Clubs', 'Los clubs compiten por el mejor proyecto y estilo. Ambiente competitivo.', 4),
  ('18:00', 'Grip & Drift', 'Tandas de derrapes espectaculares. Humo, ruido y espectáculo asegurado.', 5),
  ('20:00', 'Show de Clausura', 'Gran final con exhibiciones, sorpresas y el cierre por todo lo alto.', 6);

insert into public.event_stats (number, label, sort_order) values
  ('6+', 'Actividades', 0),
  ('10h', 'Duración', 1),
  ('700+', 'Asistencias', 2),
  ('∞', 'Adrenalina', 3);

insert into public.event_sponsors (name, subtitle, sort_order) values
  ('DIAMOND SQUAD', 'ORGANIZA', 0),
  ('FK1 CIRCUIT', 'SEDE', 1),
  ('RPM FEST', 'EVENTO', 2);
```

- [ ] **Step 2: Aplicar la migración al proyecto Supabase real.**

- [ ] **Step 3: Verificación manual** — `select * from event_config;` debe devolver 1 fila; `select count(*) from event_activities;` debe devolver 6; `select count(*) from event_schedule;` debe devolver 7; `select count(*) from event_stats;` debe devolver 4; `select count(*) from event_sponsors;` debe devolver 3.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0009_event_content_seed.sql
git commit -m "feat(db): seed event content tables from current data.json"
```

---

### Task 3: `app/api/evento/route.ts` — API pública del evento

**Files:**
- Create: `app/api/evento/route.ts`

- [ ] **Step 1: Escribir la ruta**

```ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  const admin = createAdminClient();

  const [configRes, activitiesRes, scheduleRes, statsRes, sponsorsRes] = await Promise.all([
    admin.from('event_config').select('*').eq('id', 1).single(),
    admin.from('event_activities').select('icon, title, description, tag').order('sort_order'),
    admin.from('event_schedule').select('time, title, description').order('sort_order'),
    admin.from('event_stats').select('number, label').order('sort_order'),
    admin.from('event_sponsors').select('name, subtitle').order('sort_order')
  ]);

  if (configRes.error) {
    console.error('evento: failed to load event_config', configRes.error);
    return NextResponse.json({ error: 'No se pudo cargar la configuración del evento.' }, { status: 500 });
  }
  if (activitiesRes.error || scheduleRes.error || statsRes.error || sponsorsRes.error) {
    console.error(
      'evento: failed to load event lists',
      activitiesRes.error,
      scheduleRes.error,
      statsRes.error,
      sponsorsRes.error
    );
    return NextResponse.json({ error: 'No se pudo cargar el contenido del evento.' }, { status: 500 });
  }

  const c = configRes.data;

  return NextResponse.json({
    config: {
      name: c.name,
      organizer: c.organizer,
      date: c.event_date,
      location: c.location,
      address: c.address,
      status: c.status,
      dressCode: c.dress_code,
      badge: c.badge,
      title: c.title,
      subtitle: c.subtitle,
      ctaText: c.cta_text,
      ctaLink: c.cta_link,
      ctaStatus: c.cta_status,
      descShort: c.desc_short,
      quote: c.quote
    },
    activities: activitiesRes.data ?? [],
    schedule: scheduleRes.data ?? [],
    stats: statsRes.data ?? [],
    sponsors: sponsorsRes.data ?? []
  });
}
```

Nota: los nombres de campo del JSON de salida (`date`, `dressCode`, `ctaText`, `ctaLink`, `ctaStatus`, `descShort`) son exactamente los que espera `public/js/data-loader.js` hoy — no cambian, solo la fuente de los datos.

- [ ] **Step 2: Verificación manual** — con el servidor local corriendo (`npm run dev`), `curl http://localhost:3000/api/evento` debe devolver un JSON con la misma forma que `public/data/data.json` (mismas claves `config`/`activities`/`schedule`/`stats`/`sponsors`).

- [ ] **Step 3: Commit**

```bash
git add app/api/evento/route.ts
git commit -m "feat: add public /api/evento route reading event content from Supabase"
```

---

### Task 4: `app/admin/evento/page.tsx` — panel de edición del evento

**Files:**
- Create: `app/admin/evento/page.tsx`

- [ ] **Step 1: Escribir la página**

```tsx
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
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="text-sm text-text-muted">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={row.values[f.key] ?? ''}
                      onChange={(e) => onChange(i, f.key, e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-border-subtle bg-bg-darkest p-2 text-white-warm"
                    />
                  ) : (
                    <input
                      value={row.values[f.key] ?? ''}
                      onChange={(e) => onChange(i, f.key, e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-bg-darkest p-2 text-white-warm"
                    />
                  )}
                </div>
              ))}
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

  async function saveList(table: string, rows: ListRow[], original: string[]) {
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
        const { error: insertError } = await supabase.from(table).insert(payload);
        if (insertError) throw insertError;
      }
    }
  }

  async function saveAll() {
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const { error: configError } = await supabase.from('event_config').update(configForm).eq('id', 1);
      if (configError) throw configError;

      await saveList('event_activities', activities, originalIds.activities);
      await saveList('event_schedule', schedule, originalIds.schedule);
      await saveList('event_stats', stats, originalIds.stats);
      await saveList('event_sponsors', sponsors, originalIds.sponsors);

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
        onRemove={(i) => removeRow(setActivities, i)}
      />

      <ListEditor
        title="Horario"
        rows={schedule}
        fields={SCHEDULE_FIELDS}
        onChange={(i, k, v) => updateRow(setSchedule, i, k, v)}
        onAdd={() => addRow(setSchedule, ['time', 'title', 'description'])}
        onRemove={(i) => removeRow(setSchedule, i)}
      />

      <ListEditor
        title="Estadísticas"
        rows={stats}
        fields={STAT_FIELDS}
        onChange={(i, k, v) => updateRow(setStats, i, k, v)}
        onAdd={() => addRow(setStats, ['number', 'label'])}
        onRemove={(i) => removeRow(setStats, i)}
      />

      <ListEditor
        title="Patrocinadores"
        rows={sponsors}
        fields={SPONSOR_FIELDS}
        onChange={(i, k, v) => updateRow(setSponsors, i, k, v)}
        onAdd={() => addRow(setSponsors, ['name', 'subtitle'])}
        onRemove={(i) => removeRow(setSponsors, i)}
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
```

- [ ] **Step 2: Verificación manual** — `npx tsc --noEmit` y `npm run build` sin errores. Como usuario admin, visitar `/admin/evento`: deben cargarse los 15 campos de configuración y las 4 listas con el contenido sembrado en la Tarea 2. Cambiar un campo (p. ej. `title`), añadir una fila nueva a "Patrocinadores", eliminar una fila de "Estadísticas", pulsar "GUARDAR CAMBIOS" → debe aparecer "Cambios guardados." y, al recargar la página, los cambios deben persistir.

- [ ] **Step 3: Commit**

```bash
git add app/admin/evento/page.tsx
git commit -m "feat: add /admin/evento page for editing event content"
```

---

### Task 5: `public/js/data-loader.js` — apuntar a `/api/evento`

**Files:**
- Modify: `public/js/data-loader.js:8`

- [ ] **Step 1: Cambiar la URL de fetch**

Cambiar:
```js
    const res = await fetch('data/data.json?_=' + Date.now());
```
por:
```js
    const res = await fetch('/api/evento?_=' + Date.now());
```

No se cambia nada más del archivo — el resto de la lógica de renderizado sigue igual, ya que `/api/evento` devuelve exactamente la misma forma de JSON.

- [ ] **Step 2: Verificación manual** — con `npm run dev`, visitar `/` y confirmar en las herramientas de red del navegador que se hace una petición a `/api/evento` (no a `/data/data.json`) y que el contenido de la portada (título, fecha, ubicación, actividades, horario, patrocinadores) se rellena igual que antes.

- [ ] **Step 3: Commit**

```bash
git add public/js/data-loader.js
git commit -m "feat: point data-loader.js at /api/evento instead of the static data.json file"
```

---

### Task 6: Borrar `public/data/data.json`

**Files:**
- Delete: `public/data/data.json`

- [ ] **Step 1: Confirmar que nada más lo referencia**

Run: `grep -rln "data/data.json" public/js public/*.html`
Expected: sin resultados (ya que la Tarea 5 cambió la única referencia).

- [ ] **Step 2: Borrar el archivo**

```bash
git rm public/data/data.json
```

- [ ] **Step 3: Verificación manual** — `npm run build` sin errores; visitar `/` sigue funcionando igual (los datos ya vienen de `/api/evento`).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove unused static data.json now that /api/evento serves this content"
```

---

### Task 7: Migración — tablas de ganadores + RLS

**Files:**
- Create: `supabase/migrations/0010_awards.sql`

- [ ] **Step 1: Escribir la migración**

```sql
create table public.award_editions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  sort_order integer not null default 0
);

create table public.award_categories (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.award_editions(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table public.award_winners (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.award_categories(id) on delete cascade,
  person_name text not null default '',
  car_name text not null default '',
  car_info text not null default '',
  image_url text,
  rank integer not null default 1
);

alter table public.award_editions enable row level security;
alter table public.award_categories enable row level security;
alter table public.award_winners enable row level security;

create policy "award_editions_public_read" on public.award_editions for select using (true);
create policy "award_editions_admin_write" on public.award_editions for insert with check (public.is_admin());
create policy "award_editions_admin_update" on public.award_editions for update using (public.is_admin()) with check (public.is_admin());
create policy "award_editions_admin_delete" on public.award_editions for delete using (public.is_admin());

create policy "award_categories_public_read" on public.award_categories for select using (true);
create policy "award_categories_admin_write" on public.award_categories for insert with check (public.is_admin());
create policy "award_categories_admin_update" on public.award_categories for update using (public.is_admin()) with check (public.is_admin());
create policy "award_categories_admin_delete" on public.award_categories for delete using (public.is_admin());

create policy "award_winners_public_read" on public.award_winners for select using (true);
create policy "award_winners_admin_write" on public.award_winners for insert with check (public.is_admin());
create policy "award_winners_admin_update" on public.award_winners for update using (public.is_admin()) with check (public.is_admin());
create policy "award_winners_admin_delete" on public.award_winners for delete using (public.is_admin());
```

- [ ] **Step 2: Aplicar la migración al proyecto Supabase real.**

- [ ] **Step 3: Verificación manual** — `list_tables` muestra las 3 tablas nuevas; `get_advisors` no reporta ninguna sin RLS.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0010_awards.sql
git commit -m "feat(db): add award editions/categories/winners tables"
```

---

### Task 8: Migración — bucket `winner-images`

**Files:**
- Create: `supabase/migrations/0011_winner_images_storage.sql`

- [ ] **Step 1: Escribir la migración**

```sql
insert into storage.buckets (id, name, public)
values ('winner-images', 'winner-images', true)
on conflict (id) do nothing;

create policy "winner_images_public_read" on storage.objects
  for select using (bucket_id = 'winner-images');

create policy "winner_images_admin_write" on storage.objects
  for insert with check (bucket_id = 'winner-images' and public.is_admin());
create policy "winner_images_admin_update" on storage.objects
  for update using (bucket_id = 'winner-images' and public.is_admin());
create policy "winner_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'winner-images' and public.is_admin());
```

- [ ] **Step 2: Aplicar la migración al proyecto Supabase real.**

- [ ] **Step 3: Verificación manual** — el bucket `winner-images` existe y es público (comprobar en el dashboard de Supabase o vía SQL `select * from storage.buckets where id = 'winner-images';`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0011_winner_images_storage.sql
git commit -m "feat(db): add winner-images storage bucket with admin-only write policies"
```

---

### Task 9: `app/api/admin/ganadores/imagen/route.ts` — subida de foto de ganador

**Files:**
- Create: `app/api/admin/ganadores/imagen/route.ts`

- [ ] **Step 1: Escribir la ruta** (calcada de `app/api/admin/productos/imagen/route.ts`, mismo bucket pattern con `winner-images`)

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen supera los 2 MB.' }, { status: 400 });
  }

  const extension = file.name.split('.').pop() ?? 'bin';
  const path = `${crypto.randomUUID()}.${extension}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('winner-images')
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl }
  } = admin.storage.from('winner-images').getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
```

- [ ] **Step 2: Verificación manual** — igual que la de `/api/admin/productos/imagen`: `curl -X POST` sin sesión → 401; con sesión no-admin → 403; admin con imagen >2MB → 400; admin con imagen válida → 200 con `url` públicamente accesible.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/ganadores/imagen/route.ts
git commit -m "feat: add admin winner image upload route"
```

---

### Task 10: `app/admin/ganadores/page.tsx` — panel de edición de ganadores

**Files:**
- Create: `app/admin/ganadores/page.tsx`

- [ ] **Step 1: Escribir la página**

```tsx
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
```

- [ ] **Step 2: Verificación manual** — `npx tsc --noEmit` y `npm run build` sin errores. Como admin, visitar `/admin/ganadores`: crear una edición ("RPM Fest 2025", año 2025), añadirle una categoría ("Mejor Drift"), rellenar el ganador (nombre, coche, info, foto) y pulsar "Guardar ganador" → debe persistir. Eliminar la categoría → el ganador debe desaparecer también (por el `on delete cascade`). Eliminar la edición → todo su contenido debe desaparecer.

- [ ] **Step 3: Commit**

```bash
git add app/admin/ganadores/page.tsx
git commit -m "feat: add /admin/ganadores page for managing award editions, categories, and winners"
```

---

### Task 11: `app/api/ganadores/route.ts` — API pública de ganadores

**Files:**
- Create: `app/api/ganadores/route.ts`

- [ ] **Step 1: Escribir la ruta**

```ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type WinnerRow = { category_id: string; person_name: string; car_name: string; car_info: string; image_url: string | null };
type CategoryOut = { id: string; name: string; winner: Omit<WinnerRow, 'category_id'> | null };

export async function GET() {
  const admin = createAdminClient();

  const [editionsRes, categoriesRes, winnersRes] = await Promise.all([
    admin.from('award_editions').select('id, name, year').order('year', { ascending: false }),
    admin.from('award_categories').select('id, edition_id, name').order('sort_order'),
    admin
      .from('award_winners')
      .select('category_id, person_name, car_name, car_info, image_url')
      .order('rank')
  ]);

  if (editionsRes.error || categoriesRes.error || winnersRes.error) {
    console.error('ganadores: failed to load data', editionsRes.error, categoriesRes.error, winnersRes.error);
    return NextResponse.json({ error: 'No se pudieron cargar los ganadores.' }, { status: 500 });
  }

  const winnersByCategory = new Map<string, Omit<WinnerRow, 'category_id'>>();
  for (const w of (winnersRes.data ?? []) as WinnerRow[]) {
    if (!winnersByCategory.has(w.category_id)) {
      winnersByCategory.set(w.category_id, {
        person_name: w.person_name,
        car_name: w.car_name,
        car_info: w.car_info,
        image_url: w.image_url
      });
    }
  }

  const categoriesByEdition = new Map<string, CategoryOut[]>();
  for (const cat of categoriesRes.data ?? []) {
    const list = categoriesByEdition.get(cat.edition_id) ?? [];
    list.push({ id: cat.id, name: cat.name, winner: winnersByCategory.get(cat.id) ?? null });
    categoriesByEdition.set(cat.edition_id, list);
  }

  const editions = (editionsRes.data ?? []).map((ed) => ({
    id: ed.id,
    name: ed.name,
    year: ed.year,
    categories: categoriesByEdition.get(ed.id) ?? []
  }));

  return NextResponse.json({ editions });
}
```

- [ ] **Step 2: Verificación manual** — con el servidor local corriendo, `curl http://localhost:3000/api/ganadores` debe devolver `{ "editions": [...] }` con la edición y categoría creadas en la Tarea 10, y el ganador rellenado.

- [ ] **Step 3: Commit**

```bash
git add app/api/ganadores/route.ts
git commit -m "feat: add public /api/ganadores route assembling editions, categories, and winners"
```

---

### Task 12: Enlaces de "Evento" y "Ganadores" en la navegación de `/admin`

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Añadir los dos enlaces nuevos**

Cambiar:
```tsx
        <nav className="flex gap-6 text-sm font-bold text-white-warm">
          <Link href="/admin/productos" className="hover:text-gold">
            Productos
          </Link>
          <Link href="/admin/pedidos" className="hover:text-gold">
            Pedidos
          </Link>
        </nav>
```
por:
```tsx
        <nav className="flex gap-6 text-sm font-bold text-white-warm">
          <Link href="/admin/productos" className="hover:text-gold">
            Productos
          </Link>
          <Link href="/admin/pedidos" className="hover:text-gold">
            Pedidos
          </Link>
          <Link href="/admin/evento" className="hover:text-gold">
            Evento
          </Link>
          <Link href="/admin/ganadores" className="hover:text-gold">
            Ganadores
          </Link>
        </nav>
```

- [ ] **Step 2: Verificación manual** — `npm run build` sin errores; como admin, la barra de navegación de `/admin/*` muestra los 4 enlaces y todos funcionan.

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: add Evento and Ganadores links to admin navigation"
```

---

### Task 13: `public/css/ganadores.css` — estilos de la página de ganadores

**Files:**
- Create: `public/css/ganadores.css`

- [ ] **Step 1: Escribir la hoja de estilos** (reutiliza las variables CSS ya definidas en `public/css/style.css`, que se carga siempre antes que este archivo)

```css
/* Ganadores page — extiende los estilos base de style.css */

.ganadores-content {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  margin-top: 2rem;
}

.ganadores-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 2rem 0;
}

.edition-block {
  border-top: 1px solid var(--border-subtle);
  padding-top: 2rem;
}

.edition-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  color: var(--gold);
  margin-bottom: 1.5rem;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}

.category-block {
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 1.25rem;
}

.category-name {
  color: var(--white-warm);
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.winner-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.winner-photo {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 8px;
}

.winner-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.winner-person {
  color: var(--white-warm);
  font-weight: 700;
}

.winner-car {
  color: var(--gold);
  font-size: 0.9rem;
}

.winner-car-info {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.ganadores-empty-category {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-style: italic;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/css/ganadores.css
git commit -m "feat: add stylesheet for the ganadores page"
```

---

### Task 14: `public/js/ganadores-loader.js` + `public/ganadores.html` — página pública

**Files:**
- Create: `public/js/ganadores-loader.js`
- Create: `public/ganadores.html`

- [ ] **Step 1: Escribir el loader**

```js
// ============================================
// RPM Fest — Ganadores Loader from /api/ganadores
// ============================================

(async function loadGanadores() {
  const container = document.getElementById('ganadores-content');
  if (!container) return;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  let data;
  try {
    const res = await fetch('/api/ganadores');
    if (!res.ok) throw new Error('Not found');
    data = await res.json();
  } catch {
    container.innerHTML = '<p class="ganadores-empty">No se pudieron cargar los ganadores.</p>';
    return;
  }

  const editions = data && Array.isArray(data.editions) ? data.editions : [];
  if (editions.length === 0) {
    container.innerHTML = '<p class="ganadores-empty">Todavía no hay ganadores publicados.</p>';
    return;
  }

  container.innerHTML = editions
    .map((edition) => {
      const categoriesHtml = (edition.categories || [])
        .map((cat) => {
          const w = cat.winner;
          const winnerHtml = w
            ? `
              <div class="winner-card">
                ${w.image_url ? `<img src="${w.image_url}" alt="${escapeHtml(w.car_name)}" class="winner-photo">` : ''}
                <div class="winner-info">
                  <p class="winner-person">${escapeHtml(w.person_name)}</p>
                  <p class="winner-car">${escapeHtml(w.car_name)}</p>
                  ${w.car_info ? `<p class="winner-car-info">${escapeHtml(w.car_info)}</p>` : ''}
                </div>
              </div>
            `
            : '<p class="ganadores-empty-category">Sin ganador todavía</p>';

          return `
            <div class="category-block">
              <h4 class="category-name">${escapeHtml(cat.name)}</h4>
              ${winnerHtml}
            </div>
          `;
        })
        .join('');

      return `
        <div class="edition-block">
          <h3 class="edition-name">${escapeHtml(edition.name)}</h3>
          <div class="category-grid">${categoriesHtml}</div>
        </div>
      `;
    })
    .join('');
})();
```

- [ ] **Step 2: Escribir la página HTML** (mismo esqueleto que `public/eventos.html`)

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RPM Fest — Ganadores</title>
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/ganadores.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Bebas+Neue&display=swap" rel="stylesheet">
</head>
<body>

  <nav class="navbar">
    <div class="nav-container">
      <a href="index.html" class="nav-logo">
        <img src="logo-rpmfest.png" alt="RPM Fest" class="nav-logo-img">
      </a>
      <button class="nav-toggle" aria-label="Menú">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links">
        <li><a href="index.html#evento">Evento</a></li>
        <li><a href="index.html#experiencias">Experiencias</a></li>
        <li><a href="index.html#horarios">Horarios</a></li>
        <li><a href="index.html#ubicacion">Ubicación</a></li>
        <li><a href="eventos.html">Próximos Eventos</a></li>
        <li><a href="ganadores.html" class="active">Ganadores</a></li>
      </ul>
    </div>
  </nav>

  <section class="section first-section">
    <div class="container">
      <div class="section-header">
        <span class="section-tag">PALMARÉS</span>
        <h2 class="section-title">Ganadores de <span class="gold">Ediciones Anteriores</span></h2>
      </div>
      <div id="ganadores-content" class="ganadores-content">
        <p class="ganadores-empty">Cargando…</p>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">
      <div class="footer-main">
        <div class="footer-brand">
          <div class="footer-logo">RPM<span class="gold">FEST</span></div>
          <p class="footer-desc">Un festival del motor como ningún otro. Organizado por Diamond Squad Events.</p>
        </div>
        <div class="footer-links-col">
          <h4>Legal</h4>
          <a href="https://web.fourvenues.com/es/legal/aviso-legal" target="_blank">Aviso Legal</a>
          <a href="https://web.fourvenues.com/es/legal/politica-de-cookies" target="_blank">Política de Cookies</a>
          <a href="https://web.fourvenues.com/es/legal/politica-de-privacidad" target="_blank">Política de Privacidad</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 Diamond Squad Events. Todos los derechos reservados.</p>
    </div>
  </footer>

  <script src="js/ganadores-loader.js"></script>
  <script>
    document.querySelector('.nav-toggle')?.addEventListener('click', () => {
      document.querySelector('.nav-links')?.classList.toggle('open');
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add public/js/ganadores-loader.js public/ganadores.html
git commit -m "feat: add public ganadores.html page and its data loader"
```

---

### Task 15: `next.config.js` — rewrite de `/ganadores`

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: Añadir el rewrite**

Cambiar:
```js
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/eventos', destination: '/eventos.html' }
    ];
  }
```
por:
```js
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/eventos', destination: '/eventos.html' },
      { source: '/ganadores', destination: '/ganadores.html' }
    ];
  }
```

- [ ] **Step 2: Verificación manual** — `npm run build && npm run start`, visitar `http://localhost:3000/ganadores` → debe renderizar la página de ganadores (no un 404 ni el archivo estático crudo).

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "feat: add /ganadores rewrite to next.config.js"
```

---

### Task 16: Enlace "Ganadores" en la navegación de `index.html` y `eventos.html`

**Files:**
- Modify: `public/index.html`
- Modify: `public/eventos.html`

- [ ] **Step 1: Añadir el enlace en `public/index.html`**

Cambiar:
```html
      <ul class="nav-links">
        <li><a href="#evento">Evento</a></li>
        <li><a href="#experiencias">Experiencias</a></li>
        <li><a href="#horarios">Horarios</a></li>
        <li><a href="#ubicacion">Ubicación</a></li>
        <li><a href="eventos.html">Próximos Eventos</a></li>
      </ul>
```
por:
```html
      <ul class="nav-links">
        <li><a href="#evento">Evento</a></li>
        <li><a href="#experiencias">Experiencias</a></li>
        <li><a href="#horarios">Horarios</a></li>
        <li><a href="#ubicacion">Ubicación</a></li>
        <li><a href="eventos.html">Próximos Eventos</a></li>
        <li><a href="ganadores.html">Ganadores</a></li>
      </ul>
```

- [ ] **Step 2: Añadir el enlace en `public/eventos.html`**

Cambiar:
```html
      <ul class="nav-links">
        <li><a href="index.html#evento">Evento</a></li>
        <li><a href="index.html#experiencias">Experiencias</a></li>
        <li><a href="index.html#horarios">Horarios</a></li>
        <li><a href="index.html#ubicacion">Ubicación</a></li>
        <li><a href="eventos.html" class="active">Próximos Eventos</a></li>
      </ul>
```
por:
```html
      <ul class="nav-links">
        <li><a href="index.html#evento">Evento</a></li>
        <li><a href="index.html#experiencias">Experiencias</a></li>
        <li><a href="index.html#horarios">Horarios</a></li>
        <li><a href="index.html#ubicacion">Ubicación</a></li>
        <li><a href="eventos.html" class="active">Próximos Eventos</a></li>
        <li><a href="ganadores.html">Ganadores</a></li>
      </ul>
```

- [ ] **Step 3: Verificación manual** — visitar `/` y `/eventos`, confirmar que el enlace "Ganadores" aparece en el menú y lleva a `/ganadores` (nota: como `data-loader.js` también inyecta un enlace "Tienda" dinámicamente en `/`, la barra de `/` tendrá 6 enlaces tras cargar el script — comprobar que no hay duplicados).

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/eventos.html
git commit -m "feat: add Ganadores link to main site navigation"
```

---

### Task 17: Verificación final

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Build y typecheck limpios**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores, todas las rutas nuevas (`/admin/evento`, `/admin/ganadores`, `/api/evento`, `/api/ganadores`, `/api/admin/ganadores/imagen`, `/ganadores`) aparecen en la salida del build.

- [ ] **Step 2: Prueba de RLS en vivo**

Con un usuario no-admin (o anónimo), confirmar que un intento de `insert`/`update`/`delete` en cualquiera de las 8 tablas nuevas (`event_config`, `event_activities`, `event_schedule`, `event_stats`, `event_sponsors`, `award_editions`, `award_categories`, `award_winners`) es rechazado por RLS, y que la lectura (`select`) funciona sin sesión.

- [ ] **Step 3: Recorrido manual completo**

Como admin: editar el evento desde `/admin/evento` y confirmar que `/` refleja el cambio sin recargar caché obsoleta. Crear una edición/categoría/ganador desde `/admin/ganadores` y confirmar que `/ganadores` lo muestra. Como visitante anónimo: confirmar que `/`, `/eventos` y `/ganadores` cargan correctamente y que `/admin/evento` y `/admin/ganadores` redirigen a `/login` sin sesión.

No hay commit para esta tarea — solo verificación.
