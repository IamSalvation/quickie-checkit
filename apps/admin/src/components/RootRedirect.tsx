import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RootRedirect() {
  const { session, account, operator, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Platform admins always land on /platform
  if (operator?.is_platform_admin) {
    return <Navigate to="/platform" replace />
  }

  // Account pending approval
  if (account?.status === 'pending') {
    return <Navigate to="/pending" replace />
  }

  // Account paused or deleted
  if (account?.status === 'paused' || account?.status === 'deleted') {
    return <Navigate to="/pending" replace />
  }

  // Everyone else
  return <Navigate to="/dashboard" replace />
}