-- 002_accounts.sql
-- CheckIt — the tenant table.
-- One row per customer. A school, a symposium, a bootcamp, a hotel, an event.
-- "Account" is the generic term; the preset field drives labels + modules.

create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  id_prefix       text not null,
  status          text not null default 'pending',
  tier            text not null default 'v1',
  preset          text not null default 'school',
  grading_scale   jsonb,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint accounts_status_check
    check (status in ('pending', 'active', 'paused', 'deleted')),
  constraint accounts_tier_check
    check (tier in ('v1', 'v2')),
  constraint accounts_preset_check
    check (preset in ('school', 'symposium', 'bootcamp', 'conference', 'hotel', 'event', 'custom')),
  constraint accounts_slug_format
    check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  constraint accounts_id_prefix_format
    check (id_prefix ~ '^[A-Z][A-Z0-9]{1,9}$')
);

alter table public.accounts enable row level security;

create index if not exists accounts_slug_idx on public.accounts (slug);
create index if not exists accounts_status_idx on public.accounts (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row
  execute function public.set_updated_at();