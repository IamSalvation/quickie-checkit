import { supabase } from '../supabase'
import type { AccountPreset } from '../../types/db'

export type ContextType =
  | 'lecture'
  | 'talk'
  | 'module'
  | 'stay'
  | 'meeting'
  | 'checkpoint'
  | 'session'
  | 'custom'

export type ContextStatus = 'scheduled' | 'open' | 'closed' | 'cancelled'

export interface ContextRow {
  id: string
  account_id: string
  program_id: string | null
  type: ContextType
  label: string
  starts_at: string | null
  ends_at: string | null
  status: ContextStatus
  public_checkin_code: string | null
  public_checkin_open: boolean
  public_checkin_expires: string | null
  id_entry_enabled: boolean
  checkout_enabled: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Which context types to show per preset
export function contextTypesForPreset(
  preset: AccountPreset | undefined | null
): ContextType[] {
  switch (preset) {
    case 'school':
      return ['lecture', 'session']
    case 'symposium':
      return ['talk', 'session']
    case 'bootcamp':
      return ['module', 'session']
    case 'conference':
      return ['session']
    case 'hotel':
      return ['stay']
    case 'event':
      return ['checkpoint']
    default:
      return [
        'lecture',
        'talk',
        'module',
        'stay',
        'meeting',
        'checkpoint',
        'session',
        'custom',
      ]
  }
}

export const CONTEXT_TYPE_LABELS: Record<ContextType, string> = {
  lecture: 'Lecture',
  talk: 'Talk',
  module: 'Module',
  stay: 'Stay',
  meeting: 'Meeting',
  checkpoint: 'Checkpoint',
  session: 'Session',
  custom: 'Custom',
}

export interface ListContextsOptions {
  search?: string
  programId?: string | 'all'
  status?: ContextStatus | 'all'
  limit?: number
  offset?: number
}

export interface ContextWithProgram extends ContextRow {
  program: { id: string; name: string; code: string | null } | null
}

export async function listContexts(
  accountId: string,
  opts: ListContextsOptions = {}
): Promise<{
  data: ContextWithProgram[]
  count: number
  error: string | null
}> {
  const limit = opts.limit ?? 100
  const offset = opts.offset ?? 0

  let query = supabase
    .from('contexts')
    .select('*, program:programs(id, name, code)', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.programId && opts.programId !== 'all') {
    query = query.eq('program_id', opts.programId)
  }
  if (opts.status && opts.status !== 'all') {
    query = query.eq('status', opts.status)
  }
  if (opts.search && opts.search.trim()) {
    query = query.ilike('label', `%${opts.search.trim()}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], count: 0, error: error.message }
  }

  const rows = (data ?? []).map((row) => {
    const program = Array.isArray(row.program) ? row.program[0] : row.program
    return { ...row, program: program ?? null } as ContextWithProgram
  })

  return { data: rows, count: count ?? 0, error: null }
}

export async function getContext(
  id: string
): Promise<{ data: ContextWithProgram | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contexts')
    .select('*, program:programs(id, name, code)')
    .eq('id', id)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: 'Not found' }

  const program = Array.isArray(data.program) ? data.program[0] : data.program
  return { data: { ...data, program: program ?? null } as ContextWithProgram, error: null }
}

export interface CreateContextInput {
  accountId: string
  label: string
  type: ContextType
  programId?: string | null
  startsAt?: string | null
  endsAt?: string | null
  checkoutEnabled?: boolean
  idEntryEnabled?: boolean
}

export async function createContext(
  input: CreateContextInput
): Promise<{ data: ContextRow | null; error: string | null }> {
  const label = input.label.trim()
  if (!label) return { data: null, error: 'Label is required' }

  const { data, error } = await supabase
    .from('contexts')
    .insert({
      account_id: input.accountId,
      label,
      type: input.type,
      program_id: input.programId || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      checkout_enabled: input.checkoutEnabled ?? false,
      id_entry_enabled: input.idEntryEnabled ?? false,
      status: 'scheduled',
    })
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as ContextRow, error: null }
}

export async function updateContext(
  id: string,
  updates: {
    label?: string
    type?: ContextType
    program_id?: string | null
    starts_at?: string | null
    ends_at?: string | null
    checkout_enabled?: boolean
    id_entry_enabled?: boolean
  }
): Promise<{ data: ContextRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contexts')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as ContextRow, error: null }
}

export async function openContext(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('contexts')
    .update({ status: 'open' })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function closeContext(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('contexts')
    .update({ status: 'closed' })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteContext(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('contexts').delete().eq('id', id)
  return { error: error?.message ?? null }
}