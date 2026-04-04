import { useState, useEffect } from 'react'

const API = 'http://localhost:8080/api/budget'
const USER_ID = 1

export default function App() {
  const [budgets, setBudgets] = useState([])
  const [form, setForm] = useState({ category: '', budgetAmount: '', monthYear: '' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchBudgets() }, [])

  const fetchBudgets = async () => {
    try {
      const res = await fetch(`${API}/user/${USER_ID}`)
      const data = await res.json()
      setBudgets(data)
    } catch (err) {
      console.error('Failed to fetch budgets:', err)
    }
  }

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
    } catch (err) {
      setError('Something went wrong. Please try again.')
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
    } catch (err) {
      setError('Failed to delete budget.')
    }
  }

  const pageStyle = {
    minHeight: '100vh', padding: '40px 16px',
    background: 'linear-gradient(135deg, #f3f9ff 0%, #e8f2ff 100%)',
    fontFamily: 'system-ui, sans-serif', color: '#0b1a2d',
  }
  const cardStyle = {
    maxWidth: 900, margin: '0 auto', padding: 24,
    background: '#ffffff', borderRadius: 18,
    boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
  }
  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: '1px solid rgba(15,23,42,0.15)',
    borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box',
  }
  const buttonStyle = {
    padding: '12px 18px', borderRadius: 10, border: 'none',
    cursor: 'pointer', fontWeight: 600, fontSize: 15,
  }
  const tableHeaderStyle = {
    background: '#1d4ed8', color: 'white',
    textAlign: 'left', padding: '12px 14px',
    borderBottom: '2px solid rgba(255,255,255,0.3)',
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, marginBottom: 12, fontSize: 28 }}>Budget Management</h1>
        <p style={{ marginTop: 0, marginBottom: 28, color: 'rgba(15,23,42,0.75)' }}>
          Track your budgets by category and keep a close eye on what's left.
        </p>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#d1fae5', color: '#047857', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontWeight: 500 }}>
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 600 }}>
              Category
              <input type="text" value={form.category} onChange={handleChange('category')}
                placeholder="e.g. Groceries" style={{ ...inputStyle, marginTop: 6 }} />
            </label>
            <label style={{ fontSize: 14, fontWeight: 600 }}>
              Budget Amount
              <input type="number" min="0.01" step="0.01" value={form.budgetAmount}
                onChange={handleChange('budgetAmount')} placeholder="0.00"
                style={{ ...inputStyle, marginTop: 6 }} />
            </label>
            <label style={{ fontSize: 14, fontWeight: 600 }}>
              Month
              <input type="month" value={form.monthYear}
                onChange={handleChange('monthYear')}
                style={{ ...inputStyle, marginTop: 6 }} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {editingId && (
              <button type="button" onClick={resetForm}
                style={{ ...buttonStyle, background: '#e5e7eb', color: '#0b1a2d' }}>
                Cancel
              </button>
            )}
            <button type="submit" style={{
              ...buttonStyle,
              background: editingId ? '#f59e0b' : '#10b981',
              color: 'white', width: 180,
            }}>
              {editingId ? 'Save Changes' : 'Add Budget'}
            </button>
          </div>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Category</th>
                <th style={tableHeaderStyle}>Month</th>
                <th style={tableHeaderStyle}>Budget</th>
                <th style={tableHeaderStyle}>Spent</th>
                <th style={tableHeaderStyle}>Remaining</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 18, textAlign: 'center', color: 'rgba(15,23,42,0.7)' }}>
                    No budgets yet. Use the form above to create one.
                  </td>
                </tr>
              ) : (
                budgets.map((entry, index) => {
                  const remaining = (entry.budgetAmount || 0) - (entry.spentAmount || 0)
                  return (
                    <tr key={entry.budgetId} style={{ background: index % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(243,247,255,0.95)' }}>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>{entry.category}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>{entry.monthYear}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>${entry.budgetAmount?.toFixed(2)}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>${(entry.spentAmount || 0).toFixed(2)}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                        <span style={{ fontFamily: 'monospace', color: remaining < 0 ? '#b91c1c' : '#047857' }}>
                          ${remaining.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                        <button type="button" onClick={() => handleEdit(entry)}
                          style={{ ...buttonStyle, background: '#fbbf24', color: '#0b1a2d', marginRight: 10 }}>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(entry.budgetId)}
                          style={{ ...buttonStyle, background: '#ef4444', color: 'white' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}