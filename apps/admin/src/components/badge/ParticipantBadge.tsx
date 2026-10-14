import { QRCodeSVG } from 'qrcode.react'
import type { Participant } from '../../lib/api/participants'

interface Props {
  participant: Participant
  accountName: string
  /** When true, this is rendered inside a print-friendly page */
  forPrint?: boolean
}

/**
 * Single participant badge.
 * - On screen: rounded card, subtle shadow
 * - For print: bordered box, fixed size, no shadow, no rounded corners
 */
export default function ParticipantBadge({
  participant,
  accountName,
  forPrint = false,
}: Props) {
  return (
    <div
      className={[
        'flex flex-col items-center bg-white p-4 text-center',
        forPrint
          ? 'w-full h-full border border-black'
          : 'rounded-lg border border-slate-200 shadow-sm',
      ].join(' ')}
    >
      <div className="w-full truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {accountName}
      </div>

      <div className="mt-2 flex w-full items-center justify-center">
        <QRCodeSVG
          value={participant.system_id}
          size={forPrint ? 140 : 160}
          level="M"
          includeMargin={false}
        />
      </div>

      <div className="mt-2 w-full">
        <div className="truncate text-sm font-semibold text-slate-900">
          {participant.full_name}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-slate-500">
          {participant.system_id}
        </div>
        {participant.external_id && (
          <div className="mt-0.5 text-[10px] text-slate-400">
            {participant.external_id}
          </div>
        )}
      </div>
    </div>
  )
}