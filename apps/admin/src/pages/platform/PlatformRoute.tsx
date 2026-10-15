import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  children: ReactNode
}

export default function PlatformRoute({ children }: Props) {
  const { session, operator, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!operator?.is_platform_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}