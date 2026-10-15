-- 024_grades_v2.sql
-- Grade entry v2: exam_max per program, auto_from_attendance flag,
-- atomic grade recompute RPCs (single + batch).-- 024_grades_v2.sql
-- Grade entry v2: exam_max per program, auto-from-attendance CA component,
-- atomic grade recompute RPCs.

-- 1. Exam max score per program
alter table public.programs
  add column if not exists exam_max_score numeric(6,2) not null default 100;

-- 2. Auto-from-attendance flag on CA components
alter table public.ca_components
  add column if not exists auto_from_attendance boolean not null default false;

-- 3. Recompute a single participant's grade for a program
create or replace function public.recompute_grade(
  p_participant_id uuid,
  p_program_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_exam numeric;
  v_ca_total numeric := 0;
  v_total numeric;
  v_grade text;
  v_comp record;
  v_score numeric;
  v_present_count int;
  v_total_contexts int;
  v_auto_score numeric;
  v_attendance_pct numeric;
  v_band record;
  v_scale jsonb;
begin
  -- Get account_id + exam_max via program
  select p.account_id, p.exam_max_score
    into v_account_id, v_exam
  from public.programs p
  where p.id = p_program_id;

  if v_account_id is null then
    return jsonb_build_object('ok', false, 'message', 'Program not found.');
  end if;

  -- Get exam from existing grade row (if any)
  select g.exam into v_exam
  from public.grades g
  where g.participant_id = p_participant_id and g.program_id = p_program_id;

  -- Compute CA total by iterating components
  for v_comp in
    select id, max_score, weight, auto_from_attendance
    from public.ca_components
    where account_id = v_account_id
    order by sort_order
  loop
    -- Check for a manual score first
    select cs.score into v_score
    from public.ca_scores cs
    where cs.participant_id = p_participant_id
      and cs.program_id = p_program_id
      and cs.component_id = v_comp.id;

    if v_score is null and v_comp.auto_from_attendance then
      -- Auto from attendance
      select count(*) into v_total_contexts
      from public.contexts c
      where c.program_id = p_program_id;

      if v_total_contexts > 0 then
        select count(*) into v_present_count
        from public.presence_records pr
        join public.contexts c on c.id = pr.context_id
        where c.program_id = p_program_id
          and pr.participant_id = p_participant_id
          and pr.status = 'present';

        v_attendance_pct := (v_present_count::numeric / v_total_contexts::numeric);
        v_auto_score := round((v_attendance_pct * v_comp.max_score * v_comp.weight) * 2) / 2;
        v_score := v_auto_score;
      end if;
    end if;

    if v_score is not null then
      v_ca_total := v_ca_total + (v_score * v_comp.weight);
    end if;
  end loop;

  v_ca_total := round(v_ca_total * 100) / 100;
  v_total := v_ca_total + coalesce(v_exam, 0);

  -- Lookup grade from account grading_scale (jsonb array of {grade,min,max})
  -- Fallback to Nigeria default
  select a.grading_scale into v_scale
  from public.accounts a
  where a.id = v_account_id;

  if v_scale is null then
    v_scale := '[
      {"grade":"A","min":70,"max":100},
      {"grade":"B","min":60,"max":69},
      {"grade":"C","min":50,"max":59},
      {"grade":"D","min":45,"max":49},
      {"grade":"E","min":40,"max":44},
      {"grade":"F","min":0,"max":39}
    ]'::jsonb;
  end if;

  v_grade := null;
  for v_band in select * from jsonb_to_recordset(v_scale)
    as x(grade text, min numeric, max numeric)
  loop
    if v_total >= v_band.min and v_total <= v_band.max then
      v_grade := v_band.grade;
      exit;
    end if;
  end loop;

  -- Upsert the grade row
  insert into public.grades (
    account_id, participant_id, program_id, ca_total, exam, total, grade
  )
  values (
    v_account_id, p_participant_id, p_program_id, v_ca_total, v_exam, v_total, v_grade
  )
  on conflict (participant_id, program_id)
  do update set
    ca_total = excluded.ca_total,
    exam = excluded.exam,
    total = excluded.total,
    grade = excluded.grade,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'ca_total', v_ca_total,
    'exam', v_exam,
    'total', v_total,
    'grade', v_grade
  );
end;
$$;

grant execute on function public.recompute_grade(uuid, uuid) to authenticated;

-- 4. Recompute all grades for a program
create or replace function public.recompute_all_grades(p_program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_participant record;
  v_count int := 0;
begin
  select account_id into v_account_id
  from public.programs where id = p_program_id;

  if v_account_id is null then
    return jsonb_build_object('ok', false, 'message', 'Program not found.');
  end if;

  if not (public.is_platform_admin() or v_account_id = public.current_account_id()) then
    return jsonb_build_object('ok', false, 'message', 'Not allowed.');
  end if;

  for v_participant in
    select id from public.participants where account_id = v_account_id
  loop
    perform public.recompute_grade(v_participant.id, p_program_id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'recomputed', v_count);
end;
$$;

grant execute on function public.recompute_all_grades(uuid) to authenticated;