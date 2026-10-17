import { useState } from 'react'
import Modal from '../../components/ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (eventEndDate: string) => void
}

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate())
  )
}

export default function EventDateModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  const today = new Date()
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 180)

  const [eventEndDate, setEventEndDate] = useState(
    toLocalInput(today)
  )
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)

    if (!eventEndDate) {
      setError('Please pick the date your event ends.')
      return
    }

    const end = new Date(eventEndDate)
    if (isNaN(end.getTime())) {
      setError('Invalid date.')
      return
    }

    if (end <= today) {
      setError('Event end date must be in the future.')
      return
    }

    if (end > maxDate) {
      setError('Event end date cannot be more than 180 days out.')
      return
    }

    onConfirm(eventEndDate)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="When does your event end?"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Your Event Pass stays active from today until this date, plus a
          7-day grace period. Pick the last day of your event.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Event end date
          </label>
          <input
            type="date"
            value={eventEndDate}
            min={toLocalInput(new Date(today.getTime() + 86400000))}
            max={toLocalInput(maxDate)}
            onChange={(e) => setEventEndDate(e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div className="rounded bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
          <div className="font-medium text-slate-900">Summary</div>
          <div className="mt-1">
            Pay NGN 50,000 one-time. Access until{' '}
            <strong className="text-slate-900">
              {eventEndDate || '(pick a date)'}
            </strong>{' '}
            plus 7 days of read-only grace after.
          </div>
        </div>

        {error && (
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Continue to payment
          </button>
        </div>
      </div>
    </Modal>
  )
}