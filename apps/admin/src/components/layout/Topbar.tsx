import { useAuth } from '../../contexts/AuthContext'

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { operator, signOut } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="rounded p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <span className="lg:hidden text-sm font-semibold text-slate-900 truncate">
          Quickie CheckIt
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-slate-900 truncate max-w-[160px]">
            {operator?.full_name ?? operator?.email}
          </div>
          <div className="flex items-center justify-end gap-1 text-xs text-slate-500">
            <span>{operator?.role}</span>
            {operator?.is_platform_admin && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Admin
              </span>
            )}
          </div>
        </div>

        <button
          onClick={signOut}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 whitespace-nowrap"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}