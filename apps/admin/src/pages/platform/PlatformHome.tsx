import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { listAllAccounts } from '../../lib/api/platform'
import { getSupportUnreadCounts } from '../../lib/api/support'

interface HomeCounts {
  total: number
  active: number
  pending: number
  paused: number
  deleted: number
}

export default function PlatformHome() {
  const { operator, account } = useAuth()
  const [counts, setCounts] = useState<HomeCounts>({
    total: 0,
    active: 0,
    pending: 0,
    paused: 0,
    deleted: 0,
  })
  const [loading, setLoading] = useState(true)
  const [unreadInbox, setUnreadInbox] = useState(0)

  useEffect(() => {
    listAllAccounts().then(({ data }) => {
      const c: HomeCounts = {
        total: data.length,
        active: 0,
        pending: 0,
        paused: 0,
        deleted: 0,
      }
      for (const a of data) {
        if (a.status === 'active') c.active++
        else if (a.status === 'pending') c.pending++
        else if (a.status === 'paused') c.paused++
        else if (a.status === 'deleted') c.deleted++
      }
      setCounts(c)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await getSupportUnreadCounts()
      if (!cancelled) setUnreadInbox(data.unread_for_platform)
    }

    load()
    const iv = setInterval(load, 20000)

    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Platform admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage all accounts on Quickie CheckIt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/platform/customers"
          className="block rounded-lg bg-white p-5 shadow hover:shadow-md transition-shadow"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Customers
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {loading ? '-' : counts.total}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
            {counts.active > 0 && (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                {counts.active} active
              </span>
            )}
            {counts.pending > 0 && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                {counts.pending} pending
              </span>
            )}
            {counts.paused > 0 && (
              <span className="rounded bg-orange-50 px-1.5 py-0.5 font-medium text-orange-700">
                {counts.paused} paused
              </span>
            )}
          </div>
        </Link>

        <Link
          to="/dashboard"
          className="block rounded-lg bg-white p-5 shadow hover:shadow-md transition-shadow"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500">
            My Org Admin
          </div>
          <div className="mt-1 text-base font-semibold text-slate-900 truncate">
            {account?.name ?? 'My account'}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Go to your own account dashboard
          </div>
        </Link>

        <Link
          to="/platform/inbox"
          className="block rounded-lg bg-white p-5 shadow hover:shadow-md transition-shadow"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Inbox
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {unreadInbox}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {unreadInbox > 0 ? 'unread messages' : 'Customer support messages'}
          </div>
        </Link>
      </div>

      <div className="mt-8 rounded-lg bg-white p-5 shadow">
        <h2 className="text-sm font-medium text-slate-900">Signed in as</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Operator</dt>
            <dd className="mt-0.5 text-slate-900">
              {operator?.full_name ?? operator?.email}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Your account</dt>
            <dd className="mt-0.5 text-slate-900">{account?.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Platform admin</dt>
            <dd className="mt-0.5 text-emerald-700 font-medium">Yes</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}