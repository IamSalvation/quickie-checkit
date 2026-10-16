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
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body.printing-badge * {
            visibility: hidden;
          }
          body.printing-badge .badge-print-root,
          body.printing-badge .badge-print-root * {
            visibility: visible;
          }
          body.printing-badge .badge-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 194mm;
          }
          body.printing-badge .badge-row {
            width: 190mm;
            height: 55mm;
            display: flex;
            flex-direction: row;
            page-break-inside: avoid;
            break-inside: avoid;
            border-bottom: 1px dashed #94a3b8;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
            box-sizing: border-box;
          }
          body.printing-badge .badge-half {
            width: 95mm;
            height: 55mm;
            box-sizing: border-box;
            overflow: hidden;
          }
          body.printing-badge .badge-half-front {
            border-right: 1px dashed #94a3b8;
            padding-right: 2mm;
          }
          body.printing-badge .badge-half-back {
            padding-left: 2mm;
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
              <h1 className="text-2xl font-bold text-slate-900">Print badges</h1>
              <p className="mt-1 text-sm text-slate-600">
                {participants.length}{' '}
                {participants.length === 1
                  ? preset.labels.participant.toLowerCase()
                  : preset.labels.participants.toLowerCase()}
                . 5 per A4 page.
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
            <strong>How to print:</strong> each row = one badge. Cut along the
            dashed lines, fold each row in half down the middle (dashed vertical
            line), laminate if you like. Front = logo + QR. Back = photo +
            details.
          </div>

          <div className="mt-6 rounded-lg bg-white p-5 shadow">
            <h2 className="text-sm font-medium text-slate-900">Preview</h2>
            <p className="mt-1 text-xs text-slate-500">
              On paper, each row prints at 190mm x 55mm. Screen preview below is
              approximate.
            </p>
            <div className="mt-3 space-y-4">
              {participants.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-2"
                >
                  <div className="rounded border border-slate-100">
                    <ParticipantBadge
                      participant={p}
                      accountName={account?.name ?? ''}
                      side="front"
                    />
                  </div>
                  <div className="rounded border border-slate-100">
                    <ParticipantBadge
                      participant={p}
                      accountName={account?.name ?? ''}
                      side="back"
                    />
                  </div>
                </div>
              ))}
              {participants.length > 6 && (
                <p className="text-xs text-slate-400">
                  + {participants.length - 6} more (not shown in preview)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="badge-print-root hidden print:block">
        {participants.map((p) => (
          <div key={p.id} className="badge-row">
            <div className="badge-half badge-half-front">
              <ParticipantBadge
                participant={p}
                accountName={account?.name ?? ''}
                side="front"
                forPrint
              />
            </div>
            <div className="badge-half badge-half-back">
              <ParticipantBadge
                participant={p}
                accountName={account?.name ?? ''}
                side="back"
                forPrint
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}