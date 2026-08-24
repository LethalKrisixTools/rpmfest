# Diseño: Panel de administración del evento y página de ganadores

## Contexto

La migración de la tienda a Next.js + Supabase (ver `docs/superpowers/specs/2026-08-22-tienda-cesta-checkout-design.md` y su plan de implementación) eliminó `panel.html` y el flujo de escritura a GitHub (`admin/app.js`), ya que ese panel gestionaba tanto el catálogo de la tienda (ahora reemplazado por `/admin/productos`) como el contenido general del evento (`public/data/data.json`, leído por `public/js/data-loader.js` para rellenar `/` y `/eventos`). Solo la parte de tienda fue reconstruida; la edición del contenido del evento quedó sin ninguna interfaz de administración.

Este documento diseña esa pieza que falta, y añade además una funcionalidad nueva: una página pública de "ganadores" con el palmarés de categorías de ediciones anteriores del festival, también editable desde el panel de administración.

## Objetivos

1. Recuperar la capacidad de editar el contenido de `/` y `/eventos` (fecha, ubicación, horario, actividades, estadísticas, patrocinadores) sin tocar código, mediante un panel `/admin/evento` consistente con el resto del sistema (Supabase + RLS, igual que `/admin/productos`).
2. Añadir una página pública `/ganadores` con el historial de categorías y ganadores de ediciones pasadas del festival, editable desde un nuevo panel `/admin/ganadores`.
3. No modificar el HTML/CSS/JS estático de `/` y `/eventos` más allá de cambiar la URL desde la que `data-loader.js` obtiene los datos — cero riesgo para la web pública actual.

## Fuera de alcance

- Reescribir `/` y `/eventos` como páginas Next.js (siguen siendo HTML estático).
- Múltiples fotos por ganador (solo una foto principal, ver sección de ganadores).
- Más de un ganador por categoría en la interfaz inicial (el modelo de datos lo permite para el futuro, ver más abajo).

## 1. Datos del evento

### Esquema

- **`event_config`** — tabla singleton (`id smallint primary key default 1 check (id = 1)`, una única fila) con columnas: `name`, `organizer`, `event_date`, `location`, `address`, `status`, `dress_code`, `badge`, `title`, `subtitle`, `cta_text`, `cta_link`, `cta_status`, `desc_short`, `quote` (todo `text`), `updated_at timestamptz`.
- **`event_activities`** — `id uuid pk`, `icon text`, `title text`, `description text`, `tag text`, `sort_order integer not null default 0`.
- **`event_schedule`** — `id uuid pk`, `time text`, `title text`, `description text`, `sort_order integer not null default 0`.
- **`event_stats`** — `id uuid pk`, `number text`, `label text`, `sort_order integer not null default 0`.
- **`event_sponsors`** — `id uuid pk`, `name text`, `subtitle text`, `sort_order integer not null default 0`.

Fechas y horas (`event_date`, `time`) se guardan como texto libre, igual que en `data.json` actualmente (p. ej. "Sábado 16 de Mayo · 10:00", "10:00") — no son fechas ISO parseables hoy, y forzar ese formato no aporta nada.

### RLS

Las 5 tablas: `select` público (para `anon` y `authenticated`, es contenido ya público hoy), `insert`/`update`/`delete` solo para `is_admin()` (mismo patrón que `products_admin_write` etc. en `supabase/migrations/0002_rls_policies.sql`).

### Semilla

Una migración inserta el contenido actual de `public/data/data.json` en estas 5 tablas (una fila en `event_config`, y las filas correspondientes en las 4 tablas de listas, con `sort_order` según el orden actual del JSON), para no perder contenido en el cambio.

## 2. Ganadores

### Esquema

- **`award_editions`** — `id uuid pk`, `name text` (p. ej. "RPM Fest 2025"), `year integer`, `sort_order integer not null default 0`.
- **`award_categories`** — `id uuid pk`, `edition_id uuid references award_editions(id) on delete cascade`, `name text`, `sort_order integer not null default 0`. Las categorías pertenecen a una edición concreta y pueden variar de una edición a otra (confirmado con el usuario).
- **`award_winners`** — `id uuid pk`, `category_id uuid references award_categories(id) on delete cascade`, `person_name text`, `car_name text`, `car_info text`, `image_url text` (nullable), `rank integer not null default 1`.

El campo `rank` existe desde el principio pensando en varios ganadores por categoría (2º, 3º puesto) como posible ampliación futura. **Actualización tras la implementación**: durante la revisión de código se detectó una condición de carrera real — sin restricción alguna sobre `category_id`, un reintento de guardado o dos ediciones concurrentes del mismo ganador podían crear dos filas "actuales" para la misma categoría, con el panel mostrando arbitrariamente una u otra. Para cerrar ese fallo se añadió `alter table public.award_winners add constraint award_winners_category_id_key unique (category_id);` (migración `0012_award_winners_unique_category.sql`), y `saveWinner` en `/admin/ganadores` pasó a usar `upsert(payload, { onConflict: 'category_id' })`.

Esto significa que, a día de hoy, **sí existe** una restricción `unique` sobre `category_id` — la promesa original de "ampliar a 2º/3º puesto sin ninguna migración adicional" ya no es exacta. Añadir varios ganadores por categoría en el futuro requerirá: (1) una migración que elimine o sustituya esta restricción unique (p. ej. por una sobre `(category_id, rank)`), y (2) cambios de código en `app/api/ganadores/route.ts` (`CategoryOut.winner` está tipado como un único objeto, no un array) y en la lógica de guardado de `/admin/ganadores/page.tsx`. Se consideró que la corrección de la condición de carrera era la prioridad correcta frente a mantener la extensibilidad especulativa intacta.

### Fotos

Un bucket de Storage nuevo, `winner-images` (mismo patrón que `product-images`: público de lectura, solo admin puede insertar/actualizar/eliminar, límite de 2 MB, mismos tipos permitidos `png/jpeg/svg+xml/webp`). Ruta nueva `app/api/admin/ganadores/imagen/route.ts`, calcada de `app/api/admin/productos/imagen/route.ts` (mismas comprobaciones de auth/rol/tipo/tamaño).

### RLS

Igual que en la sección anterior: lectura pública, escritura solo `is_admin()`.

## 3. Panel de administración

### `/admin/evento`

Página cliente (como `/admin/productos`): un formulario con los campos de `event_config` arriba, y debajo 4 bloques de lista (actividades, horario, estadísticas, patrocinadores). Cada bloque muestra sus filas actuales como inputs editables, con un botón "Añadir" (crea una fila vacía al final) y un botón "Eliminar" por fila. Un único botón "Guardar cambios" al final de la página persiste todo: `update` sobre `event_config`, y para cada lista, diff entre el estado cargado y el estado actual del formulario (`update` de filas existentes por `id`, `insert` de filas nuevas sin `id`, `delete` de filas quitadas por el usuario).

### `/admin/ganadores`

Página cliente con una lista de ediciones (crear/eliminar edición, con `name` y `year`). Al expandir una edición se muestran sus categorías (crear/eliminar categoría, con `name`), y cada categoría muestra su ganador (si existe) con campos `person_name`, `car_name`, `car_info` y subida/cambio de foto; si la categoría no tiene ganador aún, un formulario para crear el primero.

### Navegación

Se añaden enlaces "Evento" y "Ganadores" a la barra de navegación de `app/admin/layout.tsx`, junto a "Productos" y "Pedidos".

## 4. Rutas y página pública nuevas

### `/api/evento`

Route Handler `GET`, sin autenticación, público. Lee las 5 tablas del evento y devuelve un JSON con exactamente la misma forma que `data.json` hoy:

```json
{
  "config": { "name": "...", "organizer": "...", ... },
  "activities": [ { "icon": "...", "title": "...", "description": "...", "tag": "..." }, ... ],
  "schedule": [ { "time": "...", "title": "...", "description": "..." }, ... ],
  "stats": [ { "number": "...", "label": "..." }, ... ],
  "sponsors": [ { "name": "...", "subtitle": "..." }, ... ]
}
```

Ordenado por `sort_order` en cada lista. `export const dynamic = 'force-dynamic'` y `export const fetchCache = 'force-no-store'` (para evitar el mismo problema de caché de Next.js Data Cache detectado y corregido en `app/checkout/confirmacion/[pedido]/page.tsx` durante la migración de la tienda — sin esto, los cambios del panel no se reflejarían en la web pública hasta el siguiente build).

`public/js/data-loader.js` cambia la URL que usa para cargar los datos de `/data/data.json` a `/api/evento` — es la única modificación a ese archivo. `public/data/data.json` se borra (ya no lo lee nadie).

### `/api/ganadores`

Route Handler `GET`, sin autenticación, público. Lee las 3 tablas de ganadores y devuelve las ediciones ordenadas por `year` descendente (más reciente primero), cada una con sus categorías (ordenadas por `sort_order`) y el/los ganador(es) de cada categoría (ordenados por `rank`). Mismos `dynamic`/`fetchCache` que `/api/evento`.

### `/ganadores`

Página HTML estática nueva (mismo estilo visual que `index.html`/`eventos.html`: mismo `css/style.css`, misma estructura de navegación/footer), con un script cliente (nuevo, p. ej. `public/js/ganadores-loader.js`, siguiendo el mismo patrón que `data-loader.js`) que pide `/api/ganadores` y renderiza las ediciones con sus categorías y ganadores (foto, nombre, coche, info del coche).

Se añade un enlace "Ganadores" a la navegación principal de `index.html` y `eventos.html`, con el mismo mecanismo ya usado para el enlace "Tienda": `data-loader.js` lo inyecta dinámicamente en `.nav-links` si no existe ya (evita duplicar el cambio en dos archivos HTML estáticos y mantiene el patrón ya establecido).

## 5. Migración y despliegue

Todo este trabajo se hace en un nuevo worktree/rama (`feature/evento-ganadores-admin` o similar), siguiendo el mismo proceso que la migración de la tienda: implementación por tarea con revisión de spec-compliance y calidad de código, build/typecheck limpios, y verificación en vivo contra el proyecto Supabase real antes de fusionar a `main`.

## 6. Verificación

- `npx tsc --noEmit`, `npm run build` limpios.
- RLS probada en vivo: un usuario admin puede escribir en las 8 tablas nuevas; un usuario no-admin o anónimo no puede.
- Edición real desde `/admin/evento` y `/admin/ganadores`, confirmando que `/api/evento` y `/api/ganadores` reflejan el cambio inmediatamente (sin caché obsoleta) y que `/`, `/eventos` y `/ganadores` lo muestran correctamente.
- Subida de imagen de ganador probada en vivo (401 sin sesión, 403 no-admin, 400 tipo/tamaño inválido, 200 con URL pública accesible), igual que se hizo para `/api/admin/productos/imagen`.
- Confirmar que borrar `public/data/data.json` no rompe el build (`npm run build` sin errores de módulo faltante).
