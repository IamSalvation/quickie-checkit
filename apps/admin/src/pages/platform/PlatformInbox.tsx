import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  listAllSupportThreads,
  listMessagesForThread,
  sendSupportMessage,
  markThreadRead,
  timeAgo,
  type ThreadWithAccount,
  type SupportMessage,
} from '../../lib/api/support'

export default function PlatformInbox() {
  const { operator } = useAuth()

  const [threads, setThreads] = useState<ThreadWithAccount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true)
    setError(null)
    const { data, error: err } = await listAllSupportThreads()
    setThreads(data)
    setError(err)
    setLoadingThreads(false)
    if (data.length > 0 && !selectedId) {
      setSelectedId(data[0].id)
    }
  }, [selectedId])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true)
    const { data, error: err } = await listMessagesForThread(threadId)
    if (err) {
      setError(err)
      setLoadingMessages(false)
      return
    }
    setMessages(data)
    await markThreadRead(threadId, 'platform')
    setLoadingMessages(false)
    // Refresh thread list so unread badge disappears
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!selectedId || !operator) return
    const text = body.trim()
    if (!text) return

    setSending(true)
    const { data, error: err } = await sendSupportMessage({
      threadId: selectedId,
      body: text,
      senderRole: 'platform',
      senderOperatorId: operator.id,
    })
    setSending(false)

    if (err || !data) {
      alert(err ?? 'Send failed')
      return
    }
    setMessages((prev) => [...prev, data])
    setBody('')
  }

  const selected = threads.find((t) => t.id === selectedId) ?? null

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
        <p className="mt-1 text-sm text-slate-600">
          Support messages from your customers.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Thread list */}
        <div className="rounded-lg bg-white shadow lg:col-span-1">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-medium text-slate-900">
              Threads ({threads.length})
            </h2>
          </div>

          {loadingThreads ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Loading...
            </div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No threads yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[30rem] overflow-y-auto">
              {threads.map((t) => {
                const isSelected = t.id === selectedId
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className={
                        'w-full text-left px-4 py-3 hover:bg-slate-50 ' +
                        (isSelected ? 'bg-slate-50' : '')
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {t.account?.name ?? 'Unknown account'}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {t.last_message_preview ?? 'No messages yet'}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {timeAgo(t.last_message_at)}
                          </span>
                          {t.unread_for_platform && t.unread_for_platform > 0 ? (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              {t.unread_for_platform}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Message pane */}
        <div className="rounded-lg bg-white shadow lg:col-span-2">
          {!selected ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Select a thread on the left.
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-medium text-slate-900">
                  {selected.account?.name ?? 'Unknown account'}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 font-mono">
                  {selected.account?.slug ?? ''}
                </div>
              </div>

              <div className="max-h-[24rem] overflow-y-auto p-4 space-y-3 bg-slate-50">
                {loadingMessages ? (
                  <div className="text-center text-sm text-slate-500 py-6">
                    Loading...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center">
                    <p className="text-sm text-slate-500">
                      No messages in this thread yet.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isPlatform = m.sender_role === 'platform'
                    return (
                      <div
                        key={m.id}
                        className={
                          'flex ' +
                          (isPlatform ? 'justify-end' : 'justify-start')
                        }
                      >
                        <div
                          className={
                            'max-w-[75%] rounded-lg px-3 py-2 text-sm ' +
                            (isPlatform
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-200 text-slate-900')
                          }
                        >
                          <div>{m.body}</div>
                          <div
                            className={
                              'mt-1 text-[10px] ' +
                              (isPlatform ? 'text-slate-300' : 'text-slate-400')
                            }
                          >
                            {isPlatform ? 'Platform (you)' : 'Admin'} -{' '}
                            {timeAgo(m.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-slate-200 p-3 flex gap-2"
              >
                <input
                  type="text"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}