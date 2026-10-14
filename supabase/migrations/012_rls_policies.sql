-- 012_rls_policies.sql
-- CheckIt RLS policies.
-- Every table has account_id (except accounts itself, which has id).
-- Pattern: platform admin sees all; everyone else sees their own account.
--
-- Read + Write (insert/update/delete) policies are created per table.
-- Policies are permissive OR by default, so multiple policies just add paths.

-- =========================================================================
-- accounts
-- =========================================================================
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
  for select to authenticated
  using (public.is_platform_admin() or id = public.current_account_id());

drop policy if exists accounts_insert on public.accounts;
create policy accounts_insert on public.accounts
  for insert to authenticated
  with check (public.is_platform_admin());

drop policy if exists accounts_update on public.accounts;
create policy accounts_update on public.accounts
  for update to authenticated
  using (public.is_platform_admin() or id = public.current_account_id())
  with check (public.is_platform_admin() or id = public.current_account_id());

drop policy if exists accounts_delete on public.accounts;
create policy accounts_delete on public.accounts
  for delete to authenticated
  using (public.is_platform_admin());

-- =========================================================================
-- operators
-- =========================================================================
drop policy if exists operators_select on public.operators;
create policy operators_select on public.operators
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists operators_insert on public.operators;
create policy operators_insert on public.operators
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists operators_update on public.operators;
create policy operators_update on public.operators
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists operators_delete on public.operators;
create policy operators_delete on public.operators
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

-- =========================================================================
-- participants
-- =========================================================================
drop policy if exists participants_select on public.participants;
create policy participants_select on public.participants
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists participants_insert on public.participants;
create policy participants_insert on public.participants
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists participants_update on public.participants;
create policy participants_update on public.participants
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists participants_delete on public.participants;
create policy participants_delete on public.participants
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

-- =========================================================================
-- programs
-- =========================================================================
drop policy if exists programs_select on public.programs;
create policy programs_select on public.programs
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists programs_insert on public.programs;
create policy programs_insert on public.programs
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists programs_update on public.programs;
create policy programs_update on public.programs
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists programs_delete on public.programs;
create policy programs_delete on public.programs
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

-- =========================================================================
-- contexts
-- =========================================================================
drop policy if exists contexts_select on public.contexts;
create policy contexts_select on public.contexts
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists contexts_insert on public.contexts;
create policy contexts_insert on public.contexts
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists contexts_update on public.contexts;
create policy contexts_update on public.contexts
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists contexts_delete on public.contexts;
create policy contexts_delete on public.contexts
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

-- =========================================================================
-- kiosks
-- =========================================================================
drop policy if exists kiosks_select on public.kiosks;
create policy kiosks_select on public.kiosks
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists kiosks_insert on public.kiosks;
create policy kiosks_insert on public.kiosks
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists kiosks_update on public.kiosks;
create policy kiosks_update on public.kiosks
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists kiosks_delete on public.kiosks;
create policy kiosks_delete on public.kiosks
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

-- =========================================================================
-- presence_records
-- =========================================================================
drop policy if exists presence_records_select on public.presence_records;
create policy presence_records_select on public.presence_records
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists presence_records_insert on public.presence_records;
create policy presence_records_insert on public.presence_records
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists presence_records_update on public.presence_records;
create policy presence_records_update on public.presence_records
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists presence_records_delete on public.presence_records;
create policy presence_records_delete on public.presence_records
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

-- =========================================================================
-- ca_components
-- =========================================================================
drop policy if exists ca_components_select on public.ca_components;
create policy ca_components_select on public.ca_components
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists ca_components_insert on public.ca_components;
create policy ca_components_insert on public.ca_components
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists ca_components_update on public.ca_components;
create policy ca_components_update on public.ca_components
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists ca_components_delete on public.ca_components;
create policy ca_components_delete on public.ca_components
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

-- =========================================================================
-- ca_scores
-- =========================================================================
drop policy if exists ca_scores_select on public.ca_scores;
create policy ca_scores_select on public.ca_scores
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists ca_scores_insert on public.ca_scores;
create policy ca_scores_insert on public.ca_scores
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists ca_scores_update on public.ca_scores;
create policy ca_scores_update on public.ca_scores
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists ca_scores_delete on public.ca_scores;
create policy ca_scores_delete on public.ca_scores
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

-- =========================================================================
-- grades
-- =========================================================================
drop policy if exists grades_select on public.grades;
create policy grades_select on public.grades
  for select to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists grades_insert on public.grades;
create policy grades_insert on public.grades
  for insert to authenticated
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists grades_update on public.grades;
create policy grades_update on public.grades
  for update to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id())
  with check (public.is_platform_admin() or account_id = public.current_account_id());

drop policy if exists grades_delete on public.grades;
create policy grades_delete on public.grades
  for delete to authenticated
  using (public.is_platform_admin() or account_id = public.current_account_id());