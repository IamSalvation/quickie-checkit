import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import { listKiosks, type Kiosk } from '../../lib/api/kiosks'
import { openContextWithKiosks, type ContextWithProgram } from '../../lib/api/contexts'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  open: boolean
  context: ContextWithProgram | null
  onClose: () => void
  onOpened: () => void
}

export default function OpenContextModal({
  open,
  context,
  onClose,
  onOpened,
}: Props) {
  const { account } = useAuth()
  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load kiosks when the modal opens
  useEffect(() => {
    if (!open || !account) return
    setLoading(true)
    setSelected(new Set())
    setError(null)

    listKiosks(account.id, { status: 'active' }).then(({ data, error: err }) => {
      setKiosks(data)
      setError(err)
      setLoading(false)
    })
  }, [open, account])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function isBusy(k: Kiosk): boolean {
    return k.context_id !== null && k.context_id !== context?.id
  }

  async function handleOpen() {
    if (!context) return
    setError(null)
    setWorking(true)

    const { error: err } = await openContextWithKiosks(
      context.id,
      Array.from(selected)
    )

    setWorking(false)

    if (err) {
      setError(err)
      return
    }

    onOpened()
    onClose()
  }

  if (!context) return null

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!working) onClose()
      }}
      title={`Open "${context.label}" for check-in`}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Which kiosks should accept check-ins for this session?
        </p>

        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">
            Loading kiosks...
          </div>
        ) : kiosks.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-500">
              No active kiosks registered.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              You can still open the session without binding a kiosk.
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded border border-slate-200 divide-y divide-slate-100">
            {kiosks.map((k) => {
              const busy = isBusy(k)
              const checked = selected.has(k.id)
              return (
                <label
                  key={k.id}
                  className={[
                    'flex items-start gap-3 p-3 cursor-pointer',
                    busy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={() => toggle(k.id)}
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {k.label}
                    </div>
                    {k.location && (
                      <div className="text-xs text-slate-500 truncate">
                        {k.location}
                      </div>
                    )}
                    {busy && (
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                        In use by another session
                      </div>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}

        {error && (
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOpen}
            disabled={working}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {working ? 'Opening...' : 'Open session'}
          </button>
        </div>
      </div>
    </Modal>
  )
}