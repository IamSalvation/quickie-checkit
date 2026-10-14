import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import {
  listContexts,
  CONTEXT_TYPE_LABELS,
  type ContextWithProgram,
  type ContextStatus,
} from '../../lib/api/contexts'
import { listPrograms, type Program } from '../../lib/api/programs'
import CreateContextModal from './CreateContextModal'

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
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ContextsPage() {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [contexts, setContexts] = useState<ContextWithProgram[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState<string | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ContextStatus | 'all'>('all')
  const [programs, setPrograms] = useState<Program[]>([])

  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (!account) return
    listPrograms(account.id, { status: 'active', limit: 200 }).then(({ data }) =>
      setPrograms(data)
    )
  }, [account])

  const load = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)

    const { data, count: total, error: err } = await listContexts(account.id, {
      search,
      programId: programFilter,
      status: statusFilter,
    })

    setContexts(data)
    setCount(total)
    setError(err)
    setLoading(false)
  }, [account, search, programFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {preset.labels.contexts}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {count}{' '}
              {count === 1
                ? preset.labels.context.toLowerCase()
                : preset.labels.contexts.toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add {preset.labels.context}
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search by label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-md rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="all">All {preset.labels.programs.toLowerCase()}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ContextStatus | 'all')
            }
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-lg bg-white shadow">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading...</div>
          ) : contexts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">
                {search || programFilter !== 'all' || statusFilter !== 'all'
                  ? 'No matches.'
                  : `No ${preset.labels.contexts.toLowerCase()} yet.`}
              </p>
              {!search && programFilter === 'all' && statusFilter === 'all' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Add your first {preset.labels.context.toLowerCase()}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">{preset.labels.program}</th>
                  <th className="px-4 py-3 font-medium">Starts</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contexts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/contexts/${c.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {c.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {CONTEXT_TYPE_LABELS[c.type]}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.program ? (
                        c.program.name
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(c.starts_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/contexts/${c.id}`}
                        className="text-xs text-slate-600 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateContextModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => load()}
      />
    </div>
  )
}