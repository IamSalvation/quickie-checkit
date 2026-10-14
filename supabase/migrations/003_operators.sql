-- 003_operators.sql
-- CheckIt operators: people who log in.
-- Owner (admin), plus delegated staff (lecturer, front-desk, facilitator).
--
-- NOTE: no auth link yet. This records who SHOULD be able to log in.
-- Phase 2 will link operators.id to auth.users(id) and add the trigger.

create table if not exists public.operators (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  email           text not null,
  full_name       text,
  role            text not null default 'admin',
  is_owner        boolean not null default false,
  status          text not null default 'active',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint operators_role_check
    check (role in ('admin', 'lecturer', 'staff')),
  constraint operators_status_check
    check (status in ('active', 'invited', 'disabled')),
  constraint operators_email_format
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

alter table public.operators enable row level security;

create index if not exists operators_account_id_idx on public.operators (account_id);
create index if not exists operators_email_idx on public.operators (email);
create unique index if not exists operators_account_email_unique
  on public.operators (account_id, lower(email));

drop trigger if exists operators_set_updated_at on public.operators;
create trigger operators_set_updated_at
  before update on public.operators
  for each row
  execute function public.set_updated_at();