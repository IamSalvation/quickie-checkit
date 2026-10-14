-- 016_photo_capture.sql
-- Adds photo capture support:
--   participants.photo_url            - enrollment photo (one-time, updated rarely)
--   presence_records.photo_url        - live check-in photo (every scan)

alter table public.participants
  add column if not exists photo_url text;

alter table public.presence_records
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'participant-photos',
  'participant-photos',
  true,
  5 * 1024 * 1024,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "participant_photos_insert" on storage.objects;
create policy "participant_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'participant-photos'
    and (
      public.is_platform_admin()
      or (storage.foldername(name))[1] = public.current_account_id()::text
    )
  );

drop policy if exists "participant_photos_update" on storage.objects;
create policy "participant_photos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'participant-photos'
    and (
      public.is_platform_admin()
      or (storage.foldername(name))[1] = public.current_account_id()::text
    )
  )
  with check (
    bucket_id = 'participant-photos'
    and (
      public.is_platform_admin()
      or (storage.foldername(name))[1] = public.current_account_id()::text
    )
  );

drop policy if exists "participant_photos_delete" on storage.objects;
create policy "participant_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'participant-photos'
    and (
      public.is_platform_admin()
      or (storage.foldername(name))[1] = public.current_account_id()::text
    )
  );

drop policy if exists "participant_photos_read_public" on storage.objects;
create policy "participant_photos_read_public" on storage.objects
  for select to public
  using (bucket_id = 'participant-photos');