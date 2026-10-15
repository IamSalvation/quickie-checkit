import { useEffect, useRef, useState } from 'react'
import Modal from './ui/Modal'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { uploadParticipantPhoto } from '../lib/api/photos'

interface Props {
  open: boolean
  onClose: () => void
  participantId: string
  participantName: string
  onEnrolled: () => void
}

type Step = 'consent' | 'capture' | 'preview' | 'processing' | 'done'

const CONSENT_TEXT =
  'I give consent to enroll this participant face for the purpose of ' +
  'verifying their identity at kiosk check-in. The face data will be ' +
  'stored securely and used only for attendance verification. This ' +
  'consent can be withdrawn by removing the enrollment from the ' +
  'participant profile. Data is handled in line with NDPR requirements.'

export default function FaceEnrollmentModal({
  open,
  onClose,
  participantId,
  participantName,
  onEnrolled,
}: Props) {
  const { account, user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep] = useState<Step>('consent')
  const [consentChecked, setConsentChecked] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep('consent')
    setConsentChecked(false)
    setCameraActive(false)
    setCameraError(null)
    setPhotoBlob(null)
    setPhotoPreview(null)
    setError(null)
    setSuccessMsg(null)
  }, [open])

  useEffect(() => {
    if (!cameraActive) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {})
  }, [cameraActive])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  async function startCamera() {
    setCameraError(null)
    setStep('capture')
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
    } catch (e) {
      setCameraError(e instanceof Error ? e.message : 'Camera unavailable')
      setCameraActive(false)
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
    if (video.videoWidth === 0) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        setPhotoBlob(blob)
        setPhotoPreview(url)
        stopCamera()
        setStep('preview')
      },
      'image/jpeg',
      0.85
    )
  }

  function retake() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoBlob(null)
    setPhotoPreview(null)
    startCamera()
  }

  async function handleEnroll() {
    if (!account || !photoBlob) return
    setError(null)
    setStep('processing')

    try {
      // Lazy-load face-api (large bundle) only when actually enrolling
      const { extractEmbedding, loadImage } = await import(
        '../lib/faceRecognition'
      )

      const img = await loadImage(photoPreview ?? '')
      const embedding = await extractEmbedding(img)

      if (!embedding) {
        setError(
          'No face detected in the photo. Make sure the face is clear, ' +
            'well-lit, and facing the camera.'
        )
        setStep('preview')
        return
      }

      if (embedding.length !== 128) {
        setError('Unexpected embedding size: ' + embedding.length)
        setStep('preview')
        return
      }

      // 1. Save the embedding
      const { error: upsertErr } = await supabase
        .from('participant_face_embeddings')
        .upsert(
          {
            account_id: account.id,
            participant_id: participantId,
            embedding: embedding,
            consent_given: true,
            consent_text: CONSENT_TEXT,
            consent_given_at: new Date().toISOString(),
            enrolled_at: new Date().toISOString(),
            enrolled_by: user?.id ?? null,
            model_version: 'vladmandic-face-api-1.7',
          },
          { onConflict: 'account_id,participant_id' }
        )

      if (upsertErr) {
        setError(upsertErr.message)
        setStep('preview')
        return
      }

      // 2. Also save this same capture as the participant profile photo.
      //    Non-fatal: if upload fails, the embedding is still valid.
      const { url: photoUrl, error: photoErr } = await uploadParticipantPhoto(
        account.id,
        participantId,
        photoBlob
      )

      if (photoErr || !photoUrl) {
        console.warn('Photo upload failed (embedding saved):', photoErr)
      } else {
        await supabase
          .from('participants')
          .update({ photo_url: photoUrl })
          .eq('id', participantId)
      }

      setSuccessMsg(
        'Face enrolled for ' +
          participantName +
          '. Profile photo updated. Verification will now run at kiosk check-in.'
      )
      setStep('done')
      onEnrolled()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enrollment failed')
      setStep('preview')
    }
  }

  function handleClose() {
    if (step === 'processing') return
    stopCamera()
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Face enrollment"
      size="lg"
    >
      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          Enrolling:{' '}
          <strong className="text-slate-900">{participantName}</strong>
        </div>

        {step === 'consent' && (
          <>
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed">
              {CONSENT_TEXT}
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                I have read and agree to the consent terms above on behalf of
                this participant.
              </span>
            </label>

            {error && (
              <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startCamera}
                disabled={!consentChecked}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'capture' && (
          <>
            {cameraError ? (
              <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {cameraError}
              </div>
            ) : (
              <div className="relative mx-auto w-full max-w-sm aspect-[3/4] rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 aspect-square border-4 border-white/70 rounded-2xl" />
                </div>
                <div className="absolute inset-x-0 bottom-0 pb-4 flex justify-center pointer-events-none">
                  <div className="rounded-full bg-black/70 px-4 py-2 text-xs text-white">
                    Center the face in the box
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setStep('consent')
                }}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Back
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="rounded bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Capture
                </button>
              )}
            </div>
          </>
        )}

        {step === 'preview' && photoPreview && (
          <>
            <div className="mx-auto w-full max-w-sm">
              <img
                src={photoPreview}
                alt="Captured face"
                className="w-full rounded-lg border border-slate-300"
              />
            </div>

            {error && (
              <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={retake}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleEnroll}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Enroll face
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="py-10 text-center">
            <div className="text-sm text-slate-500">
              Extracting face embedding...
            </div>
            <div className="mt-2 text-xs text-slate-400">
              First run may take a few seconds to load the ML models.
            </div>
          </div>
        )}

        {step === 'done' && (
          <>
            <div className="rounded bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
              {successMsg}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}