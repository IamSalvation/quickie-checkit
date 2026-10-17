import { useState, useMemo, useRef, type ChangeEvent } from 'react'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { getPreset } from '../../lib/presets'
import {
  parseCsv,
  autoDetectNameColumn,
  autoDetectExternalIdColumn,
} from '../../lib/csv'
import {
  bulkCreateParticipants,
  type BulkRow,
  type BulkImportResult,
} from '../../lib/api/participants'

interface Props {
  open: boolean
  onClose: () => void
  onImported: (count: number) => void
}

type Step = 'source' | 'mapping' | 'importing' | 'done'

export default function BulkImportModal({ open, onClose, onImported }: Props) {
  const { account } = useAuth()
  const preset = getPreset(account?.preset)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('source')
  const [rawCsv, setRawCsv] = useState('')
  const [pasteValue, setPasteValue] = useState('')
  const [nameCol, setNameCol] = useState(-1)
  const [extCol, setExtCol] = useState(-1)
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const parsed = useMemo(() => {
    if (!rawCsv.trim()) return { headers: [], rows: [] }
    return parseCsv(rawCsv)
  }, [rawCsv])

  function reset() {
    setStep('source')
    setRawCsv('')
    setPasteValue('')
    setNameCol(-1)
    setExtCol(-1)
    setResult(null)
    setProgress({ done: 0, total: 0 })
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    if (step === 'importing') return
    reset()
    onClose()
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? ''
      setRawCsv(text)
      const p = parseCsv(text)
      setNameCol(autoDetectNameColumn(p.headers))
      setExtCol(autoDetectExternalIdColumn(p.headers))
      setError(null)
    }
    reader.readAsText(file)
  }

  function handlePasteContinue() {
    if (!pasteValue.trim()) {
      setError('Paste some CSV first')
      return
    }
    setRawCsv(pasteValue)
    const p = parseCsv(pasteValue)
    setNameCol(autoDetectNameColumn(p.headers))
    setExtCol(autoDetectExternalIdColumn(p.headers))
    setError(null)
  }

  function goToMapping() {
    if (parsed.rows.length === 0) {
      setError('No rows detected in the CSV')
      return
    }
    if (nameCol < 0) {
      setError('Select which column contains the name')
      return
    }
    setError(null)
    setStep('mapping')
  }

  async function handleImport() {
    if (!account) return
    if (nameCol < 0) {
      setError('Name column is required')
      return
    }

    const rows: BulkRow[] = parsed.rows.map((r) => ({
      full_name: r[nameCol] ?? '',
      external_id: extCol >= 0 ? r[extCol] ?? null : null,
    }))

    setStep('importing')
    setProgress({ done: 0, total: rows.length })
    setError(null)

    const { data, error: err } = await bulkCreateParticipants(
      account.id,
      rows,
      (done, total) => setProgress({ done, total })
    )

    if (err || !data) {
      setError(err ?? 'Import failed')
      setStep('mapping')
      return
    }

    setResult(data)
    setStep('done')
    if (data.imported > 0) onImported(data.imported)
  }

  // -------- Render --------

  const headerCellCls =
    'px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={'Bulk import ' + preset.labels.participants}
    >
      {error && (
        <div className="mb-3 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: source */}
      {step === 'source' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload a CSV file or paste comma-separated rows. First row must be
            the header.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Upload file
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFile}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
            />
          </div>

          {parsed.headers.length > 0 && (
            <div className="rounded bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
              Detected {parsed.rows.length} row
              {parsed.rows.length === 1 ? '' : 's'} - {parsed.headers.length}{' '}
              column{parsed.headers.length === 1 ? '' : 's'}
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">OR</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Paste CSV
            </label>
            <textarea
              rows={5}
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder={'Name,Matric No\nJosh Aye,MAT-004\nBola Adeyemi,MAT-005'}
              className="block w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            {parsed.headers.length === 0 ? (
              <button
                type="button"
                onClick={handlePasteContinue}
                disabled={!pasteValue.trim()}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={goToMapping}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Next: Map columns
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: mapping + preview */}
      {step === 'mapping' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-2">
              Map columns
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Full name column <span className="text-red-500">*</span>
                </label>
                <select
                  value={nameCol}
                  onChange={(e) => setNameCol(Number(e.target.value))}
                  className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  <option value={-1}>Select a column...</option>
                  {parsed.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  External ID column (optional)
                </label>
                <select
                  value={extCol}
                  onChange={(e) => setExtCol(Number(e.target.value))}
                  className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  <option value={-1}>- Ignore -</option>
                  {parsed.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-2">
              Preview ({Math.min(5, parsed.rows.length)} of {parsed.rows.length})
            </h3>
            <div className="overflow-hidden rounded border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={headerCellCls}>Name</th>
                    <th className={headerCellCls}>External ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsed.rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-900">
                        {nameCol >= 0 ? r[nameCol] : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-mono">
                        {extCol >= 0 ? r[extCol] || '-' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep('source')}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={nameCol < 0}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Import {parsed.rows.length}{' '}
              {parsed.rows.length === 1
                ? preset.labels.participant.toLowerCase()
                : preset.labels.participants.toLowerCase()}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: importing */}
      {step === 'importing' && (
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-700">
            Importing... {progress.done} / {progress.total}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-slate-900 transition-all"
              style={{
                width:
                  progress.total > 0
                    ? Math.round((progress.done / progress.total) * 100) + '%'
                    : '0%',
              }}
            />
          </div>
          <p className="text-xs text-slate-400">
            Large imports are batched. Please keep this window open.
          </p>
        </div>
      )}

      {/* Step 4: done */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="rounded bg-emerald-50 border border-emerald-200 px-3 py-3 text-sm text-emerald-800">
            Import complete
          </div>
          <ul className="space-y-1 text-sm">
            <li className="text-slate-800">
              Imported: <strong>{result.imported}</strong>
            </li>
            {result.skipped_duplicate > 0 && (
              <li className="text-slate-600">
                Skipped (duplicate external ID):{' '}
                <strong>{result.skipped_duplicate}</strong>
              </li>
            )}
            {result.failed_missing_name > 0 && (
              <li className="text-slate-600">
                Skipped (missing name):{' '}
                <strong>{result.failed_missing_name}</strong>
              </li>
            )}
            {result.errors.length > 0 && (
              <li className="text-red-700">
                Errors: <strong>{result.errors.length}</strong>
                <ul className="mt-1 ml-4 list-disc text-xs text-red-600">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}