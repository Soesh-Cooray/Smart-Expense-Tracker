import { useMemo, useState, useEffect } from 'react'
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
import './styles/ExpensesPage.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const ICONS = ['🏠', '🍔', '🚗', '🎬', '🏥', '⚡', '🛒', '💳', '✈️', '📱']
const CATEGORIES = ['Housing', 'Food', 'Transport', 'Entertainment', 'Health', 'Utilities', 'Shopping', 'Other']
const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Cash', 'Digital Wallet']

const API_BASE_URL = 'http://localhost:8080/api/expenses'

const EMPTY_FORM = {
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  category: CATEGORIES[0],
  paymentMethod: PAYMENT_METHODS[0],
  notes: '',
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

  records.forEach((expense) => {
    const d = new Date(expense.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = months.find((m) => m.key === key)
    if (bucket) bucket.total += Number(expense.amount)
  })

  return months
}

function ExpenseModal({ userId, editingExpense, onClose, onSave }) {
  const [form, setForm] = useState(editingExpense ? {
    ...editingExpense,
    amount: String(editingExpense.amount),
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
    if (!form.description.trim()) nextErrors.description = 'Description is required.'
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
      userId: userId,
      description: form.description.trim(),
      category: form.category,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      date: form.date,
      notes: form.notes?.trim() || '',
    })
  }

  return (
    <div className="exp-modal-backdrop" onClick={onClose}>
      <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="exp-modal-header">
          <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button type="button" className="exp-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit}>
          <div className="exp-form-field">
            <label>Description</label>
            <input
              name="description"
              value={form.description}
              onChange={onChange}
              placeholder="e.g. Grocery Shopping"
              className={errors.description ? 'error' : ''}
              autoFocus
            />
            {errors.description && <span className="exp-error">{errors.description}</span>}
          </div>

          <div className="exp-form-row">
            <div className="exp-form-field">
              <label>Amount (Rs.)</label>
              <input
                name="amount"
                type="number"
                min="1"
                value={form.amount}
                onChange={onChange}
                className={errors.amount ? 'error' : ''}
              />
              {errors.amount && <span className="exp-error">{errors.amount}</span>}
            </div>

            <div className="exp-form-field">
              <label>Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={onChange}
                max={today}
                className={errors.date ? 'error' : ''}
              />
              {errors.date && <span className="exp-error">{errors.date}</span>}
            </div>
          </div>

          <div className="exp-form-row">
            <div className="exp-form-field">
              <label>Category</label>
              <select name="category" value={form.category} onChange={onChange}>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="exp-form-field">
              <label>Payment Method</label>
              <select name="paymentMethod" value={form.paymentMethod} onChange={onChange}>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="exp-form-field">
            <label>Notes (optional)</label>
            <textarea
              name="notes"
              rows="2"
              value={form.notes}
              onChange={onChange}
              placeholder="Optional memo"
            />
          </div>

          <div className="exp-modal-footer">
            <button type="button" className="exp-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="exp-btn-primary">
              {editingExpense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExpenseViewModal({ expense, onClose }) {
  if (!expense) return null

  return (
    <div className="exp-modal-backdrop" onClick={onClose}>
      <div className="exp-modal exp-modal-view" onClick={(e) => e.stopPropagation()}>
        <div className="exp-modal-header">
          <h2>Expense Details</h2>
          <button type="button" className="exp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="exp-view-grid">
          <div><span>Description</span><strong>{expense.description}</strong></div>
          <div><span>Amount</span><strong>{formatMoney(expense.amount)}</strong></div>
          <div><span>Date</span><strong>{formatDate(expense.date)}</strong></div>
          <div><span>Category</span><strong>{expense.category}</strong></div>
          <div><span>Payment Method</span><strong>{expense.paymentMethod}</strong></div>
          <div><span>Notes</span><strong>{expense.notes || 'No notes'}</strong></div>
        </div>
      </div>
    </div>
  )
}

export default function ExpensePage({ onOpenSidebar }) {
  const [expenseList, setExpenseList] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [viewingExpense, setViewingExpense] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const userId = 1 // Default user ID - change if needed

  // Fetch expenses on mount
  useEffect(() => {
    fetchExpenses()
  }, [])

  async function fetchExpenses() {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(API_BASE_URL)
      if (!response.ok) throw new Error('Failed to fetch expenses')
      const data = await response.json()
      setExpenseList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Could not load expenses. Make sure the backend is running.')
      setExpenseList([])
    } finally {
      setLoading(false)
    }
  }

  const categoriesInUse = useMemo(
    () => [...new Set(expenseList.map((expense) => expense.category))],
    [expenseList]
  )

  const filteredExpenses = useMemo(() => {
    return expenseList
      .filter((expense) => categoryFilter === 'ALL' || expense.category === categoryFilter)
      .filter((expense) => {
        const query = search.trim().toLowerCase()
        if (!query) return true
        return (
          expense.description.toLowerCase().includes(query)
          || expense.category.toLowerCase().includes(query)
          || expense.paymentMethod.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [categoryFilter, expenseList, search])

  const totalAmount = expenseList.reduce((sum, expense) => sum + Number(expense.amount), 0)

  const thisMonthAmount = expenseList
    .filter((expense) => {
      const d = new Date(expense.date)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((sum, expense) => sum + Number(expense.amount), 0)

  const monthlyBuckets = buildMonthBuckets(expenseList, 6)

  const lineData = {
    labels: monthlyBuckets.map((bucket) => bucket.label),
    datasets: [
      {
        label: 'Expenses',
        data: monthlyBuckets.map((bucket) => bucket.total),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.12)',
        pointBackgroundColor: '#dc2626',
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
          label: (ctx) => ` Expense: ${formatMoney(ctx.parsed.y)}`,
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
    setEditingExpense(null)
    setShowFormModal(true)
  }

  function openEdit(expense) {
    setEditingExpense(expense)
    setShowFormModal(true)
  }

  async function saveExpense(expenseData) {
    try {
      if (editingExpense) {
        // Update
        const response = await fetch(`${API_BASE_URL}/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        })
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.message || 'Failed to update')
        }
        const updated = await response.json()
        setExpenseList((prev) =>
          prev.map((exp) => (exp.id === editingExpense.id ? updated : exp))
        )
      } else {
        // Create
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        })
        if (!response.ok) {
          const errData = await response.json()
          console.error('Backend error:', errData)
          throw new Error(errData.message || 'Failed to create')
        }
        const saved = await response.json()
        setExpenseList((prev) => [saved, ...prev])
      }
      setShowFormModal(false)
      setEditingExpense(null)
    } catch (err) {
      console.error('Save error:', err)
      alert(`Failed to save expense: ${err.message}`)
    }
  }

  async function deleteExpense(id) {
    if (!window.confirm('Delete this expense?')) return
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      setExpenseList((prev) => prev.filter((expense) => expense.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete expense')
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
            <h1 className="db-title">Expenses</h1>
            <p className="db-subtitle">{today}</p>
          </div>
        </div>

        <div className="db-header-right">
          <button className="db-icon-btn" type="button" title="Notifications">🔔</button>
          <button className="db-add-btn" type="button" onClick={openCreate}>+ Add Expense</button>
        </div>
      </header>

      {error && (
        <div className="exp-error-banner">
          {error}
        </div>
      )}

      <section className="exp-kpi-grid">
        <article className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">📊</span><span className="kpi-badge pos">↓</span></div>
          <p className="kpi-label">Total Expenses</p>
          <h2 className="kpi-value">{filteredExpenses.length}</h2>
          <span className="kpi-change pos">records</span>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">💸</span><span className="kpi-badge pos">↓</span></div>
          <p className="kpi-label">Total Amount</p>
          <h2 className="kpi-value">{formatMoney(totalAmount)}</h2>
          <span className="kpi-change pos">all time</span>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">🏷️</span><span className="kpi-badge pos">↓</span></div>
          <p className="kpi-label">Categories</p>
          <h2 className="kpi-value">{categoriesInUse.length}</h2>
          <span className="kpi-change pos">unique</span>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">📅</span><span className="kpi-badge pos">↓</span></div>
          <p className="kpi-label">This Month</p>
          <h2 className="kpi-value">{formatMoney(thisMonthAmount)}</h2>
          <span className="kpi-change pos">current month</span>
        </article>
      </section>

      <section className="db-card exp-line-card">
        <div className="db-card-header">
          <h3>Expense Trend</h3>
          <span className="db-card-tag db-card-tag-red">Last 6 months</span>
        </div>
        <div className="exp-line-wrap">
          <Line data={lineData} options={lineOptions} />
        </div>
      </section>

      <section className="db-card">
        <div className="db-card-header exp-table-head">
          <h3>Your Expenses</h3>
          <div className="exp-filters">
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

        <div className="exp-table-wrap">
          {loading ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading...</p>
          ) : (
            <table className="exp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="exp-empty-row">No expenses match this filter.</td>
                  </tr>
                )}

                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>{expense.description}</td>
                    <td>{expense.category}</td>
                    <td className="exp-amount">{formatMoney(expense.amount)}</td>
                    <td>{expense.paymentMethod}</td>
                    <td>
                      <div className="exp-actions">
                        <button type="button" className="exp-btn-view" onClick={() => setViewingExpense(expense)}>View</button>
                        <button type="button" className="exp-btn-edit" onClick={() => openEdit(expense)}>Edit</button>
                        <button type="button" className="exp-btn-delete" onClick={() => deleteExpense(expense.id)}>Delete</button>
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
        <ExpenseModal
          userId={userId}
          editingExpense={editingExpense}
          onClose={() => {
            setShowFormModal(false)
            setEditingExpense(null)
          }}
          onSave={saveExpense}
        />
      )}

      {viewingExpense && (
        <ExpenseViewModal expense={viewingExpense} onClose={() => setViewingExpense(null)} />
      )}
    </>
  )
}
