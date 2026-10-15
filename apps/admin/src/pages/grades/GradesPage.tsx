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
  upsertGrade,
  computeGrade,
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingCell, setSavingCell] = useState<string | null>(null)

  // Local drafts so typing works
  const [draftScores, setDraftScores] = useState<Record<string, string>>({})
  const [draftExams, setDraftExams] = useState<Record<string, string>>({})

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

    const [scoresRes, gradesRes] = await Promise.all([
      listCaScoresForProgram(selectedProgramId),
      listGradesForProgram(selectedProgramId),
    ])

    if (scoresRes.error || gradesRes.error) {
      setError(scoresRes.error ?? gradesRes.error)
      setLoading(false)
      return
    }

    setScores(scoresRes.data)
    setGradeRows(gradesRes.data)
    setLoading(false)
  }, [selectedProgramId])

  useEffect(() => {
    if (selectedProgramId) {
      setDraftScores({})
      setDraftExams({})
      loadProgramData()
    }
  }, [selectedProgramId, loadProgramData])

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

  function handleDraftScoreChange(
    participantId: string,
    componentId: string,
    value: string
  ) {
    const key = participantId + '|' + componentId
    setDraftScores((prev) => ({ ...prev, [key]: value }))
  }

  function handleDraftExamChange(participantId: string, value: string) {
    setDraftExams((prev) => ({ ...prev, [participantId]: value }))
  }

  async function commitScore(
    participantId: string,
    componentId: string,
    value: string
  ) {
    if (!account) return
    const key = participantId + '|' + componentId

    const existing = scoreMap.get(key)
    const num = value === '' ? null : Number(value)

    // Skip if unchanged
    if (num === (existing ?? null)) {
      setDraftScores((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }

    if (num !== null && (isNaN(num) || num < 0)) {
      // Revert draft
      setDraftScores((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }

    setSavingCell(key)

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

    if (err) {
      setSavingCell(null)
      alert(err)
      return
    }

    await recomputeGrade(participantId)
    setSavingCell(null)
    setDraftScores((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    await loadProgramData()
  }

  async function commitExam(participantId: string, value: string) {
    if (!account) return
    const existing = gradeMap.get(participantId)
    const num = value === '' ? null : Number(value)

    if (num === (existing?.exam ?? null)) {
      setDraftExams((prev) => {
        const next = { ...prev }
        delete next[participantId]
        return next
      })
      return
    }

    if (num !== null && (isNaN(num) || num < 0)) {
      setDraftExams((prev) => {
        const next = { ...prev }
        delete next[participantId]
        return next
      })
      return
    }

    setSavingCell(participantId + '|exam')

    await recomputeGrade(participantId, num)
    setSavingCell(null)
    setDraftExams((prev) => {
      const next = { ...prev }
      delete next[participantId]
      return next
    })
    await loadProgramData()
  }

  async function recomputeGrade(
    participantId: string,
    examOverride?: number | null
  ) {
    if (!account) return

    const participantScores = scores.filter(
      (s) => s.participant_id === participantId
    )
    const existingGrade = gradeMap.get(participantId)

    const exam =
      examOverride !== undefined
        ? examOverride
        : existingGrade?.exam ?? null

    const { ca_total, total, grade } = computeGrade(
      participantScores,
      components,
      exam
    )

    await upsertGrade(
      {
        accountId: account.id,
        participantId,
        programId: selectedProgramId,
        ca_total,
        exam,
        total,
        grade,
      },
      user?.id ?? null
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Grades</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter CA scores and exam marks per participant. Grades compute
              automatically.
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
            <strong>Setup needed:</strong> Define your CA structure first on the{' '}
            <Link to="/grades/settings" className="underline">
              Assessment structure
            </Link>{' '}
            page.
          </div>
        )}

        <div className="mt-5">
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

        {error && (
          <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
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
                        (c.weight !== 1 ? ', weight ' + c.weight : '')
                      }
                    >
                      <div className="leading-tight whitespace-nowrap">
                        {c.name}
                      </div>
                      <div className="text-[10px] font-normal normal-case text-slate-400">
                        /{c.max_score}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 font-medium text-center">
                    <div className="leading-tight">Exam</div>
                    <div className="text-[10px] font-normal normal-case text-slate-400">
                      /100
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
                        const draftVal = draftScores[key]
                        const displayVal =
                          draftVal !== undefined
                            ? draftVal
                            : dbVal === null || dbVal === undefined
                              ? ''
                              : String(dbVal)
                        const isSaving = savingCell === key
                        return (
                          <td key={c.id} className="px-1 py-1 text-center">
                            <input
                              type="number"
                              min="0"
                              max={c.max_score}
                              step="0.5"
                              value={displayVal}
                              disabled={isSaving || !hasComponents}
                              onChange={(e) =>
                                handleDraftScoreChange(p.id, c.id, e.target.value)
                              }
                              onBlur={(e) => commitScore(p.id, c.id, e.target.value)}
                              className="w-16 rounded border border-slate-300 px-1 py-1 text-center text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
                            />
                          </td>
                        )
                      })}
                      <td className="px-1 py-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={
                            draftExams[p.id] !== undefined
                              ? draftExams[p.id]
                              : existingGrade?.exam === null ||
                                existingGrade?.exam === undefined
                                ? ''
                                : String(existingGrade.exam)
                          }
                          disabled={
                            savingCell === p.id + '|exam' || !hasComponents
                          }
                          onChange={(e) =>
                            handleDraftExamChange(p.id, e.target.value)
                          }
                          onBlur={(e) => commitExam(p.id, e.target.value)}
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

        <p className="mt-4 text-xs text-slate-400">
          Scores save automatically when you tab out of a field.
        </p>
      </div>
    </div>
  )
}