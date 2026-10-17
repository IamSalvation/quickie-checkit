import { supabase } from '../supabase'

export interface StorageUsage {
  state: 'active' | 'grace' | 'locked'
  checkin_photo_count: number
  checkin_photo_bytes_estimate: number
  oldest_checkin_photo_at: string | null
  pending_review_count: number
  enrollment_photo_count: number
  enrollment_photo_bytes_estimate: number
}

export interface CleanupCandidate {
  record_id: string
  photo_url: string
  checked_in_at: string
}

export interface CleanupResult {
  deleted: number
  failed: number
  bytes_freed_estimate: number
  errors: string[]
}

/**
 * Estimate bytes per photo. Actual size varies, but 50KB is a reasonable average
 * for JPEGs captured at kiosk quality.
 */
const BYTES_PER_PHOTO = 50000

/**
 * Get storage usage stats for an account.
 */
export async function getStorageUsage(
  accountId: string
): Promise<{ data: StorageUsage | null; error: string | null }> {
  const { data, error } = await supabase.rpc('account_storage_usage', {
    p_account_id: accountId,
  })
  if (error || !data) {
    return { data: null, error: error?.message ?? null }
  }
  return { data: data as StorageUsage, error: null }
}

/**
 * List presence records whose check-in photos can be safely deleted.
 * @param olderThanDays  - pass 0 to list all (no date filter)
 */
export async function listCleanupCandidates(
  accountId: string,
  olderThanDays: number
): Promise<{ data: CleanupCandidate[]; error: string | null }> {
  const { data, error } = await supabase.rpc('list_cleanup_candidates', {
    p_account_id: accountId,
    p_older_than_days: olderThanDays,
  })
  if (error) {
    return { data: [], error: error.message }
  }
  return { data: (data ?? []) as CleanupCandidate[], error: null }
}

/**
 * Extract the storage path from a Supabase storage public URL.
 * Example: https://xxx.supabase.co/storage/v1/object/public/participant-photos/abc/123.jpg
 *          -> abc/123.jpg
 */
function extractPath(photoUrl: string): string | null {
  const marker = '/object/public/participant-photos/'
  const idx = photoUrl.indexOf(marker)
  if (idx < 0) return null
  return decodeURIComponent(photoUrl.substring(idx + marker.length))
}

/**
 * Delete check-in photos (storage files + null out photo_url).
 * Batches to avoid large single requests.
 * @param onProgress called with (done, total)
 */
export async function deleteCheckInPhotos(
  accountId: string,
  candidates: CleanupCandidate[],
  onProgress?: (done: number, total: number) => void
): Promise<{ data: CleanupResult | null; error: string | null }> {
  if (candidates.length === 0) {
    return {
      data: { deleted: 0, failed: 0, bytes_freed_estimate: 0, errors: [] },
      error: null,
    }
  }

  const result: CleanupResult = {
    deleted: 0,
    failed: 0,
    bytes_freed_estimate: 0,
    errors: [],
  }

  const BATCH = 500

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH)
    const paths: string[] = []
    const validIds: string[] = []

    for (const c of batch) {
      const path = extractPath(c.photo_url)
      if (path) {
        paths.push(path)
        validIds.push(c.record_id)
      } else {
        result.errors.push('Could not extract path from: ' + c.photo_url)
        result.failed++
      }
    }

    if (paths.length === 0) continue

    // 1. Delete files from storage
    const { error: storageErr } = await supabase.storage
      .from('participant-photos')
      .remove(paths)

    if (storageErr) {
      result.errors.push('Batch ' + (Math.floor(i / BATCH) + 1) + ': ' + storageErr.message)
      result.failed += validIds.length
      continue
    }

    // 2. Null out photo_url on the records
    const { error: updateErr } = await supabase
      .from('presence_records')
      .update({ photo_url: null })
      .in('id', validIds)
      .eq('account_id', accountId)

    if (updateErr) {
      result.errors.push('Batch update: ' + updateErr.message)
      result.failed += validIds.length
      continue
    }

    result.deleted += validIds.length
    result.bytes_freed_estimate += validIds.length * BYTES_PER_PHOTO

    if (onProgress) {
      onProgress(Math.min(i + BATCH, candidates.length), candidates.length)
    }
  }

  return { data: result, error: null }
}

/**
 * Format bytes as human-readable (KB, MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}