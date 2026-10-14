import { useState, type FormEvent } from 'react'
import Modal from '../../components/ui/Modal'
import { createParticipant, type Participant } from '../../lib/api/participants'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (p: Participant) => void
}

export default function CreateParticipantModal({ open, onClose, onCreated }: Props) {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [fullName, setFullName] = useState('')
  const [externalId, setExternalId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setFullName('')
    setExternalId('')
    setError(null)
    setSubmitting(false)
  }

  function handleClose() {
    if (submitting) return
    reset()
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!account) return

    setError(null)
    setSubmitting(true)

    const { data, error: err } = await createParticipant({
      accountId: account.id,
      fullName,
      externalId: externalId || null,
    })

    setSubmitting(false)

    if (err || !data) {
      setError(err ?? 'Could not create')
      return
    }

    onCreated(data)
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Add ${preset.labels.participant}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            type="text"
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            {preset.labels.participant} ID <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="Matric no / staff no / phone"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            A {preset.labels.participant.toLowerCase()} ID will be auto-generated.
          </p>
        </div>

        {error && (
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}