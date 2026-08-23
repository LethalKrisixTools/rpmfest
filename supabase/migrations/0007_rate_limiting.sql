create table public.rate_limit_buckets (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

create function public.check_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.rate_limit_buckets;
begin
  insert into public.rate_limit_buckets (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
          when public.rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else public.rate_limit_buckets.count + 1
        end,
        window_start = case
          when public.rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else public.rate_limit_buckets.window_start
        end
  returning * into v_row;

  return v_row.count <= p_max_attempts;
end;
$$;

revoke all on public.rate_limit_buckets from public, anon, authenticated;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
