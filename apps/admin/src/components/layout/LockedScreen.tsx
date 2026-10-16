import { useAuth } from '../../contexts/AuthContext'

const CONTACT_EMAIL = 'obiorajoshua@gmail.com'

export default function LockedScreen() {
  const { account, operator, signOut } = useAuth()

  const accountName = account?.name ?? 'Your account'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
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
          <strong>{accountName}</strong>&apos;s access has expired. Contact
          support to renew and restore full access.
        </p>

        <div className="mt-6 space-y-2 text-sm">
          <a
            href={
              'mailto:' +
              CONTACT_EMAIL +
              '?subject=Renew Pinkas access for ' +
              encodeURIComponent(accountName)
            }
            className="block w-full rounded bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800"
          >
            Email support to renew
          </a>
          <p className="text-xs text-slate-500">{CONTACT_EMAIL}</p>
        </div>

        {operator?.email && (
          <p className="mt-6 text-xs text-slate-400">
            Signed in as {operator.email}
          </p>
        )}

        <button
          onClick={signOut}
          className="mt-4 text-xs text-slate-500 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}