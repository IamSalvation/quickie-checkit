-- 008_presence_records.sql
-- CheckIt presence records: the actual check-in / check-out rows.
--
-- One row per (participant, context) unless checkout_enabled allows reopening.
-- checked_out_at is null for point-in-time contexts (a lecture check-in).
-- checked_out_at is set for interval contexts (a hotel stay, a lab session).
--
-- method: how the record was created
-- mode:   whether it was in-person or online
-- verified: true if V2 face check passed, false if V1 or failed/mismatch

create table if not exists public.presence_records (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  context_id      uuid not null references public.contexts(id) on delete cascade,
  kiosk_id        uuid references public.kiosks(id) on delete set null,

  checked_in_at   timestamptz not null default now(),
  checked_out_at  timestamptz,

  method          text not null,
  mode            text not null,
  verified        boolean not null default false,
  face_score      numeric(5, 4),
  metadata        jsonb not null default '{}'::jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint presence_method_check
    check (method in (
      'qr_kiosk_inperson',
      'qr_kiosk_online',
      'id_entry_online',
      'manual',
      'face_verified'
    )),
  constraint presence_mode_check
    check (mode in ('in_person', 'online')),
  constraint presence_checkout_after_checkin
    check (checked_out_at is null or checked_out_at >= checked_in_at),
  constraint presence_face_score_range
    check (face_score is null or (face_score >= 0 and face_score <= 1))
);

alter table public.presence_records enable row level security;

create index if not exists presence_account_id_idx
  on public.presence_records (account_id);
create index if not exists presence_participant_id_idx
  on public.presence_records (participant_id);
create index if not exists presence_context_id_idx
  on public.presence_records (context_id);
create index if not exists presence_account_context_idx
  on public.presence_records (account_id, context_id);
create index if not exists presence_account_participant_idx
  on public.presence_records (account_id, participant_id);
create index if not exists presence_checked_in_at_idx
  on public.presence_records (account_id, checked_in_at desc);

create unique index if not exists presence_participant_context_unique
  on public.presence_records (participant_id, context_id)
  where checked_out_at is null;

drop trigger if exists presence_set_updated_at on public.presence_records;
create trigger presence_set_updated_at
  before update on public.presence_records
  for each row
  execute function public.set_updated_at();