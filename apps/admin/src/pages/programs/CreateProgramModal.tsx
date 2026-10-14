import { useState, type FormEvent } from 'react'
import Modal from '../../components/ui/Modal'
import {
  createProgram,
  type Program,
  type ProgramType,
} from '../../lib/api/programs'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (p: Program) => void
}

const TYPE_OPTIONS: { value: ProgramType; label: string }[] = [
  { value: 'course', label: 'Course' },
  { value: 'track', label: 'Track' },
  { value: 'cohort', label: 'Cohort' },
  { value: 'room', label: 'Room' },
  { value: 'service', label: 'Service' },
  { value: 'group', label: 'Group' },
  { value: 'custom', label: 'Custom' },
]

export default function CreateProgramModal({ open, onClose, onCreated }: Props) {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [type, setType] = useState<ProgramType>('course')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setName('')
    setCode('')
    setType('course')
    setDescription('')
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

    const { data, error: err } = await createProgram({
      accountId: account.id,
      name,
      code: code || null,
      type,
      description: description || null,
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
      title={`Add ${preset.labels.program}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={preset.value === 'school' ? 'MTH101' : 'Name'}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Code <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MTH101"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Must be unique within your account if provided.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ProgramType)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
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