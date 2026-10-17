import { useEffect, useState, type FormEvent } from 'react'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import {
  getAccountUsageFull,
  updateAccountLimits,
  type AccountUsageFull,
  type AccountLimitsUpdate,
} from '../../lib/api/platform'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  accountId: string
  accountName: string
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  )
}

export default function AccessLimitsEditModal({
  open,
  onClose,
  onSaved,
  accountId,
  accountName,
}: Props) {
  const { operator } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<AccountUsageFull | null>(null)

  const [maxParticipants, setMaxParticipants] = useState('')
  const [maxPrograms, setMaxPrograms] = useState('')
  const [maxContexts, setMaxContexts] = useState('')
  const [maxKiosks, setMaxKiosks] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [graceDays, setGraceDays] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await getAccountUsageFull(accountId)
      if (cancelled) return
      if (err || !data) {
        setError(err ?? 'Could not load')
        setLoading(false)
        return
      }
      setUsage(data)
      setMaxParticipants(String(data.max_participants))
      setMaxPrograms(String(data.max_programs))
      setMaxContexts(String(data.max_contexts))
      setMaxKiosks(String(data.max_kiosks))
      setExpiresAt(toLocalInput(data.access_expires_at))
      setGraceDays(String(data.lockout_grace_days))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, accountId])

  function setQuickExpiry(days: number | null) {
    if (days === null) {
      setExpiresAt('')
      return
    }
    const d = new Date()
    d.setDate(d.getDate() + days)
    setExpiresAt(toLocalInput(d.toISOString()))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!operator) return

    setSaving(true)
    setError(null)

    const updates: AccountLimitsUpdate = {}

    const n = (s: string) => {
      const v = parseInt(s, 10)
      return isNaN(v) || v < 0 ? null : v
    }

    const mp = n(maxParticipants)
    const mpr = n(maxPrograms)
    const mc = n(maxContexts)
    const mk = n(maxKiosks)
    const gd = n(graceDays)

    if (mp === null || mpr === null || mc === null || mk === null || gd === null) {
      setSaving(false)
      setError('All limits must be non-negative numbers.')
      return
    }

    updates.max_participants = mp
    updates.max_programs = mpr
    updates.max_contexts = mc
    updates.max_kiosks = mk
    updates.lockout_grace_days = gd
    updates.access_expires_at = expiresAt
      ? new Date(expiresAt).toISOString()
      : null

    const { error: err } = await updateAccountLimits(
      accountId,
      updates,
      operator.id
    )

    setSaving(false)

    if (err) {
      setError(err)
      return
    }

    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={'Edit access & limits - ' + accountName}
    >
      {loading ? (
        <div className="py-6 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Resource limits
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Max participants
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                />
                {usage && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {usage.participants} used
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Max programs
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxPrograms}
                  onChange={(e) => setMaxPrograms(e.target.value)}
                  className="block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                />
                {usage && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {usage.programs} used
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Max contexts / month
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxContexts}
                  onChange={(e) => setMaxContexts(e.target.value)}
                  className="block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                />
                {usage && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {usage.contexts_this_month} used this month
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Max kiosks
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxKiosks}
                  onChange={(e) => setMaxKiosks(e.target.value)}
                  className="block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                />
                {usage && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {usage.kiosks} used
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Access expiry
            </h3>
            <div className="mt-2">
              <label className="block text-xs text-slate-600 mb-1">
                Expires at
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickExpiry(7)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  +7d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(30)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  +30d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(90)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  +90d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(365)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  +1y
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(null)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  Never
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs text-slate-600 mb-1">
                Grace period (days)
              </label>
              <input
                type="number"
                min={0}
                max={90}
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                className="block w-24 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              />
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
              disabled={saving}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}