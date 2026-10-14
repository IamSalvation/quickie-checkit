-- 020_kiosk_context_binding.sql
-- Kiosk-context binding + live phase (in/out) + flagged review model.

alter table public.kiosks
  add column if not exists context_id uuid references public.contexts(id) on delete set null;

create index if not exists kiosks_context_id_idx on public.kiosks (context_id);

alter table public.contexts
  add column if not exists location text;

alter table public.contexts
  add column if not exists phase text not null default 'in';

alter table public.contexts
  drop constraint if exists contexts_phase_check;

alter table public.contexts
  add constraint contexts_phase_check check (phase in ('in', 'out'));

alter table public.presence_records
  add column if not exists needs_review boolean not null default false;

alter table public.presence_records
  add column if not exists status text not null default 'present';

alter table public.presence_records
  drop constraint if exists presence_records_status_check;

alter table public.presence_records
  add constraint presence_records_status_check check (status in ('present', 'absent'));

alter table public.presence_records
  add column if not exists resolved_by uuid references public.operators(id) on delete set null;

alter table public.presence_records
  add column if not exists resolved_at timestamptz;

create index if not exists presence_records_needs_review_idx
  on public.presence_records (account_id)
  where needs_review = true;