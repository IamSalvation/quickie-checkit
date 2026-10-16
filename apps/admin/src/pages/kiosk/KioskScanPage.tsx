import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import {
  kioskCheckin,
  kioskLookupContext,
  updatePresencePhoto,
  kioskVerifyFace,
  type KioskCheckinResult,
  type KioskVerifyResult,
} from '../../lib/api/presence'
import { supabase } from '../../lib/supabase'

const STORAGE_KEY = 'checkit_kiosk_device_token'

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no_token' }
  | { kind: 'no_context'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'scanning'; contextLabel: string; phase: 'in' | 'out' }
  | {
      kind: 'result'
      result: KioskCheckinResult
      verify: KioskVerifyResult | null
      verifying: boolean
    }

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return null
    audioContext = new Ctx()
    return audioContext
  } catch {
    return null
  }
}

function playTone(frequency: number, durationMs: number, volume = 0.15) {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = frequency
    const now = ctx.currentTime
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
    osc.start(now)
    osc.stop(now + durationMs / 1000 + 0.02)
  } catch {
    // Ignore
  }
}

function playSuccessChime() {
  playTone(880, 120, 0.15)
  setTimeout(() => playTone(1320, 180, 0.15), 100)
}

function playErrorBuzz() {
  playTone(220, 350, 0.18)
}

function playWarnBeep() {
  playTone(440, 200, 0.15)
}

export default function KioskScanPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<ScreenState>({ kind: 'loading' })
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cooldownRef = useRef<number>(0)
  const processingRef = useRef<boolean>(false)

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY)
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
    setDeviceToken(token)

    let cancelled = false

    async function lookup() {
      if (!token) return
      const { data, error } = await kioskLookupContext(token)
      if (cancelled) return

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

      setState({
        kind: 'scanning',
        contextLabel: data.context?.label ?? 'Session',
        phase: data.context?.phase === 'out' ? 'out' : 'in',
      })
    }

    lookup()
    const iv = setInterval(lookup, 8000)

    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [])

  useEffect(() => {
    if (state.kind !== 'scanning') return
    let cancelled = false
    let timer: number | undefined
    const scanCanvas = document.createElement('canvas')

    async function startCamera() {
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
          await videoRef.current.play().catch(() => {})
        }

        await new Promise<void>((resolve) => {
          const check = () => {
            const v = videoRef.current
            if (v && v.readyState >= 2 && v.videoWidth > 0) {
              resolve()
            } else {
              setTimeout(check, 100)
            }
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
            720 / Math.max(video.videoWidth, video.videoHeight)
          )
          const w = Math.round(video.videoWidth * scale)
          const h = Math.round(video.videoHeight * scale)
          scanCanvas.width = w
          scanCanvas.height = h
          ctx.drawImage(video, 0, 0, w, h)

          const img = ctx.getImageData(0, 0, w, h)
          const result = jsQR(img.data, w, h)
          if (result?.data && deviceToken) {
            const now = Date.now()
            if (now - cooldownRef.current > 3000) {
              cooldownRef.current = now
              handleScan(result.data)
            }
          }
        }, 150)
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Camera unavailable'
        setState({ kind: 'error', message: 'Camera: ' + msg })
      }
    }

    async function handleScan(systemId: string) {
      if (processingRef.current) return
      processingRef.current = true

      const { data, error } = await kioskCheckin(deviceToken!, systemId)
      if (error || !data) {
        playErrorBuzz()
        setState({ kind: 'error', message: error ?? 'Check-in failed' })
        setTimeout(() => window.location.reload(), 2500)
        return
      }

      setState({
        kind: 'result',
        result: data,
        verify: null,
        verifying: false,
      })

      if (
        data.ok &&
        (data.code === 'checked_in' || data.code === 'checked_out')
      ) {
        playSuccessChime()
      } else {
        playErrorBuzz()
      }

      if (
        data.ok &&
        data.code === 'checked_in' &&
        data.record?.id &&
        data.participant?.id &&
        videoRef.current &&
        canvasRef.current
      ) {
        setState((s) =>
          s.kind === 'result' ? { ...s, verifying: true } : s
        )

        try {
          const { extractEmbedding } = await import('../../lib/faceRecognition')

          const video = videoRef.current
          const canvas = canvasRef.current

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')

          if (ctx && video.videoWidth > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
            const img = new Image()
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve()
              img.onerror = (e) => reject(e)
              img.src = dataUrl
            })

            const embedding = await extractEmbedding(img)

            const blob: Blob | null = await new Promise((resolve) =>
              canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8)
            )
            if (blob) {
              const path = data.participant.id + '/' + Date.now() + '.jpg'
              const { error: upErr } = await supabase.storage
                .from('participant-photos')
                .upload(path, blob, {
                  contentType: 'image/jpeg',
                  upsert: false,
                })
              if (!upErr) {
                const { data: urlData } = supabase.storage
                  .from('participant-photos')
                  .getPublicUrl(path)
                if (urlData?.publicUrl) {
                  await updatePresencePhoto(
                    data.record.id,
                    urlData.publicUrl
                  )
                }
              }
            }

            const effectiveEmbedding =
              embedding && embedding.length === 128 ? embedding : null

            const { data: verifyData } = await kioskVerifyFace(
              deviceToken!,
              data.record.id,
              effectiveEmbedding
            )

            if (verifyData) {
              setState((s) =>
                s.kind === 'result'
                  ? { ...s, verify: verifyData, verifying: false }
                  : s
              )
              if (verifyData.result === 'no_match') {
                playWarnBeep()
              }
            } else {
              setState((s) =>
                s.kind === 'result' ? { ...s, verifying: false } : s
              )
            }
          } else {
            setState((s) =>
              s.kind === 'result' ? { ...s, verifying: false } : s
            )
          }
        } catch (err) {
          console.warn('[Kiosk] Face verify failed:', err)
          setState((s) =>
            s.kind === 'result'
              ? {
                  ...s,
                  verifying: false,
                  verify: {
                    ok: false,
                    distance: null,
                    score: null,
                    result: 'not_attempted',
                    reason: 'rpc_error',
                  },
                }
              : s
          )
        }
      }

      setTimeout(() => {
        setState((s) =>
          s.kind === 'result'
            ? {
                kind: 'scanning',
                contextLabel: s.result.context?.label ?? '',
                phase: 'in',
              }
            : s
        )
        processingRef.current = false
        cooldownRef.current = Date.now()
      }, 4000)
    }

    startCamera()

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [state.kind, deviceToken])

  function clearToken() {
    localStorage.removeItem(STORAGE_KEY)
    navigate('/kiosk/setup/' + deviceToken, { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2"><img src="/logo.png" alt="Quickie Pinkas" className="h-6 w-auto" /><div className="text-sm font-semibold">Quickie Pinkas - Kiosk</div></div>
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
            <div className="text-4xl">-</div>
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
            <div className="text-4xl">!</div>
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
          <div className="w-full max-w-md">
            <div className="mb-3 text-center">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Open session
              </div>
              <div className="text-lg font-semibold">{state.contextLabel}</div>
              <div className="mt-1 inline-block rounded-full bg-slate-800 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-300">
                {state.phase === 'in' ? 'Check-in' : 'Check-out'}
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-6 pointer-events-none">
                <div className="bg-black/70 backdrop-blur-sm px-5 py-2.5 rounded-full">
                  <p className="text-sm text-white font-medium text-center">
                    Stand still so I can see your badge
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {state.kind === 'result' && (
          <div className="max-w-md text-center">
            {state.result.code === 'checked_in' && (
              <>
                {state.result.participant?.photo_url ? (
                  <img
                    src={state.result.participant.photo_url}
                    alt={state.result.participant.full_name}
                    className="mx-auto h-32 w-32 rounded-full object-cover border-4 border-emerald-400 shadow-2xl"
                  />
                ) : (
                  <div className="mx-auto h-32 w-32 rounded-full bg-emerald-500/20 border-4 border-emerald-400 flex items-center justify-center text-5xl">
                    OK
                  </div>
                )}
                <div className="mt-4 text-2xl font-bold text-emerald-400">
                  {state.result.participant?.full_name}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Checked in at{' '}
                  {state.result.record?.checked_in_at
                    ? new Date(
                        state.result.record.checked_in_at
                      ).toLocaleTimeString()
                    : '-'}
                </div>

                <div className="mt-4">
                  {state.verifying && (
                    <span className="inline-block rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
                      Verifying face...
                    </span>
                  )}
                  {!state.verifying && state.verify && (
                    <>
                      {state.verify.result === 'match' && (
                        <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                          Face verified
                          {state.verify.score !== null &&
                            ' (' + Math.round(state.verify.score * 100) + '%)'}
                        </span>
                      )}
                      {state.verify.result === 'no_match' && (
                        <span className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">
                          Face did not match - flagged
                        </span>
                      )}
                      {state.verify.result === 'not_attempted' && (
                        <span className="inline-block rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-400">
                          {state.verify.reason === 'no_enrollment'
                            ? 'Not enrolled'
                            : state.verify.reason === 'no_face_detected'
                            ? 'No face detected - flagged'
                            : 'Not verified'}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {state.result.code === 'checked_out' && (
              <>
                {state.result.participant?.photo_url ? (
                  <img
                    src={state.result.participant.photo_url}
                    alt={state.result.participant.full_name}
                    className="mx-auto h-32 w-32 rounded-full object-cover border-4 border-blue-400 shadow-2xl"
                  />
                ) : (
                  <div className="mx-auto h-32 w-32 rounded-full bg-blue-500/20 border-4 border-blue-400 flex items-center justify-center text-5xl">
                    OK
                  </div>
                )}
                <div className="mt-4 text-2xl font-bold text-blue-400">
                  {state.result.participant?.full_name}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Checked out at{' '}
                  {state.result.record?.checked_out_at
                    ? new Date(
                        state.result.record.checked_out_at
                      ).toLocaleTimeString()
                    : '-'}
                </div>
              </>
            )}

            {state.result.code === 'already_checked_in' && (
              <>
                {state.result.participant?.photo_url ? (
                  <img
                    src={state.result.participant.photo_url}
                    alt={state.result.participant.full_name}
                    className="mx-auto h-32 w-32 rounded-full object-cover border-4 border-amber-400 shadow-2xl"
                  />
                ) : (
                  <div className="mx-auto h-32 w-32 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center text-5xl">
                    OK
                  </div>
                )}
                <div className="mt-4 text-2xl font-bold text-amber-400">
                  {state.result.participant?.full_name}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Already checked in.
                </div>
              </>
            )}

            {state.result.code === 'not_checked_in' && (
              <>
                <div className="mx-auto h-32 w-32 rounded-full bg-red-500/20 border-4 border-red-400 flex items-center justify-center text-5xl">
                  X
                </div>
                <div className="mt-4 text-2xl font-bold text-red-400">
                  {state.result.participant?.full_name}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  You haven't checked in for this session.
                </div>
              </>
            )}

            {state.result.code === 'marked_absent' && (
              <>
                <div className="mx-auto h-32 w-32 rounded-full bg-red-500/20 border-4 border-red-400 flex items-center justify-center text-5xl">
                  X
                </div>
                <div className="mt-4 text-2xl font-bold text-red-400">
                  {state.result.participant?.full_name}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Marked absent for this session.
                </div>
              </>
            )}

            {!state.result.ok &&
              state.result.code !== 'not_checked_in' &&
              state.result.code !== 'marked_absent' && (
                <>
                  <div className="text-6xl">X</div>
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