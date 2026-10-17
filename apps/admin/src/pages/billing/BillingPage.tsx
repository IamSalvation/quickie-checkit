import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  initializeCheckout,
  readBillingStatus,
  purchaseOptionsForPreset,
  formatBillingDate,
  daysUntil,
  type PurchaseType,
} from '../../lib/api/billing'
import EventDateModal from './EventDateModal'

export default function BillingPage() {
  const { account } = useAuth()

  const [working, setWorking] = useState<PurchaseType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)

  if (!account) {
    return <div className="p-6 text-sm text-slate-500">Loading...</div>
  }

  const status = readBillingStatus(account)
  const options = purchaseOptionsForPreset(account.preset)
  const isSubscriptionPreset =
    account.preset === 'school' || account.preset === 'hotel'

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

    // Redirect to Paystack checkout
    window.location.href = data.authorization_url
  }

  function handleEventPassClick() {
    setShowEventModal(true)
  }

  const daysLeft = daysUntil(status.access_expires_at)

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <img src="/logo.png" alt="Quickie Pinkas" className="h-8 w-auto mb-4" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your subscription and payment.
          </p>
        </div>

        {/* Current status */}
        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-sm font-medium text-slate-900">
            Current status
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Tier</dt>
              <dd className="mt-0.5 text-slate-900 font-medium">
                {status.tier.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Billing type</dt>
              <dd className="mt-0.5 text-slate-900">{status.billing_type}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="mt-0.5">
                <span
                  className={
                    status.subscription_status === 'active'
                      ? 'rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                      : status.subscription_status === 'past_due'
                      ? 'rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700'
                      : status.subscription_status === 'canceled'
                      ? 'rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700'
                      : 'rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
                  }
                >
                  {status.subscription_status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Access expires</dt>
              <dd className="mt-0.5 text-slate-900">
                {formatBillingDate(status.access_expires_at)}
                {daysLeft !== null && (
                  <span className="ml-1 text-xs text-slate-500">
                    ({daysLeft > 0 ? daysLeft + 'd left' : daysLeft === 0 ? 'today' : Math.abs(daysLeft) + 'd ago'})
                  </span>
                )}
              </dd>
            </div>
            {status.cancel_at_period_end && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500"></dt>
                <dd className="mt-0.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                  Cancelling at period end on{' '}
                  {formatBillingDate(status.current_period_end)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pricing cards */}
        <h2 className="mb-3 text-sm font-medium text-slate-900">
          {isSubscriptionPreset ? 'Plans' : 'Event Pass'}
        </h2>

        {isSubscriptionPreset ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {options.includes('v1') && (
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Basic
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  V1
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  NGN 35,000
                  <span className="text-sm font-normal text-slate-500">
                    /month
                  </span>
                </div>
                <ul className="mt-4 space-y-1 text-xs text-slate-600">
                  <li>- 50 participants</li>
                  <li>- 5 programs</li>
                  <li>- 20 contexts/month</li>
                  <li>- 1 kiosk</li>
                </ul>
                <button
                  onClick={() => handleSubscribe('v1')}
                  disabled={working !== null || status.tier === 'v1' && status.subscription_status === 'active'}
                  className="mt-4 w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {working === 'v1'
                    ? 'Loading...'
                    : status.tier === 'v1' && status.subscription_status === 'active'
                    ? 'Current plan'
                    : 'Subscribe to V1'}
                </button>
              </div>
            )}

            {options.includes('v2') && (
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-xs uppercase tracking-wide text-amber-600">
                  Recommended
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  V2
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  NGN 40,000
                  <span className="text-sm font-normal text-slate-500">
                    /month
                  </span>
                </div>
                <ul className="mt-4 space-y-1 text-xs text-slate-600">
                  <li>- Unlimited participants</li>
                  <li>- Unlimited programs</li>
                  <li>- Unlimited contexts</li>
                  <li>- Unlimited kiosks</li>
                  <li>- Face verification</li>
                  <li>- Review queue</li>
                </ul>
                <button
                  onClick={() => handleSubscribe('v2')}
                  disabled={working !== null || status.tier === 'v2' && status.subscription_status === 'active'}
                  className="mt-4 w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {working === 'v2'
                    ? 'Loading...'
                    : status.tier === 'v2' && status.subscription_status === 'active'
                    ? 'Current plan'
                    : 'Subscribe to V2'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              One-time
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              Event Pass
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              NGN 50,000
              <span className="text-sm font-normal text-slate-500">
                /event
              </span>
            </div>
            <ul className="mt-4 space-y-1 text-xs text-slate-600">
              <li>- 200 participants</li>
              <li>- 10 programs</li>
              <li>- 100 contexts</li>
              <li>- 5 kiosks</li>
              <li>- Active until your event ends</li>
              <li>- 7-day grace period after</li>
            </ul>
            <button
              onClick={handleEventPassClick}
              disabled={working !== null || status.subscription_status === 'active'}
              className="mt-4 w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {working === 'event_pass'
                ? 'Loading...'
                : status.subscription_status === 'active'
                ? 'Active'
                : 'Buy Event Pass'}
            </button>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          All prices in Nigerian Naira. Payments processed securely by Paystack.
        </p>
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
