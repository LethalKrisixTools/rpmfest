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
