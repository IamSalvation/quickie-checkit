-- 009c_grades.sql
-- CheckIt grades: one row per participant per program.
-- Holds the computed CA total, exam score, total, grade, and any manual overrides.
--
-- Auto-computation happens in the app:
--   ca_total = sum(ca_scores.score * ca_components.weight) for this participant+program
--   total    = ca_total + exam
--   grade    = scale_lookup(total, account.grading_scale)
--
-- Manual override: if grade_override is set, it wins. If locked = true, the row
-- is not recomputed even if ca_scores or exam change - the admin has confirmed it.

create table if not exists public.grades (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  program_id      uuid not null references public.programs(id) on delete cascade,

  ca_total        numeric(6, 2),
  exam            numeric(6, 2),
  total           numeric(6, 2),
  grade           text,
  grade_override  text,
  locked          boolean not null default false,

  entered_by      uuid references public.operators(id) on delete set null,
  entered_at      timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint grades_scores_nonneg
    check (
      (ca_total is null or ca_total >= 0)
      and (exam is null or exam >= 0)
      and (total is null or total >= 0)
    )
);

alter table public.grades enable row level security;

create index if not exists grades_account_id_idx
  on public.grades (account_id);
create index if not exists grades_participant_program_idx
  on public.grades (participant_id, program_id);
create index if not exists grades_program_id_idx
  on public.grades (program_id);

create unique index if not exists grades_participant_program_unique
  on public.grades (participant_id, program_id);

drop trigger if exists grades_set_updated_at on public.grades;
create trigger grades_set_updated_at
  before update on public.grades
  for each row
  execute function public.set_updated_at();