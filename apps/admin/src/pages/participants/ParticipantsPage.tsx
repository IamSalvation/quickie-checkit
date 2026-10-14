import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import {
  listParticipants,
  deleteParticipant,
  type Participant,
} from '../../lib/api/participants'
import CreateParticipantModal from './CreateParticipantModal'

export default function ParticipantsPage() {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)

    const { data, count: total, error: err } = await listParticipants(
      account.id,
      { search }
    )

    setParticipants(data)
    setCount(total)
    setError(err)
    setLoading(false)
  }, [account, search])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(p: Participant) {
    if (!confirm(`Delete ${p.full_name} (${p.system_id})?`)) return
    const { error: err } = await deleteParticipant(p.id)
    if (err) {
      alert(err)
      return
    }
    setParticipants((prev) => prev.filter((x) => x.id !== p.id))
    setCount((c) => Math.max(0, c - 1))
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {preset.labels.participants}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {count}{' '}
              {count === 1
                ? preset.labels.participant.toLowerCase()
                : preset.labels.participants.toLowerCase()}{' '}
              registered
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/participants/print"
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Print badges
            </Link>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add {preset.labels.participant}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <input
            type="text"
            placeholder={`Search by name or ${preset.labels.participant.toLowerCase()} ID...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-lg bg-white shadow">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading...</div>
          ) : participants.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">
                {search
                  ? 'No matches.'
                  : `No ${preset.labels.participants.toLowerCase()} yet.`}
              </p>
              {!search && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Add your first {preset.labels.participant.toLowerCase()}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">
                    {preset.labels.participant} ID
                  </th>
                  <th className="px-4 py-3 font-medium">External ID</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/participants/${p.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {p.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {p.system_id}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.external_id ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateParticipantModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(p) => {
          setParticipants((prev) => [p, ...prev])
          setCount((c) => c + 1)
        }}
      />
    </div>
  )
}