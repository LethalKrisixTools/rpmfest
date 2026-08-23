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

-- Support the RLS policies above, which filter/join on these columns.
create index orders_user_id_idx on public.orders (user_id);
create index order_items_order_id_idx on public.order_items (order_id);
