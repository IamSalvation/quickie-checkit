-- 007_kiosks.sql
-- CheckIt in-person kiosks: a physical device at a door.
-- Persistent, bound to a location, device-authenticated.
--
-- NOTE: online kiosks are NOT in this table.
-- They are the five public_checkin_* / id_entry_enabled / checkout_enabled fields on contexts.

create table if not exists public.kiosks (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  label           text not null,
  location        text,
  device_token    text not null unique,
  status          text not null default 'active',
  metadata        jsonb not null default '{}'::jsonb,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint kiosks_status_check
    check (status in ('active', 'revoked')),
  constraint kiosks_label_not_blank
    check (length(trim(label)) > 0),
  constraint kiosks_device_token_format
    check (device_token ~ '^[a-zA-Z0-9_-]{20,}$')
);

alter table public.kiosks enable row level security;

create index if not exists kiosks_account_id_idx on public.kiosks (account_id);
create index if not exists kiosks_status_idx on public.kiosks (account_id, status);

drop trigger if exists kiosks_set_updated_at on public.kiosks;
create trigger kiosks_set_updated_at
  before update on public.kiosks
  for each row
  execute function public.set_updated_at();