import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'

export default function DashboardHome() {
  const { operator, account } = useAuth()
  const preset = getPreset(account?.preset)

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back, {operator?.full_name ?? operator?.email}.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {preset.labels.participants}
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">0</div>
            <div className="mt-1 text-xs text-slate-400">None registered yet</div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {preset.labels.contexts}
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">0</div>
            <div className="mt-1 text-xs text-slate-400">None created yet</div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Kiosks
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">0</div>
            <div className="mt-1 text-xs text-slate-400">None registered yet</div>
          </div>
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
              <dd className="mt-0.5 font-mono text-xs text-slate-700">{account?.slug}</dd>
            </div>
            <div>
              <dt className="text-slate-500">ID prefix</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">{account?.id_prefix}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tier</dt>
              <dd className="mt-0.5 text-slate-900">{account?.tier}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Real features land in Phase 3 onwards.
        </p>
      </div>
    </div>
  )
}