-- 017_kiosk_checkin_returns_photo.sql
-- Add participant.photo_url to the kiosk_checkin RPC response so the kiosk
-- success screen can display the enrollment photo.
--
-- This migration replaces the previous function body — same behavior,
-- just includes photo_url in the "participant" jsonb.

create or replace function public.kiosk_checkin(
  p_device_token text,
  p_system_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kiosk record;
  v_context record;
  v_participant record;
  v_existing record;
  v_record record;
begin
  select k.id, k.account_id, k.status
    into v_kiosk
  from public.kiosks k
  where k.device_token = p_device_token
  limit 1;

  if v_kiosk.id is null then
    return jsonb_build_object('ok', false, 'code', 'unknown_device', 'message', 'Device not recognised.');
  end if;

  if v_kiosk.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'device_revoked', 'message', 'This kiosk has been revoked.');
  end if;

  select c.id, c.account_id, c.label, c.checkout_enabled
    into v_context
  from public.contexts c
  where c.account_id = v_kiosk.account_id
    and c.status = 'open'
  order by c.starts_at desc nulls last, c.created_at desc
  limit 1;

  if v_context.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'no_open_context',
      'message', 'No open session. Ask staff to open one.'
    );
  end if;

  select p.id, p.full_name, p.system_id, p.external_id, p.photo_url
    into v_participant
  from public.participants p
  where p.account_id = v_kiosk.account_id
    and lower(p.system_id) = lower(trim(p_system_id))
  limit 1;

  if v_participant.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'unknown_participant',
      'message', 'Badge not recognised.'
    );
  end if;

  select pr.id, pr.checked_in_at
    into v_existing
  from public.presence_records pr
  where pr.participant_id = v_participant.id
    and pr.context_id = v_context.id
    and pr.checked_out_at is null
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'ok', true,
      'code', 'already_checked_in',
      'message', 'Already checked in.',
      'participant', jsonb_build_object(
        'id', v_participant.id,
        'full_name', v_participant.full_name,
        'system_id', v_participant.system_id,
        'photo_url', v_participant.photo_url
      ),
      'checked_in_at', v_existing.checked_in_at
    );
  end if;

  insert into public.presence_records (
    account_id,
    participant_id,
    context_id,
    kiosk_id,
    method,
    mode,
    verified
  )
  values (
    v_kiosk.account_id,
    v_participant.id,
    v_context.id,
    v_kiosk.id,
    'qr_kiosk_inperson',
    'in_person',
    false
  )
  returning id, checked_in_at into v_record;

  update public.kiosks
  set last_seen_at = now()
  where id = v_kiosk.id;

  return jsonb_build_object(
    'ok', true,
    'code', 'checked_in',
    'message', 'Checked in.',
    'participant', jsonb_build_object(
      'id', v_participant.id,
      'full_name', v_participant.full_name,
      'system_id', v_participant.system_id,
      'photo_url', v_participant.photo_url
    ),
    'record', jsonb_build_object(
      'id', v_record.id,
      'checked_in_at', v_record.checked_in_at
    ),
    'context', jsonb_build_object(
      'id', v_context.id,
      'label', v_context.label
    )
  );
end;
$$;