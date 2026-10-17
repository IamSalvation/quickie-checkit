import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import { supabase } from '../../lib/supabase'
import StorageCleanupCard from '../../components/storage/StorageCleanupCard'

type SaveState = 'idle' | 'saving' | 'success' | 'error'

export default function SettingsPage() {
  const { operator, account, refresh, signOut } = useAuth()
  const preset = getPreset(account?.preset)

  // -------- Profile: full name --------
  const [fullName, setFullName] = useState(operator?.full_name ?? '')
  const [profileState, setProfileState] = useState<SaveState>('idle')
  const [profileError, setProfileError] = useState<string | null>(null)

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    if (!operator) return
    setProfileState('saving')
    setProfileError(null)

    const trimmed = fullName.trim()
    if (!trimmed) {
      setProfileState('error')
      setProfileError('Name cannot be empty')
      return
    }

    const { error } = await supabase
      .from('operators')
      .update({ full_name: trimmed })
      .eq('id', operator.id)

    if (error) {
      setProfileState('error')
      setProfileError(error.message)
      return
    }

    await refresh()
    setProfileState('success')
    setTimeout(() => setProfileState('idle'), 2500)
  }

  // -------- Security: change password --------
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwState, setPwState] = useState<SaveState>('idle')
  const [pwError, setPwError] = useState<string | null>(null)

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwState('saving')
    setPwError(null)

    if (newPassword.length < 6) {
      setPwState('error')
      setPwError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwState('error')
      setPwError('Passwords do not match')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPwState('error')
      setPwError(error.message)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setPwState('success')
    setTimeout(() => setPwState('idle'), 2500)
  }

  // -------- Security: sign out everywhere --------
  const [signOutAllState, setSignOutAllState] = useState<SaveState>('idle')

  async function handleSignOutEverywhere() {
    if (
      !confirm(
        'Sign out of all devices? You will be logged out of this session and every other device.'
      )
    )
      return

    setSignOutAllState('saving')
    await supabase.auth.signOut({ scope: 'global' })
    setSignOutAllState('success')
    // signOut() in context will handle redirect via ProtectedRoute
    await signOut()
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <img src="/logo.png" alt="Quickie Pinkas" className="h-8 w-auto mb-4" />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your profile and account.
          </p>
        </div>

        {/* Profile */}
        <section className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
          <p className="mt-1 text-xs text-slate-500">
            Your display name across the app.
          </p>

          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full max-w-md rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="text"
                  value={operator?.email ?? ''}
                  readOnly
                  className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Contact support to change your email.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <input
                  type="text"
                  value={operator?.role ?? ''}
                  readOnly
                  className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                />
              </div>
            </div>

            {profileState === 'error' && profileError && (
              <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {profileError}
              </div>
            )}
            {profileState === 'success' && (
              <div className="rounded bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                Saved.
              </div>
            )}

            <button
              type="submit"
              disabled={profileState === 'saving'}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {profileState === 'saving' ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </section>

        {/* Security */}
        <section className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-sm font-semibold text-slate-900">Security</h2>
          <p className="mt-1 text-xs text-slate-500">
            Change your password or sign out of all devices.
          </p>

          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                className="mt-1 block w-full max-w-md rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                className="mt-1 block w-full max-w-md rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            {pwState === 'error' && pwError && (
              <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {pwError}
              </div>
            )}
            {pwState === 'success' && (
              <div className="rounded bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                Password updated.
              </div>
            )}

            <button
              type="submit"
              disabled={pwState === 'saving' || !newPassword || !confirmPassword}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pwState === 'saving' ? 'Updating...' : 'Update password'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-medium text-slate-900">
              Sign out everywhere
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Revokes every active session, including this one.
            </p>
            <button
              type="button"
              onClick={handleSignOutEverywhere}
              disabled={signOutAllState === 'saving'}
              className="mt-2 rounded border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {signOutAllState === 'saving'
                ? 'Signing out...'
                : 'Sign out everywhere'}
            </button>
          </div>
        </section>

        {/* Storage */}
        <div className="mt-6">
          {account && <StorageCleanupCard accountId={account.id} />}
        </div>

        {/* Account */}
        <section className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-sm font-semibold text-slate-900">Account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Read-only account information.
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-0.5 text-slate-900">{account?.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Preset</dt>
              <dd className="mt-0.5 text-slate-900">{preset.label}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Slug</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">
                {account?.slug}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Tier</dt>
              <dd className="mt-0.5 text-slate-900">{account?.tier}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="mt-0.5 text-slate-900">{account?.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">ID prefix</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">
                {account?.id_prefix}
              </dd>
            </div>
          </dl>

          {operator?.is_platform_admin && (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                You are a platform admin.
              </p>
              <Link
                to="/platform"
                className="mt-1 inline-block text-xs font-medium text-amber-900 underline"
              >
                Open Platform Console
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}