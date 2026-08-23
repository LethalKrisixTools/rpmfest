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
