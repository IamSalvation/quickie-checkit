import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import { supabase } from '../../lib/supabase'

interface Counts {
  participants: number
  contexts: number
  kiosks: number
}

export default function DashboardHome() {
  const { operator, account } = useAuth()
  const preset = getPreset(account?.preset)

  const [counts, setCounts] = useState<Counts>({
    participants: 0,
    contexts: 0,
    kiosks: 0,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!account) return
    setLoading(true)

    const [p, c, k] = await Promise.all([
      supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id),
      supabase
        .from('contexts')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id),
      supabase
        .from('kiosks')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .eq('status', 'active'),
    ])

    setCounts({
      participants: p.count ?? 0,
      contexts: c.count ?? 0,
      kiosks: k.count ?? 0,
    })
    setLoading(false)
  }, [account])

  useEffect(() => {
    load()
  }, [load])

  function StatCard({
    label,
    value,
    href,
    hint,
  }: {
    label: string
    value: number
    href: string
    hint: string
  }) {
    return (
      <Link
        to={href}
        className="block rounded-lg bg-white p-5 shadow hover:shadow-md transition-shadow"
      >
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">
          {loading ? '-' : value}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {value === 0 ? hint : `View ${label.toLowerCase()}`}
        </div>
      </Link>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <img src="/logo.png" alt="Quickie Pinkas" className="h-8 w-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back, {operator?.full_name ?? operator?.email}.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label={preset.labels.participants}
            value={counts.participants}
            href="/participants"
            hint={`None registered yet`}
          />
          <StatCard
            label={preset.labels.contexts}
            value={counts.contexts}
            href="/contexts"
            hint="None created yet"
          />
          <StatCard
            label="Kiosks"
            value={counts.kiosks}
            href="/kiosks"
            hint="None registered yet"
          />
        </div>

        <div className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-sm font-medium text-slate-900">Account</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-0.5 text-slate-900">{account?.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Preset</dt>
              <dd className="mt-0.5 text-slate-900">{preset.label}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="mt-0.5 text-slate-900">{account?.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Slug</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">
                {account?.slug}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">ID prefix</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">
                {account?.id_prefix}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Tier</dt>
              <dd className="mt-0.5 text-slate-900">{account?.tier}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}