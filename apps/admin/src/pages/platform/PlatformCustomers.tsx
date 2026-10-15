import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  listAllAccounts,
  approveAccount,
  pauseAccount,
  restoreAccount,
  softDeleteAccount,
  upgradeTier,
  accountStatusClass,
  accountTierClass,
  type AccountWithCounts,
} from '../../lib/api/platform'

type StatusFilter = 'all' | 'active' | 'pending' | 'paused' | 'deleted'

export default function PlatformCustomers() {
  const { account: ownAccount } = useAuth()

  const [accounts, setAccounts] = useState<AccountWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [working, setWorking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await listAllAccounts()
    setAccounts(data)
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered =
    statusFilter === 'all'
      ? accounts
      : accounts.filter((a) => a.status === statusFilter)

  async function run(
    id: string,
    fn: () => Promise<{ error: string | null }>,
    label: string
  ) {
    if (!confirm(label)) return
    setWorking(id)
    const { error: err } = await fn()
    setWorking(null)
    if (err) {
      alert(err)
      return
    }
    load()
  }

  async function handleTierToggle(a: AccountWithCounts) {
    const next = a.tier === 'v1' ? 'v2' : 'v1'
    if (!confirm('Change ' + a.name + ' tier from ' + a.tier + ' to ' + next + '?'))
      return
    setWorking(a.id)
    const { error: err } = await upgradeTier(a.id, next)
    setWorking(null)
    if (err) {
      alert(err)
      return
    }
    load()
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-600">
            {accounts.length} account{accounts.length === 1 ? '' : 's'} on the
            platform
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(['all', 'active', 'pending', 'paused', 'deleted'] as StatusFilter[]).map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={
                'rounded px-3 py-1.5 text-xs font-medium ' +
                (statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100')
              }
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          )
        )}
      </div>

      {error && (
        <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-lg bg-white shadow">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">No accounts match.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium text-right">Ops</th>
                  <th className="px-4 py-3 font-medium text-right">Parts</th>
                  <th className="px-4 py-3 font-medium text-right">Ctxs</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => {
                  const isOwn = a.id === ownAccount?.id
                  const isWorking = working === a.id
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          to={'/platform/customers/' + a.id}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {a.name}
                        </Link>
                        {isOwn && (
                          <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {a.slug}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'rounded px-2 py-0.5 text-xs font-medium ' +
                            accountStatusClass(a.status)
                          }
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTierToggle(a)}
                          disabled={isWorking}
                          className={
                            'rounded px-2 py-0.5 text-xs font-medium hover:opacity-80 disabled:opacity-50 ' +
                            accountTierClass(a.tier)
                          }
                          title="Click to toggle tier"
                        >
                          {a.tier}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {a.operator_count}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {a.participant_count}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {a.context_count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-3 text-xs">
                          {a.status === 'pending' && (
                            <button
                              onClick={() =>
                                run(
                                  a.id,
                                  () => approveAccount(a.id),
                                  'Approve ' + a.name + '?'
                                )
                              }
                              disabled={isWorking}
                              className="text-emerald-700 hover:underline disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}
                          {a.status === 'active' && !isOwn && (
                            <button
                              onClick={() =>
                                run(
                                  a.id,
                                  () => pauseAccount(a.id),
                                  'Pause ' + a.name + '?'
                                )
                              }
                              disabled={isWorking}
                              className="text-orange-700 hover:underline disabled:opacity-50"
                            >
                              Pause
                            </button>
                          )}
                          {a.status === 'paused' && (
                            <button
                              onClick={() =>
                                run(
                                  a.id,
                                  () => restoreAccount(a.id),
                                  'Restore ' + a.name + '?'
                                )
                              }
                              disabled={isWorking}
                              className="text-emerald-700 hover:underline disabled:opacity-50"
                            >
                              Restore
                            </button>
                          )}
                          {a.status !== 'deleted' && !isOwn && (
                            <button
                              onClick={() =>
                                run(
                                  a.id,
                                  () => softDeleteAccount(a.id),
                                  'Soft delete ' + a.name + '? Data is preserved but the account is marked deleted.'
                                )
                              }
                              disabled={isWorking}
                              className="text-red-700 hover:underline disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Click the tier badge to toggle between v1 and v2. Paused accounts cannot
        access their dashboard. Deleted accounts are preserved but cannot log
        in.
      </p>
    </div>
  )
}