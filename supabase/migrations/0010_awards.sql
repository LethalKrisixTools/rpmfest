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
