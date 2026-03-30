import { useState } from 'react'

export default function App() {
  const [budgets, setBudgets] = useState([])
  const [form, setForm] = useState({ category: '', budget: '', spent: '' })
  const [editingId, setEditingId] = useState(null)

  const cardStyle = {
    maxWidth: 900,
    margin: '40px auto',
    padding: 24,
    background: '#ffffff',
    borderRadius: 18,
    boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
  }

  const pageStyle = {
    minHeight: '100vh',
    padding: '40px 16px',
    background: 'linear-gradient(135deg, #f3f9ff 0%, #e8f2ff 100%)',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#0b1a2d',
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid rgba(15, 23, 42, 0.15)',
    borderRadius: 10,
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const buttonStyle = {
    padding: '12px 18px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 15,
  }

  const tableHeaderStyle = {
    background: '#1d4ed8',
    color: 'white',
    textAlign: 'left',
    padding: '12px 14px',
    borderBottom: '2px solid rgba(255,255,255,0.3)',
  }

  const rowStyle = (index) => ({
    background: index % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(243,247,255,0.95)',
  })

  const resetForm = () => {
    setForm({ category: '', budget: '', spent: '' })
    setEditingId(null)
  }

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedCategory = form.category.trim()
    const budgetValue = Number(form.budget)
    const spentValue = Number(form.spent)

    if (!trimmedCategory) return
    if (Number.isNaN(budgetValue) || Number.isNaN(spentValue)) return

    const newEntry = {
      id: editingId ?? Date.now(),
      category: trimmedCategory,
      budget: budgetValue,
      spent: spentValue,
    }

    if (editingId) {
      setBudgets((prev) => prev.map((item) => (item.id === editingId ? newEntry : item)))
    } else {
      setBudgets((prev) => [newEntry, ...prev])
    }

    resetForm()
  }

  const handleEdit = (id) => {
    const entry = budgets.find((item) => item.id === id)
    if (!entry) return
    setForm({
      category: entry.category,
      budget: String(entry.budget),
      spent: String(entry.spent),
    })
    setEditingId(id)
  }

  const handleDelete = (id) => {
    setBudgets((prev) => prev.filter((item) => item.id !== id))
    if (editingId === id) {
      resetForm()
    }
  }

  const computeRemaining = (budget, spent) => {
    const remaining = Number(budget) - Number(spent)
    return Number.isNaN(remaining) ? 0 : remaining
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, marginBottom: 12, fontSize: 28 }}>Budget Management</h1>
        <p style={{ marginTop: 0, marginBottom: 28, color: 'rgba(15, 23, 42, 0.75)' }}>
          Track your budgets by category, update spending, and keep a close eye on what’s left.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#0b1a2d' }}>
              Category
              <input
                type="text"
                value={form.category}
                onChange={handleChange('category')}
                placeholder="e.g. Groceries"
                style={{ ...inputStyle, marginTop: 6 }}
                required
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#0b1a2d' }}>
                Budget Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budget}
                  onChange={handleChange('budget')}
                  placeholder="0.00"
                  style={{ ...inputStyle, marginTop: 6 }}
                  required
                />
              </label>

              <label style={{ fontSize: 14, fontWeight: 600, color: '#0b1a2d' }}>
                Spent Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.spent}
                  onChange={handleChange('spent')}
                  placeholder="0.00"
                  style={{ ...inputStyle, marginTop: 6 }}
                  required
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontWeight: 600 }}>Remaining:</span>
              <span style={{ marginLeft: 6, fontFamily: 'monospace' }}>
                ${computeRemaining(form.budget, form.spent).toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              style={{
                ...buttonStyle,
                background: editingId ? '#f59e0b' : '#10b981',
                color: 'white',
                width: 180,
              }}
            >
              {editingId ? 'Save Changes' : 'Add Budget'}
            </button>
          </div>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Category</th>
                <th style={tableHeaderStyle}>Budget</th>
                <th style={tableHeaderStyle}>Spent</th>
                <th style={tableHeaderStyle}>Remaining</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 18, textAlign: 'center', color: 'rgba(15, 23, 42, 0.7)' }}>
                    No budgets added yet. Use the form above to create one.
                  </td>
                </tr>
              ) : (
                budgets.map((entry, index) => {
                  const remaining = computeRemaining(entry.budget, entry.spent)
                  return (
                    <tr key={entry.id} style={rowStyle(index)}>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>{entry.category}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>${entry.budget.toFixed(2)}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>${entry.spent.toFixed(2)}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
                        <span style={{ fontFamily: 'monospace', color: remaining < 0 ? '#b91c1c' : '#047857' }}>
                          ${remaining.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(entry.id)}
                          style={{
                            ...buttonStyle,
                            background: '#fbbf24',
                            color: '#0b1a2d',
                            marginRight: 10,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          style={{
                            ...buttonStyle,
                            background: '#ef4444',
                            color: 'white',
                          }}
                        >
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
