-- 010_auth_helpers.sql
-- CheckIt auth helper functions. Mirror of ClockIt's pattern.
-- Used by RLS policies.

-- 1. Flag the platform admin on operators
alter table public.operators
  add column if not exists is_platform_admin boolean not null default false;

create index if not exists operators_platform_admin_idx
  on public.operators (is_platform_admin)
  where is_platform_admin = true;

-- 2. current_account_id() - the account_id of the logged-in operator
create or replace function public.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id
  from public.operators
  where id = auth.uid()
  limit 1;
$$;

comment on function public.current_account_id() is
  'Returns the account_id of the currently authenticated operator.';

-- 3. is_platform_admin() - flag bypass for RLS
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.operators where id = auth.uid()),
    false
  );
$$;

comment on function public.is_platform_admin() is
  'Returns true if the current operator is a platform admin.';

-- 4. current_account_is_active() - is the operator account active?
create or replace function public.current_account_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select status = 'active'
     from public.accounts
     where id = public.current_account_id()),
    false
  );
$$;

comment on function public.current_account_is_active() is
  'Returns true if the currently authenticated operator account is active.';

grant execute on function public.current_account_id() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.current_account_is_active() to authenticated;