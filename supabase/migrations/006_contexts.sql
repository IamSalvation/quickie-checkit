-- 006_contexts.sql
-- CheckIt contexts: the thing someone checks in to.
-- A Lecture (school), Talk (symposium), Module (bootcamp), Stay (hotel), Meeting (church/clinic), Checkpoint (event).
--
-- Online kiosk is NOT a separate table. It is fields on the context:
--   public_checkin_code   - the URL slug, e.g. /k/abc123
--   public_checkin_open   - is the online kiosk currently accepting check-ins?
--   public_checkin_expires - when does it stop accepting?
--   id_entry_enabled      - can participants type their system_id instead of scanning QR?
--   checkout_enabled      - is check-out allowed for this context?

create table if not exists public.contexts (
  id                      uuid primary key default gen_random_uuid(),
  account_id              uuid not null references public.accounts(id) on delete cascade,
  program_id              uuid references public.programs(id) on delete set null,
  type                    text not null default 'lecture',
  label                   text not null,
  starts_at               timestamptz,
  ends_at                 timestamptz,
  status                  text not null default 'scheduled',

  -- online kiosk
  public_checkin_code     text,
  public_checkin_open     boolean not null default false,
  public_checkin_expires  timestamptz,
  id_entry_enabled        boolean not null default false,
  checkout_enabled        boolean not null default false,

  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint contexts_type_check
    check (type in ('lecture', 'talk', 'module', 'stay', 'meeting', 'checkpoint', 'session', 'custom')),
  constraint contexts_status_check
    check (status in ('scheduled', 'open', 'closed', 'cancelled')),
  constraint contexts_label_not_blank
    check (length(trim(label)) > 0),
  constraint contexts_checkin_code_format
    check (public_checkin_code is null or public_checkin_code ~ '^[a-z0-9]{6,12}$'),
  constraint contexts_time_order
    check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

alter table public.contexts enable row level security;

create index if not exists contexts_account_id_idx on public.contexts (account_id);
create index if not exists contexts_program_id_idx on public.contexts (program_id);
create index if not exists contexts_status_idx on public.contexts (account_id, status);
create index if not exists contexts_starts_at_idx on public.contexts (account_id, starts_at);

create unique index if not exists contexts_public_checkin_code_unique
  on public.contexts (public_checkin_code)
  where public_checkin_code is not null;

drop trigger if exists contexts_set_updated_at on public.contexts;
create trigger contexts_set_updated_at
  before update on public.contexts
  for each row
  execute function public.set_updated_at();