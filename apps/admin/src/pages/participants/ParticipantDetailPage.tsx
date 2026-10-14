import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import {
  getParticipant,
  deleteParticipant,
  type Participant,
} from '../../lib/api/participants'
import {
  uploadParticipantPhoto,
  deleteParticipantPhoto,
} from '../../lib/api/photos'
import { supabase } from '../../lib/supabase'
import ParticipantBadge from '../../components/badge/ParticipantBadge'
import PhotoCapture from '../../components/PhotoCapture'

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const [showPhotoCapture, setShowPhotoCapture] = useState(false)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await getParticipant(id)
    setParticipant(data)
    setError(err)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete() {
    if (!participant) return
    if (!confirm(`Permanently delete ${participant.full_name}?`)) return
    setWorking(true)
    const { error: err } = await deleteParticipant(participant.id)
    setWorking(false)
    if (err) {
      alert(err)
      return
    }
    navigate('/participants')
  }

  function handlePrint() {
    window.print()
  }

  async function handleSavePhoto() {
    if (!account || !participant || !photoBlob) return
    setPhotoError(null)
    setWorking(true)

    const { url, error: uploadErr } = await uploadParticipantPhoto(
      account.id,
      participant.id,
      photoBlob
    )

    if (uploadErr || !url) {
      setWorking(false)
      setPhotoError(uploadErr ?? 'Upload failed')
      return
    }

    const { data: updated, error: updateErr } = await supabase
      .from('participants')
      .update({ photo_url: url })
      .eq('id', participant.id)
      .select('*')
      .single()

    setWorking(false)

    if (updateErr || !updated) {
      setPhotoError(updateErr?.message ?? 'Could not save')
      return
    }

    setParticipant(updated as Participant)
    cancelPhotoEdit()
  }

  async function handleRemovePhoto() {
    if (!account || !participant) return
    if (!confirm('Remove this photo?')) return
    setWorking(true)

    await deleteParticipantPhoto(account.id, participant.id)

    const { data: updated } = await supabase
      .from('participants')
      .update({ photo_url: null })
      .eq('id', participant.id)
      .select('*')
      .single()

    setWorking(false)

    if (updated) {
      setParticipant(updated as Participant)
    }
  }

  function cancelPhotoEdit() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoBlob(null)
    setPhotoPreview(null)
    setPhotoError(null)
    setShowPhotoCapture(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl text-sm text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error || !participant) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error ?? 'Not found'}
          </div>
          <Link
            to="/participants"
            className="mt-4 inline-block text-sm text-slate-600 hover:underline"
          >
            ← Back to {preset.labels.participants}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 3.5in 4.5in;
            margin: 0.15in;
          }
          body * { visibility: hidden !important; }
          .print-badge,
          .print-badge * { visibility: visible !important; }
          .print-badge {
            display: block !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 3.2in !important;
            height: 4.2in !important;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-4 sm:p-6 no-print">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/participants"
            className="text-xs text-slate-500 hover:underline"
          >
            ← Back to {preset.labels.participants}
          </Link>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              {participant.photo_url ? (
                <img
                  src={participant.photo_url}
                  alt={participant.full_name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400 text-xl font-medium">
                  {participant.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {participant.full_name}
                </h1>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {participant.system_id}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePrint}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Print badge
              </button>
              <button
                onClick={handleDelete}
                disabled={working}
                className="rounded border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="text-sm font-medium text-slate-900">Details</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Full name</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {participant.full_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    {preset.labels.participant} ID
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-900">
                    {participant.system_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">External ID</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {participant.external_id ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Registered</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {new Date(participant.created_at).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-900">
                  Enrollment photo
                </h2>
                {!showPhotoCapture && (
                  <button
                    onClick={() => setShowPhotoCapture(true)}
                    className="text-xs text-slate-600 hover:underline"
                  >
                    {participant.photo_url ? 'Replace' : 'Add photo'}
                  </button>
                )}
              </div>

              {!showPhotoCapture ? (
                <>
                  {participant.photo_url ? (
                    <div className="mt-3 space-y-2">
                      <img
                        src={participant.photo_url}
                        alt={participant.full_name}
                        className="w-full max-w-xs rounded-md border border-slate-300"
                      />
                      <button
                        onClick={handleRemovePhoto}
                        disabled={working}
                        className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        Remove photo
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 rounded border border-dashed border-slate-300 p-6 text-center">
                      <p className="text-sm text-slate-500">No photo yet.</p>
                      <button
                        onClick={() => setShowPhotoCapture(true)}
                        className="mt-3 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Take photo
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-3 space-y-3">
                  <PhotoCapture
                    currentPreviewUrl={photoPreview}
                    onCapture={(blob, previewUrl) => {
                      setPhotoBlob(blob)
                      setPhotoPreview(previewUrl)
                    }}
                    onClear={() => {
                      setPhotoBlob(null)
                      setPhotoPreview(null)
                    }}
                    label="New photo"
                    hint="Take a new photo or cancel to keep the existing one."
                  />

                  {photoError && (
                    <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                      {photoError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={cancelPhotoEdit}
                      disabled={working}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePhoto}
                      disabled={working || !photoBlob}
                      className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {working ? 'Saving...' : 'Save photo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-white p-5 shadow">
            <h2 className="text-sm font-medium text-slate-900">
              Badge preview
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              This is what will print.
            </p>
            <div className="mt-3 max-w-xs">
              <ParticipantBadge
                participant={participant}
                accountName={account?.name ?? ''}
              />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">
              Attendance history coming in a later phase.
            </p>
          </div>
        </div>
      </div>

      {/* Print-only badge — rendered on-page but hidden on screen via CSS */}
      <div className="print-badge" style={{ display: 'none' }}>
        <ParticipantBadge
          participant={participant}
          accountName={account?.name ?? ''}
          forPrint
        />
      </div>
    </>
  )
}