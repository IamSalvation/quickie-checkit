import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { daysUntilExpiry } from '../../lib/api/access'

interface Props {
  expiresAt: string | null
  graceDays: number
}

const CONTACT_EMAIL = 'obiorajoshua@gmail.com'

export default function GraceBanner({ expiresAt, graceDays }: Props) {
  const { account } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  // Calculate days since expiry (negative = still in grace window)
  const daysLeft = daysUntilExpiry(expiresAt)
  // If we're in grace, daysLeft is negative
  const graceRemaining = daysLeft !== null ? graceDays + daysLeft : 0

  const expiredLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'earlier'

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
          !
        </div>

        <div className="flex-1 text-sm text-amber-900">
          <div className="font-medium">
            Read-only mode — {account?.name ?? 'Your account'} access expired on{' '}
            {expiredLabel}
          </div>
          <div className="mt-0.5 text-xs text-amber-800">
            {graceRemaining > 0 ? (
              <>
                You have <strong>{graceRemaining} day{graceRemaining === 1 ? '' : 's'}</strong>{' '}
                of read-only access remaining to export your data. After that,
                sign-in will be disabled until you renew.
              </>
            ) : (
              <>Your account will be locked soon. Contact support to renew.</>
            )}{' '}
            You can still view and export data, but cannot create new records.
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <a
              href={'mailto:' + CONTACT_EMAIL + '?subject=Renew Pinkas access for ' + (account?.name ?? '')}
              className="rounded bg-amber-600 px-2.5 py-1 font-medium text-white hover:bg-amber-700"
            >
              Email to renew
            </a>
            <a
              href={'mailto:' + CONTACT_EMAIL}
              className="text-amber-900 underline hover:no-underline self-center"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 text-amber-700 hover:bg-amber-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}