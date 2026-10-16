import { useEffect, useState } from 'react'
import {
  getAccountUsageFull,
  listLimitChanges,
  type AccountUsageFull,
  type LimitChangeRow,
} from '../../lib/api/platform'

interface Props {
  accountId: string
  accountName: string
  onEdit: () => void
}

function stateBadge(state: string): string {
  switch (state) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700'
    case 'grace':
      return 'bg-amber-50 text-amber-700'
    case 'locked':
      return 'bg-red-50 text-red-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function stateLabel(state: string): string {
  switch (state) {
    case 'active':
      return 'Active'
    case 'grace':
      return 'Grace (read-only)'
    case 'locked':
      return 'Locked'
    default:
      return state
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function usageColor(used: number, cap: number): string {
  if (used > cap) return 'text-red-700 font-semibold'
  if (used === cap) return 'text-amber-700 font-semibold'
  return 'text-slate-900'
}

function progressPct(used: number, cap: number): number {
  if (cap <= 0) return 100
  return Math.min(100, Math.round((used / cap) * 100))
}

function progressColor(used: number, cap: number): string {
  if (used > cap) return 'h-full bg-red-500'
  if (used === cap) return 'h-full bg-amber-500'
  if (progressPct(used, cap) > 75) return 'h-full bg-amber-400'
  return 'h-full bg-emerald-500'
}

function fieldLabel(f: string): string {
  switch (f) {
    case 'max_participants': return 'Max participants'
    case 'max_programs': return 'Max programs'
    case 'max_contexts': return 'Max contexts / month'
    case 'max_kiosks': return 'Max kiosks'
    case 'access_expires_at': return 'Access expires'
    case 'lockout_grace_days': return 'Grace days'
    default: return f
  }
}

export default function AccessLimitsCard({
  accountId,
  accountName,
  onEdit,
}: Props) {
  const [usage, setUsage] = useState<AccountUsageFull | null>(null)
  const [changes, setChanges] = useState<LimitChangeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const [u, c] = await Promise.all([
        getAccountUsageFull(accountId),
        listLimitChanges(accountId, 5),
      ])
      if (cancelled) return
      if (u.error) setError(u.error)
      setUsage(u.data)
      setChanges(c.data)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [accountId])

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-slate-900">
            Access &amp; limits
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {accountName}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
        >
          Edit
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-red-700">{error}</div>
      ) : !usage ? (
        <div className="p-6 text-sm text-slate-500">
          No usage data.
        </div>
      ) : (
        <div className="p-4 space-y-5">
          {/* Status row */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={
                'rounded px-2 py-0.5 text-xs font-medium ' +
                stateBadge(usage.state)
              }
            >
              {stateLabel(usage.state)}
            </span>
            <span className="text-slate-600">
              Expires: <strong className="text-slate-900">
                {formatDate(usage.access_expires_at)}
              </strong>
              {usage.access_expires_at && (
                <>
                  {' '}
                  (
                  {(() => {
                    const d = daysUntil(usage.access_expires_at)
                    if (d === null) return null
                    if (d > 0) return d + 'd left'
                    if (d === 0) return 'today'
                    return Math.abs(d) + 'd ago'
                  })()}
                  )
                </>
              )}
            </span>
            <span className="text-slate-500">
              Grace: {usage.lockout_grace_days}d
            </span>
          </div>

          {/* Usage table */}
          <div className="space-y-3">
            {(
              [
                ['participants', 'Participants', usage.max_participants],
                ['programs', 'Programs', usage.max_programs],
                ['contexts_this_month', 'Contexts this month', usage.max_contexts],
                ['kiosks', 'Kiosks', usage.max_kiosks],
              ] as const
            ).map(([key, label, cap]) => {
              const used = usage[key]
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{label}</span>
                    <span className={usageColor(used, cap)}>
                      {used} / {cap}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={progressColor(used, cap)}
                      style={{ width: progressPct(used, cap) + '%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent changes */}
          {changes.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-xs font-medium text-slate-700">
                Recent changes
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {changes.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {fieldLabel(c.field)}:{' '}
                      <span className="text-slate-400">
                        {c.old_value ?? 'null'}
                      </span>{' '}
                      {'->'}{' '}
                      <span className="text-slate-900">
                        {c.new_value ?? 'null'}
                      </span>
                    </span>
                    <span className="shrink-0 text-slate-400">
                      {new Date(c.changed_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}