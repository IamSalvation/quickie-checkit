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
          ? 'flex h-full w-full flex-col items-stretch bg-white'
          : 'flex w-full max-w-sm flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm'
      }
    >
      <div className="w-full text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">
        {accountName}
      </div>

      <div className="mt-2 flex flex-1 items-center gap-3">
        <div className="shrink-0">
          {participant.photo_url ? (
            <img
              src={participant.photo_url}
              alt=""
              className={
                forPrint
                  ? 'h-[28mm] w-[22mm] rounded border border-slate-300 object-cover'
                  : 'h-20 w-16 rounded border border-slate-300 object-cover'
              }
            />
          ) : (
            <div
              className={
                (forPrint ? 'h-[28mm] w-[22mm]' : 'h-20 w-16') +
                ' rounded border border-slate-300 bg-slate-100 flex items-center justify-center text-slate-400 font-semibold text-xl'
              }
            >
              {participant.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <QRCodeSVG
            value={participant.system_id}
            size={forPrint ? 90 : 96}
            level="M"
          />
        </div>

        <div className="min-w-0 flex-1">
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
                ? 'mt-1 font-mono text-[9px] text-slate-600'
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
      </div>

      {forPrint && (
        <div className="mt-1 w-full text-center text-[7px] text-slate-400">
          Hold this badge to the scanner
        </div>
      )}
    </div>
  )
}