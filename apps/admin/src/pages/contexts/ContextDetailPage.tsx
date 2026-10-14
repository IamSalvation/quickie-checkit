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

export default function ContextDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [context, setContext] = useState<ContextWithProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await getContext(id)
    setContext(data)
    setError(err)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleOpen() {
    if (!context) return
    setWorking(true)
    const { error: err } = await openContext(context.id)
    setWorking(false)
    if (err) {
      alert(err)
      return
    }
    load()
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
    load()
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
      <div className="mx-auto max-w-3xl">
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

        <div className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-sm font-medium text-slate-900">Details</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Attendance tracking coming in Phase 4.2 — QR codes, kiosk scanning, live check-ins.
          </p>
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