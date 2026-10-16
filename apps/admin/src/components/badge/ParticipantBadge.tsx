import { QRCodeSVG } from 'qrcode.react'
import type { Participant } from '../../lib/api/participants'

interface Props {
  participant: Participant
  accountName: string
  forPrint?: boolean
}

export default function ParticipantBadge({
  participant,
  accountName,
  forPrint = false,
}: Props) {
  return (
    <div
      className={
        forPrint
          ? 'flex h-full w-full flex-col items-center justify-between bg-white p-2'
          : 'flex w-full max-w-sm flex-col items-center rounded-lg border border-slate-200 bg-white p-4 shadow-sm'
      }
    >
      <img
        src="/logo.png"
        alt="Quickie Pinkas"
        className={forPrint ? 'h-6 w-auto' : 'h-10 w-auto'}
      />

      <div className="mt-2 w-full text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">
        {accountName}
      </div>

      <div className="mt-2 flex items-center justify-center">
        <QRCodeSVG
          value={participant.system_id}
          size={forPrint ? 130 : 140}
          level="M"
        />
      </div>

      <div className="mt-2 w-full text-center">
        <div
          className={
            forPrint
              ? 'text-[11px] font-bold text-slate-900 leading-tight'
              : 'text-sm font-semibold text-slate-900 leading-tight'
          }
        >
          {participant.full_name}
        </div>
        <div
          className={
            forPrint
              ? 'mt-0.5 font-mono text-[9px] text-slate-600'
              : 'mt-0.5 font-mono text-[10px] text-slate-600'
          }
        >
          {participant.system_id}
        </div>
        {participant.external_id && (
          <div
            className={
              forPrint
                ? 'mt-0.5 text-[9px] text-slate-500'
                : 'mt-0.5 text-[10px] text-slate-500'
            }
          >
            {participant.external_id}
          </div>
        )}
      </div>

      {forPrint && (
        <div className="mt-1 w-full text-center text-[7px] text-slate-400">
          Hold this badge to the scanner
        </div>
      )}
    </div>
  )
}