-- 019_simplify_storage_policies.sql
-- Replace the folder-scoped storage policies with simple bucket-scoped ones.
-- Mirrors ClockIt's approach - simpler and works for both enrollment photos
-- (authenticated) and check-in selfies (anon kiosk).

drop policy if exists "participant_photos_insert" on storage.objects;
drop policy if exists "participant_photos_update" on storage.objects;
drop policy if exists "participant_photos_delete" on storage.objects;
drop policy if exists "participant_photos_read_public" on storage.objects;
drop policy if exists "checkin_photos_anon_insert" on storage.objects;

create policy "participant_photos_auth_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'participant-photos');

create policy "participant_photos_auth_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'participant-photos')
with check (bucket_id = 'participant-photos');

create policy "participant_photos_auth_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'participant-photos');

create policy "participant_photos_auth_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'participant-photos');

create policy "participant_photos_anon_insert"
on storage.objects
for insert
to anon
with check (bucket_id = 'participant-photos');

create policy "participant_photos_anon_select"
on storage.objects
for select
to anon
using (bucket_id = 'participant-photos');