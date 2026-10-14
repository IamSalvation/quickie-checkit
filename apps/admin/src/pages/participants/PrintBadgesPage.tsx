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
      <div className="p-6 no-print">
        <div className="mx-auto max-w-3xl text-sm text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 no-print">
        <div className="mx-auto max-w-3xl">
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
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
      {/* Print styles: 2 columns x 4 rows per page, clean borders */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0.5in;
          }
          body {
            background: white !important;
          }
          .no-print { display: none !important; }
          .badge-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.25in !important;
          }
          .badge-cell {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Controls (hidden when printing) */}
      <div className="p-6 no-print">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/participants"
            className="text-xs text-slate-500 hover:underline"
          >
            ← Back to {preset.labels.participants}
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
                . 8 per page.
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
            <strong>Tip:</strong> In the print dialog, set <em>Destination</em> to
            "Save as PDF" if you want a file. Set margins to "Default" and enable
            "Background graphics" for best results.
          </div>

          {/* Preview */}
          <div className="mt-6 rounded-lg bg-white p-5 shadow">
            <h2 className="text-sm font-medium text-slate-900">Preview</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

      {/* Print-only grid */}
      <div className="badge-grid" style={{ display: 'none' }}>
        {participants.map((p) => (
          <div key={p.id} className="badge-cell hidden print:block">
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