import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  listCaComponents,
  createCaComponent,
  updateCaComponent,
  deleteCaComponent,
  type CaComponent,
} from '../../lib/api/grades'
import Modal from '../../components/ui/Modal'

interface FormState {
  id: string | null
  name: string
  max_score: string
  weight: string
  sort_order: string
}

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  max_score: '',
  weight: '1',
  sort_order: '1',
}

export default function CaComponentsPage() {
  const { account } = useAuth()

  const [components, setComponents] = useState<CaComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await listCaComponents(account.id)
    setComponents(data)
    setError(err)
    setLoading(false)
  }, [account])

  useEffect(() => {
    load()
  }, [load])

  function openAdd() {
    setForm({
      ...EMPTY_FORM,
      sort_order: String(components.length + 1),
    })
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(c: CaComponent) {
    setForm({
      id: c.id,
      name: c.name,
      max_score: String(c.max_score),
      weight: String(c.weight),
      sort_order: String(c.sort_order),
    })
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() {
    if (submitting) return
    setShowModal(false)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!account) return

    const name = form.name.trim()
    const maxScore = Number(form.max_score)
    const weight = Number(form.weight)
    const sortOrder = Number(form.sort_order)

    if (!name) {
      setFormError('Name is required')
      return
    }
    if (!maxScore || maxScore <= 0) {
      setFormError('Max score must be a positive number')
      return
    }
    if (!weight || weight <= 0) {
      setFormError('Weight must be a positive number')
      return
    }
    if (isNaN(sortOrder)) {
      setFormError('Order must be a number')
      return
    }

    setFormError(null)
    setSubmitting(true)

    if (form.id) {
      const { error: err } = await updateCaComponent(form.id, {
        name,
        max_score: maxScore,
        weight,
        sort_order: sortOrder,
      })
      setSubmitting(false)
      if (err) {
        setFormError(err)
        return
      }
    } else {
      const { error: err } = await createCaComponent({
        accountId: account.id,
        name,
        max_score: maxScore,
        weight,
        sort_order: sortOrder,
      })
      setSubmitting(false)
      if (err) {
        setFormError(err)
        return
      }
    }

    closeModal()
    load()
  }

  async function handleDelete(c: CaComponent) {
    if (
      !confirm(
        `Delete "${c.name}"? Any scores entered for this component will also be deleted.`
      )
    )
      return

    const { error: err } = await deleteCaComponent(c.id)
    if (err) {
      alert(err)
      return
    }
    setComponents((prev) => prev.filter((x) => x.id !== c.id))
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/grades" className="text-xs text-slate-500 hover:underline">
          &lt;- Back to Grades
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Assessment structure
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Define the components that make up the continuous assessment (CA)
              for every course. This applies to all programs in your account.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add component
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading...
            </div>
          ) : components.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">
                No components defined yet.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Start with something like: Test 1 (10), Test 2 (10),
                Assignment (5), Quiz (5).
              </p>
              <button
                onClick={openAdd}
                className="mt-4 rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Add your first component
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Max score</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {components.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.max_score}</td>
                    <td className="px-4 py-3 text-slate-600">{c.weight}</td>
                    <td className="px-4 py-3 text-slate-600">{c.sort_order}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-3 text-xs">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-slate-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={form.id ? 'Edit component' : 'Add component'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              type="text"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Test 1"
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Max score
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.max_score}
                onChange={(e) =>
                  setForm({ ...form, max_score: e.target.value })
                }
                placeholder="10"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Weight
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                placeholder="1"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Order
              </label>
              <input
                type="number"
                step="1"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: e.target.value })
                }
                placeholder="1"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Weight multiplies the score when computing the CA total. Use 1.0 for
            equal weighting, or 2.0 to count something double.
          </p>

          {formError && (
            <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : form.id ? 'Save changes' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}