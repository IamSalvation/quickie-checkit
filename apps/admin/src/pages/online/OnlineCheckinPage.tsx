import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import jsQR from 'jsqr'
import {
  onlineLookupContext,
  onlineCheckin,
  type OnlineContextInfo,
  type OnlineCheckinResult,
} from '../../lib/api/onlineCheckin'

type PageState =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready' }
  | { kind: 'result'; result: OnlineCheckinResult }

export default function OnlineCheckinPage() {
  const { code } = useParams<{ code: string }>()
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [context, setContext] = useState<OnlineContextInfo | null>(null)
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null)

  const [studentId, setStudentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  const cooldownRef = useRef(0)

  // Lookup the context on mount
  useEffect(() => {
    if (!code) {
      setInvalidMessage('No code provided.')
      setState({ kind: 'invalid', message: 'No code provided.' })
      return
    }
    onlineLookupContext(code).then(({ data, error: err }) => {
      if (err || !data) {
        const msg = err ?? 'Lookup failed.'
        setInvalidMessage(msg)
        setState({ kind: 'invalid', message: msg })
        return
      }
      if (!data.ok || !data.context) {
        const msg = data.message ?? 'Link not valid.'
        setInvalidMessage(msg)
        setState({ kind: 'invalid', message: msg })
        return
      }
      setContext(data.context)
      setState({ kind: 'ready' })
    })
  }, [code])

  // Camera scan loop
  useEffect(() => {
    if (!scanning) return
    let cancelled = false
    let timer: number | undefined
    const scanCanvas = document.createElement('canvas')

    async function start() {
      try {
        let selectedDeviceId: string | undefined
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const cameras = devices.filter((d) => d.kind === 'videoinput')
          const frontCamera =
            cameras.find((c) => /front|user|selfie/i.test(c.label)) ||
            cameras.find((c) => /wide|ultra/i.test(c.label)) ||
            cameras[0]
          if (frontCamera) selectedDeviceId = frontCamera.deviceId
        } catch {
          // ignore
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId
            ? {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: 720 },
              height: { ideal: 960 },
            }
            : {
              facingMode: 'user',
              width: { ideal: 720 },
              height: { ideal: 960 },
            },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => { })
        }
        await new Promise<void>((resolve) => {
          const check = () => {
            const v = videoRef.current
            if (v && v.readyState >= 2 && v.videoWidth > 0) resolve()
            else setTimeout(check, 100)
          }
          check()
        })
        const ctx = scanCanvas.getContext('2d', { willReadFrequently: true })

        timer = window.setInterval(() => {
          if (cancelled || !ctx || processingRef.current) return
          const video = videoRef.current
          if (!video || video.videoWidth === 0) return
          const scale = Math.min(
            1,
            600 / Math.max(video.videoWidth, video.videoHeight)
          )
          const w = Math.round(video.videoWidth * scale)
          const h = Math.round(video.videoHeight * scale)
          scanCanvas.width = w
          scanCanvas.height = h
          ctx.drawImage(video, 0, 0, w, h)
          const img = ctx.getImageData(0, 0, w, h)
          const qr = jsQR(img.data, w, h)
          if (qr?.data) {
            const now = Date.now()
            if (now - cooldownRef.current > 3000) {
              cooldownRef.current = now
              submitCheckin(qr.data, 'qr_kiosk_online')
            }
          }
        }, 200)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Camera unavailable'
        setError('Camera: ' + msg)
        setScanning(false)
      }
    }
    start()

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scanning])

  async function submitCheckin(
    systemId: string,
    method: 'id_entry_online' | 'qr_kiosk_online'
  ) {
    if (!code || processingRef.current) return
    processingRef.current = true
    setSubmitting(true)
    setError(null)

    const { data, error: err } = await onlineCheckin(code, systemId, method)

    setSubmitting(false)
    processingRef.current = false

    if (err || !data) {
      setError(err ?? 'Check-in failed.')
      return
    }

    setState({ kind: 'result', result: data })
    if (scanning) setScanning(false)
  }

  async function handleIdSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId.trim()) return
    await submitCheckin(studentId.trim(), 'id_entry_online')
  }

  function reset() {
    setStudentId('')
    setError(null)
    if (!context) return
    setState({ kind: 'ready' })
  }

  function handleScanClick() {
    setError(null)
    setScanning(true)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <div className="text-sm font-bold text-slate-900">Quickie CheckIt</div>
        </div>

        {state.kind === 'loading' && (
          <div className="rounded-lg bg-white p-8 shadow text-center">
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        )}

        {state.kind === 'invalid' && (
          <div className="rounded-lg bg-white p-8 shadow text-center">
            <div className="text-5xl font-bold text-red-500">X</div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Link not available
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              {invalidMessage ?? 'This link is not valid.'}
            </p>
            <p className="mt-6 text-xs text-slate-400">
              Ask your lecturer for a fresh link.
            </p>
          </div>
        )}

        {state.kind === 'ready' && context && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {context.phase === 'in' ? 'Check-in' : 'Check-out'}
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-900">
                {context.label}
              </h1>
            </div>

            {!scanning ? (
              <>
                <form onSubmit={handleIdSubmit} className="mt-6 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Student ID
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. TESTSC-00001"
                      className="mt-1 block w-full rounded border border-slate-300 px-3 py-3 text-base font-mono focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                      disabled={!context.id_entry_enabled || submitting}
                    />
                    {!context.id_entry_enabled && (
                      <p className="mt-1 text-xs text-slate-500">
                        ID entry is disabled. Please scan your badge QR instead.
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting || !context.id_entry_enabled || !studentId.trim()
                    }
                    className="w-full rounded bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {submitting
                      ? 'Submitting...'
                      : context.phase === 'in'
                        ? 'Check in'
                        : 'Check out'}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="text-xs text-slate-400">OR</div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  onClick={handleScanClick}
                  className="w-full rounded border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Scan badge QR
                </button>
              </>
            ) : (
              <>
                <div className="mt-5 relative rounded-2xl overflow-hidden bg-black aspect-[3/4] shadow-2xl">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-2/3 aspect-square border-4 border-white/80 rounded-2xl" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-6 pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-sm px-5 py-2.5 rounded-full">
                      <p className="text-sm text-white font-medium text-center">
                        Hold your badge inside the box
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={() => setScanning(false)}
                  className="mt-4 w-full rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}

        {state.kind === 'result' && (
          <div className="rounded-lg bg-white p-8 shadow text-center">
            {state.result.code === 'checked_in' && (
              <>
                {state.result.participant?.photo_url ? (
                  <img
                    src={state.result.participant.photo_url}
                    alt={state.result.participant.full_name}
                    className="mx-auto h-24 w-24 rounded-full object-cover border-4 border-emerald-400"
                  />
                ) : (
                  <div className="mx-auto h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center text-4xl text-emerald-700 font-bold">
                    OK
                  </div>
                )}
                <h1 className="mt-4 text-xl font-bold text-emerald-700">
                  {state.result.participant?.full_name}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Checked in at{' '}
                  {state.result.record?.checked_in_at
                    ? new Date(
                      state.result.record.checked_in_at
                    ).toLocaleTimeString()
                    : ''}
                </p>
              </>
            )}

            {state.result.code === 'checked_out' && (
              <>
                {state.result.participant?.photo_url ? (
                  <img
                    src={state.result.participant.photo_url}
                    alt={state.result.participant.full_name}
                    className="mx-auto h-24 w-24 rounded-full object-cover border-4 border-blue-400"
                  />
                ) : (
                  <div className="mx-auto h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl text-blue-700 font-bold">
                    OK
                  </div>
                )}
                <h1 className="mt-4 text-xl font-bold text-blue-700">
                  {state.result.participant?.full_name}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Checked out at{' '}
                  {state.result.record?.checked_out_at
                    ? new Date(
                      state.result.record.checked_out_at
                    ).toLocaleTimeString()
                    : ''}
                </p>
              </>
            )}

            {state.result.code === 'already_checked_in' && (
              <>
                <div className="mx-auto h-24 w-24 rounded-full bg-amber-100 flex items-center justify-center text-4xl text-amber-700 font-bold">
                  OK
                </div>
                <h1 className="mt-4 text-xl font-bold text-amber-700">
                  {state.result.participant?.full_name}
                </h1>
                <p className="mt-1 text-sm text-slate-600">Already checked in.</p>
              </>
            )}

            {!state.result.ok && (
              <>
                <div className="mx-auto h-24 w-24 rounded-full bg-red-100 flex items-center justify-center text-4xl text-red-600 font-bold">
                  X
                </div>
                <h1 className="mt-4 text-xl font-bold text-red-600">
                  {state.result.message}
                </h1>
              </>
            )}

            <button
              onClick={reset}
              className="mt-6 w-full rounded border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Done
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by{' '}
          <Link to="/" className="text-slate-500 hover:underline">
            Quickie CheckIt
          </Link>
        </p>
      </div>
    </div>
  )
}