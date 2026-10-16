-- 030_account_access_limits.sql
-- Per-account resource caps + time-limited access.
-- Lifecycle: active -> grace (7d read-only) -> locked.
-- Platform admin can override every value per account.
-- Applied in Supabase SQL Editor on 2026-10-16.

-- 1. New columns on accounts
alter table public.accounts
  add column if not exists max_participants   integer not null default 50,
  add column if not exists max_programs       integer not null default 5,
  add column if not exists max_contexts       integer not null default 20,
  add column if not exists max_kiosks         integer not null default 1,
  add column if not exists access_expires_at  timestamptz,
  add column if not exists lockout_grace_days integer not null default 7,
  add column if not exists trial_started_at   timestamptz,
  add column if not exists limits_overridden  boolean not null default false;

-- Sanity constraints
alter table public.accounts
  drop constraint if exists accounts_max_participants_check;
alter table public.accounts
  add constraint accounts_max_participants_check check (max_participants >= 0);

alter table public.accounts
  drop constraint if exists accounts_max_programs_check;
alter table public.accounts
  add constraint accounts_max_programs_check check (max_programs >= 0);

alter table public.accounts
  drop constraint if exists accounts_max_contexts_check;
alter table public.accounts
  add constraint accounts_max_contexts_check check (max_contexts >= 0);

alter table public.accounts
  drop constraint if exists accounts_max_kiosks_check;
alter table public.accounts
  add constraint accounts_max_kiosks_check check (max_kiosks >= 0);

alter table public.accounts
  drop constraint if exists accounts_lockout_grace_days_check;
alter table public.accounts
  add constraint accounts_lockout_grace_days_check
  check (lockout_grace_days >= 0 and lockout_grace_days <= 90);

-- 2. account_access_state(uuid) returns active | grace | locked
create or replace function public.account_access_state(p_account_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when a.access_expires_at is null then 'active'
    when now() < a.access_expires_at then 'active'
    when now() < a.access_expires_at + (a.lockout_grace_days || ' days')::interval then 'grace'
    else 'locked'
  end
  from public.accounts a
  where a.id = p_account_id;
$$;

grant execute on function public.account_access_state(uuid) to authenticated;

-- 3. account_usage(uuid) returns counts + caps + state
create or replace function public.account_usage(p_account_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'participants', (select count(*) from public.participants where account_id = p_account_id),
    'programs', (select count(*) from public.programs where account_id = p_account_id and status = 'active'),
    'contexts_this_month', (select count(*) from public.contexts where account_id = p_account_id and created_at >= date_trunc('month', now())),
    'kiosks', (select count(*) from public.kiosks where account_id = p_account_id and status = 'active'),
    'max_participants', (select max_participants from public.accounts where id = p_account_id),
    'max_programs', (select max_programs from public.accounts where id = p_account_id),
    'max_contexts', (select max_contexts from public.accounts where id = p_account_id),
    'max_kiosks', (select max_kiosks from public.accounts where id = p_account_id),
    'access_expires_at', (select access_expires_at from public.accounts where id = p_account_id),
    'lockout_grace_days', (select lockout_grace_days from public.accounts where id = p_account_id),
    'state', public.account_access_state(p_account_id)
  );
$$;

grant execute on function public.account_usage(uuid) to authenticated;

-- 4. Audit table
create table if not exists public.account_limit_changes (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  changed_by  uuid references public.operators(id) on delete set null,
  field       text not null,
  old_value   text,
  new_value   text,
  changed_at  timestamptz not null default now()
);

create index if not exists account_limit_changes_account_idx
  on public.account_limit_changes (account_id, changed_at desc);

alter table public.account_limit_changes enable row level security;

drop policy if exists account_limit_changes_select on public.account_limit_changes;
create policy account_limit_changes_select on public.account_limit_changes
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists account_limit_changes_insert on public.account_limit_changes;
create policy account_limit_changes_insert on public.account_limit_changes
  for insert to authenticated
  with check (public.is_platform_admin());

-- 5. Update signup trigger to set trial_started_at + access_expires_at
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
  v_account_name text := coalesce(new.raw_user_meta_data->>'account_name', 'My Account');
  v_full_name text := coalesce(new.raw_user_meta_data->>'full_name', new.email);
  v_preset text := coalesce(new.raw_user_meta_data->>'preset', 'school');
  v_slug text;
  v_id_prefix text;
begin
  if v_preset not in ('school','symposium','bootcamp','conference','hotel','event','custom') then
    v_preset := 'school';
  end if;

  v_slug := lower(regexp_replace(v_account_name, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(gen_random_uuid()::text, 1, 6);
  v_slug := trim(both '-' from v_slug);

  v_id_prefix := upper(regexp_replace(v_account_name, '[^a-zA-Z0-9]', '', 'g'));
  v_id_prefix := substr(v_id_prefix, 1, 6);
  if length(v_id_prefix) < 2 then v_id_prefix := 'ACCT'; end if;
  if v_id_prefix !~ '^[A-Z]' then
    v_id_prefix := 'A' || v_id_prefix;
    v_id_prefix := substr(v_id_prefix, 1, 6);
  end if;

  insert into public.accounts (
    name, slug, id_prefix, status, tier, preset,
    trial_started_at, access_expires_at
  )
  values (
    v_account_name, v_slug, v_id_prefix, 'pending', 'v1', v_preset,
    now(), now() + interval '7 days'
  )
  returning id into new_account_id;

  insert into public.operators (id, account_id, email, full_name, role, is_owner, status)
  values (new.id, new_account_id, new.email, v_full_name, 'admin', true, 'active')
  on conflict (id) do nothing;

  return new;
end $$;