import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'checkit_kiosk_device_token'

export default function KioskSetupPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'storing' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('No setup token in URL.')
      return
    }

    setStatus('storing')
    try {
      localStorage.setItem(STORAGE_KEY, token)
      setStatus('done')
      setTimeout(() => navigate('/kiosk/scan', { replace: true }), 800)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Could not save token')
    }
  }, [token, navigate])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center">
        <div className="text-4xl">🎫</div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Kiosk setup
        </h1>

        {status === 'storing' && (
          <p className="mt-3 text-sm text-slate-600">Pairing device...</p>
        )}
        {status === 'done' && (
          <p className="mt-3 text-sm text-emerald-700">
            Device paired. Redirecting to scanner...
          </p>
        )}
        {status === 'error' && (
          <div className="mt-3 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          If this screen doesn't redirect, go to{' '}
          <span className="font-mono">/kiosk/scan</span> manually.
        </p>
      </div>
    </div>
  )
}

export const KIOSK_STORAGE_KEY = STORAGE_KEY