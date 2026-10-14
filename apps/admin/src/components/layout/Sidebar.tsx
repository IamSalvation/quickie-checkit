import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
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
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="text-base font-semibold">Quickie CheckIt</div>
        <div className="mt-1 text-xs text-slate-400 truncate">
          {account?.name ?? 'Loading...'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'block px-4 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-slate-800 text-white font-medium'
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