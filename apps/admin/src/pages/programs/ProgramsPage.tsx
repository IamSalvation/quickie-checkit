import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import {
  listPrograms,
  archiveProgram,
  restoreProgram,
  deleteProgram,
  type Program,
  type ProgramType,
  type ProgramStatus,
} from '../../lib/api/programs'
import CreateProgramModal from './CreateProgramModal'

const TYPE_LABELS: Record<ProgramType, string> = {
  course: 'Course',
  track: 'Track',
  cohort: 'Cohort',
  room: 'Room',
  service: 'Service',
  group: 'Group',
  custom: 'Custom',
}

export default function ProgramsPage() {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [programs, setPrograms] = useState<Program[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ProgramType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | 'all'>('active')

  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)

    const { data, count: total, error: err } = await listPrograms(account.id, {
      search,
      type: typeFilter,
      status: statusFilter,
    })

    setPrograms(data)
    setCount(total)
    setError(err)
    setLoading(false)
  }, [account, search, typeFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  async function handleArchive(p: Program) {
    if (!confirm(`Archive "${p.name}"? It will be hidden from active lists.`)) return
    const { error: err } = await archiveProgram(p.id)
    if (err) {
      alert(err)
      return
    }
    load()
  }

  async function handleRestore(p: Program) {
    const { error: err } = await restoreProgram(p.id)
    if (err) {
      alert(err)
      return
    }
    load()
  }

  async function handleDelete(p: Program) {
    if (
      !confirm(
        `Permanently delete "${p.name}"? This cannot be undone. Archived items are safer.`
      )
    )
      return
    const { error: err } = await deleteProgram(p.id)
    if (err) {
      alert(err)
      return
    }
    setPrograms((prev) => prev.filter((x) => x.id !== p.id))
    setCount((c) => Math.max(0, c - 1))
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {preset.labels.programs}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {count}{' '}
              {count === 1
                ? preset.labels.program.toLowerCase()
                : preset.labels.programs.toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add {preset.labels.program}
          </button>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder={`Search by name or code...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-md rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ProgramType | 'all')}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="all">All types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProgramStatus | 'all')
            }
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="mt-5 overflow-hidden rounded-lg bg-white shadow">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading...</div>
          ) : programs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">
                {search || typeFilter !== 'all' || statusFilter !== 'active'
                  ? 'No matches.'
                  : `No ${preset.labels.programs.toLowerCase()} yet.`}
              </p>
              {!search && typeFilter === 'all' && statusFilter === 'active' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Add your first {preset.labels.program.toLowerCase()}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {programs.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {p.code ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {TYPE_LABELS[p.type]}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'active' ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-3 text-xs">
                        {p.status === 'active' ? (
                          <button
                            onClick={() => handleArchive(p)}
                            className="text-slate-600 hover:underline"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(p)}
                            className="text-emerald-700 hover:underline"
                          >
                            Restore
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateProgramModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => load()}
      />
    </div>
  )
}