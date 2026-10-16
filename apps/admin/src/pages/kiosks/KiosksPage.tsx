import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  listKiosks,
  createKiosk,
  revokeKiosk,
  restoreKiosk,
  deleteKiosk,
  buildSetupUrl,
  type Kiosk,
  type KioskStatus,
} from '../../lib/api/kiosks'
import Modal from '../../components/ui/Modal'

function formatDateTime(iso: string | null): string {
  if (!iso) return 'â€”'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function KiosksPage() {
  const { account } = useAuth()

  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<KioskStatus | 'all'>('active')

  const [showCreate, setShowCreate] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState<Kiosk | null>(null)

  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    const { data, count: total, error: err } = await listKiosks(account.id, {
      status: statusFilter,
    })
    setKiosks(data)
    setCount(total)
    setError(err)
    setLoading(false)
  }, [account, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  function resetCreateForm() {
    setNewLabel('')
    setNewLocation('')
    setCreateError(null)
    setCreating(false)
  }

  async function handleCreate() {
    if (!account) return
    setCreateError(null)
    setCreating(true)

    const { data, error: err } = await createKiosk({
      accountId: account.id,
      label: newLabel,
      location: newLocation || null,
    })

    setCreating(false)

    if (err || !data) {
      setCreateError(err ?? 'Could not create')
      return
    }

    setJustCreated(data)
    resetCreateForm()
    setShowCreate(false)
    load()
  }

  async function handleRevoke(k: Kiosk) {
    if (!confirm(`Revoke "${k.label}"? This kiosk will stop accepting check-ins.`)) return
    const { error: err } = await revokeKiosk(k.id)
    if (err) { alert(err); return }
    load()
  }

  async function handleRestore(k: Kiosk) {
    const { error: err } = await restoreKiosk(k.id)
    if (err) { alert(err); return }
    load()
  }

  async function handleDelete(k: Kiosk) {
    if (!confirm(`Permanently delete "${k.label}"?`)) return
    const { error: err } = await deleteKiosk(k.id)
    if (err) { alert(err); return }
    setKiosks((prev) => prev.filter((x) => x.id !== k.id))
    setCount((c) => Math.max(0, c - 1))
  }

  function toggleToken(id: string) {
    setRevealedTokens((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => alert('Copied to clipboard'),
      () => alert('Copy failed â€” long-press or right-click to copy manually')
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <img src="/logo.png" alt="Quickie Pinkas" className="h-8 w-auto mb-4" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kiosks</h1>
            <p className="mt-1 text-sm text-slate-600">
              {count} {count === 1 ? 'device' : 'devices'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Register kiosk
          </button>
        </div>

        <div className="mt-5 flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as KioskStatus | 'all')}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
            <option value="all">All</option>
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-lg bg-white shadow">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading...</div>
          ) : kiosks.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">
                {statusFilter === 'active'
                  ? 'No active kiosks. Register one to start checking participants in.'
                  : 'No kiosks match this filter.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="divide-y divide-slate-100 sm:hidden">
                {kiosks.map((k) => {
                  const revealed = revealedTokens.has(k.id)
                  const setupUrl = buildSetupUrl(k.device_token)
                  return (
                    <li key={k.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900">{k.label}</div>
                          {k.location && (
                            <div className="text-xs text-slate-500">{k.location}</div>
                          )}
                        </div>
                        {k.status === 'active' ? (
                          <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Revoked
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500">
                        Last seen: {formatDateTime(k.last_seen_at)}
                      </div>

                      <div>
                        {revealed ? (
                          <div className="space-y-1">
                            <code className="block break-all font-mono text-[10px] text-slate-600">
                              {setupUrl}
                            </code>
                            <div className="flex gap-3 text-xs">
                              <button
                                onClick={() => copyToClipboard(setupUrl)}
                                className="text-slate-600 hover:underline"
                              >
                                Copy
                              </button>
                              <a
                                href={setupUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-600 hover:underline"
                              >
                                Open
                              </a>
                              <button
                                onClick={() => toggleToken(k.id)}
                                className="text-slate-600 hover:underline"
                              >
                                Hide
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleToken(k.id)}
                            className="text-xs text-slate-500 hover:underline"
                          >
                            Reveal setup URL
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3 text-xs pt-1">
                        {k.status === 'active' ? (
                          <button
                            onClick={() => handleRevoke(k)}
                            className="text-slate-600 hover:underline"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(k)}
                            className="text-emerald-700 hover:underline"
                          >
                            Restore
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(k)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Label</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Last seen</th>
                      <th className="px-4 py-3 font-medium">Device token</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kiosks.map((k) => {
                      const revealed = revealedTokens.has(k.id)
                      const setupUrl = buildSetupUrl(k.device_token)
                      return (
                        <tr key={k.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-900">{k.label}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {k.location ?? <span className="text-slate-300">â€”</span>}
                          </td>
                          <td className="px-4 py-3">
                            {k.status === 'active' ? (
                              <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                Revoked
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatDateTime(k.last_seen_at)}
                          </td>
                          <td className="px-4 py-3">
                            {revealed ? (
                              <div className="flex flex-col gap-1">
                                <code className="font-mono text-[10px] text-slate-600 break-all">
                                  {setupUrl}
                                </code>
                                <div className="flex gap-2 text-[10px]">
                                  <button
                                    onClick={() => copyToClipboard(setupUrl)}
                                    className="text-slate-600 hover:underline"
                                  >
                                    Copy
                                  </button>
                                  <a
                                    href={setupUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-600 hover:underline"
                                  >
                                    Open
                                  </a>
                                  <button
                                    onClick={() => toggleToken(k.id)}
                                    className="text-slate-600 hover:underline"
                                  >
                                    Hide
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => toggleToken(k.id)}
                                className="text-xs text-slate-500 hover:underline"
                              >
                                Reveal setup URL
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-3 text-xs">
                              {k.status === 'active' ? (
                                <button
                                  onClick={() => handleRevoke(k)}
                                  className="text-slate-600 hover:underline"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestore(k)}
                                  className="text-emerald-700 hover:underline"
                                >
                                  Restore
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(k)}
                                className="text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Open the setup URL on the tablet you want to use as a kiosk. The URL
          pairs the device automatically, then redirects it to the scan screen.
        </p>
      </div>

      {/* Register modal */}
      <Modal
        open={showCreate}
        onClose={() => { resetCreateForm(); setShowCreate(false) }}
        title="Register kiosk"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Label</label>
            <input
              type="text"
              required
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Lecture Hall A"
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Location <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Block B, Room 12"
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {createError && (
            <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { resetCreateForm(); setShowCreate(false) }}
              disabled={creating}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newLabel.trim()}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? 'Registering...' : 'Register'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Just-created confirmation */}
      <Modal
        open={!!justCreated}
        onClose={() => setJustCreated(null)}
        title="Kiosk registered"
      >
        {justCreated && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Open this URL on the tablet you want to use as the kiosk:
            </p>
            <div className="rounded bg-slate-50 border border-slate-200 p-3">
              <code className="block break-all font-mono text-xs text-slate-800">
                {buildSetupUrl(justCreated.device_token)}
              </code>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copyToClipboard(buildSetupUrl(justCreated.device_token))}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Copy URL
              </button>
              <a
                href={buildSetupUrl(justCreated.device_token)}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Open in new tab
              </a>
            </div>
            <p className="text-xs text-slate-500">
              You can re-open this URL later from the Kiosks list.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}