import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import {
  listParticipants,
  type Participant,
} from '../../lib/api/participants'
import ParticipantBadge from '../../components/badge/ParticipantBadge'

export default function PrintBadgesPage() {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('printing-badge')
    return () => {
      document.body.classList.remove('printing-badge')
    }
  }, [])

  const load = useCallback(async () => {
    if (!account) return
    setLoading(true)
    const { data, error: err } = await listParticipants(account.id, {
      limit: 500,
    })
    setParticipants(data)
    setError(err)
    setLoading(false)
  }, [account])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="p-6 print:hidden">
        <div className="mx-auto max-w-3xl text-sm text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 print:hidden">
        <div className="mx-auto max-w-3xl">
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
          <Link
            to="/participants"
            className="mt-4 inline-block text-sm text-slate-600 hover:underline"
          >
            Back to {preset.labels.participants}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          body.printing-badge .printable-badge {
            position: relative !important;
            page-break-inside: avoid;
            page-break-after: auto;
            border: 1px solid #cbd5e1;
            width: 85mm;
            height: 55mm;
            padding: 4mm;
            box-sizing: border-box;
            background: white;
            display: inline-block;
            vertical-align: top;
            margin: 2mm;
          }
          body.printing-badge .badge-grid {
            display: block;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="p-6 print:hidden">
        <div className="mx-auto max-w-5xl">
          <img src="/logo.png" alt="Quickie Pinkas" className="h-8 w-auto mb-4" />
        <Link
            to="/participants"
            className="text-xs text-slate-500 hover:underline"
          >
            Back to {preset.labels.participants}
          </Link>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Print badges
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {participants.length}{' '}
                {participants.length === 1
                  ? preset.labels.participant.toLowerCase()
                  : preset.labels.participants.toLowerCase()}
                . 3 per A4 page row.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Print all
            </button>
          </div>

          <div className="mt-5 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <strong>Tip:</strong> Set Destination to "Save as PDF" if you want a
            file. Enable "Background graphics" in print settings for best
            results.
          </div>

          <div className="mt-6 rounded-lg bg-white p-5 shadow">
            <h2 className="text-sm font-medium text-slate-900">Preview</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {participants.map((p) => (
                <ParticipantBadge
                  key={p.id}
                  participant={p}
                  accountName={account?.name ?? ''}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="badge-grid hidden print:block">
        {participants.map((p) => (
          <div key={p.id} className="printable-badge">
            <ParticipantBadge
              participant={p}
              accountName={account?.name ?? ''}
              forPrint
            />
          </div>
        ))}
      </div>
    </>
  )
}