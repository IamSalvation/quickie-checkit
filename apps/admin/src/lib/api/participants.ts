import { supabase } from '../supabase'
import type { Account } from '../../types/db'

export interface Participant {
  id: string
  account_id: string
  full_name: string
  system_id: string
  external_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ListParticipantsOptions {
  search?: string
  limit?: number
  offset?: number
}

export async function listParticipants(
  accountId: string,
  opts: ListParticipantsOptions = {}
): Promise<{ data: Participant[]; count: number; error: string | null }> {
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  let query = supabase
    .from('participants')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.search && opts.search.trim()) {
    const s = opts.search.trim()
    query = query.or(
      `full_name.ilike.%${s}%,system_id.ilike.%${s}%,external_id.ilike.%${s}%`
    )
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], count: 0, error: error.message }
  }

  return { data: (data ?? []) as Participant[], count: count ?? 0, error: null }
}

export async function getParticipant(
  id: string
): Promise<{ data: Participant | null; error: string | null }> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: 'Not found' }
  return { data: data as Participant, error: null }
}

export interface CreateParticipantInput {
  accountId: string
  fullName: string
  externalId?: string | null
}

export async function createParticipant(
  input: CreateParticipantInput
): Promise<{ data: Participant | null; error: string | null }> {
  const fullName = input.fullName.trim()
  if (!fullName) {
    return { data: null, error: 'Name is required' }
  }

  const { data: sysId, error: rpcError } = await supabase.rpc(
    'next_participant_system_id',
    { p_account_id: input.accountId }
  )

  if (rpcError || !sysId) {
    return {
      data: null,
      error: rpcError?.message ?? 'Could not generate system_id',
    }
  }

  const externalId = input.externalId?.trim() || null

  const { data, error } = await supabase
    .from('participants')
    .insert({
      account_id: input.accountId,
      full_name: fullName,
      system_id: sysId,
      external_id: externalId,
    })
    .select('*')
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as Participant, error: null }
}

export async function updateParticipant(
  id: string,
  updates: { full_name?: string; external_id?: string | null }
): Promise<{ data: Participant | null; error: string | null }> {
  const { data, error } = await supabase
    .from('participants')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as Participant, error: null }
}

export async function deleteParticipant(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('participants').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export function useAccountId(account: Account | null): string | null {
  return account?.id ?? null
}