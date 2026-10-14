import { supabase } from '../supabase'

export type PresenceMethod =
  | 'qr_kiosk_inperson'
  | 'qr_kiosk_online'
  | 'id_entry_online'
  | 'manual'
  | 'face_verified'

export type PresenceMode = 'in_person' | 'online'
export type PresenceStatus = 'present' | 'absent'

export interface PresenceRecord {
  id: string
  account_id: string
  participant_id: string
  context_id: string
  kiosk_id: string | null
  checked_in_at: string
  checked_out_at: string | null
  method: PresenceMethod
  mode: PresenceMode
  verified: boolean
  face_score: number | null
  photo_url: string | null
  needs_review: boolean
  status: PresenceStatus
  resolved_by: string | null
  resolved_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PresenceWithParticipant extends PresenceRecord {
  participant: {
    id: string
    full_name: string
    system_id: string
    external_id: string | null
    photo_url: string | null
  } | null
}

export async function listPresenceForContext(
  contextId: string,
  opts: { limit?: number } = {}
): Promise<{
  data: PresenceWithParticipant[]
  count: number
  error: string | null
}> {
  const limit = opts.limit ?? 500

  const { data, count, error } = await supabase
    .from('presence_records')
    .select(
      '*, participant:participants(id, full_name, system_id, external_id, photo_url)',
      { count: 'exact' }
    )
    .eq('context_id', contextId)
    .order('checked_in_at', { ascending: false })
    .limit(limit)

  if (error) return { data: [], count: 0, error: error.message }

  const rows = (data ?? []).map((row) => {
    const participant = Array.isArray(row.participant)
      ? row.participant[0]
      : row.participant
    return {
      ...row,
      participant: participant ?? null,
    } as PresenceWithParticipant
  })

  return { data: rows, count: count ?? 0, error: null }
}

export interface KioskCheckinResult {
  ok: boolean
  code:
    | 'checked_in'
    | 'checked_out'
    | 'already_checked_in'
    | 'not_checked_in'
    | 'unknown_device'
    | 'device_revoked'
    | 'no_open_context'
    | 'unknown_participant'
  message: string
  participant?: {
    id: string
    full_name: string
    system_id: string
    photo_url: string | null
  }
  record?: {
    id: string
    checked_in_at: string
    checked_out_at?: string | null
  }
  context?: {
    id: string
    label: string
  }
  checked_in_at?: string
}

export async function kioskCheckin(
  deviceToken: string,
  systemId: string
): Promise<{ data: KioskCheckinResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('kiosk_checkin', {
    p_device_token: deviceToken,
    p_system_id: systemId,
  })

  if (error) return { data: null, error: error.message }
  return { data: data as KioskCheckinResult, error: null }
}

export interface KioskContextResult {
  ok: boolean
  code: 'ok' | 'unknown_device' | 'device_revoked' | 'no_open_context'
  message: string
  kiosk?: { id: string; label: string }
  context?: {
    id: string
    label: string
    checkout_enabled: boolean
    phase?: 'in' | 'out'
  }
}

export async function kioskLookupContext(
  deviceToken: string
): Promise<{ data: KioskContextResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('kiosk_lookup_context', {
    p_device_token: deviceToken,
  })

  if (error) return { data: null, error: error.message }
  return { data: data as KioskContextResult, error: null }
}

export async function updatePresencePhoto(
  recordId: string,
  photoUrl: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('presence_records')
    .update({ photo_url: photoUrl })
    .eq('id', recordId)
  return { error: error?.message ?? null }
}

/**
 * Resolve a flagged record: mark them as checked out at a given time.
 */
export async function resolveCheckout(
  presenceId: string,
  checkedOutAt: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('resolve_checkout', {
    p_presence_id: presenceId,
    p_checked_out_at: checkedOutAt,
  })

  if (error) return { error: error.message }

  const result = data as { ok: boolean; message?: string }
  if (!result.ok) return { error: result.message ?? 'Could not resolve' }
  return { error: null }
}

/**
 * Resolve a flagged record: mark them as absent (not counted in attendance).
 */
export async function resolveAbsent(
  presenceId: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('resolve_absent', {
    p_presence_id: presenceId,
  })

  if (error) return { error: error.message }

  const result = data as { ok: boolean; message?: string }
  if (!result.ok) return { error: result.message ?? 'Could not resolve' }
  return { error: null }
}