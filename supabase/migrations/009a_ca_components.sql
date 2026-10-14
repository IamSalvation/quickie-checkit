-- 009a_ca_components.sql
-- CheckIt CA components: admin-defined continuous assessment structure.
-- Defined once per account. Applies to all programs in that account.
--
-- Example for a Nigerian school:
--   ("Test 1", max 10, weight 1.0, order 1)
--   ("Test 2", max 10, weight 1.0, order 2)
--   ("Assignment", max 5, weight 1.0, order 3)
--   ("Quiz", max 5, weight 1.0, order 4)
--
-- Example for a simpler school: one row ("CA", max 30, weight 1.0, order 1)

create table if not exists public.ca_components (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  name            text not null,
  max_score       numeric(6, 2) not null,
  weight          numeric(5, 2) not null default 1.0,
  sort_order      integer not null default 1,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint ca_components_name_not_blank
    check (length(trim(name)) > 0),
  constraint ca_components_max_score_positive
    check (max_score > 0),
  constraint ca_components_weight_positive
    check (weight > 0)
);

alter table public.ca_components enable row level security;

create index if not exists ca_components_account_id_idx
  on public.ca_components (account_id);
create unique index if not exists ca_components_account_name_unique
  on public.ca_components (account_id, lower(name));

drop trigger if exists ca_components_set_updated_at on public.ca_components;
create trigger ca_components_set_updated_at
  before update on public.ca_components
  for each row
  execute function public.set_updated_at();