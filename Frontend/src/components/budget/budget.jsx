import { useState, useEffect, useCallback } from 'react'
import '../../Dashboard.css'
import '../income/IncomePage.css'

const API = 'http://localhost:8080/api/budget'
const USER_ID = 1

export default function Budget({ onOpenSidebar }) {
  const [budgets, setBudgets] = useState([])
  const [form, setForm] = useState({ category: '', budgetAmount: '', monthYear: '' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch(`${API}/user/${USER_ID}`)
      const data = await res.json()
      setBudgets(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to fetch budgets:', e)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      fetchBudgets()
    }, 0)
    return () => clearTimeout(id)
  }, [fetchBudgets])

  const resetForm = () => {
    setForm({ category: '', budgetAmount: '', monthYear: '' })
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const validate = () => {
    if (!form.category.trim()) return 'Category cannot be empty'
    if (!form.budgetAmount || Number(form.budgetAmount) <= 0) return 'Budget amount must be greater than 0'
    if (!form.monthYear) return 'Please select a month'
    if (!editingId) {
      const selected = new Date(form.monthYear + '-01')
      const now = new Date()
      now.setDate(1)
      now.setHours(0, 0, 0, 0)
      if (selected < now) return 'Month cannot be in the past'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    const payload = {
      userId: USER_ID,
      category: form.category.trim(),
      budgetAmount: Number(form.budgetAmount),
      monthYear: form.monthYear,
    }

    try {
      const url = editingId ? `${API}/update/${editingId}` : `${API}/create`
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
    }
  }

  const handleEdit = (budget) => {
    setForm({
      category: budget.category,
      budgetAmount: String(budget.budgetAmount),
      monthYear: budget.monthYear || '',
    })
    setEditingId(budget.budgetId)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (budgetId) => {
    try {
      await fetch(`${API}/delete/${budgetId}`, { method: 'DELETE' })
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
            <p className="db-subtitle">Manage monthly budgets by category</p>
          </div>
        </div>

        <div className="db-header-right">
          <button className="db-icon-btn" type="button" title="Notifications">🔔</button>
          <button className="db-add-btn" type="button" onClick={() => { setEditingId(null); setForm({ category: '', budgetAmount: '', monthYear: '' }); }}>+ Add Budget</button>
        </div>
      </header>

      {error && <div className="inc-error-banner">⚠ {error}</div>}
      {success && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: '#d1fae5', color: '#047857', fontWeight: 600 }}>{success}</div>}

      <section className="db-card">
        <div className="db-card-header">
          <h3>Create / Edit Budget</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label className="inc-form-field">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Category</span>
              <input type="text" value={form.category} onChange={handleChange('category')} placeholder="e.g. Groceries" />
            </label>

            <label className="inc-form-field">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Budget Amount</span>
              <input type="number" min="0.01" step="0.01" value={form.budgetAmount} onChange={handleChange('budgetAmount')} placeholder="0.00" />
            </label>

            <label className="inc-form-field">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Month</span>
              <input type="month" value={form.monthYear} onChange={handleChange('monthYear')} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {editingId && (
              <button type="button" className="inc-btn-ghost" onClick={resetForm}>Cancel</button>
            )}
            <button type="submit" className="inc-btn-primary">{editingId ? 'Save Changes' : 'Add Budget'}</button>
          </div>
        </form>
      </section>

      <section className="db-card">
        <div className="db-card-header">
          <h3>Budgets</h3>
          <span className="db-card-tag">Overview</span>
        </div>

        <div className="inc-table-wrap">
          {budgets.length === 0 ? (
            <p className="inc-empty-row">No budgets yet. Use the form above to create one.</p>
          ) : (
            <table className="inc-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Month</th>
                  <th>Budget</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((entry) => {
                  const remaining = (entry.budgetAmount || 0) - (entry.spentAmount || 0)
                  return (
                    <tr key={entry.budgetId}>
                      <td>{entry.category}</td>
                      <td>{entry.monthYear}</td>
                      <td className="inc-amount">{Number(entry.budgetAmount || 0).toFixed(2)}</td>
                      <td>{Number(entry.spentAmount || 0).toFixed(2)}</td>
                      <td><span style={{ fontFamily: 'monospace', color: remaining < 0 ? '#b91c1c' : '#047857' }}>{remaining.toFixed(2)}</span></td>
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
