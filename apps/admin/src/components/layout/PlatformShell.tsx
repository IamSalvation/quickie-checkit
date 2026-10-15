import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function PlatformShell() {
  const { operator, account, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/platform', label: 'Home', end: true },
    { to: '/platform/customers', label: 'Customers', end: false },
    { to: '/platform/inbox', label: 'Inbox', end: false },
  ]

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900">
                Platform
              </span>
              <span className="font-semibold truncate">Quickie CheckIt</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/dashboard"
                className="text-xs text-slate-300 hover:text-white whitespace-nowrap"
                title={'Return to ' + (account?.name ?? 'my account')}
              >
                Return to {account?.name ?? 'my account'}
              </Link>
              <span className="hidden sm:inline text-xs text-slate-400 truncate max-w-[180px]">
                {operator?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 whitespace-nowrap"
              >
                Sign out
              </button>
            </div>
          </div>

          <nav className="mt-3 flex items-center gap-4 overflow-x-auto pb-1 -mb-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'text-sm font-medium whitespace-nowrap',
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}