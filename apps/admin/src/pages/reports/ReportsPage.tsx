import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import { listPrograms, type Program } from '../../lib/api/programs'
import { listContexts, type ContextWithProgram } from '../../lib/api/contexts'
import {
  fetchMasterSheet,
  fetchSessionRegister,
  masterSheetToCsv,
  sessionRegisterToCsv,
  downloadCsv,
  type MasterSheet,
  type SessionRegisterRow,
} from '../../lib/api/reports'

type Tab = 'master' | 'register'

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const METHOD_LABELS: Record<string, string> = {
  qr_kiosk_inperson: 'QR (kiosk)',
  qr_kiosk_online: 'QR (online)',
  id_entry_online: 'ID entry',
  manual: 'Manual',
  face_verified: 'Face',
}

export default function ReportsPage() {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [tab, setTab] = useState<Tab>('master')

  // Master sheet state
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [masterSheet, setMasterSheet] = useState<MasterSheet | null>(null)
  const [masterLoading, setMasterLoading] = useState(false)
  const [masterError, setMasterError] = useState<string | null>(null)

  // Session register state
  const [contexts, setContexts] = useState<ContextWithProgram[]>([])
  const [selectedContextId, setSelectedContextId] = useState<string>('')
  const [registerRows, setRegisterRows] = useState<SessionRegisterRow[]>([])
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  // Load programs + contexts once
  useEffect(() => {
    if (!account) return
    listPrograms(account.id, { status: 'all', limit: 200 }).then(({ data }) =>
      setPrograms(data)
    )
    listContexts(account.id, { status: 'all', limit: 200 }).then(({ data }) =>
      setContexts(data)
    )
  }, [account])

  const loadMasterSheet = useCallback(async () => {
    if (!account || !selectedProgramId) return
    setMasterLoading(true)
    setMasterError(null)
    const { data, error: err } = await fetchMasterSheet(account.id, {
      programId: selectedProgramId,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : null,
      dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : null,
    })
    setMasterLoading(false)
    if (err) {
      setMasterError(err)
      setMasterSheet(null)
      return
    }
    setMasterSheet(data)
  }, [account, selectedProgramId, dateFrom, dateTo])

  const loadRegister = useCallback(async () => {
    if (!selectedContextId) return
    setRegisterLoading(true)
    setRegisterError(null)
    const { data, error: err } = await fetchSessionRegister(selectedContextId)
    setRegisterLoading(false)
    if (err) {
      setRegisterError(err)
      setRegisterRows([])
      return
    }
    setRegisterRows(data ?? [])
  }, [selectedContextId])

  useEffect(() => {
    if (tab === 'master' && selectedProgramId) loadMasterSheet()
  }, [tab, selectedProgramId, loadMasterSheet])

  useEffect(() => {
    if (tab === 'register' && selectedContextId) loadRegister()
  }, [tab, selectedContextId, loadRegister])

  function handleMasterCsv() {
    if (!masterSheet) return
    const csv = masterSheetToCsv(masterSheet)
    const label = programs.find((p) => p.id === selectedProgramId)?.name ?? 'report'
    downloadCsv(`${label}-master-sheet.csv`, csv)
  }

  function handleRegisterCsv() {
    if (registerRows.length === 0) return
    const csv = sessionRegisterToCsv(registerRows)
    const label = contexts.find((c) => c.id === selectedContextId)?.label ?? 'session'
    downloadCsv(`${label}-register.csv`, csv)
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Attendance reports and exports.
        </p>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-slate-200 print:hidden">
          <button
            onClick={() => setTab('master')}
            className={
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px ' +
              (tab === 'master'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            Master Sheet
          </button>
          <button
            onClick={() => setTab('register')}
            className={
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px ' +
              (tab === 'register'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            Session Register
          </button>
        </div>

        {/* Master Sheet */}
        {tab === 'master' && (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 print:hidden">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {preset.labels.program}
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  <option value="">- Select -</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.code ? ` (${p.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 print:hidden">
              <button
                onClick={loadMasterSheet}
                disabled={!selectedProgramId || masterLoading}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {masterLoading ? 'Loading...' : 'Run report'}
              </button>
              {masterSheet && masterSheet.rows.length > 0 && (
                <>
                  <button
                    onClick={handleMasterCsv}
                    className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Print
                  </button>
                </>
              )}
            </div>

            {masterError && (
              <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {masterError}
              </div>
            )}

            {masterSheet && masterSheet.contexts.length === 0 && (
              <div className="mt-6 rounded border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">
                  No {preset.labels.contexts.toLowerCase()} found for this
                  {preset.labels.program.toLowerCase()} in this date range.
                </p>
              </div>
            )}

            {masterSheet && masterSheet.contexts.length > 0 && (
              <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-medium">
                        Participant
                      </th>
                      <th className="px-3 py-2 font-medium">System ID</th>
                      {masterSheet.contexts.map((c) => (
                        <th
                          key={c.id}
                          className="px-2 py-2 font-medium text-center"
                          title={c.label}
                        >
                          {c.label.slice(0, 12)}
                          {c.label.length > 12 ? '...' : ''}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium text-right">%</th>
                      <th className="px-2 py-2 font-medium text-center">On</th>
                      <th className="px-2 py-2 font-medium text-center">In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {masterSheet.rows.map((row) => (
                      <tr key={row.participant.id} className="hover:bg-slate-50">
                        <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                          {row.participant.full_name}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {row.participant.system_id}
                        </td>
                        {masterSheet.contexts.map((c) => {
                          const v = row.cells[c.id] ?? '-'
                          const cellCls =
                            v === 'P'
                              ? 'text-emerald-700 font-semibold'
                              : v === 'A'
                              ? 'text-red-600 font-semibold'
                              : 'text-slate-300'
                          return (
                            <td
                              key={c.id}
                              className={'px-2 py-2 text-center ' + cellCls}
                            >
                              {v}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-right font-medium text-slate-900">
                          {row.attendancePct}%
                        </td>
                        <td className="px-2 py-2 text-center text-xs text-blue-700">
                          {row.onlineCount || '-'}
                        </td>
                        <td className="px-2 py-2 text-center text-xs text-slate-600">
                          {row.inPersonCount || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Session Register */}
        {tab === 'register' && (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 print:hidden">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {preset.labels.context}
                </label>
                <select
                  value={selectedContextId}
                  onChange={(e) => setSelectedContextId(e.target.value)}
                  className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  <option value="">- Select -</option>
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                      {c.starts_at
                        ? ` - ${new Date(c.starts_at).toLocaleDateString()}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 print:hidden">
              <button
                onClick={loadRegister}
                disabled={!selectedContextId || registerLoading}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {registerLoading ? 'Loading...' : 'Run report'}
              </button>
              {registerRows.length > 0 && (
                <>
                  <button
                    onClick={handleRegisterCsv}
                    className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Print
                  </button>
                </>
              )}
            </div>

            {registerError && (
              <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {registerError}
              </div>
            )}

            {registerRows.length > 0 && (
              <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Participant</th>
                      <th className="px-3 py-2 font-medium">System ID</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Method</th>
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Checked In</th>
                      <th className="px-3 py-2 font-medium">Checked Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registerRows.map((row) => (
                      <tr key={row.participant.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-900">
                          {row.participant.full_name}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">
                          {row.participant.system_id}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === 'present' && (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Present
                            </span>
                          )}
                          {row.status === 'absent' && (
                            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              Absent
                            </span>
                          )}
                          {row.status === 'no_record' && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                              No record
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.method ? METHOD_LABELS[row.method] ?? row.method : '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.mode ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {formatDateTime(row.checked_in_at)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {formatDateTime(row.checked_out_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}