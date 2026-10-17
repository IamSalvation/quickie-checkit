import { QRCodeSVG } from 'qrcode.react'
import type { Participant } from '../../lib/api/participants'

export type BadgeSide = 'front' | 'back'

interface Props {
  participant: Participant
  accountName: string
  side: BadgeSide
  forPrint?: boolean
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ParticipantBadge({
  participant,
  accountName,
  side,
  forPrint = false,
}: Props) {
  const qrSize = forPrint ? 130 : 120

  if (side === 'front') {
    return (
      <div className="flex h-full w-full items-center justify-center gap-4 bg-white px-3">
        <img
          src="/logo.png"
          alt="Quickie Pinkas"
          className={forPrint ? 'h-16 w-auto' : 'h-12 w-auto'}
        />
        <QRCodeSVG value={window.location.origin + "/s/" + participant.system_id} size={qrSize} level="M" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center gap-4 bg-white px-3">
      {participant.photo_url ? (
        <img
          src={participant.photo_url}
          alt={participant.full_name}
          className={
            forPrint
              ? 'h-20 w-20 rounded border border-slate-300 object-cover'
              : 'h-16 w-16 rounded border border-slate-200 object-cover'
          }
        />
      ) : (
        <div
          className={
            forPrint
              ? 'flex h-20 w-20 items-center justify-center rounded border border-slate-300 bg-slate-100 text-2xl font-bold text-slate-500'
              : 'flex h-16 w-16 items-center justify-center rounded border border-slate-200 bg-slate-100 text-xl font-bold text-slate-500'
          }
        >
          {getInitials(participant.full_name)}
        </div>
      )}

      <div className="flex flex-col justify-center">
        <div className="text-xs font-bold text-slate-900 leading-tight">
          {participant.full_name}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-slate-700">
          {participant.system_id}
        </div>
        {participant.external_id && (
          <div className="mt-0.5 text-[10px] text-slate-600">
            {participant.external_id}
          </div>
        )}
        <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-400">
          {accountName}
        </div>
      </div>
    </div>
  )
}