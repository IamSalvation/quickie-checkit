import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const items = [
    { to: '/dashboard', label: 'Dashboard', end: true },
    { to: '/participants', label: preset.labels.participants },
    { to: '/programs', label: preset.labels.programs },
    { to: '/contexts', label: preset.labels.contexts },
    { to: '/kiosks', label: 'Kiosks' },
    { to: '/reports', label: 'Reports' },
    { to: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800">
        <div className="min-w-0">
          <div className="text-base font-semibold truncate">
            Quickie CheckIt
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            {account?.name ?? 'Loading...'}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden text-2xl leading-none text-slate-400 hover:text-white px-1"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'block rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
        {preset.label} · {account?.status ?? '—'}
      </div>
    </nav>
  )
}