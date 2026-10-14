import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import PendingApproval from './pages/PendingApproval'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">Loading...</p>
    </div>
  )
}

function DashboardPlaceholder() {
  const { operator, account, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {account?.name ?? 'Dashboard'}
          </h1>
          <button
            onClick={signOut}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-slate-600">
            Signed in as <strong>{operator?.email}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Role: <strong>{operator?.role}</strong>
            {operator?.is_platform_admin && (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Platform Admin
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Account status: <strong>{account?.status}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Preset: <strong>{account?.preset}</strong>
          </p>
        </div>
        <p className="mt-6 text-sm text-slate-400">
          Dashboard shell coming in Phase 2.3.
        </p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, account, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (account && account.status === 'pending') {
    return <Navigate to="/pending" replace />
  }
  return <>{children}</>
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { session, account, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (session) {
    if (account?.status === 'pending') return <Navigate to="/pending" replace />
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

function PendingRoute() {
  const { session, account, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (account && account.status !== 'pending') {
    return <Navigate to="/dashboard" replace />
  }
  return <PendingApproval />
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route path="/pending" element={<PendingRoute />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}