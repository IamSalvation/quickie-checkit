-- 014_next_system_id_rpc.sql
-- Atomic system_id generation per account.
--
-- Why: two admins adding participants at the same time must not both get
-- STMA-00001. We use a counter table with an atomic UPDATE ... RETURNING.
--
-- Result format: {id_prefix}-{5-digit zero-padded}
-- Example: STMA-00001, STMA-00002, ..., STMA-99999

create table if not exists public.account_counters (
  account_id    uuid primary key references public.accounts(id) on delete cascade,
  last_number   bigint not null default 0,
  updated_at    timestamptz not null default now()
);

alter table public.account_counters enable row level security;

-- Only authenticated users can read their own counter (not that they need to,
-- but just in case). Function below bypasses RLS via security definer.
drop policy if exists account_counters_select on public.account_counters;
create policy account_counters_select on public.account_counters
  for select to authenticated
  using (
    public.is_platform_admin()
    or account_id = public.current_account_id()
  );

-- The generator function.
-- Takes an account_id, increments its counter atomically, returns formatted system_id.
-- security definer so it can insert/update the counter table regardless of RLS.
create or replace function public.next_participant_system_id(p_account_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next bigint;
begin
  -- Fetch the account's id_prefix
  select id_prefix into v_prefix
  from public.accounts
  where id = p_account_id;

  if v_prefix is null then
    raise exception 'Account % not found', p_account_id;
  end if;

  -- Upsert the counter, increment, and capture the new value atomically
  insert into public.account_counters (account_id, last_number)
  values (p_account_id, 1)
  on conflict (account_id)
  do update set
    last_number = public.account_counters.last_number + 1,
    updated_at = now()
  returning last_number into v_next;

  return v_prefix || '-' || lpad(v_next::text, 5, '0');
end;
$$;

comment on function public.next_participant_system_id(uuid) is
  'Atomically generates the next participant system_id for an account.';

grant execute on function public.next_participant_system_id(uuid) to authenticated;