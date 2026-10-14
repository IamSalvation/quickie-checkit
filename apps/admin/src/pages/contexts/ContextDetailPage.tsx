import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import {
  getContext,
  openContext,
  closeContext,
  deleteContext,
  CONTEXT_TYPE_LABELS,
  type ContextWithProgram,
  type ContextStatus,
} from '../../lib/api/contexts'
import {
  listPresenceForContext,
  type PresenceWithParticipant,
} from '../../lib/api/presence'

function StatusBadge({ status }: { status: ContextStatus }) {
  const styles: Record<ContextStatus, string> = {
    scheduled: 'bg-slate-100 text-slate-700',
    open: 'bg-emerald-50 text-emerald-700',
    closed: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-red-50 text-red-700',
  }
  const labels: Record<ContextStatus, string> = {
    scheduled: 'Scheduled',
    open: 'Open',
    closed: 'Closed',
    cancelled: 'Cancelled',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const METHOD_LABELS: Record<string, string> = {
  qr_kiosk_inperson: 'QR (kiosk)',
  qr_kiosk_online: 'QR (online)',
  id_entry_online: 'ID entry',
  manual: 'Manual',
  face_verified: 'Face verified',
}

export default function ContextDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [context, setContext] = useState<ContextWithProgram | null>(null)
  const [attendance, setAttendance] = useState<PresenceWithParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const loadContext = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await getContext(id)
    setContext(data)
    setError(err)
    setLoading(false)
  }, [id])

  const loadAttendance = useCallback(async () => {
    if (!id) return
    setAttendanceLoading(true)
    const { data } = await listPresenceForContext(id, { limit: 500 })
    setAttendance(data)
    setAttendanceLoading(false)
  }, [id])

  useEffect(() => {
    loadContext()
    loadAttendance()
  }, [loadContext, loadAttendance])

  // Auto-refresh attendance every 5s when context is open
  useEffect(() => {
    if (!context || context.status !== 'open') return
    const iv = setInterval(() => {
      loadAttendance()
    }, 5000)
    return () => clearInterval(iv)
  }, [context, loadAttendance])

  async function handleOpen() {
    if (!context) return
    setWorking(true)
    const { error: err } = await openContext(context.id)
    setWorking(false)
    if (err) {
      alert(err)
      return
    }
    loadContext()
  }

  async function handleClose() {
    if (!context) return
    setWorking(true)
    const { error: err } = await closeContext(context.id)
    setWorking(false)
    if (err) {
      alert(err)
      return
    }
    loadContext()
  }

  async function handleDelete() {
    if (!context) return
    if (
      !confirm(
        `Permanently delete "${context.label}"? Attendance records will also be deleted.`
      )
    )
      return
    setWorking(true)
    const { error: err } = await deleteContext(context.id)
    setWorking(false)
    if (err) {
      alert(err)
      return
    }
    navigate('/contexts')
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl text-sm text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error || !context) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error ?? 'Not found'}
          </div>
          <Link
            to="/contexts"
            className="mt-4 inline-block text-sm text-slate-600 hover:underline"
          >
            ← Back to {preset.labels.contexts}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/contexts"
          className="text-xs text-slate-500 hover:underline"
        >
          ← Back to {preset.labels.contexts}
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {context.label}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={context.status} />
              <span className="text-xs text-slate-500">
                {CONTEXT_TYPE_LABELS[context.type]}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {context.status === 'scheduled' && (
              <button
                onClick={handleOpen}
                disabled={working}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Open for check-in
              </button>
            )}
            {context.status === 'open' && (
              <button
                onClick={handleClose}
                disabled={working}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Close
              </button>
            )}
            {context.status === 'closed' && (
              <button
                onClick={handleOpen}
                disabled={working}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Re-open
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Details card */}
          <div className="rounded-lg bg-white p-5 shadow lg:col-span-1">
            <h2 className="text-sm font-medium text-slate-900">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">{preset.labels.program}</dt>
                <dd className="mt-0.5 text-slate-900">
                  {context.program ? (
                    <>
                      {context.program.name}
                      {context.program.code && (
                        <span className="ml-1 text-xs text-slate-500">
                          ({context.program.code})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd className="mt-0.5 text-slate-900">
                  {CONTEXT_TYPE_LABELS[context.type]}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Starts</dt>
                <dd className="mt-0.5 text-slate-900">
                  {formatDateTime(context.starts_at)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Ends</dt>
                <dd className="mt-0.5 text-slate-900">
                  {formatDateTime(context.ends_at)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Check-out</dt>
                <dd className="mt-0.5 text-slate-900">
                  {context.checkout_enabled ? 'Allowed' : 'Not allowed'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">ID entry</dt>
                <dd className="mt-0.5 text-slate-900">
                  {context.id_entry_enabled ? 'Allowed' : 'Not allowed'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Attendance card */}
          <div className="rounded-lg bg-white p-5 shadow lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-900">
                Attendance
              </h2>
              <div className="flex items-center gap-3">
                {context.status === 'open' && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    Live
                  </span>
                )}
                <button
                  onClick={loadAttendance}
                  disabled={attendanceLoading}
                  className="text-xs text-slate-500 hover:underline disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {attendance.length}{' '}
              {attendance.length === 1 ? 'check-in' : 'check-ins'}
            </p>

            <div className="mt-4 max-h-96 overflow-y-auto">
              {attendanceLoading && attendance.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  Loading...
                </div>
              ) : attendance.length === 0 ? (
                <div className="rounded border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No check-ins yet.
                  </p>
                  {context.status === 'open' && (
                    <p className="mt-1 text-xs text-slate-400">
                      Kiosk check-ins will appear here automatically.
                    </p>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">
                        {preset.labels.participant} ID
                      </th>
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 text-slate-900">
                          {r.participant?.full_name ?? '—'}
                        </td>
                        <td className="py-2 font-mono text-xs text-slate-600">
                          {r.participant?.system_id ?? '—'}
                        </td>
                        <td className="py-2 text-slate-600">
                          {formatTime(r.checked_in_at)}
                        </td>
                        <td className="py-2 text-slate-600">
                          {METHOD_LABELS[r.method] ?? r.method}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={working}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Delete this {preset.labels.context.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  )
}