import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getStudentRecord, type StudentRecord } from '../../lib/api/students'

export default function StudentRecordPage() {
  const { systemId } = useParams<{ systemId: string }>()
  const [record, setRecord] = useState<StudentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!systemId) return
    setLoading(true)
    getStudentRecord(systemId).then(({ data, error: err }) => {
      if (err || !data) {
        setError(err ?? 'Student not found')
      } else {
        setRecord(data)
      }
      setLoading(false)
    })
  }, [systemId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-500">Loading record...</p>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div>
          <img
            src="/logo.png"
            alt="Quickie Pinkas"
            className="mx-auto h-12 w-auto mb-4"
          />
          <h1 className="text-xl font-bold text-slate-900">Record not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error ?? 'This link is not valid.'}
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Ask your school admin for a valid record link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Quickie Pinkas"
            className="mx-auto h-10 w-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-slate-900">
            {record.account.name}
          </h1>
          <p className="text-sm text-slate-500">Student Record</p>
        </div>

        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-lg font-semibold text-slate-900">
            {record.student.full_name}
          </h2>
          <p className="text-sm text-slate-600 font-mono mt-1">
            {record.student.system_id}
          </p>
          {record.student.external_id && (
            <p className="text-xs text-slate-400 mt-0.5">
              {record.student.external_id}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {record.courses.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">
              No courses enrolled yet.
            </p>
          )}

          {record.courses.map((course) => (
            <div key={course.id} className="rounded-lg bg-white p-5 shadow">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">
                    {course.name}
                  </h3>
                  {course.code && (
                    <p className="text-xs text-slate-500 font-mono">
                      {course.code}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-slate-900">
                    {course.attendance.percent}%
                  </span>
                  <p className="text-[10px] text-slate-500">
                    {course.attendance.present} / {course.attendance.total}{' '}
                    sessions
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-700">Grades</p>
                {course.grade ? (
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-800">
                    <span>CA: {course.grade.ca_total ?? '-'}</span>
                    <span>Exam: {course.grade.exam ?? '-'}</span>
                    <span>Total: {course.grade.total ?? '-'}</span>
                    <span className="font-bold text-slate-900">
                      ({course.grade.grade ?? '-'})
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Not yet graded</p>
                )}
              </div>

              {course.sessions.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 select-none">
                    View session history ({course.sessions.length})
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {course.sessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="truncate pr-2">
                          {s.label}
                          {s.date && (
                            <span className="text-slate-400 ml-1">
                              -{' '}
                              {new Date(s.date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </span>
                        <span
                          className={
                            s.status === 'Present'
                              ? 'text-emerald-600 font-medium shrink-0'
                              : 'text-red-600 shrink-0'
                          }
                        >
                          {s.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Powered by Quickie Pinkas
        </p>
      </div>
    </div>
  )
}