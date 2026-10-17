import { useEffect, useState, useCallback } from 'react'
import {
  getStorageUsage,
  listCleanupCandidates,
  deleteCheckInPhotos,
  formatBytes,
  type StorageUsage,
  type CleanupResult,
} from '../../lib/api/storage'

interface Props {
  accountId: string
  /** When true, shows the platform admin style title and audit hint */
  isPlatformAdmin?: boolean
  /** Callback fired after successful cleanup (e.g. to refresh usage on a parent card) */
  onCleanupComplete?: (result: CleanupResult) => void
}

const RETENTION_OPTIONS: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '21d', days: 21 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0 },
]

export default function StorageCleanupCard({
  accountId,
  isPlatformAdmin = false,
  onCleanupComplete,
}: Props) {
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null)
  const [previewCounts, setPreviewCounts] = useState<Record<number, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await getStorageUsage(accountId)
    if (err) {
      setError(err)
      setLoading(false)
      return
    }
    setUsage(data)

    // Fetch preview counts for each retention option in parallel
    if (data && data.checkin_photo_count > 0) {
      const counts: Record<number, number> = {}
      await Promise.all(
        RETENTION_OPTIONS.map(async (opt) => {
          const res = await listCleanupCandidates(accountId, opt.days)
          counts[opt.days] = res.data.length
        })
      )
      setPreviewCounts(counts)
    }

    setLoading(false)
  }, [accountId])

  useEffect(() => {
    load()
  }, [load])

  async function handleCleanup(days: number) {
    const count = previewCounts[days] ?? 0
    if (count === 0) {
      alert('No photos match that retention window.')
      return
    }

    const confirmMsg =
      'Delete ' +
      count +
      ' check-in photo' +
      (count === 1 ? '' : 's') +
      ' older than ' +
      (days === 0 ? 'everything' : days + ' days') +
      '?\n\n' +
      'This removes the photo files from storage and clears photo_url on those records. ' +
      'Attendance records themselves are preserved Ã¢â‚¬â€ only the selfie images are deleted.\n\n' +
      'Enrollment photos are NEVER deleted.\n\n' +
      'This cannot be undone.'

    if (!confirm(confirmMsg)) return

    setRunning(true)
    setProgress({ done: 0, total: count })
    setLastResult(null)

    // 1. Fetch candidates
    const { data: candidates, error: listErr } = await listCleanupCandidates(
      accountId,
      days
    )
    if (listErr || !candidates) {
      setRunning(false)
      alert('Could not list candidates: ' + (listErr ?? 'unknown'))
      return
    }

    // 2. Delete in batches
    const { data: result, error: delErr } = await deleteCheckInPhotos(
      accountId,
      candidates,
      (done, total) => setProgress({ done, total })
    )

    setRunning(false)

    if (delErr || !result) {
      alert('Cleanup failed: ' + (delErr ?? 'unknown'))
      return
    }

    setLastResult(result)
    if (onCleanupComplete) onCleanupComplete(result)

    // Refresh usage stats
    load()
  }

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-sm text-slate-500">Loading storageÃ¢â‚¬Â¦</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-sm text-red-700">Error: {error}</p>
      </div>
    )
  }

  if (!usage) return null

  const totalCheckinBytes = usage.checkin_photo_count * 50000

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-medium text-slate-900">Storage</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Manage check-in selfie captures. Enrollment photos are never touched.
        </p>
      </div>

      <div className="space-y-4 p-4">
        {/* Usage summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Check-in photos
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {usage.checkin_photo_count}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              ~{formatBytes(totalCheckinBytes)} (est.)
            </div>
            {usage.pending_review_count > 0 && (
              <div className="mt-1 text-[11px] text-amber-700">
                {usage.pending_review_count} awaiting face review (protected)
              </div>
            )}
            {usage.oldest_checkin_photo_at && (
              <div className="mt-1 text-[11px] text-slate-400">
                Oldest:{' '}
                {new Date(usage.oldest_checkin_photo_at).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Enrollment photos
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {usage.enrollment_photo_count}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              ~{formatBytes(usage.enrollment_photo_bytes_estimate)} (est.)
            </div>
            <div className="mt-1 text-[11px] text-emerald-700">
              Protected Ã¢â‚¬â€ never deleted
            </div>
          </div>
        </div>

        {/* Cleanup options */}
        {usage.checkin_photo_count > 0 && (
          <div>
            <h3 className="text-xs font-medium text-slate-700">
              Delete check-in photos older than
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RETENTION_OPTIONS.map((opt) => {
                const count = previewCounts[opt.days] ?? 0
                const disabled = running || count === 0
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleCleanup(opt.days)}
                    disabled={disabled}
                    className={
                      'rounded border px-2.5 py-1.5 text-xs font-medium ' +
                      (disabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100')
                    }
                  >
                    {opt.label}
                    <span className="ml-1 text-slate-400">({count})</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Numbers in parentheses show how many photos match that window.
            </p>
          </div>
        )}

        {/* Progress */}
        {running && (
          <div>
            <p className="text-xs text-slate-600">
              Deleting... {progress.done} / {progress.total}
            </p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-slate-900 transition-all"
                style={{
                  width:
                    progress.total > 0
                      ? Math.round((progress.done / progress.total) * 100) + '%'
                      : '0%',
                }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {lastResult && !running && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <div className="font-medium">Cleanup complete</div>
            <div className="mt-1">
              Deleted {lastResult.deleted} photo
              {lastResult.deleted === 1 ? '' : 's'} Ã‚Â- ~
              {formatBytes(lastResult.bytes_freed_estimate)} freed (est.)
            </div>
            {lastResult.failed > 0 && (
              <div className="mt-1 text-red-700">
                {lastResult.failed} failed Ã¢â‚¬â€{' '}
                {lastResult.errors.slice(0, 3).join('; ')}
                {lastResult.errors.length > 3 && ' ...'}
              </div>
            )}
          </div>
        )}

        {usage.checkin_photo_count === 0 && (
          <p className="text-xs text-slate-500">
            No check-in photos to clean up.
          </p>
        )}

        {isPlatformAdmin && (
          <p className="text-[11px] text-slate-400">
            Platform admin action Ã¢â‚¬â€ will appear in your audit log.
          </p>
        )}
      </div>
    </div>
  )
}