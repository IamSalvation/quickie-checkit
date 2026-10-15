import { supabase } from '../supabase'
import type { CaComponent } from './grades'

export interface GradedReportParticipant {
  id: string
  full_name: string
  system_id: string
  external_id: string | null
  photo_url: string | null
}

export interface GradedReportRow {
  participant: GradedReportParticipant
  attendancePct: number
  componentScores: Record<string, number | null>
  caTotal: number | null
  exam: number | null
  total: number | null
  grade: string | null
  gradeOverride: string | null
}

export interface GradedReport {
  components: CaComponent[]
  rows: GradedReportRow[]
  examMax: number
  averages: {
    attendancePct: number
    caTotal: number
    total: number
  }
}

export interface FetchGradedReportOptions {
  accountId: string
  programId: string
}

export async function fetchGradedReport(
  opts: FetchGradedReportOptions
): Promise<{ data: GradedReport | null; error: string | null }> {
  const { accountId, programId } = opts

  const { data: components, error: compErr } = await supabase
    .from('ca_components')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true })

  if (compErr) return { data: null, error: compErr.message }

  const { data: participants, error: partErr } = await supabase
    .from('participants')
    .select('id, full_name, system_id, external_id, photo_url')
    .eq('account_id', accountId)
    .order('full_name', { ascending: true })

  if (partErr) return { data: null, error: partErr.message }

  const { data: program } = await supabase
    .from('programs')
    .select('exam_max_score')
    .eq('id', programId)
    .maybeSingle()

  const examMax = (program?.exam_max_score ?? 100) as number

  const { data: contexts, error: ctxErr } = await supabase
    .from('contexts')
    .select('id')
    .eq('program_id', programId)

  if (ctxErr) return { data: null, error: ctxErr.message }

  const contextIds = (contexts ?? []).map((c) => c.id)

  let presenceRecords: Array<{
    participant_id: string
    context_id: string
    status: string
  }> = []

  if (contextIds.length > 0) {
    const { data: presence, error: presErr } = await supabase
      .from('presence_records')
      .select('participant_id, context_id, status')
      .in('context_id', contextIds)

    if (presErr) return { data: null, error: presErr.message }
    presenceRecords = presence ?? []
  }

  const { data: caScores, error: scoreErr } = await supabase
    .from('ca_scores')
    .select('participant_id, component_id, score')
    .eq('program_id', programId)

  if (scoreErr) return { data: null, error: scoreErr.message }

  const { data: grades, error: gradeErr } = await supabase
    .from('grades')
    .select(
      'participant_id, ca_total, exam, total, grade, grade_override'
    )
    .eq('program_id', programId)

  if (gradeErr) return { data: null, error: gradeErr.message }

  // Count DISTINCT contexts where the participant was present.
  // A participant can have multiple presence records for the same context
  // (e.g. kiosk + online check-in in the same session), so we dedupe.
  const presentSet = new Map<string, Set<string>>()
  for (const r of presenceRecords) {
    if (r.status !== 'present') continue
    const set = presentSet.get(r.participant_id) ?? new Set<string>()
    set.add(r.context_id)
    presentSet.set(r.participant_id, set)
  }

  const scoreMap = new Map<string, number | null>()
  for (const s of caScores ?? []) {
    scoreMap.set(s.participant_id + '|' + s.component_id, s.score)
  }

  const gradeMap = new Map<
    string,
    {
      ca_total: number | null
      exam: number | null
      total: number | null
      grade: string | null
      grade_override: string | null
    }
  >()
  for (const g of grades ?? []) {
    gradeMap.set(g.participant_id, {
      ca_total: g.ca_total,
      exam: g.exam,
      total: g.total,
      grade: g.grade,
      grade_override: g.grade_override,
    })
  }

  const totalContexts = contextIds.length

  const rows: GradedReportRow[] = (participants ?? []).map((p) => {
    const presentCount = presentSet.get(p.id)?.size ?? 0
    const attendancePct =
      totalContexts === 0
        ? 0
        : Math.min(
            100,
            Math.round((presentCount / totalContexts) * 100)
          )

    const componentScores: Record<string, number | null> = {}
    for (const c of components ?? []) {
      componentScores[c.id] = scoreMap.get(p.id + '|' + c.id) ?? null
    }

    const g = gradeMap.get(p.id)
    return {
      participant: p,
      attendancePct,
      componentScores,
      caTotal: g?.ca_total ?? null,
      exam: g?.exam ?? null,
      total: g?.total ?? null,
      grade: g?.grade ?? null,
      gradeOverride: g?.grade_override ?? null,
    }
  })

  const rowsWithCA = rows.filter((r) => r.caTotal !== null)
  const rowsWithTotal = rows.filter((r) => r.total !== null)

  const avgAttendance =
    rows.length === 0
      ? 0
      : Math.round(
          rows.reduce((sum, r) => sum + r.attendancePct, 0) / rows.length
        )

  const avgCA =
    rowsWithCA.length === 0
      ? 0
      : Math.round(
          (rowsWithCA.reduce((sum, r) => sum + (r.caTotal ?? 0), 0) /
            rowsWithCA.length) *
            100
        ) / 100

  const avgTotal =
    rowsWithTotal.length === 0
      ? 0
      : Math.round(
          (rowsWithTotal.reduce((sum, r) => sum + (r.total ?? 0), 0) /
            rowsWithTotal.length) *
            100
        ) / 100

  return {
    data: {
      components: (components ?? []) as CaComponent[],
      rows,
      examMax,
      averages: {
        attendancePct: avgAttendance,
        caTotal: avgCA,
        total: avgTotal,
      },
    },
    error: null,
  }
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function gradedReportToCsv(report: GradedReport): string {
  const headers = [
    'Name',
    'System ID',
    'External ID',
    'Attendance %',
    ...report.components.map((c) => c.name + ' /' + c.max_score),
    'CA',
    'Exam',
    'Total',
    'Grade',
  ]

  const lines: string[] = [headers.map(csvEscape).join(',')]

  for (const r of report.rows) {
    const componentCols = report.components.map((c) => {
      const v = r.componentScores[c.id]
      return v === null || v === undefined ? '' : v
    })
    const line = [
      r.participant.full_name,
      r.participant.system_id,
      r.participant.external_id ?? '',
      r.attendancePct + '%',
      ...componentCols,
      r.caTotal ?? '',
      r.exam ?? '',
      r.total ?? '',
      r.gradeOverride ?? r.grade ?? '',
    ]
    lines.push(line.map(csvEscape).join(','))
  }

  return lines.join('\n')
}