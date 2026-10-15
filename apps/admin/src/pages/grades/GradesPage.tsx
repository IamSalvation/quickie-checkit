import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import { listPrograms, type Program } from '../../lib/api/programs'
import { listParticipants, type Participant } from '../../lib/api/participants'
import {
  listCaComponents,
  listCaScoresForProgram,
  upsertCaScore,
  listGradesForProgram,
  recomputeGradeRpc,
  recomputeAllGradesRpc,
  getProgramExamMax,
  setProgramExamMax,
  upsertGrade,
  type CaComponent,
  type CaScore,
  type GradeRow,
} from '../../lib/api/grades'

export default function GradesPage() {
  const { account, user } = useAuth()
  const preset = getPreset(account?.preset)

  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string>('')

  const [components, setComponents] = useState<CaComponent[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [scores, setScores] = useState<CaScore[]>([])
  const [gradeRows, setGradeRows] = useState<GradeRow[]>([])
  const [examMax, setExamMax] = useState<number>(100)
  const [examMaxDraft, setExamMaxDraft] = useState<string>('100')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({})
  const [examDrafts, setExamDrafts] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  // ---------- Loaders ----------

  useEffect(() => {
    if (!account) return
    listPrograms(account.id, { status: 'active', limit: 200 }).then(
      ({ data }) => setPrograms(data)
    )
  }, [account])

  useEffect(() => {
    if (!account) return
    listCaComponents(account.id).then(({ data }) => setComponents(data))
  }, [account])

  useEffect(() => {
    if (!account) return
    listParticipants(account.id, { limit: 500 }).then(({ data }) =>
      setParticipants(data)
    )
  }, [account])

  const loadProgramData = useCallback(async () => {
    if (!selectedProgramId) return
    setLoading(true)
    setError(null)

    const [scoresRes, gradesRes, examMaxRes] = await Promise.all([
      listCaScoresForProgram(selectedProgramId),
      listGradesForProgram(selectedProgramId),
      getProgramExamMax(selectedProgramId),
    ])

    if (scoresRes.error || gradesRes.error) {
      setError(scoresRes.error ?? gradesRes.error)
      setLoading(false)
      return
    }

    setScores(scoresRes.data)
    setGradeRows(gradesRes.data)
    setExamMax(examMaxRes.data)
    setExamMaxDraft(String(examMaxRes.data))
    setScoreDrafts({})
    setExamDrafts({})
    setLoading(false)
  }, [selectedProgramId])

  useEffect(() => {
    if (selectedProgramId) loadProgramData()
  }, [selectedProgramId, loadProgramData])

  // ---------- Lookup maps ----------

  const scoreMap = useMemo(() => {
    const m = new Map<string, number | null>()
    for (const s of scores) {
      m.set(s.participant_id + '|' + s.component_id, s.score)
    }
    return m
  }, [scores])

  const gradeMap = useMemo(() => {
    const m = new Map<string, GradeRow>()
    for (const g of gradeRows) {
      m.set(g.participant_id, g)
    }
    return m
  }, [gradeRows])

  const hasComponents = components.length > 0
  const hasUnsavedChanges =
    Object.keys(scoreDrafts).length > 0 ||
    Object.keys(examDrafts).length > 0 ||
    String(examMax) !== examMaxDraft.trim()

  // ---------- Draft handlers ----------

  function handleScoreDraft(
    participantId: string,
    componentId: string,
    value: string
  ) {
    const key = participantId + '|' + componentId
    setScoreDrafts((prev) => ({ ...prev, [key]: value }))
  }

  function handleExamDraft(participantId: string, value: string) {
    setExamDrafts((prev) => ({ ...prev, [participantId]: value }))
  }

  // ---------- Save all ----------

  async function handleSaveAll() {
    if (!account) return
    setSaving(true)
    setError(null)

    try {
      // 1. Save exam_max if changed
      const parsedExamMax = Number(examMaxDraft)
      if (!isNaN(parsedExamMax) && parsedExamMax !== examMax) {
        const { error: maxErr } = await setProgramExamMax(
          selectedProgramId,
          parsedExamMax
        )
        if (maxErr) throw new Error(maxErr)
      }

      // 2. Save all score drafts
      const affectedParticipants = new Set<string>()

      for (const key of Object.keys(scoreDrafts)) {
        const [participantId, componentId] = key.split('|')
        const raw = scoreDrafts[key].trim()
        const num = raw === '' ? null : Number(raw)

        if (num !== null && (isNaN(num) || num < 0)) continue

        const { error: err } = await upsertCaScore(
          {
            accountId: account.id,
            participantId,
            programId: selectedProgramId,
            componentId,
            score: num,
          },
          user?.id ?? null
        )
        if (err) throw new Error(err)
        affectedParticipants.add(participantId)
      }

      // 3. Save exam drafts
      for (const participantId of Object.keys(examDrafts)) {
        const raw = examDrafts[participantId].trim()
        const num = raw === '' ? null : Number(raw)

        if (num !== null && (isNaN(num) || num < 0)) continue

        const existing = gradeMap.get(participantId)
        const { error: err } = await upsertGrade(
          {
            accountId: account.id,
            participantId,
            programId: selectedProgramId,
            ca_total: existing?.ca_total ?? null,
            exam: num,
            total: existing?.total ?? null,
            grade: existing?.grade ?? null,
          },
          user?.id ?? null
        )
        if (err) throw new Error(err)
        affectedParticipants.add(participantId)
      }

      // 4. Recompute grades for affected participants
      for (const participantId of affectedParticipants) {
        await recomputeGradeRpc(participantId, selectedProgramId)
      }

      // 5. Reload
      await loadProgramData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setScoreDrafts({})
    setExamDrafts({})
    setExamMaxDraft(String(examMax))
  }

  // ---------- Recalculate ----------

  async function handleRecalcAll() {
    if (!selectedProgramId) return
    if (
      hasUnsavedChanges &&
      !confirm(
        'You have unsaved changes. Recalculate using the last saved values?'
      )
    )
      return
    setRecalculating(true)
    const { error: err } = await recomputeAllGradesRpc(selectedProgramId)
    setRecalculating(false)
    if (err) {
      setError(err)
      return
    }
    await loadProgramData()
  }

  // ---------- Render ----------

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Grades</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter CA scores and exam marks. Changes are saved when you click
              Save changes.
            </p>
          </div>
          <Link
            to="/grades/settings"
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Assessment structure
          </Link>
        </div>

        {!hasComponents && (
          <div className="mt-6 rounded bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            <strong>Setup needed:</strong> Define your CA structure first on
            the{' '}
            <Link to="/grades/settings" className="underline">
              Assessment structure
            </Link>{' '}
            page.
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {preset.labels.program}
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="block w-full sm:max-w-md rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="">- Select -</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.code ? ' (' + p.code + ')' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedProgramId && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Exam max
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={examMaxDraft}
                onChange={(e) => setExamMaxDraft(e.target.value)}
                className="w-24 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {selectedProgramId && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleRecalcAll}
              disabled={recalculating || loading}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {recalculating ? 'Recalculating...' : 'Recalculate all'}
            </button>
            {hasUnsavedChanges && (
              <>
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={saving}
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Discard
                </button>
                <span className="text-xs text-amber-700">
                  You have unsaved changes
                </span>
              </>
            )}
          </div>
        )}

        {!selectedProgramId && (
          <div className="mt-6 rounded border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              Pick a {preset.labels.program.toLowerCase()} to start entering
              grades.
            </p>
          </div>
        )}

        {selectedProgramId && loading && (
          <div className="mt-6 rounded-lg bg-white p-10 text-center text-sm text-slate-500 shadow">
            Loading...
          </div>
        )}

        {selectedProgramId && !loading && participants.length === 0 && (
          <div className="mt-6 rounded border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              No participants to grade yet.
            </p>
          </div>
        )}

        {selectedProgramId && !loading && participants.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-medium">
                    Participant
                  </th>
                  <th className="px-3 py-2 font-medium">System ID</th>
                  {components.map((c) => (
                    <th
                      key={c.id}
                      className="px-2 py-2 font-medium text-center"
                      title={
                        'Max ' +
                        c.max_score +
                        (c.weight !== 1 ? ', weight ' + c.weight : '') +
                        (c.auto_from_attendance ? ' (auto from attendance)' : '')
                      }
                    >
                      <div className="leading-tight whitespace-nowrap">
                        {c.name}
                        {c.auto_from_attendance && (
                          <span className="ml-1 text-[9px] font-normal text-blue-600">
                            auto
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-normal normal-case text-slate-400">
                        /{c.max_score}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 font-medium text-center">
                    <div className="leading-tight">Exam</div>
                    <div className="text-[10px] font-normal normal-case text-slate-400">
                      /{examMax}
                    </div>
                  </th>
                  <th className="px-3 py-2 font-medium text-right">CA</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                  <th className="px-3 py-2 font-medium text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map((p) => {
                  const existingGrade = gradeMap.get(p.id)
                  const displayGrade =
                    existingGrade?.grade_override ??
                    existingGrade?.grade ??
                    '-'
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                        {p.full_name}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {p.system_id}
                      </td>
                      {components.map((c) => {
                        const key = p.id + '|' + c.id
                        const dbVal = scoreMap.get(key)
                        const draftVal = scoreDrafts[key]
                        const displayVal =
                          draftVal !== undefined
                            ? draftVal
                            : dbVal === null || dbVal === undefined
                            ? ''
                            : String(dbVal)
                        return (
                          <td key={c.id} className="px-1 py-1 text-center">
                            <input
                              type="number"
                              min="0"
                              max={c.max_score}
                              step="0.5"
                              value={displayVal}
                              disabled={!hasComponents}
                              onChange={(e) =>
                                handleScoreDraft(p.id, c.id, e.target.value)
                              }
                              placeholder={
                                c.auto_from_attendance ? 'auto' : ''
                              }
                              className="w-16 rounded border border-slate-300 px-1 py-1 text-center text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
                            />
                          </td>
                        )
                      })}
                      <td className="px-1 py-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max={examMax}
                          step="0.5"
                          value={
                            examDrafts[p.id] !== undefined
                              ? examDrafts[p.id]
                              : existingGrade?.exam === null ||
                                existingGrade?.exam === undefined
                              ? ''
                              : String(existingGrade.exam)
                          }
                          disabled={!hasComponents}
                          onChange={(e) =>
                            handleExamDraft(p.id, e.target.value)
                          }
                          className="w-16 rounded border border-slate-300 px-1 py-1 text-center text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {existingGrade?.ca_total ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">
                        {existingGrade?.total ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={
                            'inline-block min-w-[2rem] rounded px-2 py-0.5 text-sm font-semibold ' +
                            (displayGrade === 'A'
                              ? 'bg-emerald-50 text-emerald-700'
                              : displayGrade === 'B'
                              ? 'bg-green-50 text-green-700'
                              : displayGrade === 'C'
                              ? 'bg-yellow-50 text-yellow-700'
                              : displayGrade === 'D'
                              ? 'bg-orange-50 text-orange-700'
                              : displayGrade === 'E'
                              ? 'bg-orange-50 text-orange-800'
                              : displayGrade === 'F'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-500')
                          }
                        >
                          {displayGrade}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedProgramId && !loading && (
          <p className="mt-4 text-xs text-slate-400">
            Changes save when you click Save changes. Click Recalculate all to
            force a fresh grade using the latest attendance and scores.
          </p>
        )}
      </div>
    </div>
  )
}