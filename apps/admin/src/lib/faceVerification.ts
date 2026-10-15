import { supabase } from './supabase'

export const MATCH_THRESHOLD = 0.65
export const STRONG_MATCH_THRESHOLD = 0.55

export type FaceMatchResult = 'match' | 'no_match' | 'not_attempted'

export type FaceAttemptReason =
  | 'no_enrollment'
  | 'no_face_detected'
  | 'low_quality'
  | 'rpc_error'
  | null

export type FaceVerification = {
  distance: number | null
  score: number | null
  result: FaceMatchResult
}

export function distanceToScore(distance: number): number {
  const score = Math.max(0, Math.min(1, 1 - distance / 1.2))
  return Math.round(score * 1000) / 1000
}

export function classifyDistance(distance: number): FaceMatchResult {
  return distance <= MATCH_THRESHOLD ? 'match' : 'no_match'
}

export async function verifyFace(
  participantId: string,
  liveEmbedding: number[]
): Promise<FaceVerification> {
  try {
    const { data, error } = await supabase.rpc('match_face', {
      p_participant_id: participantId,
      p_live_embedding: liveEmbedding,
    })

    if (error) {
      console.warn('[faceVerification] RPC error:', error.message)
      return { distance: null, score: null, result: 'not_attempted' }
    }

    if (!data || data.length === 0) {
      return { distance: null, score: null, result: 'not_attempted' }
    }

    const row = data[0] as { participant_id: string; distance: number }
    const distance = row.distance
    const score = distanceToScore(distance)
    const result = classifyDistance(distance)

    return { distance, score, result }
  } catch (err) {
    console.warn('[faceVerification] Unexpected error:', err)
    return { distance: null, score: null, result: 'not_attempted' }
  }
}

export function faceResultLabel(result: FaceMatchResult): string {
  switch (result) {
    case 'match':
      return 'Face matched'
    case 'no_match':
      return 'Face did not match'
    case 'not_attempted':
      return 'Not verified'
  }
}

export function faceTrustPoints(verification: FaceVerification): number {
  if (verification.result !== 'match') return 0
  if (verification.distance === null) return 0
  if (verification.distance <= STRONG_MATCH_THRESHOLD) return 20
  return 10
}