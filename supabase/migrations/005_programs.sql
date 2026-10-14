-- 005_programs.sql
-- CheckIt programs: the container.
-- A Course (school), Track (symposium), Cohort (bootcamp), Room (hotel), Service (church).
-- Programs group contexts. A program has many contexts.

create table if not exists public.programs (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  name            text not null,
  code            text,
  type            text not null default 'course',
  description     text,
  status          text not null default 'active',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint programs_type_check
    check (type in ('course', 'track', 'cohort', 'room', 'service', 'group', 'custom')),
  constraint programs_status_check
    check (status in ('active', 'archived')),
  constraint programs_name_not_blank
    check (length(trim(name)) > 0)
);

alter table public.programs enable row level security;

create index if not exists programs_account_id_idx on public.programs (account_id);
create index if not exists programs_status_idx on public.programs (account_id, status);

create unique index if not exists programs_account_code_unique
  on public.programs (account_id, lower(code))
  where code is not null;

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row
  execute function public.set_updated_at();