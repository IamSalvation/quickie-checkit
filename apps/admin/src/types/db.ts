export type AccountStatus = 'pending' | 'active' | 'paused' | 'deleted'
export type AccountTier = 'v1' | 'v2'
export type AccountPreset =
  | 'school'
  | 'symposium'
  | 'bootcamp'
  | 'conference'
  | 'hotel'
  | 'event'
  | 'custom'

export type OperatorRole = 'admin' | 'lecturer' | 'staff'
export type OperatorStatus = 'active' | 'invited' | 'disabled'

export interface Account {
  id: string
  name: string
  slug: string
  id_prefix: string
  status: AccountStatus
  tier: AccountTier
  preset: AccountPreset
  grading_scale: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string

  // Access limits & time (added in migration 030)
  max_participants: number
  max_programs: number
  max_contexts: number
  max_kiosks: number
  access_expires_at: string | null
  lockout_grace_days: number
  trial_started_at: string | null
  limits_overridden: boolean
}

export interface Operator {
  id: string
  account_id: string
  email: string
  full_name: string | null
  role: OperatorRole
  is_owner: boolean
  is_platform_admin: boolean
  status: OperatorStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}