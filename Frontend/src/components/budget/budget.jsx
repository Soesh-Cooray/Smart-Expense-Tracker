import { useState, useEffect, useCallback, useRef } from 'react'
import '../../Dashboard.css'
import '../income/IncomePage.css'
import './BudgetPage.css'

const BUDGET_API = 'http://localhost:8080/api/budget'
const EXPENSE_API = 'http://localhost:8080/api/expenses'
const CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
]

const EMPTY_FORM = {
  category: '',
  budgetAmount: '',
  cycle: 'MONTHLY',
  startDay: String(new Date().getDate()),
}

function deriveStartDate(startDay) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  const safeDay = Math.max(1, Math.min(Number(startDay || now.getDate()), lastDayOfMonth))
  const d = new Date(year, month, safeDay)
  return d.toISOString().slice(0, 10)
}

function formatMoney(value) {
  return `Rs.${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCycleWindow(start, end) {
  if (!start || !end) return 'Cycle window unavailable'
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
}

function getProgress(spent, budget) {
  const safeBudget = Number(budget || 0)
  if (safeBudget <= 0) return 0
  return Math.min((Number(spent || 0) / safeBudget) * 100, 100)
}

export default function Budget({ onOpenSidebar }) {
  const formSectionRef = useRef(null)
  const [userId, setUserId] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchBudgets = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`${BUDGET_API}/user/${userId}`)
      if (!res.ok) throw new Error('Failed to load budgets')
      const data = await res.json()
      setBudgets(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to fetch budgets:', e)
      setError('Could not load budgets. Check backend server.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchCategories = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`${EXPENSE_API}/user/${userId}/categories`)
      if (!res.ok) throw new Error('Failed to load categories')
      const data = await res.json()
      const values = Array.isArray(data) ? data.filter(Boolean) : []
      setCategories(values)
      setForm((prev) => {
        if (prev.category) return prev
        return { ...prev, category: values[0] || '' }
      })
    } catch (e) {
      console.error('Failed to fetch categories:', e)
      setCategories([])
    }
  }, [userId])

  useEffect(() => {
    const stored = localStorage.getItem('userId')
    if (!stored) {
      setError('User not logged in. Please log in first.')
      setLoading(false)
      return
    }
    setUserId(Number(stored))
  }, [])

  useEffect(() => {
    fetchBudgets()
    fetchCategories()
  }, [fetchBudgets, fetchCategories])

  useEffect(() => {
    if (!userId) return undefined
    const interval = setInterval(() => {
      fetchBudgets()
    }, 45000)
    return () => clearInterval(interval)
  }, [userId, fetchBudgets])

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      category: categories[0] || '',
      startDay: String(new Date().getDate()),
    })
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  const handleChange = (field) => (e) => {
    const value = e.target.value
    setForm((prev) => {
      return { ...prev, [field]: value }
    })
    setError('')
  }

  const validate = () => {
    if (!form.category.trim()) return 'Category cannot be empty'
    if (!form.budgetAmount || Number(form.budgetAmount) <= 0) return 'Budget amount must be greater than 0'
    if (!form.startDay || Number(form.startDay) < 1 || Number(form.startDay) > 31) return 'Start day must be between 1 and 31'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) {
      setError('User not available. Please log in again.')
      return
    }

    setError('')
    setSuccess('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    const payload = {
      userId: userId,
      category: form.category.trim(),
      budgetAmount: Number(form.budgetAmount),
      cycle: form.cycle,
      startDate: deriveStartDate(form.startDay),
      startDay: Number(form.startDay),
    }

    try {
      setIsSubmitting(true)
      const url = editingId ? `${BUDGET_API}/update/${editingId}` : `${BUDGET_API}/create`
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const msg = await res.text(); setError(msg); return }
      setSuccess(editingId ? 'Budget updated!' : 'Budget created!')
      fetchBudgets()
      resetForm()
    } catch (e) {
      setError('Something went wrong. Please try again.')
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (budget) => {
    // Ensure the edited category exists in the dropdown even if it is not in the latest expense category list.
    setCategories((prev) => {
      if (!budget?.category) return prev
      return prev.includes(budget.category) ? prev : [budget.category, ...prev]
    })

    setForm({
      category: budget.category,
      budgetAmount: String(budget.budgetAmount),
      cycle: budget.cycle || 'MONTHLY',
      startDay: String(budget.startDay || 1),
    })
    setEditingId(budget.budgetId)
    setError('')
    setSuccess('')

    // Bring the form into view so users can immediately see they're editing.
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleDelete = async (budgetId) => {
    const confirmed = window.confirm('Delete this budget?')
    if (!confirmed) return

    try {
      await fetch(`${BUDGET_API}/delete/${budgetId}`, { method: 'DELETE' })
      setSuccess('Budget deleted!')
      fetchBudgets()
      if (editingId === budgetId) resetForm()
    } catch (e) {
      setError('Failed to delete budget.')
      console.error(e)
    }
  }

  return (
    <>
      <header className="db-header">
        <div className="db-header-left">
          <button className="db-hamburger" type="button" onClick={onOpenSidebar}>☰</button>
          <div>
            <h1 className="db-title">Budget Management</h1>
            <p className="db-subtitle">Set cycle budgets and track live spending from expenses</p>
          </div>
        </div>

        <div className="db-header-right">
          <button className="db-icon-btn" type="button" title="Notifications">🔔</button>
          <button className="db-add-btn" type="button" onClick={resetForm}>+ Add Budget</button>
        </div>
      </header>

      {error && <div className="inc-error-banner">⚠ {error}</div>}
      {success && <div className="bud-success-banner">{success}</div>}

      <section className="db-card" ref={formSectionRef}>
        <div className="db-card-header">
          <h3>{editingId ? 'Edit Budget' : 'Create Budget'}</h3>
          <span className="db-card-tag">Auto-sync with expenses</span>
        </div>

        <form onSubmit={handleSubmit} className="bud-form-grid">
          <div className="bud-input-grid">
            <label className="inc-form-field">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Category</span>
              <select value={form.category} onChange={handleChange('category')} disabled={categories.length === 0}>
                {categories.length === 0 ? (
                  <option value="">No expense categories yet</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                )}
              </select>
            </label>

            <label className="inc-form-field">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Budget Amount</span>
              <input type="number" min="0.01" step="0.01" value={form.budgetAmount} onChange={handleChange('budgetAmount')} placeholder="0.00" />
            </label>

            <label className="inc-form-field">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Cycle</span>
              <select value={form.cycle} onChange={handleChange('cycle')}>
                {CYCLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="inc-form-field">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Starting Day</span>
              <input type="number" min="1" max="31" value={form.startDay} onChange={handleChange('startDay')} />
            </label>
          </div>

          <div className="bud-actions-row">
            {editingId && (
              <button type="button" className="inc-btn-ghost" onClick={resetForm} disabled={isSubmitting}>Cancel</button>
            )}
            <button type="submit" className="inc-btn-primary bud-submit-btn" disabled={categories.length === 0 || isSubmitting}>
              {isSubmitting && <span className="bud-spinner" aria-hidden="true" />}
              {isSubmitting ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Create Budget')}
            </button>
          </div>

          {categories.length === 0 && (
            <p className="bud-help-text">Add at least one expense record first. Budget categories are pulled from your expense categories.</p>
          )}
        </form>
      </section>

      <section className="db-card">
        <div className="db-card-header">
          <h3>Budget Overview</h3>
          <span className="db-card-tag">Live progress</span>
        </div>

        <div className="inc-table-wrap">
          {loading ? (
            <p className="inc-empty-row">Loading budgets...</p>
          ) : budgets.length === 0 ? (
            <p className="inc-empty-row">No budgets yet. Use the form above to create one.</p>
          ) : (
            <table className="inc-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Cycle</th>
                  <th>Cycle Window</th>
                  <th>Budget</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((entry) => {
                  const budgetAmount = Number(entry.budgetAmount || 0)
                  const spentAmount = Number(entry.spentAmount || 0)
                  const remaining = budgetAmount - spentAmount
                  const progress = getProgress(spentAmount, budgetAmount)
                  return (
                    <tr key={entry.budgetId}>
                      <td>{entry.category}</td>
                      <td>{entry.cycle === 'WEEKLY' ? 'Weekly' : 'Monthly'}</td>
                      <td>{formatCycleWindow(entry.currentCycleStart, entry.currentCycleEnd)}</td>
                      <td className="inc-amount">{formatMoney(budgetAmount)}</td>
                      <td>{formatMoney(spentAmount)}</td>
                      <td>
                        <span className={`bud-remaining ${remaining < 0 ? 'is-negative' : 'is-positive'}`}>
                          {formatMoney(remaining)}
                        </span>
                      </td>
                      <td>
                        <div className="bud-progress-wrap">
                          <div className="bud-progress-track">
                            <div className={`bud-progress-fill ${progress >= 100 ? 'is-over' : ''}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="inc-actions">
                        <button type="button" className="inc-btn-edit" onClick={() => handleEdit(entry)}>Edit</button>
                        <button type="button" className="inc-btn-delete" onClick={() => handleDelete(entry.budgetId)}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  )
}
