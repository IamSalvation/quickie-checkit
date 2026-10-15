import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Mobile overlay */}
      <div
        onClick={() => setMobileOpen(false)}
        className={[
          'fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden print:hidden',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 print:hidden',
          'lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col print:block print:w-full">
        <div className="print:hidden">
          <Topbar onMenuClick={() => setMobileOpen(true)} />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible print:h-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}