import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'

export default function ContextsPage() {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900">
          {preset.labels.contexts}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Create {preset.labels.contexts.toLowerCase()}, open them for check-in, and track attendance.
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Coming in Phase 4 — {preset.labels.contexts.toLowerCase()} creation and check-in.
          </p>
        </div>
      </div>
    </div>
  )
}