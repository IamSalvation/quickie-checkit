import { supabase } from '../supabase'

export interface OpenOnlineResult {
  ok: boolean
  code?: string
  expires_at?: string | null
  message?: string
}

export async function openOnlineCheckin(
  contextId: string,
  minutes: number | null
): Promise<{ data: OpenOnlineResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('open_online_checkin', {
    p_context_id: contextId,
    p_minutes: minutes,
  })
  if (error) return { data: null, error: error.message }
  return { data: data as OpenOnlineResult, error: null }
}

export async function closeOnlineCheckin(
  contextId: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('close_online_checkin', {
    p_context_id: contextId,
  })
  if (error) return { error: error.message }
  const result = data as { ok: boolean; message?: string }
  if (!result.ok) return { error: result.message ?? 'Could not close' }
  return { error: null }
}

export interface OnlineContextInfo {
  id: string
  label: string
  phase: 'in' | 'out'
  checkout_enabled: boolean
  id_entry_enabled: boolean
}

export interface OnlineLookupResult {
  ok: boolean
  code: 'ok' | 'unknown' | 'closed' | 'expired'
  message?: string
  context?: OnlineContextInfo
}

export async function onlineLookupContext(
  code: string
): Promise<{ data: OnlineLookupResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('online_lookup_context', {
    p_code: code,
  })
  if (error) return { data: null, error: error.message }
  return { data: data as OnlineLookupResult, error: null }
}

export interface OnlineCheckinResult {
  ok: boolean
  code:
    | 'checked_in'
    | 'checked_out'
    | 'already_checked_in'
    | 'not_checked_in'
    | 'unknown'
    | 'closed'
    | 'expired'
    | 'id_entry_disabled'
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

export async function onlineCheckin(
  code: string,
  systemId: string,
  method: 'id_entry_online' | 'qr_kiosk_online'
): Promise<{ data: OnlineCheckinResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('online_checkin', {
    p_code: code,
    p_system_id: systemId,
    p_method: method,
  })
  if (error) return { data: null, error: error.message }
  return { data: data as OnlineCheckinResult, error: null }
}

export function buildOnlineUrl(code: string): string {
  return `${window.location.origin}/k/${code}`
}