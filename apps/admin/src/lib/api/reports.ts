import { supabase } from '../supabase'

export interface ReportParticipant {
  id: string
  full_name: string
  system_id: string
  external_id: string | null
  photo_url: string | null
}

export interface ReportContext {
  id: string
  label: string
  starts_at: string | null
  status: string
}

export type CellStatus = 'P' | 'A' | '-'

export interface MasterSheetRow {
  participant: ReportParticipant
  cells: Record<string, CellStatus>
  presentCount: number
  absentCount: number
  missingCount: number
  attendancePct: number
  onlineCount: number
  inPersonCount: number
}

export interface MasterSheet {
  contexts: ReportContext[]
  rows: MasterSheetRow[]
}

export interface FetchMasterSheetOptions {
  programId: string
  dateFrom?: string | null
  dateTo?: string | null
}

export async function fetchMasterSheet(
  accountId: string,
  opts: FetchMasterSheetOptions
): Promise<{ data: MasterSheet | null; error: string | null }> {
  // 1. Get all participants
  const { data: participants, error: partErr } = await supabase
    .from('participants')
    .select('id, full_name, system_id, external_id, photo_url')
    .eq('account_id', accountId)
    .order('full_name', { ascending: true })

  if (partErr) return { data: null, error: partErr.message }

  // 2. Get all contexts for this program
  let ctxQuery = supabase
    .from('contexts')
    .select('id, label, starts_at, status')
    .eq('account_id', accountId)
    .eq('program_id', opts.programId)
    .order('starts_at', { ascending: true, nullsFirst: true })

  if (opts.dateFrom) ctxQuery = ctxQuery.gte('starts_at', opts.dateFrom)
  if (opts.dateTo) ctxQuery = ctxQuery.lte('starts_at', opts.dateTo)

  const { data: contexts, error: ctxErr } = await ctxQuery
  if (ctxErr) return { data: null, error: ctxErr.message }

  if (!contexts || contexts.length === 0) {
    return {
      data: { contexts: [], rows: [] },
      error: null,
    }
  }

  const contextIds = contexts.map((c) => c.id)

  // 3. Get all presence records for those contexts
  const { data: records, error: recErr } = await supabase
    .from('presence_records')
    .select('participant_id, context_id, status, mode')
    .in('context_id', contextIds)

  if (recErr) return { data: null, error: recErr.message }

  // 4. Build matrix
  const recordMap = new Map<string, { status: string; mode: string }>()
  for (const r of records ?? []) {
    const key = `${r.participant_id}|${r.context_id}`
    // If multiple records exist for same key, prefer 'present'
    const existing = recordMap.get(key)
    if (!existing || (existing.status === 'absent' && r.status === 'present')) {
      recordMap.set(key, { status: r.status, mode: r.mode })
    }
  }

  const totalContexts = contexts.length
  const rows: MasterSheetRow[] = (participants ?? []).map((p) => {
    const cells: Record<string, CellStatus> = {}
    let presentCount = 0
    let absentCount = 0
    let missingCount = 0
    let onlineCount = 0
    let inPersonCount = 0

    for (const ctx of contexts) {
      const key = `${p.id}|${ctx.id}`
      const rec = recordMap.get(key)
      if (!rec) {
        cells[ctx.id] = '-'
        missingCount++
      } else if (rec.status === 'present') {
        cells[ctx.id] = 'P'
        presentCount++
        if (rec.mode === 'online') onlineCount++
        else inPersonCount++
      } else {
        cells[ctx.id] = 'A'
        absentCount++
      }
    }

    const attendancePct =
      totalContexts === 0
        ? 0
        : Math.round((presentCount / totalContexts) * 100)

    return {
      participant: p as ReportParticipant,
      cells,
      presentCount,
      absentCount,
      missingCount,
      attendancePct,
      onlineCount,
      inPersonCount,
    }
  })

  return {
    data: {
      contexts: contexts as ReportContext[],
      rows,
    },
    error: null,
  }
}

// ---------- Session Register ----------

export interface SessionRegisterRow {
  participant: ReportParticipant
  checked_in_at: string | null
  checked_out_at: string | null
  method: string | null
  mode: string | null
  status: 'present' | 'absent' | 'no_record'
  needs_review: boolean
}

export async function fetchSessionRegister(
  contextId: string
): Promise<{ data: SessionRegisterRow[] | null; error: string | null }> {
  // 1. Get context info
  const { data: context, error: ctxErr } = await supabase
    .from('contexts')
    .select('id, account_id')
    .eq('id', contextId)
    .maybeSingle()

  if (ctxErr || !context) {
    return { data: null, error: ctxErr?.message ?? 'Context not found' }
  }

  // 2. Get all participants
  const { data: participants, error: partErr } = await supabase
    .from('participants')
    .select('id, full_name, system_id, external_id, photo_url')
    .eq('account_id', context.account_id)
    .order('full_name', { ascending: true })

  if (partErr) return { data: null, error: partErr.message }

  // 3. Get presence records for this context
  const { data: records, error: recErr } = await supabase
    .from('presence_records')
    .select(
      'participant_id, checked_in_at, checked_out_at, method, mode, status, needs_review'
    )
    .eq('context_id', contextId)

  if (recErr) return { data: null, error: recErr.message }

  const recordMap = new Map<string, any>()
  for (const r of records ?? []) {
    recordMap.set(r.participant_id, r)
  }

  const rows: SessionRegisterRow[] = (participants ?? []).map((p) => {
    const rec = recordMap.get(p.id)
    if (!rec) {
      return {
        participant: p as ReportParticipant,
        checked_in_at: null,
        checked_out_at: null,
        method: null,
        mode: null,
        status: 'no_record',
        needs_review: false,
      }
    }
    return {
      participant: p as ReportParticipant,
      checked_in_at: rec.checked_in_at,
      checked_out_at: rec.checked_out_at,
      method: rec.method,
      mode: rec.mode,
      status: rec.status as 'present' | 'absent',
      needs_review: rec.needs_review ?? false,
    }
  })

  return { data: rows, error: null }
}

// ---------- CSV helpers ----------

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function masterSheetToCsv(sheet: MasterSheet): string {
  const headers = [
    'Participant',
    'System ID',
    'External ID',
    ...sheet.contexts.map((c) => c.label.slice(0, 30)),
    'Attendance %',
    'Present',
    'Absent',
    'Missing',
    'Online',
    'In-person',
  ]

  const lines: string[] = [headers.map(csvEscape).join(',')]

  for (const row of sheet.rows) {
    const cells = sheet.contexts.map((c) => row.cells[c.id] ?? '-')
    const line = [
      row.participant.full_name,
      row.participant.system_id,
      row.participant.external_id ?? '',
      ...cells,
      row.attendancePct + '%',
      row.presentCount,
      row.absentCount,
      row.missingCount,
      row.onlineCount,
      row.inPersonCount,
    ]
    lines.push(line.map(csvEscape).join(','))
  }

  return lines.join('\n')
}

export function sessionRegisterToCsv(rows: SessionRegisterRow[]): string {
  const headers = [
    'Participant',
    'System ID',
    'External ID',
    'Status',
    'Method',
    'Mode',
    'Checked In',
    'Checked Out',
    'Needs Review',
  ]

  const lines: string[] = [headers.map(csvEscape).join(',')]

  for (const r of rows) {
    const line = [
      r.participant.full_name,
      r.participant.system_id,
      r.participant.external_id ?? '',
      r.status,
      r.method ?? '',
      r.mode ?? '',
      r.checked_in_at ?? '',
      r.checked_out_at ?? '',
      r.needs_review ? 'YES' : '',
    ]
    lines.push(line.map(csvEscape).join(','))
  }

  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}