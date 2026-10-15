import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })

    setSubmitting(false)

    if (err) {
      setError(err.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl font-bold text-emerald-600">OK</div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Check your email
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            If an account exists for <strong>{email}</strong>, we sent a
            password reset link. Open it to choose a new password.
          </p>
          <p className="mt-6 text-xs text-slate-400">
            Did not get it? Check spam, or{' '}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-slate-600 underline"
            >
              try a different email
            </button>
            .
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm text-slate-600 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your email and we will send you a link to reset.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered it?{' '}
          <Link
            to="/login"
            className="font-medium text-slate-900 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}