import { supabase } from '../supabase'

// ---------- Grading scale ----------

export interface GradeBand {
  grade: string
  min: number
  max: number
}

export const NIGERIA_GRADING_SCALE: GradeBand[] = [
  { grade: 'A', min: 70, max: 100 },
  { grade: 'B', min: 60, max: 69 },
  { grade: 'C', min: 50, max: 59 },
  { grade: 'D', min: 45, max: 49 },
  { grade: 'E', min: 40, max: 44 },
  { grade: 'F', min: 0, max: 39 },
]

export function lookupGrade(
  total: number | null,
  scale: GradeBand[] = NIGERIA_GRADING_SCALE
): string | null {
  if (total === null || isNaN(total)) return null
  for (const band of scale) {
    if (total >= band.min && total <= band.max) return band.grade
  }
  return null
}

// ---------- CA Components ----------

export interface CaComponent {
  id: string
  account_id: string
  name: string
  max_score: number
  weight: number
  sort_order: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function listCaComponents(
  accountId: string
): Promise<{ data: CaComponent[]; error: string | null }> {
  const { data, error } = await supabase
    .from('ca_components')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as CaComponent[], error: null }
}

export interface CreateCaComponentInput {
  accountId: string
  name: string
  max_score: number
  weight: number
  sort_order: number
}

export async function createCaComponent(
  input: CreateCaComponentInput
): Promise<{ data: CaComponent | null; error: string | null }> {
  const name = input.name.trim()
  if (!name) return { data: null, error: 'Name is required' }
  if (input.max_score <= 0) return { data: null, error: 'Max score must be positive' }
  if (input.weight <= 0) return { data: null, error: 'Weight must be positive' }

  const { data, error } = await supabase
    .from('ca_components')
    .insert({
      account_id: input.accountId,
      name,
      max_score: input.max_score,
      weight: input.weight,
      sort_order: input.sort_order,
    })
    .select('*')
    .single()

  if (error) {
    if (error.message.includes('ca_components_account_name_unique')) {
      return { data: null, error: 'A component with this name already exists.' }
    }
    return { data: null, error: error.message }
  }
  return { data: data as CaComponent, error: null }
}

export async function updateCaComponent(
  id: string,
  updates: { name?: string; max_score?: number; weight?: number; sort_order?: number }
): Promise<{ data: CaComponent | null; error: string | null }> {
  const { data, error } = await supabase
    .from('ca_components')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (error.message.includes('ca_components_account_name_unique')) {
      return { data: null, error: 'A component with this name already exists.' }
    }
    return { data: null, error: error.message }
  }
  return { data: data as CaComponent, error: null }
}

export async function deleteCaComponent(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('ca_components').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// ---------- CA Scores ----------

export interface CaScore {
  id: string
  account_id: string
  participant_id: string
  program_id: string
  component_id: string
  score: number | null
  entered_by: string | null
  entered_at: string
}

export async function listCaScoresForProgram(
  programId: string
): Promise<{ data: CaScore[]; error: string | null }> {
  const { data, error } = await supabase
    .from('ca_scores')
    .select('*')
    .eq('program_id', programId)

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as CaScore[], error: null }
}

export interface UpsertCaScoreInput {
  accountId: string
  participantId: string
  programId: string
  componentId: string
  score: number | null
}

export async function upsertCaScore(
  input: UpsertCaScoreInput,
  currentUserId: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ca_scores')
    .upsert(
      {
        account_id: input.accountId,
        participant_id: input.participantId,
        program_id: input.programId,
        component_id: input.componentId,
        score: input.score,
        entered_by: currentUserId,
        entered_at: new Date().toISOString(),
      },
      { onConflict: 'participant_id,program_id,component_id' }
    )

  return { error: error?.message ?? null }
}

// ---------- Grades ----------

export interface GradeRow {
  id: string
  account_id: string
  participant_id: string
  program_id: string
  ca_total: number | null
  exam: number | null
  total: number | null
  grade: string | null
  grade_override: string | null
  locked: boolean
  entered_by: string | null
  entered_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function listGradesForProgram(
  programId: string
): Promise<{ data: GradeRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .eq('program_id', programId)

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as GradeRow[], error: null }
}

export interface UpsertGradeInput {
  accountId: string
  participantId: string
  programId: string
  ca_total?: number | null
  exam?: number | null
  total?: number | null
  grade?: string | null
  grade_override?: string | null
  locked?: boolean
}

export async function upsertGrade(
  input: UpsertGradeInput,
  currentUserId: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('grades')
    .upsert(
      {
        account_id: input.accountId,
        participant_id: input.participantId,
        program_id: input.programId,
        ca_total: input.ca_total ?? null,
        exam: input.exam ?? null,
        total: input.total ?? null,
        grade: input.grade ?? null,
        grade_override: input.grade_override ?? null,
        locked: input.locked ?? false,
        entered_by: currentUserId,
        entered_at: new Date().toISOString(),
      },
      { onConflict: 'participant_id,program_id' }
    )

  return { error: error?.message ?? null }
}

// ---------- Computation ----------

export interface ComputedGrade {
  ca_total: number
  total: number
  grade: string
  is_complete: boolean
}

export function computeGrade(
  caScores: Array<{ component_id: string; score: number | null }>,
  components: CaComponent[],
  exam: number | null,
  scale: GradeBand[] = NIGERIA_GRADING_SCALE
): ComputedGrade {
  let ca_total = 0
  let is_complete = true

  for (const comp of components) {
    const entry = caScores.find((s) => s.component_id === comp.id)
    if (!entry || entry.score === null) {
      is_complete = false
      continue
    }
    ca_total += entry.score * comp.weight
  }

  if (exam === null) is_complete = false

  const total = ca_total + (exam ?? 0)
  const grade = lookupGrade(total, scale) ?? ''

  return {
    ca_total: Math.round(ca_total * 100) / 100,
    total: Math.round(total * 100) / 100,
    grade,
    is_complete,
  }
}