-- 004_participants.sql
-- CheckIt participants: people whose presence is tracked. No logins.
-- A student, an attendee, a guest, a trainee, a member.
--
-- Every participant always has a system_id (auto-generated, QR payload, ID entry).
-- external_id is optional (matric no, staff no, phone, booking ref) - informational only.

create table if not exists public.participants (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  full_name       text not null,
  system_id       text not null,
  external_id     text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint participants_system_id_format
    check (system_id ~ '^[A-Z][A-Z0-9]{1,9}-[0-9]{4,6}$'),
  constraint participants_full_name_not_blank
    check (length(trim(full_name)) > 0)
);

alter table public.participants enable row level security;

create index if not exists participants_account_id_idx on public.participants (account_id);
create unique index if not exists participants_account_system_id_unique
  on public.participants (account_id, lower(system_id));
create unique index if not exists participants_account_external_id_unique
  on public.participants (account_id, lower(external_id))
  where external_id is not null;

create index if not exists participants_full_name_idx
  on public.participants (account_id, lower(full_name));

drop trigger if exists participants_set_updated_at on public.participants;
create trigger participants_set_updated_at
  before update on public.participants
  for each row
  execute function public.set_updated_at();