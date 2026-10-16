/**
 * Minimal CSV parser. Handles:
 * - Comma or semicolon delimiters
 * - Quoted fields with "" escaping
 * - Newlines inside quoted fields
 * - Windows (CRLF) and Unix (LF) line endings
 * - UTF-8 BOM at the start
 *
 * Returns { headers: string[], rows: string[][] }
 * Rows are always the same length as headers (padded with empty strings if short).
 */
export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

export function parseCsv(input: string): ParsedCsv {
  let text = input.replace(/^\uFEFF/, '') // strip BOM

  // Detect delimiter: whichever of , ; \t appears more often in the first line
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const commas = (firstLine.match(/,/g) ?? []).length
  const semis = (firstLine.match(/;/g) ?? []).length
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const delim =
    semis > commas && semis > tabs ? ';' : tabs > commas ? '\t' : ','

  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"'
        i += 2
        continue
      }
      if (ch === '"') {
        inQuotes = false
        i += 1
        continue
      }
      current += ch
      i += 1
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }

    if (ch === delim) {
      row.push(current.trim())
      current = ''
      i += 1
      continue
    }

    if (ch === '\r' && next === '\n') {
      row.push(current.trim())
      rows.push(row)
      row = []
      current = ''
      i += 2
      continue
    }

    if (ch === '\n' || ch === '\r') {
      row.push(current.trim())
      rows.push(row)
      row = []
      current = ''
      i += 1
      continue
    }

    current += ch
    i += 1
  }

  // Last row
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim())
    rows.push(row)
  }

  // Drop fully empty rows
  const cleaned = rows.filter((r) => r.some((c) => c.length > 0))

  if (cleaned.length === 0) {
    return { headers: [], rows: [] }
  }

  const [headers, ...dataRows] = cleaned

  // Normalize row length to match headers
  const normalized = dataRows.map((r) => {
    const out = r.slice(0, headers.length)
    while (out.length < headers.length) out.push('')
    return out
  })

  return { headers, rows: normalized }
}

/** Auto-detect which CSV header maps to full_name */
export function autoDetectNameColumn(headers: string[]): number {
  const candidates = [
    'full name',
    'fullname',
    'name',
    'student name',
    'participant name',
    'attendee name',
    'trainee name',
    'guest name',
  ]
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (candidates.includes(h)) return i
  }
  // Fallback: any header containing the word "name"
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].toLowerCase().includes('name')) return i
  }
  return -1
}

/** Auto-detect which CSV header maps to external_id */
export function autoDetectExternalIdColumn(headers: string[]): number {
  const candidates = [
    'matric no',
    'matric number',
    'matric',
    'student id',
    'staff no',
    'staff id',
    'employee id',
    'external id',
    'id number',
    'id',
    'phone',
    'phone number',
  ]
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (candidates.includes(h)) return i
  }
  // Fallback: any header containing "id" or "no"
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase()
    if (h.includes('id') || h.includes('no')) return i
  }
  return -1
}