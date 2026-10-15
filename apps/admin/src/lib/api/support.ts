import { supabase } from '../supabase'

export type SupportSenderRole = 'admin' | 'platform'
export type SupportThreadStatus = 'open' | 'closed'

export interface SupportThread {
  id: string
  account_id: string
  subject: string
  status: SupportThreadStatus
  created_by: string | null
  last_message_at: string
  created_at: string
  updated_at: string
}

export interface SupportMessage {
  id: string
  thread_id: string
  sender_operator_id: string | null
  sender_role: SupportSenderRole
  body: string
  read_by_platform: boolean
  read_by_admin: boolean
  created_at: string
}

export interface ThreadWithAccount extends SupportThread {
  account: {
    id: string
    name: string
    slug: string
  } | null
  unread_for_platform?: number
  last_message_preview?: string | null
}

// ---------- Helper RPCs ----------

export async function getOrCreateSupportThread(): Promise<{
  data: string | null
  error: string | null
}> {
  const { data, error } = await supabase.rpc('get_or_create_support_thread')
  if (error) return { data: null, error: error.message }
  return { data: data as string | null, error: null }
}

export interface UnreadCounts {
  unread_for_platform: number
  unread_for_me: number
}

export async function getSupportUnreadCounts(): Promise<{
  data: UnreadCounts
  error: string | null
}> {
  const { data, error } = await supabase.rpc('support_unread_counts')
  if (error) {
    return { data: { unread_for_platform: 0, unread_for_me: 0 }, error: error.message }
  }
  const parsed = data as { unread_for_platform?: number; unread_for_me?: number }
  return {
    data: {
      unread_for_platform: parsed.unread_for_platform ?? 0,
      unread_for_me: parsed.unread_for_me ?? 0,
    },
    error: null,
  }
}

// ---------- Thread queries ----------

export async function getMySupportThread(): Promise<{
  data: SupportThread | null
  error: string | null
}> {
  const threadIdRes = await getOrCreateSupportThread()
  if (threadIdRes.error || !threadIdRes.data) {
    return { data: null, error: threadIdRes.error ?? 'No thread' }
  }

  const { data, error } = await supabase
    .from('support_threads')
    .select('*')
    .eq('id', threadIdRes.data)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data: data as SupportThread | null, error: null }
}

export async function listAllSupportThreads(): Promise<{
  data: ThreadWithAccount[]
  error: string | null
}> {
  const { data: threads, error } = await supabase
    .from('support_threads')
    .select('*, account:accounts(id, name, slug)')
    .order('last_message_at', { ascending: false })

  if (error) return { data: [], error: error.message }

  const rows: ThreadWithAccount[] = []
  for (const t of threads ?? []) {
    const accountRaw = (t as { account: unknown }).account
    const account = Array.isArray(accountRaw)
      ? (accountRaw[0] as ThreadWithAccount['account'])
      : (accountRaw as ThreadWithAccount['account'])

    // Unread count for platform (messages from admin, not yet read)
    const { count } = await supabase
      .from('support_messages')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', t.id)
      .eq('sender_role', 'admin')
      .eq('read_by_platform', false)

    // Last message preview
    const { data: lastMsg } = await supabase
      .from('support_messages')
      .select('body')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    rows.push({
      ...(t as SupportThread),
      account: account ?? null,
      unread_for_platform: count ?? 0,
      last_message_preview: lastMsg?.body ?? null,
    })
  }

  return { data: rows, error: null }
}

// ---------- Message queries ----------

export async function listMessagesForThread(
  threadId: string
): Promise<{ data: SupportMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as SupportMessage[], error: null }
}

export interface SendMessageInput {
  threadId: string
  body: string
  senderRole: SupportSenderRole
  senderOperatorId: string
}

export async function sendSupportMessage(
  input: SendMessageInput
): Promise<{ data: SupportMessage | null; error: string | null }> {
  const body = input.body.trim()
  if (!body) return { data: null, error: 'Message cannot be empty' }

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      thread_id: input.threadId,
      sender_operator_id: input.senderOperatorId,
      sender_role: input.senderRole,
      body,
      read_by_platform: input.senderRole === 'platform',
      read_by_admin: input.senderRole === 'admin',
    })
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }

  // Bump thread last_message_at so inbox sorting stays correct
  await supabase
    .from('support_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', input.threadId)

  return { data: data as SupportMessage, error: null }
}

// Mark all messages in a thread as read by the caller's side
export async function markThreadRead(
  threadId: string,
  side: 'platform' | 'admin'
): Promise<{ error: string | null }> {
  const patch = side === 'platform'
    ? { read_by_platform: true }
    : { read_by_admin: true }

  const filterField = side === 'platform' ? 'read_by_platform' : 'read_by_admin'
  const senderToMark = side === 'platform' ? 'admin' : 'platform'

  const { error } = await supabase
    .from('support_messages')
    .update(patch)
    .eq('thread_id', threadId)
    .eq('sender_role', senderToMark)
    .eq(filterField, false)

  return { error: error?.message ?? null }
}

// ---------- Helpers ----------

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago'
  return new Date(iso).toLocaleDateString()
}