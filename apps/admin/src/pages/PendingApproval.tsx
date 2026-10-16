import { useAuth } from '../contexts/AuthContext'

export default function PendingApproval() {
  const { account, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 text-center">
        <img src="/logo.png" alt="Quickie Pinkas" className="mx-auto h-16 w-auto mb-4" /><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <span className="text-2xl">â³</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Account pending approval
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          {account
            ? `"${account.name}" is awaiting approval. We'll let you in as soon as it's activated.`
            : 'Your account is awaiting approval.'}
        </p>

        <button
          onClick={signOut}
          className="mt-6 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}