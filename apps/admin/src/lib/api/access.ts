import { supabase } from '../supabase'

export type AccessState = 'active' | 'grace' | 'locked'

export interface AccountUsage {
  participants: number
  programs: number
  contexts_this_month: number
  kiosks: number
  max_participants: number
  max_programs: number
  max_contexts: number
  max_kiosks: number
  access_expires_at: string | null
  lockout_grace_days: number
  state: AccessState
}

/**
 * Returns active | grace | locked for the given account.
 * Falls back to 'active' on error so a network blip doesn't lock users out.
 */
export async function getAccessState(
  accountId: string
): Promise<{ data: AccessState; error: string | null }> {
  const { data, error } = await supabase.rpc('account_access_state', {
    p_account_id: accountId,
  })
  if (error || !data) {
    return { data: 'active', error: error?.message ?? null }
  }
  return { data: data as AccessState, error: null }
}

/**
 * Returns usage + caps + state as a single object.
 */
export async function getAccountUsage(
  accountId: string
): Promise<{ data: AccountUsage | null; error: string | null }> {
  const { data, error } = await supabase.rpc('account_usage', {
    p_account_id: accountId,
  })
  if (error || !data) {
    return { data: null, error: error?.message ?? null }
  }
  return { data: data as AccountUsage, error: null }
}

/**
 * Which resources are at/over their cap.
 */
export interface CapStatus {
  participants: boolean
  programs: boolean
  contexts: boolean
  kiosks: boolean
}

export function capStatus(usage: AccountUsage): CapStatus {
  return {
    participants: usage.participants >= usage.max_participants,
    programs: usage.programs >= usage.max_programs,
    contexts: usage.contexts_this_month >= usage.max_contexts,
    kiosks: usage.kiosks >= usage.max_kiosks,
  }
}

/**
 * Human-readable "used / cap" string.
 */
export function usageLabel(used: number, cap: number): string {
  return used + ' / ' + cap
}

/**
 * Days until expiry (can be negative if past).
 * Returns null if access_expires_at is null (never expires).
 */
export function daysUntilExpiry(
  accessExpiresAt: string | null
): number | null {
  if (!accessExpiresAt) return null
  const ms = new Date(accessExpiresAt).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}