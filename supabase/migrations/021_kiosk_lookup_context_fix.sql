-- 021_kiosk_lookup_context_fix.sql
-- Update kiosk_lookup_context to respect the kiosk's context_id binding.
-- Falls back to any open context for the account if unbound.

create or replace function public.kiosk_lookup_context(p_device_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kiosk record;
  v_context record;
begin
  select k.id, k.account_id, k.status, k.label, k.context_id
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

  if v_kiosk.context_id is not null then
    select c.id, c.label, c.starts_at, c.ends_at, c.status, c.checkout_enabled, c.phase
      into v_context
    from public.contexts c
    where c.id = v_kiosk.context_id
      and c.status = 'open'
    limit 1;

    if v_context.id is null then
      return jsonb_build_object(
        'ok', false,
        'code', 'no_open_context',
        'message', 'Waiting for staff to open this session.'
      );
    end if;
  else
    select c.id, c.label, c.starts_at, c.ends_at, c.status, c.checkout_enabled, c.phase
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
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'ok',
    'kiosk', jsonb_build_object('id', v_kiosk.id, 'label', v_kiosk.label),
    'context', jsonb_build_object(
      'id', v_context.id,
      'label', v_context.label,
      'checkout_enabled', v_context.checkout_enabled,
      'phase', v_context.phase
    )
  );
end;
$$;