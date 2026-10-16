-- 031_rls_enforce_access.sql
-- Enforce account access state on INSERT for the four creatable resources.
-- Grace and locked states block create actions at the DB level.
-- Select/update/delete policies are unchanged so grace-period reads/exports still work.
-- Applied in Supabase SQL Editor on 2026-10-16.

-- participants
drop policy if exists participants_insert on public.participants;
create policy participants_insert on public.participants
  for insert to authenticated
  with check (
    (public.is_platform_admin() or account_id = public.current_account_id())
    and public.account_access_state(account_id) = 'active'
  );

-- programs
drop policy if exists programs_insert on public.programs;
create policy programs_insert on public.programs
  for insert to authenticated
  with check (
    (public.is_platform_admin() or account_id = public.current_account_id())
    and public.account_access_state(account_id) = 'active'
  );

-- contexts
drop policy if exists contexts_insert on public.contexts;
create policy contexts_insert on public.contexts
  for insert to authenticated
  with check (
    (public.is_platform_admin() or account_id = public.current_account_id())
    and public.account_access_state(account_id) = 'active'
  );

-- kiosks
drop policy if exists kiosks_insert on public.kiosks;
create policy kiosks_insert on public.kiosks
  for insert to authenticated
  with check (
    (public.is_platform_admin() or account_id = public.current_account_id())
    and public.account_access_state(account_id) = 'active'
  );