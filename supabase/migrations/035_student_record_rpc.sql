-- 035_student_record_rpc.sql
-- Public RPC to fetch a student's attendance and grades by system_id.
-- The sessions list shows every check-in (audit trail preserved).
-- Attendance percent is calculated using DISTINCT contexts attended, not raw check-in count.

create or replace function public.get_student_record(p_system_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant record;
  v_account record;
  v_result jsonb;
begin
  select id, account_id, full_name, system_id, external_id
  into v_participant
  from public.participants
  where lower(system_id) = lower(p_system_id)
  limit 1;

  if v_participant.id is null then return null; end if;

  select name, slug into v_account
  from public.accounts where id = v_participant.account_id;

  select jsonb_build_object(
    'student', jsonb_build_object(
      'full_name', v_participant.full_name,
      'system_id', v_participant.system_id,
      'external_id', v_participant.external_id
    ),
    'account', jsonb_build_object('name', v_account.name),
    'courses', coalesce(
      (
        select jsonb_agg(course_data order by course_data->>'code')
        from (
          select jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'code', p.code,
            'sessions', coalesce(
              (
                select jsonb_agg(session_data order by session_data->>'checked_in_at' desc)
                from (
                  select jsonb_build_object(
                    'id', c.id,
                    'label', c.label,
                    'date', c.starts_at,
                    'status', case when pr.id is not null then 'Present' else 'Absent' end,
                    'checked_in_at', pr.checked_in_at,
                    'method', pr.method
                  ) as session_data
                  from public.contexts c
                  left join public.presence_records pr
                    on pr.context_id = c.id and pr.participant_id = v_participant.id
                  where c.program_id = p.id
                ) s
              ),
              '[]'::jsonb
            ),
            'attendance', jsonb_build_object(
              'total', (select count(*) from public.contexts c2 where c2.program_id = p.id),
              'present', (
                select count(distinct pr2.context_id)
                from public.presence_records pr2
                join public.contexts c3 on c3.id = pr2.context_id
                where c3.program_id = p.id and pr2.participant_id = v_participant.id
              ),
              'percent', (
                select case
                  when count(distinct c4.id) = 0 then 0
                  else round(
                    (count(distinct pr3.context_id)::numeric / count(distinct c4.id)::numeric) * 100
                  )
                end
                from public.contexts c4
                left join public.presence_records pr3
                  on pr3.context_id = c4.id and pr3.participant_id = v_participant.id
                where c4.program_id = p.id
              )
            ),
            'grade', (
              select jsonb_build_object(
                'ca_total', g.ca_total,
                'exam', g.exam,
                'total', g.total,
                'grade', coalesce(g.grade_override, g.grade)
              )
              from public.grades g
              where g.program_id = p.id and g.participant_id = v_participant.id
            )
          ) as course_data
          from public.programs p
          where p.account_id = v_participant.account_id
            and (
              exists (select 1 from public.grades g2 where g2.program_id = p.id and g2.participant_id = v_participant.id)
              or
              exists (
                select 1 from public.presence_records pr4
                join public.contexts c5 on c5.id = pr4.context_id
                where c5.program_id = p.id and pr4.participant_id = v_participant.id
              )
            )
        ) c
      ),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_student_record(text) to anon, authenticated;