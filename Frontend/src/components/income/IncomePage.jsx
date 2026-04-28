import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import './IncomePage.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investments', 'Bonus', 'Other']
const API_BASE_URL = 'http://localhost:8080/api/income'

const EMPTY_FORM = {
  title: '',
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  category: CATEGORIES[0],
  note: '',
}

function formatMoney(value) {
  return `Rs.${Number(value || 0).toLocaleString()}`
}

function formatDate(dateText) {
  return new Date(dateText).toLocaleDateString('en-CA')
}

function buildMonthBuckets(records, monthCount = 6) {
  const now = new Date()
  const months = []

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    months.push({ key, label, total: 0 })
  }

  records.forEach((income) => {
    const d = new Date(income.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = months.find((m) => m.key === key)
    if (bucket) bucket.total += Number(income.amount)
  })

  return months
}

function normalizeIncomeRecord(income) {
  return {
    ...income,
    note: income.note ?? income.notes ?? '',
  }
}

function IncomeModal({ editingIncome, onClose, onSave }) {
  const [form, setForm] = useState(editingIncome ? {
    ...editingIncome,
    amount: String(editingIncome.amount),
  } : EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const today = new Date().toISOString().slice(0, 10)

  function onChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const nextErrors = {}
    if (!form.title.trim()) nextErrors.title = 'Income title is required.'
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = 'Enter a valid amount.'
    if (!form.date) nextErrors.date = 'Date is required.'
    if (form.date && form.date > today) nextErrors.date = 'Cannot select a future date.'
    return nextErrors
  }

  function submit(e) {
    e.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    onSave({
      ...form,
      title: form.title.trim(),
      amount: Number(form.amount),
      description: form.description.trim(),
      note: form.note.trim(),
    })
  }

  return (
    <div className="inc-modal-backdrop" onClick={onClose}>
      <div className="inc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inc-modal-header">
          <h2>{editingIncome ? 'Edit Income' : 'Add Income'}</h2>
          <button type="button" className="inc-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit}>
          <div className="inc-form-field">
            <label>Income Title</label>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder="e.g. Salary Payment"
              className={errors.title ? 'error' : ''}
              autoFocus
            />
            {errors.title && <span className="inc-error">{errors.title}</span>}
          </div>

          <div className="inc-form-row">
            <div className="inc-form-field">
              <label>Amount (Rs.)</label>
              <input
                name="amount"
                type="number"
                min="1"
                value={form.amount}
                onChange={onChange}
                className={errors.amount ? 'error' : ''}
              />
              {errors.amount && <span className="inc-error">{errors.amount}</span>}
            </div>

            <div className="inc-form-field">
              <label>Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={onChange}
                max={today}
                className={errors.date ? 'error' : ''}
              />
              {errors.date && <span className="inc-error">{errors.date}</span>}
            </div>
          </div>

          <div className="inc-form-row">
            <div className="inc-form-field">
              <label>Category</label>
              <select name="category" value={form.category} onChange={onChange}>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="inc-form-field">
            <label>Description (optional)</label>
            <textarea
              name="description"
              rows="2"
              value={form.description}
              onChange={onChange}
              placeholder="Short description or source of income"
            />
          </div>

          <div className="inc-form-field">
            <label>Note (optional)</label>
            <textarea
              name="note"
              rows="2"
              value={form.note}
              onChange={onChange}
              placeholder="Optional memo"
            />
          </div>

          <div className="inc-modal-footer">
            <button type="button" className="inc-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="inc-btn-primary">
              {editingIncome ? 'Save Changes' : 'Add Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function IncomeViewModal({ income, onClose }) {
  if (!income) return null

  return (
    <div className="inc-modal-backdrop" onClick={onClose}>
      <div className="inc-modal inc-modal-view" onClick={(e) => e.stopPropagation()}>
        <div className="inc-modal-header">
          <h2>Income Details</h2>
          <button type="button" className="inc-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="inc-view-grid">
          <div><span>Title</span><strong>{income.title}</strong></div>
          <div><span>Amount</span><strong>{formatMoney(income.amount)}</strong></div>
          <div><span>Date</span><strong>{formatDate(income.date)}</strong></div>
          <div><span>Category</span><strong>{income.category}</strong></div>
          <div><span>Description</span><strong>{income.description || 'No description added'}</strong></div>
          <div><span>Note</span><strong>{income.note || income.notes || 'No note added'}</strong></div>
        </div>
      </div>
    </div>
  )
}

export default function IncomePage({ onOpenSidebar }) {
  const [incomeList, setIncomeList] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [viewingIncome, setViewingIncome] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState(null)

  const fetchIncome = useCallback(async (userIdParam) => {
    try {
      setLoading(true)
      setError('')
      const id = userIdParam
      if (!id) {
        setError('User ID not found. Please log in again.')
        return
      }

      const response = await fetch(`${API_BASE_URL}/user/${id}`)
      if (!response.ok) throw new Error('Failed to fetch income records')
      const data = await response.json()
      setIncomeList(Array.isArray(data) ? data.map(normalizeIncomeRecord) : [])
    } catch (err) {
      console.error('Fetch income error:', err)
      setError('Could not load income records. Make sure the backend is running.')
      setIncomeList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      const parsedUserId = parseInt(storedUserId, 10)
      setUserId(parsedUserId)
      fetchIncome(parsedUserId)
    } else {
      setError('User not logged in. Please log in first.')
      setLoading(false)
    }
  }, [fetchIncome])

  const categoriesInUse = useMemo(
    () => [...new Set(incomeList.map((income) => income.category))],
    [incomeList]
  )

  const filteredIncome = useMemo(() => {
    return incomeList
      .filter((income) => categoryFilter === 'ALL' || income.category === categoryFilter)
      .filter((income) => {
        const query = search.trim().toLowerCase()
        if (!query) return true
        return (
          (income.title || '').toLowerCase().includes(query)
          || (income.description || '').toLowerCase().includes(query)
          || income.category.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [categoryFilter, incomeList, search])

  const totalAmount = incomeList.reduce((sum, income) => sum + Number(income.amount), 0)

  const thisMonthAmount = incomeList
    .filter((income) => {
      const d = new Date(income.date)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((sum, income) => sum + Number(income.amount), 0)

  const monthlyBuckets = buildMonthBuckets(incomeList, 6)

  const lineData = {
    labels: monthlyBuckets.map((bucket) => bucket.label),
    datasets: [
      {
        label: 'Income',
        data: monthlyBuckets.map((bucket) => bucket.total),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.12)',
        pointBackgroundColor: '#2563eb',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
      },
    ],
  }

  const lineOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Income: ${formatMoney(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#94a3b8', font: { size: 12 } },
      },
      y: {
        grid: { color: '#e2e8f0' },
        border: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 12 },
          callback: (value) => `Rs.${Number(value / 1000).toFixed(0)}k`,
        },
      },
    },
    maintainAspectRatio: false,
  }

  function openCreate() {
    setEditingIncome(null)
    setShowFormModal(true)
  }

  function openEdit(income) {
    setEditingIncome(income)
    setShowFormModal(true)
  }

  async function saveIncome(incomeData) {
    try {
      if (!userId) {
        throw new Error('User ID not found. Please log in again.')
      }

      const payload = {
        userId,
        title: incomeData.title,
        description: incomeData.description,
        amount: incomeData.amount,
        category: incomeData.category,
        date: incomeData.date,
        notes: incomeData.note,
      }

      if (editingIncome) {
        const response = await fetch(`${API_BASE_URL}/${editingIncome.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.message || 'Failed to update income')
        }

        const updated = normalizeIncomeRecord(await response.json())
        setIncomeList((prev) => prev.map((inc) => (inc.id === editingIncome.id ? updated : inc)))
      } else {
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.message || 'Failed to create income')
        }

        const saved = normalizeIncomeRecord(await response.json())
        setIncomeList((prev) => [saved, ...prev])
      }

      setShowFormModal(false)
      setEditingIncome(null)
    } catch (err) {
      console.error('Save income error:', err)
      alert(`Failed to save income: ${err.message}`)
    }
  }

  async function deleteIncome(id) {
    const shouldDelete = window.confirm('Delete this income record?')
    if (!shouldDelete) return

    try {
      if (!userId) {
        throw new Error('User ID not found. Please log in again.')
      }

      const response = await fetch(`${API_BASE_URL}/${id}?userId=${userId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete income')

      setIncomeList((prev) => prev.filter((income) => income.id !== id))
    } catch (err) {
      console.error('Delete income error:', err)
      alert(`Failed to delete income: ${err.message}`)
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <header className="db-header">
        <div className="db-header-left">
          <button className="db-hamburger" type="button" onClick={onOpenSidebar}>☰</button>
          <div>
            <h1 className="db-title">Income</h1>
            <p className="db-subtitle">{today}</p>
          </div>
        </div>

        <div className="db-header-right">
          <button className="db-icon-btn" type="button" title="Notifications">🔔</button>
          <button className="db-add-btn" type="button" onClick={openCreate}>+ Add Income</button>
        </div>
      </header>

      {error && <div className="inc-error-banner">{error}</div>}

      <section className="inc-kpi-grid">
        <article className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">📈</span><span className="kpi-badge pos">↑</span></div>
          <p className="kpi-label">Total Income</p>
          <h2 className="kpi-value">{incomeList.length}</h2>
          <span className="kpi-change pos">records</span>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">💰</span><span className="kpi-badge pos">↑</span></div>
          <p className="kpi-label">Total Amount</p>
          <h2 className="kpi-value">{formatMoney(totalAmount)}</h2>
          <span className="kpi-change pos">selected view</span>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">🗂️</span><span className="kpi-badge pos">↑</span></div>
          <p className="kpi-label">Categories</p>
          <h2 className="kpi-value">{categoriesInUse.length}</h2>
          <span className="kpi-change pos">unique</span>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">🗓️</span><span className="kpi-badge pos">↑</span></div>
          <p className="kpi-label">This Month</p>
          <h2 className="kpi-value">{formatMoney(thisMonthAmount)}</h2>
          <span className="kpi-change pos">current month</span>
        </article>
      </section>

      <section className="db-card inc-line-card">
        <div className="db-card-header">
          <h3>Income Trend</h3>
          <span className="db-card-tag db-card-tag-blue">Last 6 months</span>
        </div>
        <div className="inc-line-wrap">
          <Line data={lineData} options={lineOptions} />
        </div>
      </section>

      <section className="db-card">
        <div className="db-card-header inc-table-head">
          <h3>Your Income</h3>
          <div className="inc-filters">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="ALL">ALL</option>
              {categoriesInUse.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="inc-table-wrap">
          {loading ? (
            <p className="inc-loading">Loading...</p>
          ) : (
            <table className="inc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncome.length === 0 && (
                  <tr>
                    <td colSpan="6" className="inc-empty-row">No income records match this filter.</td>
                  </tr>
                )}

                {filteredIncome.map((income) => (
                  <tr key={income.id}>
                    <td>{formatDate(income.date)}</td>
                    <td>{income.category}</td>
                    <td>{income.title}</td>
                    <td>{income.description || 'No description'}</td>
                    <td className="inc-amount">{formatMoney(income.amount)}</td>
                    <td>
                      <div className="inc-actions">
                        <button type="button" className="inc-btn-view" onClick={() => setViewingIncome(income)}>View</button>
                        <button type="button" className="inc-btn-edit" onClick={() => openEdit(income)}>Edit</button>
                        <button type="button" className="inc-btn-delete" onClick={() => deleteIncome(income.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showFormModal && (
        <IncomeModal
          editingIncome={editingIncome}
          onClose={() => {
            setShowFormModal(false)
            setEditingIncome(null)
          }}
          onSave={saveIncome}
        />
      )}

      {viewingIncome && (
        <IncomeViewModal income={viewingIncome} onClose={() => setViewingIncome(null)} />
      )}
    </>
  )
}