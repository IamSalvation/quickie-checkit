import { supabase } from '../supabase'
import type { Account, AccountTier } from '../../types/db'

export interface AccountWithCounts extends Account {
  operator_count: number
  participant_count: number
  context_count: number
}

export interface AccountOperator {
  id: string
  email: string
  full_name: string | null
  role: string
  is_owner: boolean
  is_platform_admin: boolean
  status: string
  created_at: string
}

export interface AccountStats {
  participants: number
  contexts: number
  kiosks: number
  presence_records: number
  face_enrollments: number
}

export interface AccountDetail {
  account: Account
  operators: AccountOperator[]
  stats: AccountStats
}

export async function listAllAccounts(): Promise<{
  data: AccountWithCounts[]
  error: string | null
}> {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  if (!accounts) return { data: [], error: null }

  const withCounts: AccountWithCounts[] = []
  for (const a of accounts as Account[]) {
    const [ops, parts, ctxs] = await Promise.all([
      supabase
        .from('operators')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', a.id),
      supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', a.id),
      supabase
        .from('contexts')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', a.id),
    ])

    withCounts.push({
      ...a,
      operator_count: ops.count ?? 0,
      participant_count: parts.count ?? 0,
      context_count: ctxs.count ?? 0,
    })
  }

  return { data: withCounts, error: null }
}

export async function getAccountDetail(id: string): Promise<{
  data: AccountDetail | null
  error: string | null
}> {
  const { data: account, error: acctErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (acctErr || !account) {
    return { data: null, error: acctErr?.message ?? 'Account not found' }
  }

  const { data: operators } = await supabase
    .from('operators')
    .select(
      'id, email, full_name, role, is_owner, is_platform_admin, status, created_at'
    )
    .eq('account_id', id)
    .order('created_at', { ascending: true })

  const [parts, ctxs, kiosks, records, faceEnrolls] = await Promise.all([
    supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id),
    supabase
      .from('contexts')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id),
    supabase
      .from('kiosks')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id),
    supabase
      .from('presence_records')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id),
    supabase
      .from('participant_face_embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id),
  ])

  return {
    data: {
      account: account as Account,
      operators: (operators ?? []) as AccountOperator[],
      stats: {
        participants: parts.count ?? 0,
        contexts: ctxs.count ?? 0,
        kiosks: kiosks.count ?? 0,
        presence_records: records.count ?? 0,
        face_enrollments: faceEnrolls.count ?? 0,
      },
    },
    error: null,
  }
}

async function setAccountStatus(
  id: string,
  status: 'pending' | 'active' | 'paused' | 'deleted'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('accounts')
    .update({ status })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function approveAccount(id: string) {
  return setAccountStatus(id, 'active')
}

export async function pauseAccount(id: string) {
  return setAccountStatus(id, 'paused')
}

export async function restoreAccount(id: string) {
  return setAccountStatus(id, 'active')
}

export async function softDeleteAccount(id: string) {
  return setAccountStatus(id, 'deleted')
}

export async function upgradeTier(
  id: string,
  tier: AccountTier
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('accounts')
    .update({ tier })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function hardDeleteAccount(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export function accountStatusClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700'
    case 'pending':
      return 'bg-amber-50 text-amber-700'
    case 'paused':
      return 'bg-orange-50 text-orange-700'
    case 'deleted':
      return 'bg-red-50 text-red-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function accountTierClass(tier: string): string {
  switch (tier) {
    case 'v2':
      return 'bg-violet-50 text-violet-700'
    case 'v1':
    default:
      return 'bg-slate-100 text-slate-700'
  }
}