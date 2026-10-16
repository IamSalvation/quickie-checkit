import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getMySupportThread,
  listMessagesForThread,
  sendSupportMessage,
  markThreadRead,
  timeAgo,
  type SupportThread,
  type SupportMessage,
} from '../../lib/api/support'

export default function MessagesPage() {
  const { operator, account } = useAuth()

  const [thread, setThread] = useState<SupportThread | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: t, error: tErr } = await getMySupportThread()
    if (tErr || !t) {
      setError(tErr ?? 'Could not load thread')
      setLoading(false)
      return
    }
    setThread(t)

    const { data: msgs, error: mErr } = await listMessagesForThread(t.id)
    if (mErr) {
      setError(mErr)
      setLoading(false)
      return
    }
    setMessages(msgs)

    // Mark platform messages as read
    await markThreadRead(t.id, 'admin')

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!thread || !operator) return
    const text = body.trim()
    if (!text) return

    setSending(true)
    const { data, error: err } = await sendSupportMessage({
      threadId: thread.id,
      body: text,
      senderRole: 'admin',
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

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-600">
            Talk to the Quickie Pinkas support team.
          </p>
        </div>

        {error && (
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg bg-white p-10 text-center text-sm text-slate-500 shadow">
            Loading...
          </div>
        ) : thread && (
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-medium text-slate-900">
                Support thread
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {account?.name ?? 'Your account'}
              </div>
            </div>

            <div className="max-h-[28rem] overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 ? (
                <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No messages yet. Say hello.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender_role === 'admin'
                  return (
                    <div
                      key={m.id}
                      className={
                        'flex ' + (isAdmin ? 'justify-end' : 'justify-start')
                      }
                    >
                      <div
                        className={
                          'max-w-[75%] rounded-lg px-3 py-2 text-sm ' +
                          (isAdmin
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-900')
                        }
                      >
                        <div>{m.body}</div>
                        <div
                          className={
                            'mt-1 text-[10px] ' +
                            (isAdmin ? 'text-slate-300' : 'text-slate-400')
                          }
                        >
                          {isAdmin ? 'You' : 'Platform'} -{' '}
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
                placeholder="Type a message..."
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
          </div>
        )}
      </div>
    </div>
  )
}