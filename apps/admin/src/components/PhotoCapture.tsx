import { useEffect, useRef, useState } from 'react'

interface Props {
  onCapture: (blob: Blob, previewUrl: string) => void
  onClear: () => void
  currentPreviewUrl: string | null
  label?: string
  hint?: string
}

export default function PhotoCapture({
  onCapture,
  onClear,
  currentPreviewUrl,
  label = 'Photo',
  hint = 'Optional. Helps verify identity during check-ins.',
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (!cameraActive) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {})
  }, [cameraActive])

  async function startCamera() {
    setStarting(true)
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Could not access camera')
    } finally {
      setStarting(false)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const previewUrl = URL.createObjectURL(blob)
        onCapture(blob, previewUrl)
        stopCamera()
      },
      'image/jpeg',
      0.85
    )
  }

  function clearPhoto() {
    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl)
    onClear()
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>

      {cameraError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-2 mb-2">
          Error: {cameraError}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {currentPreviewUrl && (
        <div className="space-y-2">
          <img
            src={currentPreviewUrl}
            alt="Preview"
            className="w-full max-w-xs rounded-md border border-slate-300"
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Remove photo
          </button>
        </div>
      )}

      {!currentPreviewUrl && cameraActive && (
        <div className="space-y-2">
          <div className="relative w-full max-w-xs aspect-[3/4] rounded-md border border-slate-300 bg-black overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-3 py-1.5 rounded-md"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!currentPreviewUrl && !cameraActive && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={startCamera}
            disabled={starting}
            className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-md border border-slate-300"
          >
            {starting ? 'Starting camera...' : 'Take photo'}
          </button>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      )}
    </div>
  )
}