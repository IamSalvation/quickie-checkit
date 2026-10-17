import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  initializeCheckout,
  purchaseOptionsForPreset,
  type PurchaseType,
} from '../../lib/api/billing'
import EventDateModal from '../../pages/billing/EventDateModal'

const CONTACT_EMAIL = 'obiorajoshua@gmail.com'

export default function LockedScreen() {
  const { account, operator, signOut } = useAuth()

  const [working, setWorking] = useState<PurchaseType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)

  const accountName = account?.name ?? 'Your account'
  const preset = account?.preset ?? 'school'
  const options = purchaseOptionsForPreset(preset)
  const isSubscriptionPreset = preset === 'school' || preset === 'hotel'

  async function handleSubscribe(type: PurchaseType, eventEndDate?: string) {
    if (!account) return
    setWorking(type)
    setError(null)

    const { data, error: err } = await initializeCheckout(
      account.id,
      type,
      eventEndDate
    )

    setWorking(null)

    if (err || !data) {
      setError(err ?? 'Checkout failed')
      return
    }

    window.location.href = data.authorization_url
  }

  function handleEventPassClick() {
    setShowEventModal(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-8 text-center">
        <img
          src="/logo.png"
          alt="Quickie Pinkas"
          className="mx-auto h-14 w-auto mb-4"
        />

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-red-600"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Access expired
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          <strong>{accountName}</strong>&apos;s access has expired. Choose a
          plan below to restore full access.
        </p>

        {error && (
          <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 text-left">
            {error}
          </div>
        )}

        {isSubscriptionPreset && (
          <div className="mt-6 space-y-2">
            {options.includes('v1') && (
              <button
                onClick={() => handleSubscribe('v1')}
                disabled={working !== null}
                className="block w-full rounded bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {working === 'v1'
                  ? 'Redirecting to Paystack...'
                  : 'Subscribe to V1 - NGN 35,000/month'}
              </button>
            )}
            {options.includes('v2') && (
              <button
                onClick={() => handleSubscribe('v2')}
                disabled={working !== null}
                className="block w-full rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {working === 'v2'
                  ? 'Redirecting to Paystack...'
                  : 'Subscribe to V2 - NGN 40,000/month'}
              </button>
            )}
          </div>
        )}

        {!isSubscriptionPreset && (
          <div className="mt-6 space-y-2">
            <button
              onClick={handleEventPassClick}
              disabled={working !== null}
              className="block w-full rounded bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {working === 'event_pass'
                ? 'Redirecting to Paystack...'
                : 'Buy Event Pass - NGN 50,000'}
            </button>
            <p className="text-xs text-slate-500">
              One-time payment. Active until your event ends, plus 7 days grace.
            </p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Need help? Email{' '}
            <a
              href={
                'mailto:' +
                CONTACT_EMAIL +
                '?subject=Renew Pinkas access for ' +
                encodeURIComponent(accountName)
              }
              className="text-slate-700 underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        {operator?.email && (
          <p className="mt-4 text-xs text-slate-400">
            Signed in as {operator.email}
          </p>
        )}

        <button
          onClick={signOut}
          className="mt-2 text-xs text-slate-500 hover:underline"
        >
          Sign out
        </button>
      </div>

      <EventDateModal
        open={showEventModal}
        onClose={() => setShowEventModal(false)}
        onConfirm={(eventEndDate) => {
          setShowEventModal(false)
          handleSubscribe('event_pass', eventEndDate)
        }}
      />
    </div>
  )
}