import { supabase } from '../supabase'

const BUCKET = 'participant-photos'

/**
 * Upload a participant's enrollment photo.
 * Path: {accountId}/{participantId}.jpg
 * Returns the public URL or an error string.
 */
export async function uploadParticipantPhoto(
  accountId: string,
  participantId: string,
  blob: Blob
): Promise<{ url: string | null; error: string | null }> {
  const path = `${accountId}/${participantId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    return { url: null, error: uploadError.message }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  // Add a cache-busting query so the browser re-fetches after update
  const url = `${data.publicUrl}?v=${Date.now()}`

  return { url, error: null }
}

/**
 * Upload a live check-in photo for a presence record.
 * Path: {accountId}/checkins/{recordId}.jpg
 */
export async function uploadCheckinPhoto(
  accountId: string,
  recordId: string,
  blob: Blob
): Promise<{ url: string | null; error: string | null }> {
  const path = `${accountId}/checkins/${recordId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    return { url: null, error: uploadError.message }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

export async function deleteParticipantPhoto(
  accountId: string,
  participantId: string
): Promise<{ error: string | null }> {
  const path = `${accountId}/${participantId}.jpg`
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  return { error: error?.message ?? null }
}