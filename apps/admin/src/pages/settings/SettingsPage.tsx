import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'

export default function SettingsPage() {
  const { operator, account } = useAuth()
  const preset = getPreset(account?.preset)

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Account and profile settings.
        </p>

        <div className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-sm font-medium text-slate-900">Your profile</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-0.5 text-slate-900">{operator?.full_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-0.5 text-slate-900">{operator?.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="mt-0.5 text-slate-900">{operator?.role}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Platform admin</dt>
              <dd className="mt-0.5 text-slate-900">
                {operator?.is_platform_admin ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-sm font-medium text-slate-900">Account</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-0.5 text-slate-900">{account?.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Preset</dt>
              <dd className="mt-0.5 text-slate-900">{preset.label}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Slug</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">{account?.slug}</dd>
            </div>
            <div>
              <dt className="text-slate-500">ID prefix</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">{account?.id_prefix}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Editable settings coming in a later phase.
        </p>
      </div>
    </div>
  )
}