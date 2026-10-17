import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

type Status = 'verifying' | 'success' | 'pending' | 'failed'

export default function BillingCallbackPage() {
  const { account, refresh } = useAuth()
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference') ?? searchParams.get('trxref')

  const [status, setStatus] = useState<Status>('verifying')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    async function checkStatus() {
      // Refresh auth context to pull latest account data
      await refresh()

      // Give the webhook 2 seconds to land, then keep checking
      if (attempts < 15) {
        timer = window.setTimeout(() => {
          if (!cancelled) {
            setAttempts((a) => a + 1)
          }
        }, 2000)
      } else if (!cancelled) {
        // After ~30 seconds, show pending
        setStatus('pending')
      }
    }

    checkStatus()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [attempts, refresh])

  // Check account status when account updates
  useEffect(() => {
    if (!account) return
    if (
      account.subscription_status === 'active' &&
      (account.billing_type === 'subscription' || account.billing_type === 'one_time')
    ) {
      setStatus('success')
    } else if (account.subscription_status === 'past_due') {
      setStatus('failed')
    }
  }, [account])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow text-center">
        <img
          src="/logo.png"
          alt="Quickie Pinkas"
          className="mx-auto h-12 w-auto mb-4"
        />

        {status === 'verifying' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Verifying payment...
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Please wait while we confirm your payment with Paystack.
            </p>
            {reference && (
              <p className="mt-4 font-mono text-xs text-slate-400">
                Reference: {reference}
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✓
            </div>
            <h1 className="mt-4 text-xl font-bold text-emerald-700">
              Payment successful
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your account is now active. Enjoy Pinkas.
            </p>
            <Link
              to="/billing"
              className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Back to billing
            </Link>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
              ⏱
            </div>
            <h1 className="mt-4 text-xl font-bold text-amber-700">
              Payment is taking longer than expected
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              We received your payment but haven't received confirmation from
              Paystack yet. It usually arrives within a minute. Try refreshing
              your billing page in a moment.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/billing"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Go to billing
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Check again
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">
              ✗
            </div>
            <h1 className="mt-4 text-xl font-bold text-red-700">
              Payment failed
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Something went wrong with your payment. You have not been charged.
              Please try again or contact support.
            </p>
            <Link
              to="/billing"
              className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Try again
            </Link>
          </>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Powered by Quickie Pinkas
        </p>
      </div>
    </div>
  )
}