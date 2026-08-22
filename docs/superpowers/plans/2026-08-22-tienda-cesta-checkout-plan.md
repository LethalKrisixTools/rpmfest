# Rediseño de Tienda, Cesta, Checkout y Cuentas — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `/tienda`, product pages, `/cesta`, checkout, customer accounts, and `/admin` from static HTML + GitHub-token-writes to a Next.js 14 App Router app backed by Supabase (Postgres/Auth/Storage/RLS), keeping Mollie as the payment gateway and leaving `index.html`/`eventos.html` untouched.

**Architecture:** The repo root becomes a Next.js app. `index.html` and `eventos.html` (plus their CSS/JS/data) move into `public/` and are served byte-for-byte via rewrites, so they keep working exactly as today. All new pages live under `app/` and use Tailwind CSS with a theme cloned from the current CSS custom properties. Supabase is the single source of truth for products, accounts, carts (logged-in only) and orders; all writes that affect money, stock, or other users' data happen in server-only Route Handlers using the `service_role` key, never in the browser. Mollie payment creation and webhook handling are ported from the existing `/api` functions, adapted to read/write Supabase instead of `data/store.json` and Mollie metadata.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js` + `@supabase/ssr`), Mollie REST API (`fetch`, no SDK — matches current code), Zod for server-side validation, Vitest for pure-logic unit tests, deployed on Vercel.

---

## File Structure

```
package.json, tsconfig.json, next.config.js, tailwind.config.ts, postcss.config.js, vitest.config.ts
middleware.ts                              — refreshes Supabase session cookies, guards /admin/*

app/
  layout.tsx                               — root layout, loads Inter font, global CSS
  globals.css                              — Tailwind directives + base styles
  tienda/
    page.tsx                               — product grid
    [slug]/page.tsx                        — product detail
  cesta/page.tsx                           — cart page
  checkout/
    page.tsx                               — 3-step wizard (client component)
    confirmacion/[pedido]/page.tsx         — post-payment confirmation
  pedido/page.tsx                          — guest order tracking
  login/page.tsx
  registro/page.tsx
  cuenta/page.tsx                          — profile, order history, GDPR export/delete
  privacidad/page.tsx
  terminos/page.tsx
  cookies/page.tsx
  admin/
    layout.tsx                             — session+role guard, admin nav
    productos/page.tsx                     — product CRUD
    pedidos/page.tsx                       — order list
  api/
    checkout/route.ts                      — atomic order creation + Mollie payment
    mollie-webhook/route.ts                — payment status sync + stock restore
    pedido/route.ts                        — guest order lookup (token or order_number+email)
    cuenta/export/route.ts                 — GDPR JSON export
    cuenta/eliminar/route.ts               — GDPR account deletion/anonymization
    admin/productos/imagen/route.ts        — admin image upload to Storage (server-validated role/type/size)

components/
  Navbar.tsx, Footer.tsx
  ProductCard.tsx, ProductGallery.tsx, QuantityPicker.tsx
  CartMergeDialog.tsx
  ConsentCheckbox.tsx

lib/
  supabase/client.ts                       — browser client (anon key)
  supabase/server.ts                       — server client (anon key + cookies, respects RLS)
  supabase/admin.ts                        — service_role client, server-only
  cart.ts                                  — guest cart localStorage read/write/merge helpers
  cart-sync.ts                             — logged-in cart_items read/write via browser client (RLS-protected, no server route needed)
  pricing.ts                               — server-side cart→line-items/total recomputation
  tracking-token.ts                        — HMAC sign/verify (ported from api/track-order.js)
  order-number.ts                          — RPM-YYYY-XXXXX generator
  money.ts                                 — cents <-> EUR formatting helpers
  types.ts                                 — shared TS types (Product, CartLine, Order, ...)

supabase/
  migrations/
    0001_core_tables.sql                  — profiles, products, cart_items, orders, order_items
    0002_rls_policies.sql                 — is_admin(), RLS enable + policies
    0003_order_functions.sql              — create_pending_order, restore_stock_for_order, anonymize_customer_data
    0004_storage.sql                      — product-images bucket + storage policies
  seed/migrate-store-json.ts              — one-time import of data/store.json into Supabase

public/
  index.html, eventos.html                — moved as-is
  css/, js/, assets/, data/, logo-rpmfest.png — moved as-is (referenced by the two static pages)

tests/
  pricing.test.ts
  cart-merge.test.ts
  tracking-token.test.ts
  order-number.test.ts
```

---

## Phase 0 — Bootstrap Next.js + Tailwind + static passthrough

### Task 1: Project scaffolding (package.json, TypeScript, Tailwind, Vitest configs)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "rpmfest",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "migrate:store": "tsx supabase/seed/migrate-store-json.ts"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.45.4",
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3",
    "vitest": "^2.0.3"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.js`** — serves `index.html`/`eventos.html` from `public/` unchanged

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/eventos', destination: '/eventos.html' }
    ];
  }
};

module.exports = nextConfig;
```

- [ ] **Step 4: Create `tailwind.config.ts`** — theme cloned from `css/style.css` custom properties

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-darkest': '#060201',
        'bg-dark': '#0e0d12',
        'bg-mid': '#1a090e',
        'red-dark': '#400a10',
        'red-deep': '#651b21',
        'red-brick': '#703939',
        'red-mid': '#942825',
        gold: '#f79f23',
        cream: '#e3d2b8',
        'white-warm': '#eeeeee',
        'text-muted': '#a17467',
        'border-subtle': '#21171e'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config;
```

- [ ] **Step 5: Create `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
```

- [ ] **Step 7: Create `.env.local.example`** (documents required env vars; real `.env.local` is gitignored)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MOLLIE_API_KEY=
ORDER_TRACK_SECRET=
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors. (`node_modules/` is already gitignored.)

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json next.config.js tailwind.config.ts postcss.config.js vitest.config.ts .env.local.example
git commit -m "chore: bootstrap Next.js + Tailwind + Vitest project scaffolding"
```

### Task 2: Move static site into `public/`, add root layout and global styles

**Files:**
- Move: `index.html` → `public/index.html`
- Move: `eventos.html` → `public/eventos.html`
- Move: `css/` → `public/css/`
- Move: `js/` → `public/js/`
- Move: `assets/` → `public/assets/`
- Move: `data/` → `public/data/`
- Move: `logo-rpmfest.png` → `public/logo-rpmfest.png`
- Create: `app/layout.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Move the static files/folders (preserving git history via `git mv`)**

```bash
mkdir -p public
git mv index.html public/index.html
git mv eventos.html public/eventos.html
git mv css public/css
git mv js public/js
git mv assets public/assets
git mv data public/data
git mv logo-rpmfest.png public/logo-rpmfest.png
```

- [ ] **Step 2: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #060201;
  color: #eeeeee;
}
```

- [ ] **Step 3: Create `app/layout.tsx`** — shared shell for every new Next.js page (not for the static `index.html`/`eventos.html`, which bypass this via rewrite)

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RPM Fest — Tienda',
  description: 'Tienda oficial de RPM Fest.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify static passthrough manually**

Run: `npm run dev`
Visit `http://localhost:3000/` → must render the original landing page exactly as before (same CSS/JS/images loading from `/css/*`, `/js/*`, `/assets/*`, `/data/*`).
Visit `http://localhost:3000/eventos` → must render the original events page.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: move static site into public/, add Next.js root layout"
```

### Task 3: Navbar and Footer components for new pages

**Files:**
- Create: `components/Navbar.tsx`
- Create: `components/Footer.tsx`

- [ ] **Step 1: Create `components/Navbar.tsx`** — visually replicates the current `.navbar` (same logo, links, colors) for the new Tailwind pages

```tsx
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
```

- [ ] **Step 2: Create `components/Footer.tsx`** — replicates the current `.footer` and adds links to the new legal pages

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add components/Navbar.tsx components/Footer.tsx
git commit -m "feat: add shared Navbar and Footer components for Next.js pages"
```

---

## Phase 1 — Supabase schema, RLS, order functions, storage

All migrations are applied to the existing connected Supabase project (`zykhabeftqddreitrnbc`) via the Supabase MCP `apply_migration` tool, one file at a time, then saved to `supabase/migrations/` in the repo so they're reproducible.

### Task 4: Core tables (`0001_core_tables.sql`)

**Files:**
- Create: `supabase/migrations/0001_core_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  default_address text,
  default_city text,
  default_postal_code text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  price_cents integer not null check (price_cents > 0),
  stock integer,
  category text,
  images text[] not null default '{}',
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty integer not null check (qty > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_postal_code text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled', 'expired')),
  mollie_payment_id text unique,
  privacy_consent_at timestamptz not null,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null,
  image text,
  qty integer not null check (qty > 0)
);

-- Auto-create a profile row whenever a new auth user signs up. Reads
-- full_name and terms_accepted_at from the signUp() metadata payload so the
-- consent timestamp is captured even if email confirmation delays the
-- client from having an active session to update its own profile with.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, terms_accepted_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Apply via Supabase MCP**

Call `apply_migration` with `name: "core_tables"` and the SQL above against project `zykhabeftqddreitrnbc`.
Expected: success, no errors.

- [ ] **Step 3: Verify**

Call `list_tables` (schema `public`) and confirm `profiles`, `products`, `cart_items`, `orders`, `order_items` exist.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_core_tables.sql
git commit -m "feat(db): add core tables (profiles, products, cart_items, orders, order_items)"
```

### Task 5: `is_admin()` helper and RLS policies (`0002_rls_policies.sql`)

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

- [ ] **Step 1: Write the migration**

```sql
-- SECURITY DEFINER avoids infinite recursion when a policy on `profiles`
-- would otherwise need to query `profiles` itself to check the role.
create function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- products
create policy "products_public_read_active" on public.products
  for select using (active = true or public.is_admin());
create policy "products_admin_write" on public.products
  for insert with check (public.is_admin());
create policy "products_admin_update" on public.products
  for update using (public.is_admin()) with check (public.is_admin());
create policy "products_admin_delete" on public.products
  for delete using (public.is_admin());

-- cart_items (owner only)
create policy "cart_items_owner_select" on public.cart_items
  for select using (user_id = auth.uid());
create policy "cart_items_owner_insert" on public.cart_items
  for insert with check (user_id = auth.uid());
create policy "cart_items_owner_update" on public.cart_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items_owner_delete" on public.cart_items
  for delete using (user_id = auth.uid());

-- orders / order_items — logged-in customers see only their own orders.
-- Guests never read orders via RLS (they go through /api/pedido, which uses
-- the service_role key). No client-side insert/update/delete policies exist:
-- all order writes happen through server routes using service_role, which
-- bypasses RLS entirely.
create policy "orders_owner_or_admin_select" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "order_items_owner_or_admin_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );
```

- [ ] **Step 2: Apply via Supabase MCP**

Call `apply_migration` with `name: "rls_policies"`.
Expected: success.

- [ ] **Step 3: Verify**

Call `get_advisors` with type `security` for the project. Expected: no "RLS disabled" warnings for `profiles`, `products`, `cart_items`, `orders`, `order_items`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "feat(db): add is_admin() helper and RLS policies for all tables"
```

### Task 6: Atomic order functions (`0003_order_functions.sql`)

**Files:**
- Create: `supabase/migrations/0003_order_functions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Recomputes prices/stock from `products` (never trusts client-sent amounts),
-- locks the affected product rows, decrements stock immediately (not on
-- payment confirmation, to avoid overselling during the pending window),
-- and creates the order + order_items atomically.
create function public.create_pending_order(
  p_order_number text,
  p_items jsonb, -- [{ "product_id": "uuid", "qty": 2 }, ...]
  p_customer_name text,
  p_customer_email text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_postal_code text,
  p_user_id uuid,
  p_privacy_consent_at timestamptz,
  p_clear_cart boolean
)
returns public.orders
language plpgsql
security definer set search_path = public
as $$
declare
  v_item record;
  v_product record;
  v_amount_cents integer := 0;
  v_order public.orders;
begin
  create temporary table _order_lines (
    product_id uuid, product_name text, unit_price_cents integer, image text, qty integer
  ) on commit drop;

  for v_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, qty integer)
  loop
    if v_item.qty is null or v_item.qty < 1 then
      raise exception 'INVALID_QTY';
    end if;

    select * into v_product from public.products
      where id = v_item.product_id and active = true
      for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if v_product.stock is not null and v_product.stock < v_item.qty then
      raise exception 'OUT_OF_STOCK: %', v_product.name;
    end if;

    if v_product.stock is not null then
      update public.products set stock = stock - v_item.qty, updated_at = now()
        where id = v_product.id;
    end if;

    v_amount_cents := v_amount_cents + (v_product.price_cents * v_item.qty);

    insert into _order_lines (product_id, product_name, unit_price_cents, image, qty)
    values (v_product.id, v_product.name, v_product.price_cents, v_product.images[1], v_item.qty);
  end loop;

  if v_amount_cents < 50 then
    raise exception 'AMOUNT_TOO_LOW';
  end if;

  insert into public.orders (
    order_number, user_id, customer_name, customer_email,
    shipping_address, shipping_city, shipping_postal_code,
    amount_cents, currency, status, privacy_consent_at
  ) values (
    p_order_number, p_user_id, p_customer_name, p_customer_email,
    p_shipping_address, p_shipping_city, p_shipping_postal_code,
    v_amount_cents, 'EUR', 'pending', p_privacy_consent_at
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, image, qty)
  select v_order.id, product_id, product_name, unit_price_cents, image, qty from _order_lines;

  if p_clear_cart and p_user_id is not null then
    delete from public.cart_items where user_id = p_user_id;
  end if;

  return v_order;
end;
$$;

-- Marks a pending order as paid. Idempotent: a second call is a no-op
-- because the WHERE clause only matches orders still in 'pending'.
create function public.mark_order_paid(p_order_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.orders set status = 'paid', paid_at = now()
    where id = p_order_id and status = 'pending';
$$;

-- Transitions a pending order to a terminal failure state and restores the
-- stock that was reserved at order-creation time. Idempotent: the UPDATE's
-- WHERE clause guarantees the stock restoration below only runs once, even
-- if the Mollie webhook fires more than once for the same payment.
create function public.restore_stock_for_order(p_order_id uuid, p_new_status text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_updated_id uuid;
begin
  if p_new_status not in ('failed', 'canceled', 'expired') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.orders set status = p_new_status
    where id = p_order_id and status = 'pending'
    returning id into v_updated_id;

  if v_updated_id is not null then
    update public.products p
      set stock = p.stock + oi.qty, updated_at = now()
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id = p.id and p.stock is not null;
  end if;
end;
$$;

-- GDPR erasure: anonymizes personal fields on an order but keeps the
-- accounting-relevant fields (amount, date, order_number) as required by
-- Spanish tax/commercial retention law.
create function public.anonymize_order(p_order_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.orders set
    customer_name = 'Cliente eliminado',
    customer_email = 'eliminado+' || id || '@rpmfest.invalid',
    shipping_address = '—',
    shipping_city = '—',
    shipping_postal_code = '—',
    anonymized_at = now()
  where id = p_order_id and anonymized_at is null;
$$;

-- GDPR erasure for a full account: anonymizes every order placed by the
-- user and the profile itself. The caller is still responsible for deleting
-- the auth.users row via the Supabase Auth admin API.
create function public.anonymize_customer_data(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_order_id uuid;
begin
  for v_order_id in select id from public.orders where user_id = p_user_id
  loop
    perform public.anonymize_order(v_order_id);
  end loop;

  update public.profiles set
    full_name = 'Cliente eliminado',
    phone = null,
    default_address = null,
    default_city = null,
    default_postal_code = null
  where id = p_user_id;
end;
$$;

revoke execute on function public.create_pending_order from public, authenticated, anon;
revoke execute on function public.mark_order_paid from public, authenticated, anon;
revoke execute on function public.restore_stock_for_order from public, authenticated, anon;
revoke execute on function public.anonymize_order from public, authenticated, anon;
revoke execute on function public.anonymize_customer_data from public, authenticated, anon;
grant execute on function public.create_pending_order to service_role;
grant execute on function public.mark_order_paid to service_role;
grant execute on function public.restore_stock_for_order to service_role;
grant execute on function public.anonymize_order to service_role;
grant execute on function public.anonymize_customer_data to service_role;
```

- [ ] **Step 2: Apply via Supabase MCP**

Call `apply_migration` with `name: "order_functions"`.
Expected: success.

- [ ] **Step 3: Manual verification query** (via `execute_sql`, using the service role context)

```sql
insert into public.products (slug, name, price_cents, stock, active)
values ('test-product', 'Test Product', 1000, 2, true);

select public.create_pending_order(
  'RPM-TEST-00001',
  jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where slug = 'test-product'), 'qty', 2)),
  'Test User', 'test@example.com', 'Calle Falsa 123', 'Madrid', '28080',
  null, now(), false
);

-- stock must now be 0
select stock from public.products where slug = 'test-product';

-- a second qty=1 purchase must now raise OUT_OF_STOCK
select public.create_pending_order(
  'RPM-TEST-00002',
  jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where slug = 'test-product'), 'qty', 1)),
  'Test User', 'test@example.com', 'Calle Falsa 123', 'Madrid', '28080',
  null, now(), false
);

delete from public.products where slug = 'test-product';
```

Expected: first call succeeds and stock becomes `0`; second call raises `OUT_OF_STOCK: Test Product`; cleanup delete succeeds (cascades to the test order via FK).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_order_functions.sql
git commit -m "feat(db): add atomic order creation, payment status, and GDPR erasure functions"
```

### Task 7: Storage bucket for product images (`0004_storage.sql`)

**Files:**
- Create: `supabase/migrations/0004_storage.sql`

- [ ] **Step 1: Write the migration**

```sql
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_admin_write" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());
```

- [ ] **Step 2: Apply via Supabase MCP**

Call `apply_migration` with `name: "storage_bucket"`.
Expected: success.

- [ ] **Step 3: Verify**

Call `execute_sql` with `select id, public from storage.buckets where id = 'product-images';`
Expected: one row, `public = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_storage.sql
git commit -m "feat(db): add product-images storage bucket with admin-only write policies"
```

---

## Phase 2 — Supabase client wiring and middleware

### Task 8: Browser, server, and admin Supabase clients

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Create `lib/types.ts`** — shared types used across pages/routes

```ts
export type Product = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  price_cents: number;
  stock: number | null;
  category: string | null;
  images: string[];
  active: boolean;
  featured: boolean;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  default_address: string | null;
  default_city: string | null;
  default_postal_code: string | null;
  role: 'customer' | 'admin';
  terms_accepted_at: string | null;
};

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'expired';

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  amount_cents: number;
  currency: string;
  status: OrderStatus;
  mollie_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  image: string | null;
  qty: number;
};

export type CartLine = { productId: string; qty: number };
```

- [ ] **Step 2: Create `lib/supabase/client.ts`** — browser client, uses the public anon key, safe to ship to the client because RLS controls access

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Create `lib/supabase/server.ts`** — server client bound to the request's cookies, still uses the anon key and respects RLS (used for read-your-own-data operations like `/cuenta`)

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no request context to write to;
            // middleware already refreshes the session cookie on every request.
          }
        }
      }
    }
  );
}
```

- [ ] **Step 4: Create `lib/supabase/admin.ts`** — service-role client, **server-only**, bypasses RLS entirely. Only ever imported from Route Handlers, never from a Client Component.

```ts
import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

- [ ] **Step 5: Add the `server-only` package** (guards against accidentally bundling the admin client into client-side code)

Edit `package.json` dependencies to add: `"server-only": "^0.0.1"`.
Run: `npm install`

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/supabase/client.ts lib/supabase/server.ts lib/supabase/admin.ts package.json package-lock.json
git commit -m "feat: add Supabase browser, server, and admin client factories"
```

### Task 9: Middleware — session refresh and `/admin` guard

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write the middleware**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?next=/admin', request.url));
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/cuenta/:path*', '/checkout/:path*']
};
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`
Visit `http://localhost:3000/admin/productos` while logged out → expect redirect to `/login?next=/admin`.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for session refresh and /admin role guard"
```

---

## Phase 3 — Data migration script (`data/store.json` → Supabase)

### Task 10: One-time product migration script

**Files:**
- Create: `supabase/seed/migrate-store-json.ts`
- Modify: `package.json` (add `dotenv` devDependency, already added `migrate:store` script in Task 1)

- [ ] **Step 1: Add `dotenv` devDependency**

Edit `package.json` `devDependencies` to add: `"dotenv": "^16.4.5"`.
Run: `npm install`

- [ ] **Step 2: Write `supabase/seed/migrate-store-json.ts`**

```ts
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type LegacyProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  shortDescription?: string;
  description?: string;
  images: string[];
  active: boolean;
  featured: boolean;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function uploadImage(localPath: string, productId: string): Promise<string | null> {
  const absolutePath = join(process.cwd(), 'public', localPath);
  const bytes = readFileSync(absolutePath);
  const ext = extname(localPath) || '.svg';
  const storagePath = `${productId}${ext}`;
  const contentType = ext === '.svg' ? 'image/svg+xml' : 'image/png';

  const { error } = await supabase.storage
    .from('product-images')
    .upload(storagePath, bytes, { contentType, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('product-images').getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  const raw = readFileSync(join(process.cwd(), 'public', 'data', 'store.json'), 'utf8');
  const { products } = JSON.parse(raw) as { products: LegacyProduct[] };

  for (const legacy of products) {
    const images: string[] = [];
    for (const img of legacy.images) {
      const url = await uploadImage(img, legacy.id);
      if (url) images.push(url);
    }

    const { error } = await supabase.from('products').upsert(
      {
        slug: legacy.id,
        name: legacy.name,
        short_description: legacy.shortDescription ?? null,
        description: legacy.description ?? null,
        price_cents: Math.round(legacy.price * 100),
        stock: legacy.stock ?? null,
        category: legacy.category ?? null,
        images,
        active: legacy.active !== false,
        featured: legacy.featured === true
      },
      { onConflict: 'slug' }
    );

    if (error) {
      console.error(`Failed to migrate ${legacy.id}:`, error.message);
    } else {
      console.log(`Migrated ${legacy.id} -> slug "${legacy.id}"`);
    }
  }
}

main().then(() => process.exit(0));
```

- [ ] **Step 3: Run the migration**

Run: `npm run migrate:store`
Expected: one "Migrated ..." log line per product in `public/data/store.json`, no errors.

- [ ] **Step 4: Verify in Supabase**

Call `execute_sql` with `select slug, name, price_cents, stock, images from public.products order by created_at;`
Expected: 6 rows matching the products from `data/store.json` (rpm-shirt-2026, rpm-hoodie-2026, rpm-cap-2026, rpm-sticker-pack, rpm-poster-2026, rpm-tshirt-limited), each with a non-empty `images` array pointing at a `product-images` Storage URL.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed/migrate-store-json.ts package.json package-lock.json
git commit -m "feat: add one-time script to migrate data/store.json into Supabase"
```

---

## Phase 4 — Store and product pages

### Task 11: Money helper and guest cart (localStorage) helpers

**Files:**
- Create: `lib/money.ts`
- Create: `lib/cart.ts`
- Test: `tests/cart-merge.test.ts`

- [ ] **Step 1: Create `lib/money.ts`**

```ts
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
```

- [ ] **Step 2: Write the failing test for `mergeCartLines`**

```ts
// tests/cart-merge.test.ts
import { describe, expect, it } from 'vitest';
import { mergeCartLines } from '../lib/cart';

describe('mergeCartLines', () => {
  it('sums quantities for products present in both carts', () => {
    const existing = [{ productId: 'a', qty: 1 }];
    const incoming = [{ productId: 'a', qty: 2 }, { productId: 'b', qty: 3 }];
    expect(mergeCartLines(existing, incoming)).toEqual([
      { productId: 'a', qty: 3 },
      { productId: 'b', qty: 3 }
    ]);
  });

  it('returns the existing cart unchanged when incoming is empty', () => {
    const existing = [{ productId: 'a', qty: 1 }];
    expect(mergeCartLines(existing, [])).toEqual(existing);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- cart-merge`
Expected: FAIL — `lib/cart.ts` doesn't exist yet / `mergeCartLines` is not exported.

- [ ] **Step 4: Create `lib/cart.ts`**

```ts
import type { CartLine } from './types';

const CART_KEY = 'rpmfest_guest_cart';

export function getGuestCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function setGuestCart(lines: CartLine[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

export function clearGuestCart(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CART_KEY);
}

export function addToGuestCart(productId: string, qty = 1): CartLine[] {
  const lines = getGuestCart();
  const existing = lines.find((l) => l.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    lines.push({ productId, qty });
  }
  setGuestCart(lines);
  return lines;
}

export function updateGuestCartQty(productId: string, qty: number): CartLine[] {
  let lines = getGuestCart();
  if (qty <= 0) {
    lines = lines.filter((l) => l.productId !== productId);
  } else {
    const existing = lines.find((l) => l.productId === productId);
    if (existing) existing.qty = qty;
  }
  setGuestCart(lines);
  return lines;
}

export function guestCartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

/**
 * Merges a guest's localStorage cart into an existing account cart, summing
 * quantities for products present in both. Only ever called after the
 * customer explicitly confirms the merge dialog — never automatically.
 */
export function mergeCartLines(existing: CartLine[], incoming: CartLine[]): CartLine[] {
  const map = new Map(existing.map((l) => [l.productId, l.qty]));
  for (const line of incoming) {
    map.set(line.productId, (map.get(line.productId) ?? 0) + line.qty);
  }
  return Array.from(map, ([productId, qty]) => ({ productId, qty }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- cart-merge`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/money.ts lib/cart.ts tests/cart-merge.test.ts
git commit -m "feat: add money formatting and guest cart localStorage helpers"
```

### Task 12: Product grid (`/tienda`)

**Files:**
- Create: `components/ProductCard.tsx`
- Create: `app/tienda/page.tsx`

- [ ] **Step 1: Create `components/ProductCard.tsx`** — matches approved mockup A: clickable image/name, stacked buttons (COMPRAR YA gold over + AÑADIR AL CARRITO outline)

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addToGuestCart } from '@/lib/cart';
import { formatCents } from '@/lib/money';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const soldOut = product.stock !== null && product.stock <= 0;
  const image = product.images[0] ?? '/assets/product-placeholder.svg';

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-dark">
      <Link href={`/tienda/${product.slug}`} className="relative block aspect-square bg-bg-mid">
        <Image src={image} alt={product.name} fill className="object-cover" />
        {product.featured && (
          <span className="absolute left-2 top-2 rounded bg-gold px-2 py-1 text-xs font-bold text-bg-darkest">
            DESTACADO
          </span>
        )}
        {soldOut && (
          <span className="absolute right-2 top-2 rounded bg-red-mid px-2 py-1 text-xs font-bold text-white-warm">
            AGOTADO
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/tienda/${product.slug}`} className="font-bold text-white-warm">
          {product.name}
        </Link>
        <p className="text-sm text-text-muted">{product.short_description}</p>
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={soldOut}
            onClick={() => router.push(`/checkout?product=${product.id}&qty=1`)}
            className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
          >
            COMPRAR YA
          </button>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => addToGuestCart(product.id, 1)}
            className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold text-white-warm disabled:opacity-40"
          >
            + AÑADIR AL CARRITO
          </button>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Create `app/tienda/page.tsx`** — server component, reads public products with the anon-key server client (RLS allows public read of `active = true`)

```tsx
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
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, visit `http://localhost:3000/tienda`.
Expected: the 6 migrated products render in a responsive grid with images, DESTACADO badges on featured products, and the two stacked buttons.

- [ ] **Step 4: Commit**

```bash
git add components/ProductCard.tsx app/tienda/page.tsx
git commit -m "feat: add /tienda product grid page"
```

### Task 13: Product detail page (`/tienda/[slug]`)

**Files:**
- Create: `components/ProductGallery.tsx`
- Create: `components/QuantityPicker.tsx`
- Create: `app/tienda/[slug]/page.tsx`

- [ ] **Step 1: Create `components/QuantityPicker.tsx`**

```tsx
'use client';

import { useState } from 'react';

export function QuantityPicker({
  max,
  onChange
}: {
  max: number | null;
  onChange: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);

  function update(next: number) {
    const clamped = Math.max(1, max ? Math.min(next, max) : next);
    setQty(clamped);
    onChange(clamped);
  }

  return (
    <div className="my-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => update(qty - 1)}
        className="h-8 w-8 rounded-full border border-border-subtle text-white-warm"
      >
        −
      </button>
      <span className="w-6 text-center text-white-warm">{qty}</span>
      <button
        type="button"
        onClick={() => update(qty + 1)}
        className="h-8 w-8 rounded-full border border-border-subtle text-white-warm"
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/ProductGallery.tsx`**

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(images[0] ?? '/assets/product-placeholder.svg');

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-bg-mid">
        <Image src={active} alt={alt} fill className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2">
          {images.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(src)}
              className="relative h-14 w-14 overflow-hidden rounded-md border border-border-subtle"
            >
              <Image src={src} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `app/tienda/[slug]/page.tsx`** — matches approved mockup A: gallery left, info right, stacked buttons

```tsx
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
```

- [ ] **Step 4: Create `components/ProductActions.tsx`** — client component holding the quantity picker + buttons (kept separate from the server-rendered detail page)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { addToGuestCart } from '@/lib/cart';
import { QuantityPicker } from './QuantityPicker';
import type { Product } from '@/lib/types';

export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const soldOut = product.stock !== null && product.stock <= 0;

  return (
    <div>
      <QuantityPicker max={product.stock} onChange={setQty} />
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={soldOut}
          onClick={() => router.push(`/checkout?product=${product.id}&qty=${qty}`)}
          className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
        >
          COMPRAR YA
        </button>
        <button
          type="button"
          disabled={soldOut}
          onClick={() => addToGuestCart(product.id, qty)}
          className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold text-white-warm disabled:opacity-40"
        >
          AÑADIR AL CARRITO
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Manual verification**

Visit `http://localhost:3000/tienda/rpm-shirt-2026`.
Expected: gallery on the left, product info + quantity picker + stacked buttons on the right; clicking "AÑADIR AL CARRITO" then checking `localStorage.rpmfest_guest_cart` in devtools shows the product added.

- [ ] **Step 6: Commit**

```bash
git add components/ProductGallery.tsx components/QuantityPicker.tsx components/ProductActions.tsx "app/tienda/[slug]/page.tsx"
git commit -m "feat: add /tienda/[slug] product detail page"
```

---

## Phase 5 — Cart behavior and `/cesta` page

Logged-in cart reads/writes go straight from the browser to `cart_items` through the anon-key client — RLS (`user_id = auth.uid()`) already guarantees a customer can only touch their own rows, so no server route is needed here (unlike checkout, where prices/stock must never be trusted from the browser).

### Task 14: Logged-in cart sync helpers (`lib/cart-sync.ts`)

**Files:**
- Create: `lib/cart-sync.ts`

- [ ] **Step 1: Write `lib/cart-sync.ts`**

```ts
import { createClient } from './supabase/client';
import type { CartLine } from './types';

export async function fetchAccountCart(): Promise<CartLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('cart_items').select('product_id, qty');
  if (error) throw error;
  return (data ?? []).map((row) => ({ productId: row.product_id, qty: row.qty }));
}

export async function upsertAccountCartLine(productId: string, qty: number): Promise<void> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  if (qty <= 0) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('product_id', productId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('cart_items')
    .upsert({ user_id: user.id, product_id: productId, qty }, { onConflict: 'user_id,product_id' });
  if (error) throw error;
}

export async function replaceAccountCart(lines: CartLine[]): Promise<void> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  await supabase.from('cart_items').delete().eq('user_id', user.id);
  if (lines.length === 0) return;

  const rows = lines.map((l) => ({ user_id: user.id, product_id: l.productId, qty: l.qty }));
  const { error } = await supabase.from('cart_items').insert(rows);
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/cart-sync.ts
git commit -m "feat: add RLS-backed cart_items read/write helpers for logged-in customers"
```

### Task 15: Guest→account cart merge dialog

**Files:**
- Create: `components/CartMergeDialog.tsx`

- [ ] **Step 1: Write `components/CartMergeDialog.tsx`** — shown right after a successful login/signup when a guest cart is present in `localStorage`; never merges silently

```tsx
'use client';

import { useState } from 'react';
import { clearGuestCart, getGuestCart, mergeCartLines } from '@/lib/cart';
import { fetchAccountCart, replaceAccountCart } from '@/lib/cart-sync';

export function CartMergeDialog({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const guestLines = getGuestCart();

  if (guestLines.length === 0) return null;

  async function handleChoice(shouldMerge: boolean) {
    setBusy(true);
    try {
      if (shouldMerge) {
        const accountLines = await fetchAccountCart();
        await replaceAccountCart(mergeCartLines(accountLines, guestLines));
      }
      clearGuestCart();
    } finally {
      setBusy(false);
      onDone();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-sm rounded-xl border border-border-subtle bg-bg-dark p-6 text-center">
        <p className="text-white-warm">
          Tenías productos en tu cesta de invitado. ¿Quieres añadirlos a tu cesta guardada?
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleChoice(true)}
            className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
          >
            Sí, añadir
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleChoice(false)}
            className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold text-white-warm disabled:opacity-40"
          >
            No, descartar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/CartMergeDialog.tsx
git commit -m "feat: add explicit guest-to-account cart merge confirmation dialog"
```

*(`CartMergeDialog` is wired into `/login` and `/registro` in Phase 6, right after a successful sign-in.)*

### Task 16: `/cesta` page

**Files:**
- Create: `components/CartLineRow.tsx`
- Create: `app/cesta/page.tsx`

- [ ] **Step 1: Create `components/CartLineRow.tsx`**

```tsx
'use client';

import Image from 'next/image';
import { formatCents } from '@/lib/money';
import type { Product } from '@/lib/types';

export function CartLineRow({
  product,
  qty,
  onChangeQty,
  onRemove
}: {
  product: Product;
  qty: number;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[64px_1fr_auto_auto] items-center gap-4 border-b border-border-subtle py-4">
      <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-bg-mid">
        <Image src={product.images[0] ?? '/assets/product-placeholder.svg'} alt={product.name} fill className="object-cover" />
      </div>
      <div>
        <div className="font-bold text-white-warm">{product.name}</div>
        <div className="text-sm text-text-muted">{formatCents(product.price_cents)} / ud.</div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChangeQty(qty - 1)} className="h-7 w-7 rounded-full border border-border-subtle text-white-warm">
          −
        </button>
        <span className="text-white-warm">{qty}</span>
        <button type="button" onClick={() => onChangeQty(qty + 1)} className="h-7 w-7 rounded-full border border-border-subtle text-white-warm">
          +
        </button>
      </div>
      <button type="button" onClick={onRemove} className="text-xs text-text-muted underline">
        Quitar
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/cesta/page.tsx`** — matches approved mockup A: two columns, sticky summary on the right

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartLineRow } from '@/components/CartLineRow';
import { formatCents } from '@/lib/money';
import { createClient } from '@/lib/supabase/client';
import { getGuestCart, updateGuestCartQty } from '@/lib/cart';
import { fetchAccountCart, upsertAccountCartLine } from '@/lib/cart-sync';
import type { CartLine, Product } from '@/lib/types';

export default function CestaPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    setLoggedIn(!!user);

    const cartLines = user ? await fetchAccountCart() : getGuestCart();
    setLines(cartLines);

    if (cartLines.length > 0) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .in('id', cartLines.map((l) => l.productId))
        .returns<Product[]>();
      setProducts(Object.fromEntries((data ?? []).map((p) => [p.id, p])));
    } else {
      setProducts({});
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function changeQty(productId: string, qty: number) {
    if (loggedIn) {
      await upsertAccountCartLine(productId, qty);
    } else {
      updateGuestCartQty(productId, qty);
    }
    load();
  }

  const total = lines.reduce((sum, l) => {
    const product = products[l.productId];
    return product ? sum + product.price_cents * l.qty : sum;
  }, 0);

  if (loading) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1.6fr_1fr]">
        <div>
          <h1 className="mb-4 text-2xl font-black text-white-warm">Tu cesta</h1>
          {lines.length === 0 && <p className="text-text-muted">Tu cesta está vacía.</p>}
          {lines.map((line) => {
            const product = products[line.productId];
            if (!product) return null;
            return (
              <CartLineRow
                key={line.productId}
                product={product}
                qty={line.qty}
                onChangeQty={(qty) => changeQty(line.productId, qty)}
                onRemove={() => changeQty(line.productId, 0)}
              />
            );
          })}
        </div>
        <div className="h-fit rounded-xl border border-border-subtle bg-bg-dark p-5 md:sticky md:top-20">
          <div className="text-xs font-bold tracking-widest text-text-muted">RESUMEN</div>
          <div className="mt-3 flex justify-between text-xl font-black text-white-warm">
            <span>Total</span>
            <span>{formatCents(total)}</span>
          </div>
          <button
            type="button"
            disabled={lines.length === 0}
            onClick={() => router.push('/checkout')}
            className="mt-4 w-full rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
          >
            CONTINUAR A LA COMPRA
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Manual verification**

Add a product from `/tienda` as a guest, visit `/cesta` → item appears with correct price/total; changing quantity with +/- updates the total; "Quitar" removes the line; "CONTINUAR A LA COMPRA" navigates to `/checkout`.

- [ ] **Step 4: Commit**

```bash
git add components/CartLineRow.tsx app/cesta/page.tsx
git commit -m "feat: add /cesta page with guest and account cart support"
```

---

## Phase 6 — Auth pages (`/login`, `/registro`)

### Task 17: Consent checkbox component

**Files:**
- Create: `components/ConsentCheckbox.tsx`

- [ ] **Step 1: Write `components/ConsentCheckbox.tsx`** — mandatory, non-pre-ticked, used on `/registro` and in checkout step 2 for guests (GDPR/LOPDGDD art. 5.2 evidence of consent)

```tsx
'use client';

import Link from 'next/link';

export function ConsentCheckbox({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-1"
      />
      <span>
        He leído y acepto la{' '}
        <Link href="/privacidad" target="_blank" className="text-gold underline">
          Política de Privacidad
        </Link>
        .
      </span>
    </label>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ConsentCheckbox.tsx
git commit -m "feat: add mandatory non-pre-ticked privacy consent checkbox component"
```

### Task 18: `/login` page with cart merge prompt

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Write `app/login/page.tsx`**

```tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartMergeDialog } from '@/components/CartMergeDialog';
import { createClient } from '@/lib/supabase/client';
import { getGuestCart } from '@/lib/cart';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/tienda';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showMerge, setShowMerge] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('Email o contraseña incorrectos.');
      return;
    }
    if (getGuestCart().length > 0) {
      setShowMerge(true);
    } else {
      router.push(next);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          {error && <p className="text-sm text-red-mid">{error}</p>}
          <button type="submit" className="mt-2 rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
            ENTRAR
          </button>
        </form>
        <p className="mt-4 text-sm text-text-muted">
          ¿No tienes cuenta? <Link href="/registro" className="text-gold">Crear cuenta</Link>
        </p>
      </main>
      <Footer />
      {showMerge && <CartMergeDialog onDone={() => router.push(next)} />}
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

Add a guest-cart item, then log in with an existing account → the merge dialog appears before redirecting; choosing "No, descartar" clears the guest cart and redirects without touching the account cart; choosing "Sí, añadir" merges quantities into `cart_items`.

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: add /login page with explicit guest cart merge prompt"
```

### Task 19: `/registro` page

**Files:**
- Create: `app/registro/page.tsx`

- [ ] **Step 1: Write `app/registro/page.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { CartMergeDialog } from '@/components/CartMergeDialog';
import { createClient } from '@/lib/supabase/client';
import { getGuestCart } from '@/lib/cart';

export default function RegistroPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [showMerge, setShowMerge] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Debes aceptar la Política de Privacidad para continuar.');
      return;
    }
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, terms_accepted_at: new Date().toISOString() }
      }
    });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (getGuestCart().length > 0) {
      setShowMerge(true);
    } else {
      router.push('/tienda');
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Crear cuenta</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required
            placeholder="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <ConsentCheckbox checked={consent} onChange={setConsent} />
          {error && <p className="text-sm text-red-mid">{error}</p>}
          <button type="submit" className="mt-2 rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
            CREAR CUENTA
          </button>
        </form>
      </main>
      <Footer />
      {showMerge && <CartMergeDialog onDone={() => router.push('/tienda')} />}
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

Try submitting without checking the consent box → blocked with an inline error. Submit with a valid email/password and consent checked → account is created; query `select terms_accepted_at from public.profiles order by created_at desc limit 1;` via `execute_sql` and confirm it is populated (not null).

- [ ] **Step 3: Commit**

```bash
git add app/registro/page.tsx
git commit -m "feat: add /registro page with mandatory consent checkbox"
```

---

## Phase 7 — Checkout wizard, `/api/checkout`, Mollie webhook, confirmation

### Task 20: Order number generator, tracking token, and client-side pricing helper

**Files:**
- Create: `lib/order-number.ts`
- Create: `lib/pricing.ts`
- Create: `lib/tracking-token.ts`
- Test: `tests/order-number.test.ts`
- Test: `tests/pricing.test.ts`
- Test: `tests/tracking-token.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/order-number.test.ts
import { describe, expect, it } from 'vitest';
import { generateOrderNumber } from '../lib/order-number';

describe('generateOrderNumber', () => {
  it('matches the RPM-YYYY-XXXXX format', () => {
    const year = new Date().getFullYear();
    expect(generateOrderNumber()).toMatch(new RegExp(`^RPM-${year}-[A-Z0-9]{5}$`));
  });

  it('generates different values on repeated calls', () => {
    const values = new Set(Array.from({ length: 20 }, () => generateOrderNumber()));
    expect(values.size).toBeGreaterThan(1);
  });
});
```

```ts
// tests/pricing.test.ts
import { describe, expect, it } from 'vitest';
import { computeCartTotalCents } from '../lib/pricing';
import type { Product } from '../lib/types';

const product = (id: string, price_cents: number): Product => ({
  id,
  slug: id,
  name: id,
  short_description: null,
  description: null,
  price_cents,
  stock: null,
  category: null,
  images: [],
  active: true,
  featured: false
});

describe('computeCartTotalCents', () => {
  it('sums price_cents * qty for each line', () => {
    const products = { a: product('a', 1000), b: product('b', 500) };
    const lines = [{ productId: 'a', qty: 2 }, { productId: 'b', qty: 3 }];
    expect(computeCartTotalCents(lines, products)).toBe(1000 * 2 + 500 * 3);
  });

  it('ignores lines whose product is missing from the map', () => {
    const products = { a: product('a', 1000) };
    const lines = [{ productId: 'a', qty: 1 }, { productId: 'missing', qty: 5 }];
    expect(computeCartTotalCents(lines, products)).toBe(1000);
  });
});
```

```ts
// tests/tracking-token.test.ts
import { beforeAll, describe, expect, it } from 'vitest';
import { createTrackingToken, verifyTrackingToken } from '../lib/tracking-token';

beforeAll(() => {
  process.env.ORDER_TRACK_SECRET = 'test-secret';
});

describe('tracking token', () => {
  it('round-trips the order id through sign and verify', () => {
    const token = createTrackingToken('order-123');
    expect(verifyTrackingToken(token)).toEqual({ orderId: 'order-123' });
  });

  it('rejects a tampered token', () => {
    const token = createTrackingToken('order-123');
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifyTrackingToken(tampered)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(verifyTrackingToken('not-a-token')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- order-number pricing tracking-token`
Expected: FAIL — `lib/order-number.ts`, `lib/pricing.ts`, and `lib/tracking-token.ts` don't exist yet.

- [ ] **Step 3: Create `lib/order-number.ts`**

```ts
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, '0');
  return `RPM-${year}-${random}`;
}
```

- [ ] **Step 4: Create `lib/pricing.ts`** — client-side estimate only, shown in the checkout review step; the real, trusted total is always recomputed server-side inside `create_pending_order`

```ts
import type { CartLine, Product } from './types';

export function computeCartTotalCents(lines: CartLine[], products: Record<string, Product>): number {
  return lines.reduce((sum, line) => {
    const product = products[line.productId];
    return product ? sum + product.price_cents * line.qty : sum;
  }, 0);
}
```

- [ ] **Step 5: Create `lib/tracking-token.ts`** — ported from `api/track-order.js`'s HMAC scheme, now signing the Supabase `orders.id` instead of a Mollie payment id

```ts
import crypto from 'node:crypto';

export function createTrackingToken(orderId: string): string {
  const secret = process.env.ORDER_TRACK_SECRET;
  if (!secret) throw new Error('Falta configurar ORDER_TRACK_SECRET.');
  const payload = Buffer.from(JSON.stringify({ o: orderId, t: Date.now() }), 'utf8').toString(
    'base64url'
  );
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyTrackingToken(token: string): { orderId: string } | null {
  const secret = process.env.ORDER_TRACK_SECRET;
  if (!secret || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.o || !data?.t) return null;
    if (Date.now() - Number(data.t) > 1000 * 60 * 60 * 24 * 365 * 2) return null;
    return { orderId: data.o };
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- order-number pricing tracking-token`
Expected: PASS (7 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/order-number.ts lib/pricing.ts lib/tracking-token.ts tests/order-number.test.ts tests/pricing.test.ts tests/tracking-token.test.ts
git commit -m "feat: add order number generator, tracking token signer, and pricing helper"
```

### Task 21: `/api/checkout` route — atomic order creation + Mollie payment

**Files:**
- Create: `app/api/checkout/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generateOrderNumber } from '@/lib/order-number';
import { createTrackingToken } from '@/lib/tracking-token';

const checkoutSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(99) }))
    .min(1),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    address: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1)
  }),
  guestConsent: z.boolean().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de pedido inválidos.' }, { status: 400 });
  }
  const { items, customer, guestConsent } = parsed.data;

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && !guestConsent) {
    return NextResponse.json(
      { error: 'Debes aceptar la Política de Privacidad para continuar.' },
      { status: 400 }
    );
  }
  if (!process.env.MOLLIE_API_KEY) {
    return NextResponse.json({ error: 'Falta configurar MOLLIE_API_KEY.' }, { status: 500 });
  }

  const admin = createAdminClient();
  const privacyConsentAt = new Date().toISOString();

  let order: { id: string; order_number: string; amount_cents: number; currency: string } | null = null;
  let lastErrorMessage = '';

  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const { data, error } = await admin.rpc('create_pending_order', {
      p_order_number: generateOrderNumber(),
      p_items: items.map((i) => ({ product_id: i.productId, qty: i.qty })),
      p_customer_name: customer.name,
      p_customer_email: customer.email,
      p_shipping_address: customer.address,
      p_shipping_city: customer.city,
      p_shipping_postal_code: customer.postalCode,
      p_user_id: user?.id ?? null,
      p_privacy_consent_at: privacyConsentAt,
      p_clear_cart: !!user
    });

    if (error) {
      lastErrorMessage = error.message;
      if (error.code === '23505') continue; // order_number collision — retry with a new one
      break;
    }
    order = data;
  }

  if (!order) {
    if (lastErrorMessage.startsWith('OUT_OF_STOCK')) {
      return NextResponse.json({ error: 'No hay stock suficiente de uno de los productos.' }, { status: 400 });
    }
    if (lastErrorMessage.startsWith('PRODUCT_NOT_FOUND')) {
      return NextResponse.json({ error: 'Uno de los productos ya no está disponible.' }, { status: 400 });
    }
    if (lastErrorMessage.startsWith('AMOUNT_TOO_LOW')) {
      return NextResponse.json({ error: 'El importe mínimo de pago es 0,50 €.' }, { status: 400 });
    }
    console.error('checkout: create_pending_order failed', lastErrorMessage);
    return NextResponse.json({ error: 'No se pudo crear el pedido.' }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const amount = (order.amount_cents / 100).toFixed(2);

  const paymentResponse = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: { currency: order.currency, value: amount },
      description: `RPM Fest · Pedido ${order.order_number}`,
      redirectUrl: `${origin}/checkout/confirmacion/${order.order_number}`,
      webhookUrl: `${origin}/api/mollie-webhook`,
      metadata: { orderId: order.id, orderNumber: order.order_number }
    })
  });
  const payment = await paymentResponse.json();

  if (!paymentResponse.ok) {
    await admin.rpc('restore_stock_for_order', { p_order_id: order.id, p_new_status: 'failed' });
    return NextResponse.json({ error: payment?.detail || 'No se pudo crear el pago.' }, { status: 502 });
  }

  await admin.from('orders').update({ mollie_payment_id: payment.id }).eq('id', order.id);

  const trackingToken = createTrackingToken(order.id);

  return NextResponse.json({
    checkoutUrl: payment._links?.checkout?.href,
    orderNumber: order.order_number,
    trackingToken,
    trackingUrl: `${origin}/pedido?token=${encodeURIComponent(trackingToken)}`
  });
}
```

- [ ] **Step 2: Manual verification** (using Mollie test-mode API key)

`curl -X POST http://localhost:3000/api/checkout -H "Content-Type: application/json" -d '{"items":[{"productId":"<a real product id>","qty":1}],"customer":{"name":"Test","email":"test@example.com","address":"Calle Falsa 123","city":"Madrid","postalCode":"28080"},"guestConsent":true}'`
Expected: `200` with a `checkoutUrl` pointing at `https://www.mollie.com/...` and an `orderNumber` like `RPM-2026-XXXXX`. Query `select status, amount_cents, mollie_payment_id from public.orders order by created_at desc limit 1;` → `status = 'pending'`, `mollie_payment_id` populated.
Repeating with `guestConsent` omitted → `400` "Debes aceptar...".
Repeating with a `qty` larger than the product's stock → `400` "No hay stock suficiente...".

- [ ] **Step 3: Commit**

```bash
git add app/api/checkout/route.ts
git commit -m "feat: add /api/checkout route with atomic order creation and Mollie payment"
```

### Task 22: `/api/mollie-webhook` route

**Files:**
- Create: `app/api/mollie-webhook/route.ts`

- [ ] **Step 1: Write the route** — ported from `api/mollie-webhook.js`, now updating Supabase instead of committing to GitHub; stock was already reserved at order-creation time, so `paid` only flips status, while `failed`/`canceled`/`expired` restore stock

```ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  if (!process.env.MOLLIE_API_KEY) {
    return NextResponse.json({ error: 'Falta configurar MOLLIE_API_KEY.' }, { status: 500 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  const rawBody = await request.text();
  const paymentId = contentType.includes('application/json')
    ? JSON.parse(rawBody || '{}')?.id
    : new URLSearchParams(rawBody).get('id');

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment id' }, { status: 400 });
  }

  const paymentResponse = await fetch(
    `https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `Bearer ${process.env.MOLLIE_API_KEY}` } }
  );
  const payment = await paymentResponse.json();
  if (!paymentResponse.ok) {
    return NextResponse.json({ error: payment?.detail || 'No se pudo consultar el pago.' }, { status: 502 });
  }

  const orderId = payment.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json({ ok: true, noOrder: true });
  }

  const admin = createAdminClient();

  if (payment.status === 'paid') {
    await admin.rpc('mark_order_paid', { p_order_id: orderId });
  } else if (['failed', 'canceled', 'expired'].includes(payment.status)) {
    await admin.rpc('restore_stock_for_order', { p_order_id: orderId, p_new_status: payment.status });
  }
  // Other statuses (open, pending, authorized) require no action yet.

  return NextResponse.json({ ok: true, status: payment.status });
}
```

- [ ] **Step 2: Manual verification**

In Mollie's test dashboard, complete a test payment created in Task 21's verification step, then call `curl -X POST http://localhost:3000/api/mollie-webhook -d "id=<payment id>"`.
Expected: `200 {"ok":true,"status":"paid"}`; `select status, paid_at from public.orders where id = '<order id>';` shows `status = 'paid'` and `paid_at` populated.
Repeat the same curl call a second time (simulating Mollie's at-least-once delivery) → still `200`, `paid_at` unchanged (idempotent, `mark_order_paid`'s `WHERE status = 'pending'` no longer matches).

- [ ] **Step 3: Commit**

```bash
git add app/api/mollie-webhook/route.ts
git commit -m "feat: add Mollie webhook route syncing order status and restoring stock"
```

### Task 23: Checkout wizard page (`/checkout`)

**Files:**
- Create: `app/checkout/page.tsx`

- [ ] **Step 1: Write `app/checkout/page.tsx`** — matches approved mockup C (3-step wizard). Handles both the normal cart flow and the "Comprar ya" bypass (`?product=<id>&qty=<n>`), and auto-skips step 1 when a session already exists.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { formatCents } from '@/lib/money';
import { computeCartTotalCents } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/client';
import { getGuestCart } from '@/lib/cart';
import { fetchAccountCart } from '@/lib/cart-sync';
import type { CartLine, Product } from '@/lib/types';

type Customer = { name: string; email: string; address: string; city: string; postalCode: string };

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountMode, setAccountMode] = useState<'guest' | 'account' | null>(null);
  const [items, setItems] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    email: '',
    address: '',
    city: '',
    postalCode: ''
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const buyNowProductId = searchParams.get('product');
      const buyNowQty = Number(searchParams.get('qty') ?? '1');

      const lines: CartLine[] = buyNowProductId
        ? [{ productId: buyNowProductId, qty: buyNowQty }]
        : user
          ? await fetchAccountCart()
          : getGuestCart();
      setItems(lines);

      if (lines.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .in('id', lines.map((l) => l.productId))
          .returns<Product[]>();
        setProducts(Object.fromEntries((data ?? []).map((p) => [p.id, p])));
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, default_address, default_city, default_postal_code')
          .eq('id', user.id)
          .single();
        setCustomer({
          name: profile?.full_name ?? '',
          email: user.email ?? '',
          address: profile?.default_address ?? '',
          city: profile?.default_city ?? '',
          postalCode: profile?.default_postal_code ?? ''
        });
        setAccountMode('account');
        setStep(2);
      }
      setReady(true);
    }
    load();
  }, [searchParams]);

  const total = computeCartTotalCents(items, products);

  async function submitPayment() {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customer,
          guestConsent: accountMode === 'guest' ? consent : undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo procesar el pago.');
      if (data.trackingUrl) {
        window.localStorage.setItem('rpmfest_last_tracking_url', data.trackingUrl);
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-5 py-10">
        <p className="mb-6 text-xs font-bold tracking-widest text-text-muted">
          PASO {step} DE 3
        </p>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <h1 className="text-xl font-black text-white-warm">¿Cómo quieres comprar?</h1>
            <button
              type="button"
              onClick={() => {
                setAccountMode('guest');
                setStep(2);
              }}
              className="rounded-md border border-border-subtle px-4 py-4 text-sm font-bold text-white-warm"
            >
              Continuar como invitado
            </button>
            <button
              type="button"
              onClick={() => router.push('/login?next=/checkout')}
              className="rounded-md border border-gold bg-bg-mid px-4 py-4 text-sm font-bold text-gold"
            >
              Iniciar sesión / Crear cuenta
            </button>
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (accountMode === 'guest' && !consent) {
                setError('Debes aceptar la Política de Privacidad para continuar.');
                return;
              }
              setError('');
              setStep(3);
            }}
            className="flex flex-col gap-3"
          >
            <h1 className="text-xl font-black text-white-warm">Datos de envío</h1>
            <input
              required
              placeholder="Nombre completo"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            <input
              required
              placeholder="Dirección"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            <input
              required
              placeholder="Ciudad"
              value={customer.city}
              onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            <input
              required
              placeholder="Código postal"
              value={customer.postalCode}
              onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
              className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
            />
            {accountMode === 'guest' && <ConsentCheckbox checked={consent} onChange={setConsent} />}
            {error && <p className="text-sm text-red-mid">{error}</p>}
            <button type="submit" className="mt-2 rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
              CONTINUAR
            </button>
          </form>
        )}

        {step === 3 && (
          <div>
            <h1 className="mb-4 text-xl font-black text-white-warm">Revisar y pagar</h1>
            {items.map((line) => {
              const product = products[line.productId];
              if (!product) return null;
              return (
                <div key={line.productId} className="flex justify-between py-1 text-sm text-cream">
                  <span>{product.name} ×{line.qty}</span>
                  <span>{formatCents(product.price_cents * line.qty)}</span>
                </div>
              );
            })}
            <div className="mt-3 flex justify-between border-t border-border-subtle pt-3 text-lg font-black text-white-warm">
              <span>Total</span>
              <span>{formatCents(total)}</span>
            </div>
            {error && <p className="mt-3 text-sm text-red-mid">{error}</p>}
            <button
              type="button"
              disabled={submitting}
              onClick={submitPayment}
              className="mt-4 w-full rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest disabled:opacity-40"
            >
              {submitting ? 'PROCESANDO…' : 'PAGAR AHORA'}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

From `/cesta`, click "CONTINUAR A LA COMPRA" as a guest → step 1 shown → "Continuar como invitado" → step 2 form (consent checkbox visible) → submitting without checking consent shows the inline error → check it, continue → step 3 shows correct line items and total → "PAGAR AHORA" redirects to a Mollie test checkout page.
From a product detail page, click "COMPRAR YA" → wizard opens directly with that single product/qty, bypassing the cart.
While logged in, opening `/checkout` → step 1 is skipped, step 2 is pre-filled from the profile's saved address.

- [ ] **Step 3: Commit**

```bash
git add app/checkout/page.tsx
git commit -m "feat: add 3-step checkout wizard with guest/account, shipping, and review steps"
```

### Task 24: Order confirmation page

**Files:**
- Create: `app/checkout/confirmacion/[pedido]/page.tsx`

- [ ] **Step 1: Write the confirmation page** — reads the order by `order_number`; guests can reach this page directly from the Mollie redirect, so it must not require a session (RLS on `orders` blocks anonymous `select`, so this reads through the service-role admin client, exposing only the minimal fields needed for the receipt)

```tsx
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCents } from '@/lib/money';

export default async function ConfirmacionPage({ params }: { params: { pedido: string } }) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('order_number, status, amount_cents, customer_name')
    .eq('order_number', params.pedido)
    .single();

  if (!order) notFound();

  const statusMessage: Record<string, string> = {
    pending: 'Estamos confirmando tu pago…',
    paid: '¡Pago confirmado! Gracias por tu compra.',
    failed: 'El pago no se ha podido completar.',
    canceled: 'El pago fue cancelado.',
    expired: 'El enlace de pago ha caducado.'
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="text-2xl font-black text-white-warm">Pedido {order.order_number}</h1>
        <p className="mt-3 text-text-muted">{statusMessage[order.status] ?? order.status}</p>
        <p className="mt-1 text-white-warm">Total: {formatCents(order.amount_cents)}</p>
        <p className="mt-6 text-sm text-text-muted">
          Guarda este número de pedido para consultarlo en{' '}
          <a href="/pedido" className="text-gold underline">/pedido</a>.
        </p>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

Complete Task 21/22's test payment flow end to end and confirm `/checkout/confirmacion/RPM-2026-XXXXX` shows "¡Pago confirmado!" after the webhook has processed the `paid` status.

- [ ] **Step 3: Commit**

```bash
git add "app/checkout/confirmacion/[pedido]/page.tsx"
git commit -m "feat: add post-payment order confirmation page"
```

---

## Phase 8 — Guest order tracking (`/pedido`)

### Task 25: `/api/pedido` lookup route

**Files:**
- Create: `app/api/pedido/route.ts`

- [ ] **Step 1: Write the route** — ported from `api/track-order.js`, now querying Supabase directly instead of the Mollie API

```ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTrackingToken } from '@/lib/tracking-token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const orderNumber = searchParams.get('order');
  const email = searchParams.get('email')?.toLowerCase();

  const admin = createAdminClient();
  let query = admin
    .from('orders')
    .select('id, order_number, status, amount_cents, customer_name, created_at, paid_at');

  if (token) {
    const verified = verifyTrackingToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Enlace de seguimiento inválido.' }, { status: 400 });
    }
    query = query.eq('id', verified.orderId);
  } else if (orderNumber && email) {
    query = query.eq('order_number', orderNumber).eq('customer_email', email);
  } else {
    return NextResponse.json(
      { error: 'Necesitas el enlace de seguimiento o el número de pedido y email.' },
      { status: 400 }
    );
  }

  const { data: order } = await query.single();
  if (!order) return NextResponse.json({ error: 'No se encontró el pedido.' }, { status: 404 });

  const { data: items } = await admin
    .from('order_items')
    .select('product_name, unit_price_cents, image, qty')
    .eq('order_id', order.id);

  return NextResponse.json({
    orderNumber: order.order_number,
    status: order.status,
    amount: order.amount_cents,
    customerName: order.customer_name,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    items: items ?? []
  });
}
```

- [ ] **Step 2: Manual verification**

`curl "http://localhost:3000/api/pedido?order=RPM-2026-XXXXX&email=test@example.com"` (using an order from earlier verification) → `200` with the order summary and items.
`curl "http://localhost:3000/api/pedido?order=RPM-2026-XXXXX&email=wrong@example.com"` → `404`.
`curl "http://localhost:3000/api/pedido?token=<trackingToken from Task 21's response>"` → `200` with the same order.

- [ ] **Step 3: Commit**

```bash
git add app/api/pedido/route.ts
git commit -m "feat: add /api/pedido guest order lookup route"
```

### Task 26: `/pedido` page

**Files:**
- Create: `app/pedido/page.tsx`

- [ ] **Step 1: Write the page** — reads `?token=` from the URL automatically (arriving via a shared tracking link), otherwise shows the order-number + email form; also offers a shortcut to the last tracking link saved to `localStorage` right before the Mollie redirect

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { formatCents } from '@/lib/money';

type OrderSummary = {
  orderNumber: string;
  status: string;
  amount: number;
  customerName: string;
  items: { product_name: string; unit_price_cents: number; qty: number }[];
};

export default function PedidoPage() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState('');
  const [lastTrackingUrl, setLastTrackingUrl] = useState<string | null>(null);

  async function lookup(query: string) {
    setError('');
    setOrder(null);
    const response = await fetch(`/api/pedido?${query}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'No se encontró el pedido.');
      return;
    }
    setOrder(data);
  }

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) lookup(`token=${encodeURIComponent(token)}`);
    setLastTrackingUrl(window.localStorage.getItem('rpmfest_last_tracking_url'));
  }, [searchParams]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-5 py-16">
        <h1 className="text-2xl font-black text-white-warm">Seguir mi pedido</h1>

        {lastTrackingUrl && !order && (
          <a href={lastTrackingUrl} className="mt-2 block text-sm text-gold underline">
            Ver mi último pedido
          </a>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(`order=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
          }}
          className="mt-6 flex flex-col gap-3"
        >
          <input
            required
            placeholder="Número de pedido (RPM-2026-XXXXX)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            required
            type="email"
            placeholder="Email usado en la compra"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <button type="submit" className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
            BUSCAR PEDIDO
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-mid">{error}</p>}

        {order && (
          <div className="mt-6 rounded-xl border border-border-subtle bg-bg-dark p-5">
            <h2 className="font-bold text-white-warm">Pedido {order.orderNumber}</h2>
            <p className="text-sm text-text-muted">Estado: {order.status}</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between py-1 text-sm text-cream">
                <span>{item.product_name} ×{item.qty}</span>
                <span>{formatCents(item.unit_price_cents * item.qty)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border-subtle pt-2 font-bold text-white-warm">
              <span>Total</span>
              <span>{formatCents(order.amount)}</span>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

Visit `/pedido?token=<a valid trackingToken>` → order summary loads automatically.
Visit `/pedido` and submit a valid order number + email → summary appears; wrong email → inline error shown.

- [ ] **Step 3: Commit**

```bash
git add app/pedido/page.tsx
git commit -m "feat: add /pedido guest order tracking page"
```

---

## Phase 9 — `/cuenta`: profile, order history, GDPR export/delete

Profile edits and order-history reads happen directly from the browser via the anon-key client — RLS (`profiles_update_own`, `orders_owner_or_admin_select`) already restricts them to the signed-in user's own rows. Only the JSON export and account deletion need server routes, because deletion also has to remove the `auth.users` row via the admin API.

### Task 27: `/api/cuenta/export` route (GDPR portability)

**Files:**
- Create: `app/api/cuenta/export/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: orders } = await supabase.from('orders').select('*').eq('user_id', user.id);
  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: orderItems } = orderIds.length
    ? await supabase.from('order_items').select('*').in('order_id', orderIds)
    : { data: [] };

  const payload = { profile, orders, orderItems, exportedAt: new Date().toISOString() };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="rpmfest-mis-datos.json"'
    }
  });
}
```

- [ ] **Step 2: Manual verification**

While logged in, visit `http://localhost:3000/api/cuenta/export` → browser downloads `rpmfest-mis-datos.json` containing the profile, orders, and order items for that account. While logged out → `401`.

- [ ] **Step 3: Commit**

```bash
git add app/api/cuenta/export/route.ts
git commit -m "feat: add GDPR JSON data export route for /cuenta"
```

### Task 28: `/api/cuenta/eliminar` route (GDPR erasure)

**Files:**
- Create: `app/api/cuenta/eliminar/route.ts`

- [ ] **Step 1: Write the route** — anonymizes orders/profile (accounting data is retained per Spanish tax law, see spec §13) then deletes the `auth.users` row

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const admin = createAdminClient();
  const { error: anonymizeError } = await admin.rpc('anonymize_customer_data', {
    p_user_id: user.id
  });
  if (anonymizeError) {
    console.error('anonymize_customer_data failed', anonymizeError);
    return NextResponse.json({ error: 'No se pudo eliminar la cuenta.' }, { status: 500 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('auth deleteUser failed', deleteError);
    return NextResponse.json({ error: 'No se pudo eliminar la cuenta.' }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Manual verification**

Create a throwaway test account, place a test order with it, then call the route while logged in as that user. Confirm via `execute_sql`: `select customer_name, anonymized_at from public.orders where user_id = '<id>';` shows `customer_name = 'Cliente eliminado'` and `anonymized_at` populated; `select * from auth.users where id = '<id>';` returns no rows.

- [ ] **Step 3: Commit**

```bash
git add app/api/cuenta/eliminar/route.ts
git commit -m "feat: add GDPR account erasure route (anonymize orders, delete auth user)"
```

### Task 29: `/cuenta` page

**Files:**
- Create: `app/cuenta/page.tsx`

- [ ] **Step 1: Write the page** — profile form (direct RLS-protected writes), order history (direct RLS-protected reads), and the two GDPR action buttons

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { formatCents } from '@/lib/money';
import { createClient } from '@/lib/supabase/client';
import type { Order, Profile } from '@/lib/types';

export default function CuentaPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/cuenta');
        return;
      }
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<Profile>();
      setProfile(profileRow);

      const { data: orderRows } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<Order[]>();
      setOrders(orderRows ?? []);
    }
    load();
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        default_address: profile.default_address,
        default_city: profile.default_city,
        default_postal_code: profile.default_postal_code
      })
      .eq('id', profile.id);
    setSaving(false);
    setMessage(error ? 'No se pudo guardar.' : 'Guardado.');
  }

  async function deleteAccount() {
    if (!window.confirm('¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      return;
    }
    const response = await fetch('/api/cuenta/eliminar', { method: 'POST' });
    if (response.ok) router.push('/');
  }

  if (!profile) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Mi cuenta</h1>

        <form onSubmit={saveProfile} className="flex flex-col gap-3">
          <input
            placeholder="Nombre completo"
            value={profile.full_name ?? ''}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Teléfono"
            value={profile.phone ?? ''}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Dirección"
            value={profile.default_address ?? ''}
            onChange={(e) => setProfile({ ...profile, default_address: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Ciudad"
            value={profile.default_city ?? ''}
            onChange={(e) => setProfile({ ...profile, default_city: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <input
            placeholder="Código postal"
            value={profile.default_postal_code ?? ''}
            onChange={(e) => setProfile({ ...profile, default_postal_code: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-dark p-3 text-white-warm"
          />
          <button disabled={saving} type="submit" className="rounded-md bg-gold px-4 py-3 text-sm font-bold text-bg-darkest">
            GUARDAR
          </button>
          {message && <p className="text-sm text-text-muted">{message}</p>}
        </form>

        <h2 className="mb-3 mt-10 text-lg font-black text-white-warm">Historial de pedidos</h2>
        {orders.length === 0 && <p className="text-text-muted">Aún no has hecho ningún pedido.</p>}
        {orders.map((order) => (
          <div key={order.id} className="flex justify-between border-b border-border-subtle py-2 text-sm">
            <span className="text-cream">{order.order_number} · {order.status}</span>
            <span className="text-white-warm">{formatCents(order.amount_cents)}</span>
          </div>
        ))}

        <div className="mt-10 flex flex-col gap-2 border-t border-border-subtle pt-6">
          <h2 className="text-lg font-black text-white-warm">Tus datos (RGPD)</h2>
          <a href="/api/cuenta/export" className="rounded-md border border-border-subtle px-4 py-3 text-center text-sm font-bold text-white-warm">
            Descargar mis datos
          </a>
          <button
            type="button"
            onClick={deleteAccount}
            className="rounded-md border border-red-mid px-4 py-3 text-sm font-bold text-red-mid"
          >
            Eliminar mi cuenta
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

Log in, edit the profile form, save → reload the page → changes persisted. Order history shows past test orders. "Descargar mis datos" downloads the JSON export. "Eliminar mi cuenta" prompts for confirmation, then signs out and redirects to `/`; attempting to log in again with the same credentials fails.

- [ ] **Step 3: Commit**

```bash
git add app/cuenta/page.tsx
git commit -m "feat: add /cuenta page with profile editing, order history, and GDPR actions"
```

---

## Phase 10 — Legal pages

### Task 30: `/privacidad`, `/terminos`, `/cookies`

**Files:**
- Create: `app/privacidad/page.tsx`
- Create: `app/terminos/page.tsx`
- Create: `app/cookies/page.tsx`

- [ ] **Step 1: Create `app/privacidad/page.tsx`** — content grounded in spec §13 (responsible party, purposes, legal basis, retention, rights, sub-processors)

```tsx
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function PrivacidadPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-cream">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Política de Privacidad</h1>

        <h2 className="mt-6 font-bold text-white-warm">Responsable del tratamiento</h2>
        <p>Diamond Squad Events, organizador de RPM Fest.</p>

        <h2 className="mt-6 font-bold text-white-warm">Finalidad y base legal</h2>
        <p>
          Tratamos tu nombre, email, dirección de envío y ciudad para gestionar y enviar tu
          pedido (ejecución del contrato de compraventa, art. 6.1.b RGPD). Si creas una cuenta,
          tratamos tus credenciales y datos de perfil con base en tu consentimiento explícito
          (art. 6.1.a RGPD). No usamos tus datos con fines de marketing.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Dónde se alojan tus datos</h2>
        <p>
          Los datos se alojan en la Unión Europea: base de datos en Supabase (Irlanda) y pagos
          procesados por Mollie (Países Bajos). No se realizan transferencias fuera del Espacio
          Económico Europeo.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Plazo de conservación</h2>
        <p>
          Los datos de pedidos se conservan mientras dure tu cuenta y, tras su eliminación o para
          compras de invitado, durante el plazo legal exigido por la normativa fiscal y mercantil
          española (mínimo 4 años a efectos tributarios, 6 años según el Código de Comercio).
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Tus derechos</h2>
        <p>
          Puedes acceder, rectificar, descargar (portabilidad) o eliminar tus datos desde{' '}
          <a href="/cuenta" className="text-gold underline">Mi cuenta</a>. Si compraste como
          invitado y no tienes cuenta, escríbenos a{' '}
          <a href="mailto:privacidad@rpmfest.example" className="text-gold underline">
            privacidad@rpmfest.example
          </a>{' '}
          indicando tu número de pedido y email para ejercer estos derechos.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Encargados de tratamiento</h2>
        <p>
          Supabase (base de datos y autenticación) y Mollie (procesamiento de pagos) tratan datos
          en nuestro nombre bajo sus respectivos Acuerdos de Encargado de Tratamiento.
        </p>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Create `app/terminos/page.tsx`**

```tsx
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function TerminosPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-cream">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Términos de Compra</h1>

        <h2 className="mt-6 font-bold text-white-warm">Precios y disponibilidad</h2>
        <p>
          Los precios se muestran en euros, impuestos incluidos. El stock se reserva en el
          momento de confirmar el pedido; si un producto se agota antes de completar el pago, el
          pedido no se procesa y no se realiza ningún cargo.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Pago</h2>
        <p>
          Los pagos se procesan de forma segura a través de Mollie (tarjeta, Bizum, PayPal). RPM
          Fest no almacena datos de tarjetas de pago.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Envíos</h2>
        <p>
          Los plazos de envío se comunican tras la compra. Puedes consultar el estado de tu
          pedido en <a href="/pedido" className="text-gold underline">/pedido</a> o desde{' '}
          <a href="/cuenta" className="text-gold underline">Mi cuenta</a>.
        </p>

        <h2 className="mt-6 font-bold text-white-warm">Devoluciones</h2>
        <p>
          Para gestionar una devolución, contacta con nosotros indicando tu número de pedido
          dentro de los 14 días naturales siguientes a la recepción del producto.
        </p>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Create `app/cookies/page.tsx`**

```tsx
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-cream">
        <h1 className="mb-6 text-2xl font-black text-white-warm">Política de Cookies</h1>
        <p>
          RPM Fest utiliza únicamente cookies técnicas/esenciales, estrictamente necesarias para
          el funcionamiento del sitio:
        </p>
        <ul className="mt-4 list-disc pl-5">
          <li>Cookies de sesión de Supabase Auth, para mantenerte identificado tras iniciar sesión.</li>
          <li>Estado de la cesta de invitado, guardado en tu navegador (localStorage), no en cookies de terceros.</li>
        </ul>
        <p className="mt-4">
          Al ser cookies estrictamente necesarias, no requieren un banner de consentimiento previo
          según el RGPD y la LSSI-CE. No utilizamos cookies de analítica ni de publicidad. Si en
          el futuro se incorporaran, se solicitaría tu consentimiento explícito antes de
          activarlas.
        </p>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Manual verification**

Visit `/privacidad`, `/terminos`, `/cookies` → each renders; footer links from every new page navigate correctly.

- [ ] **Step 5: Commit**

```bash
git add app/privacidad/page.tsx app/terminos/page.tsx app/cookies/page.tsx
git commit -m "feat: add /privacidad, /terminos, and /cookies legal pages"
```

---

## Phase 11 — Admin panel (`/admin`)

Product and order-list reads/writes happen directly from the browser via the anon-key client (`lib/supabase/client.ts`); the `products_admin_write/update/delete` RLS policies (Task 5) and `orders_owner_or_admin_select` already restrict these to signed-in admins, and `middleware.ts` (Task 9) already redirects non-admins away from `/admin/*` before any page code runs. The only operation that needs a server route is image upload, because it validates raw file bytes (MIME type, size) — something RLS policies can't express.

### Task 31: `app/admin/layout.tsx` — admin nav shell

**Files:**
- Create: `app/admin/layout.tsx`

- [ ] **Step 1: Write the layout** — `middleware.ts` already blocks non-admins from reaching any `/admin/*` route, so this layout only needs to render the shared nav chrome and the signed-in admin's email

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-bg-darkest">
      <header className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        <nav className="flex gap-6 text-sm font-bold text-white-warm">
          <Link href="/admin/productos" className="hover:text-gold">
            Productos
          </Link>
          <Link href="/admin/pedidos" className="hover:text-gold">
            Pedidos
          </Link>
        </nav>
        <span className="text-xs text-text-muted">{user?.email}</span>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Log in as a user whose `profiles.role = 'admin'` (set manually via `execute_sql`: `update public.profiles set role = 'admin' where id = '<your user id>';`), visit `/admin/productos` → the nav bar and your email render.

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: add admin layout with nav shell"
```

### Task 32: `app/admin/productos/page.tsx` — product CRUD

**Files:**
- Create: `app/admin/productos/page.tsx`

- [ ] **Step 1: Write the page** — lists products, and provides an inline create/edit form; all writes go straight from the browser client to Supabase, protected by the `products_admin_write/update/delete` RLS policies

```tsx
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
```

- [ ] **Step 2: Manual verification**

As an admin, visit `/admin/productos` → create a product with an uploaded image, confirm it appears in `/tienda`; edit its price and stock, confirm the list updates; delete it, confirm it disappears from both the admin list and `/tienda`. Log out and try `curl` a direct `PATCH` to Supabase REST with the anon key and no session (or with a non-admin session) → expect a permission-denied error, confirming RLS (not just the UI) blocks the write.

- [ ] **Step 3: Commit**

```bash
git add app/admin/productos/page.tsx
git commit -m "feat: add admin product CRUD page"
```

### Task 33: `app/api/admin/productos/imagen/route.ts` — product image upload

**Files:**
- Create: `app/api/admin/productos/imagen/route.ts`

- [ ] **Step 1: Write the route** — re-checks the session and admin role server-side (defense in depth: this route also validates raw file bytes, which RLS policies cannot express), then uploads to the `product-images` bucket using the admin client

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
    .from('product-images')
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl }
  } = admin.storage.from('product-images').getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
```

- [ ] **Step 2: Manual verification**

`curl -X POST http://localhost:3000/api/admin/productos/imagen -F "file=@test.png"` while logged out → `401`. Logged in as a non-admin → `403`. Logged in as admin with a 5 MB PNG → `400` ("supera los 2 MB"). Logged in as admin with a valid 100 KB PNG → `200` with `{ "url": "https://.../product-images/<uuid>.png" }`, and the URL is publicly reachable in a browser.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/productos/imagen/route.ts
git commit -m "feat: add admin product image upload route"
```

### Task 34: `app/admin/pedidos/page.tsx` — order list

**Files:**
- Create: `app/admin/pedidos/page.tsx`

- [ ] **Step 1: Write the page** — a server component reading through the RLS-respecting client; the `orders_owner_or_admin_select` policy's `public.is_admin()` branch returns every order (not just the signed-in admin's own) because the request carries an admin session

```tsx
import { createClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/money';

export default async function AdminPedidosPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('order_number, status, customer_name, customer_email, amount_cents, created_at')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-4 text-xl font-black text-white-warm">Pedidos</h1>
      <table className="w-full text-left text-sm text-white-warm">
        <thead className="text-text-muted">
          <tr>
            <th className="pb-2">Nº pedido</th>
            <th className="pb-2">Cliente</th>
            <th className="pb-2">Estado</th>
            <th className="pb-2">Importe</th>
            <th className="pb-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((o) => (
            <tr key={o.order_number} className="border-t border-border-subtle">
              <td className="py-2">{o.order_number}</td>
              <td className="py-2">
                {o.customer_name}
                <div className="text-xs text-text-muted">{o.customer_email}</div>
              </td>
              <td className="py-2">{o.status}</td>
              <td className="py-2">{formatCents(o.amount_cents)}</td>
              <td className="py-2">{new Date(o.created_at).toLocaleDateString('es-ES')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

As an admin, visit `/admin/pedidos` → every order in the database appears, including ones placed by other customers or as a guest. As a non-admin (bypassing the UI by hitting the same Supabase query directly with a customer session), confirm only that customer's own orders are returned — proving the RLS policy, not the page, is what scopes visibility.

- [ ] **Step 3: Commit**

```bash
git add app/admin/pedidos/page.tsx
git commit -m "feat: add admin order list page"
```

---

## Phase 12 — Cleanup and deployment

### Task 35: Remove obsolete static pages and serverless functions

**Files:**
- Delete: `tienda.html`, `pedido.html`, `panel.html`
- Delete: `admin/` (legacy admin JS bundle used by `panel.html`)
- Delete: `css/store.css`, `css/store-overrides.css`
- Delete: `public/data/store.json`
- Delete: `api/create-payment.js`, `api/mollie-webhook.js`, `api/track-order.js`, `api/admin-orders.js`

- [ ] **Step 1: Confirm nothing else references these files before deleting**

Run: `grep -rln "tienda.html\|pedido.html\|panel.html\|store.css\|store-overrides.css" public/index.html public/eventos.html public/css public/js 2>/dev/null`
Expected: no output (Task 2's move already confirmed `index.html`/`eventos.html` don't depend on the store pages; this re-check guards against missing something before deletion).

- [ ] **Step 2: Delete the obsolete static pages and legacy admin bundle**

```bash
git rm tienda.html pedido.html panel.html
git rm -r admin
git rm css/store.css css/store-overrides.css
git rm public/data/store.json
```

- [ ] **Step 3: Delete the obsolete serverless functions** — fully replaced by `app/api/checkout`, `app/api/mollie-webhook`, `app/api/pedido`, and `app/admin/pedidos`

```bash
git rm api/create-payment.js api/mollie-webhook.js api/track-order.js api/admin-orders.js
```

- [ ] **Step 4: Manual verification**

Run: `npm run build` → succeeds with no missing-module errors (confirms nothing still imports the deleted files).
Visit `/` and `/eventos` → both still render correctly (unaffected by the deletions).

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: remove legacy static store pages and serverless functions"
```

### Task 36: Update `vercel.json` — drop the now-unneeded rewrites

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Remove the `/panel` and `/tienda` rewrites** — `/panel` no longer exists (replaced by `/admin`, guarded by `middleware.ts`) and `/tienda` is now a native Next.js route (`app/tienda/page.tsx`), so neither needs a static-file rewrite; `next.config.js` (Task 1) already owns the `/` and `/eventos` rewrites to the remaining static pages

```json
{
  "version": 2,
  "headers": [
    {
      "source": "/data/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run build && npm run start`, visit `http://localhost:3000/tienda` → renders the Next.js product grid, not a 404 or a stale static file.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: drop obsolete /panel and /tienda rewrites from vercel.json"
```

### Task 37: Configure production environment variables and deploy

**Files:** none (Vercel project settings, outside the repo)

- [ ] **Step 1: In the Vercel project dashboard, remove the obsolete environment variables**

Remove: `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH` (used only by the old `panel.html` GitHub-write flow, now replaced by direct Supabase writes).

- [ ] **Step 2: Add the new environment variables** (same names as `.env.local.example` from Task 1), for both Production and Preview environments

```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase project settings → API>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase project settings → API>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase project settings → API, keep secret>
MOLLIE_API_KEY=<existing production Mollie key, carried over from the old deployment>
ORDER_TRACK_SECRET=<existing production tracking secret, carried over from the old deployment>
```

- [ ] **Step 3: Deploy**

Push the branch containing this work and let Vercel build it (or run `vercel --prod` if deploying manually).
Expected: build succeeds; Vercel build log shows no references to the deleted `api/*.js` functions.

- [ ] **Step 4: Post-deploy smoke test on the production URL**

Visit `/` and `/eventos` → unchanged. Visit `/tienda`, add a product to the cart, go to `/cesta`, then `/checkout`, complete a real low-value purchase (or Mollie test-mode payment if the Mollie account is still in test mode) → redirected to `/checkout/confirmacion/<pedido>` showing "Pagado". Visit `/pedido` with the emailed order number → order found. Log in as the admin account, visit `/admin/productos` and `/admin/pedidos` → both show live data.

No commit for this task (deployment + dashboard configuration only).

---
