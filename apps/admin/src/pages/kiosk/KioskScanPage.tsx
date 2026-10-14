import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import {
  kioskCheckin,
  kioskLookupContext,
  type KioskCheckinResult,
} from '../../lib/api/presence'

const STORAGE_KEY = 'checkit_kiosk_device_token'

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no_token' }
  | { kind: 'no_context'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'scanning'; contextLabel: string }
  | { kind: 'result'; result: KioskCheckinResult }

export default function KioskScanPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<ScreenState>({ kind: 'loading' })
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const cooldownRef = useRef<number>(0)

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY)
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
    setDeviceToken(token)

    kioskLookupContext(token).then(({ data, error }) => {
      if (error || !data) {
        setState({ kind: 'error', message: error ?? 'Lookup failed' })
        return
      }
      if (!data.ok) {
        if (data.code === 'no_open_context') {
          setState({ kind: 'no_context', message: data.message })
        } else {
          setState({ kind: 'error', message: data.message })
        }
        return
      }
      setState({ kind: 'scanning', contextLabel: data.context?.label ?? 'Session' })
    })
  }, [])

  useEffect(() => {
    if (state.kind !== 'scanning') return
    let cancelled = false
    let stream: MediaStream | null = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        tick()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Camera unavailable'
        setState({ kind: 'error', message: `Camera: ${msg}` })
      }
    }

    function tick() {
      if (cancelled) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const w = video.videoWidth
      const h = video.videoHeight
      if (w && h) {
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h)
          const imageData = ctx.getImageData(0, 0, w, h)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (code && code.data && deviceToken) {
            const now = Date.now()
            if (now - cooldownRef.current > 3000) {
              cooldownRef.current = now
              handleScan(code.data)
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    async function handleScan(systemId: string) {
      const { data, error } = await kioskCheckin(deviceToken!, systemId)
      if (error || !data) {
        setState({ kind: 'error', message: error ?? 'Check-in failed' })
        setTimeout(() => window.location.reload(), 2000)
        return
      }
      setState({ kind: 'result', result: data })

      playBeep(data.ok && data.code === 'checked_in')

      setTimeout(() => {
        setState((s) =>
          s.kind === 'result'
            ? { kind: 'scanning', contextLabel: s.result.context?.label ?? '' }
            : s
        )
        cooldownRef.current = Date.now()
      }, 2500)
    }

    start()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [state.kind, deviceToken])

  function playBeep(success: boolean) {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = success ? 880 : 320
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
      osc.onended = () => ctx.close()
    } catch {
      // Ignore audio errors
    }
  }

  function clearToken() {
    localStorage.removeItem(STORAGE_KEY)
    navigate('/kiosk/setup/' + deviceToken, { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="text-sm font-semibold">Quickie CheckIt — Kiosk</div>
        {deviceToken && (
          <button
            onClick={clearToken}
            className="text-xs text-slate-400 hover:text-white"
          >
            Unpair
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {state.kind === 'loading' && <p className="text-slate-400">Loading...</p>}

        {state.kind === 'no_token' && (
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold">Not paired</h1>
            <p className="mt-3 text-sm text-slate-400">
              This device is not configured as a kiosk. Ask an admin for the
              setup URL.
            </p>
          </div>
        )}

        {state.kind === 'no_context' && (
          <div className="max-w-md text-center">
            <div className="text-4xl">⏸️</div>
            <h1 className="mt-4 text-xl font-bold">No open session</h1>
            <p className="mt-3 text-sm text-slate-400">{state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="max-w-md text-center">
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-4 text-xl font-bold">Error</h1>
            <p className="mt-3 text-sm text-slate-400">{state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Retry
            </button>
          </div>
        )}

        {state.kind === 'scanning' && (
          <div className="w-full max-w-2xl">
            <div className="mb-3 text-center">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Open session
              </div>
              <div className="text-lg font-semibold">{state.contextLabel}</div>
            </div>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-2/3 aspect-square border-4 border-white/70 rounded-2xl" />
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-400">
              Hold the badge QR inside the box.
            </p>
          </div>
        )}

        {state.kind === 'result' && (
          <div className="max-w-md text-center">
            {state.result.code === 'checked_in' && (
              <>
                <div className="text-6xl">✓</div>
                <div className="mt-4 text-2xl font-bold text-emerald-400">
                  {state.result.participant?.full_name}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Checked in at{' '}
                  {state.result.record?.checked_in_at
                    ? new Date(
                        state.result.record.checked_in_at
                      ).toLocaleTimeString()
                    : '—'}
                </div>
              </>
            )}
            {state.result.code === 'already_checked_in' && (
              <>
                <div className="text-6xl">↻</div>
                <div className="mt-4 text-2xl font-bold text-amber-400">
                  {state.result.participant?.full_name}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Already checked in.
                </div>
              </>
            )}
            {!state.result.ok && (
              <>
                <div className="text-6xl">✕</div>
                <div className="mt-4 text-2xl font-bold text-red-400">
                  {state.result.message}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}