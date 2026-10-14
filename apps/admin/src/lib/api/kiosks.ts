import { supabase } from '../supabase'

export type KioskStatus = 'active' | 'revoked'

export interface Kiosk {
  id: string
  account_id: string
  label: string
  location: string | null
  device_token: string
  status: KioskStatus
  metadata: Record<string, unknown>
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface ListKiosksOptions {
  status?: KioskStatus | 'all'
}

export async function listKiosks(
  accountId: string,
  opts: ListKiosksOptions = {}
): Promise<{ data: Kiosk[]; count: number; error: string | null }> {
  let query = supabase
    .from('kiosks')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (opts.status && opts.status !== 'all') {
    query = query.eq('status', opts.status)
  }

  const { data, count, error } = await query

  if (error) return { data: [], count: 0, error: error.message }
  return { data: (data ?? []) as Kiosk[], count: count ?? 0, error: null }
}

function generateDeviceToken(): string {
  // 32 url-safe chars. Uses crypto if available, else falls back.
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const base = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return base
}

export interface CreateKioskInput {
  accountId: string
  label: string
  location?: string | null
}

export async function createKiosk(
  input: CreateKioskInput
): Promise<{ data: Kiosk | null; error: string | null }> {
  const label = input.label.trim()
  if (!label) return { data: null, error: 'Label is required' }

  const { data, error } = await supabase
    .from('kiosks')
    .insert({
      account_id: input.accountId,
      label,
      location: input.location?.trim() || null,
      device_token: generateDeviceToken(),
      status: 'active',
    })
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Kiosk, error: null }
}

export async function revokeKiosk(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('kiosks')
    .update({ status: 'revoked' })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function restoreKiosk(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('kiosks')
    .update({ status: 'active' })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteKiosk(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('kiosks').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export function buildSetupUrl(deviceToken: string): string {
  return `${window.location.origin}/kiosk/setup/${deviceToken}`
}