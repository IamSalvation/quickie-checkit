import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import {
  getParticipant,
  deleteParticipant,
  type Participant,
} from '../../lib/api/participants'
import ParticipantBadge from '../../components/badge/ParticipantBadge'

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await getParticipant(id)
    setParticipant(data)
    setError(err)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete() {
    if (!participant) return
    if (!confirm(`Permanently delete ${participant.full_name}?`)) return
    setWorking(true)
    const { error: err } = await deleteParticipant(participant.id)
    setWorking(false)
    if (err) {
      alert(err)
      return
    }
    navigate('/participants')
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl text-sm text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error || !participant) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error ?? 'Not found'}
          </div>
          <Link
            to="/participants"
            className="mt-4 inline-block text-sm text-slate-600 hover:underline"
          >
            ← Back to {preset.labels.participants}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-badge, .print-badge * { visibility: visible; }
          .print-badge {
            position: absolute;
            left: 0;
            top: 0;
            width: 3.5in;
            height: 4.5in;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6 no-print">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/participants"
            className="text-xs text-slate-500 hover:underline"
          >
            ← Back to {preset.labels.participants}
          </Link>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {participant.full_name}
              </h1>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {participant.system_id}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Print badge
              </button>
              <button
                onClick={handleDelete}
                disabled={working}
                className="rounded border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Left: details */}
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="text-sm font-medium text-slate-900">Details</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Full name</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {participant.full_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{preset.labels.participant} ID</dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-900">
                    {participant.system_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">External ID</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {participant.external_id ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Registered</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {new Date(participant.created_at).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Right: badge preview */}
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="text-sm font-medium text-slate-900">
                Badge preview
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                This is what will print.
              </p>
              <div className="mt-3">
                <ParticipantBadge
                  participant={participant}
                  accountName={account?.name ?? ''}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">
              Attendance history coming in Phase 4.2b.
            </p>
          </div>
        </div>
      </div>

      {/* Print-only badge (hidden on screen) */}
      <div
        className="print-badge"
        style={{ display: 'none' }}
      >
        <div className="hidden print:block">
          <ParticipantBadge
            participant={participant}
            accountName={account?.name ?? ''}
            forPrint
          />
        </div>
      </div>
    </>
  )
}