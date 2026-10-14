-- 009b_ca_scores.sql
-- CheckIt CA scores: one row per participant per program per component.
-- Sum of scores (weighted) = ca_total for the participant in that program.
--
-- Example:
--   Participant A, MTH101, "Test 1", score 8.5
--   Participant A, MTH101, "Test 2", score 7.0
--   Participant A, MTH101, "Assignment", score 4.5
--   CA total for A in MTH101 = 20.0 (if weights are 1.0)

create table if not exists public.ca_scores (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  program_id      uuid not null references public.programs(id) on delete cascade,
  component_id    uuid not null references public.ca_components(id) on delete cascade,
  score           numeric(6, 2),
  entered_by      uuid references public.operators(id) on delete set null,
  entered_at      timestamptz not null default now(),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint ca_scores_score_nonneg
    check (score is null or score >= 0)
);

alter table public.ca_scores enable row level security;

create index if not exists ca_scores_account_id_idx
  on public.ca_scores (account_id);
create index if not exists ca_scores_participant_program_idx
  on public.ca_scores (participant_id, program_id);
create index if not exists ca_scores_component_id_idx
  on public.ca_scores (component_id);

create unique index if not exists ca_scores_participant_program_component_unique
  on public.ca_scores (participant_id, program_id, component_id);

drop trigger if exists ca_scores_set_updated_at on public.ca_scores;
create trigger ca_scores_set_updated_at
  before update on public.ca_scores
  for each row
  execute function public.set_updated_at();