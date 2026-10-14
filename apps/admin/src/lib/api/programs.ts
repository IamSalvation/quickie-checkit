import { supabase } from '../supabase'

export type ProgramType =
  | 'course'
  | 'track'
  | 'cohort'
  | 'room'
  | 'service'
  | 'group'
  | 'custom'

export type ProgramStatus = 'active' | 'archived'

export interface Program {
  id: string
  account_id: string
  name: string
  code: string | null
  type: ProgramType
  description: string | null
  status: ProgramStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ListProgramsOptions {
  search?: string
  type?: ProgramType | 'all'
  status?: ProgramStatus | 'all'
  limit?: number
  offset?: number
}

export async function listPrograms(
  accountId: string,
  opts: ListProgramsOptions = {}
): Promise<{ data: Program[]; count: number; error: string | null }> {
  const limit = opts.limit ?? 100
  const offset = opts.offset ?? 0

  let query = supabase
    .from('programs')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status && opts.status !== 'all') {
    query = query.eq('status', opts.status)
  }
  if (opts.type && opts.type !== 'all') {
    query = query.eq('type', opts.type)
  }
  if (opts.search && opts.search.trim()) {
    const s = opts.search.trim()
    query = query.or(`name.ilike.%${s}%,code.ilike.%${s}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], count: 0, error: error.message }
  }

  return { data: (data ?? []) as Program[], count: count ?? 0, error: null }
}

export interface CreateProgramInput {
  accountId: string
  name: string
  code?: string | null
  type: ProgramType
  description?: string | null
}

export async function createProgram(
  input: CreateProgramInput
): Promise<{ data: Program | null; error: string | null }> {
  const name = input.name.trim()
  if (!name) return { data: null, error: 'Name is required' }

  const { data, error } = await supabase
    .from('programs')
    .insert({
      account_id: input.accountId,
      name,
      code: input.code?.trim() || null,
      type: input.type,
      description: input.description?.trim() || null,
    })
    .select('*')
    .single()

  if (error) {
    // Unique constraint on (account_id, lower(code)) when code is present
    if (error.message.includes('programs_account_code_unique')) {
      return { data: null, error: 'That code is already used in this account.' }
    }
    return { data: null, error: error.message }
  }

  return { data: data as Program, error: null }
}

export async function updateProgram(
  id: string,
  updates: {
    name?: string
    code?: string | null
    type?: ProgramType
    description?: string | null
  }
): Promise<{ data: Program | null; error: string | null }> {
  const { data, error } = await supabase
    .from('programs')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (error.message.includes('programs_account_code_unique')) {
      return { data: null, error: 'That code is already used in this account.' }
    }
    return { data: null, error: error.message }
  }

  return { data: data as Program, error: null }
}

export async function archiveProgram(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programs')
    .update({ status: 'archived' })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function restoreProgram(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programs')
    .update({ status: 'active' })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteProgram(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('programs').delete().eq('id', id)
  return { error: error?.message ?? null }
}