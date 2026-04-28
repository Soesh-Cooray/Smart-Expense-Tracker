import { useState, useEffect, useCallback } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import Sidebar from '../Sidebar'
import '../../Dashboard.css'
import './SavingsGoals.css'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const API_BASE = 'http://localhost:8080'

const ICONS = [
  '🎯', '🏡', '🚗', '✈️', '💻', '📱', '🎓', '💍',
  '🏖️', '🛡️', '💰', '🏋️', '🎸', '📚', '🏕️', '👶',
  '🎉', '🐶', '🌴', '💎', '🎮', '🎵', '🚀', '🎨',
]

const COLORS = [
  '#1d4ed8', '#16a34a', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#ef4444', '#f97316',
]

const DEFAULT_FORM = {
  name: '',
  targetAmount: '',
  dueDate: '',
  icon: '🎯',
  color: '#1d4ed8',
}

function pct(saved, target) {
  if (!target) return 0
  return Math.min(100, Math.round((saved / target) * 100))
}

function parseDate(dueDate) {
  if (!dueDate) return null
  if (Array.isArray(dueDate)) {
    const [y, m, d] = dueDate
    return new Date(y, m - 1, d)
  }
  return new Date(dueDate)
}

function getDaysLeft(dueDate) {
  const d = parseDate(dueDate)
  if (!d) return null
  const diff = d - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(dueDate) {
  const d = parseDate(dueDate)
  if (!d) return ''
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtMoney(n) {
  return `Rs.${Number(n).toLocaleString()}`
}

function GoalCard({ goal, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const p = pct(goal.savedAmount, goal.targetAmount)
  const daysLeft = getDaysLeft(goal.dueDate)
  const toGo = Math.max(0, goal.targetAmount - goal.savedAmount)
  const completed = p >= 100

  let urgencyClass = 'ok'
  if (!completed) {
    if (daysLeft !== null && daysLeft <= 0) urgencyClass = 'danger'
    else if (daysLeft !== null && daysLeft < 30) urgencyClass = 'danger'
    else if (daysLeft !== null && daysLeft < 90) urgencyClass = 'warn'
  }

  return (
    <div className="sg-card">
      {confirming ? (
        <div className="sg-confirm-overlay">
          <p>
            Delete <strong>{goal.name}</strong>?<br />
            This cannot be undone.
          </p>
          <div className="sg-confirm-actions">
            <button className="sg-btn-danger-sm" onClick={() => onDelete(goal.id)}>
              Delete
            </button>
            <button className="sg-btn-ghost-sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="sg-card-top">
            <div
              className="sg-icon-bubble"
              style={{
                background: goal.color + '20',
                border: `1.5px solid ${goal.color}50`,
              }}
            >
              {goal.icon}
            </div>
            <div className="sg-card-info">
              <h3 className="sg-card-name">{goal.name}</h3>
              <span className="sg-card-date">Due {formatDate(goal.dueDate)}</span>
            </div>
            <span className="sg-card-pct" style={{ color: goal.color }}>
              {p}%
            </span>
          </div>

          {/* Days remaining badge */}
          {completed ? (
            <div className="sg-days-badge ok">Completed</div>
          ) : daysLeft !== null && (
            <div className={`sg-days-badge ${urgencyClass}`}>
              {daysLeft <= 0
                ? 'Overdue'
                : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
            </div>
          )}

          <div className="sg-progress-bg">
            <div
              className="sg-progress-fill"
              style={{ width: `${p}%`, background: goal.color }}
            />
          </div>

          <div className="sg-card-amounts">
            <span>
              <strong>{fmtMoney(goal.savedAmount)}</strong> saved
            </span>
            <span>{fmtMoney(toGo)} to go</span>
          </div>

          <div className="sg-target-label">Target: {fmtMoney(goal.targetAmount)}</div>

          <div className="sg-card-actions">
            <button className="sg-btn-edit" onClick={() => onEdit(goal)}>
              ✏ Edit
            </button>
            <button className="sg-btn-delete" onClick={() => setConfirming(true)}>
              🗑 Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function GoalModal({ editingGoal, onClose, onSave }) {
  const todayDate = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState(
    editingGoal
      ? {
          name: editingGoal.name,
          targetAmount: editingGoal.targetAmount,
          dueDate: editingGoal.dueDate || '',
          icon: editingGoal.icon,
          color: editingGoal.color,
        }
      : { ...DEFAULT_FORM }
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Goal name is required.'
    if (!form.targetAmount || Number(form.targetAmount) <= 0)
      errs.targetAmount = 'Enter a valid target amount.'
    if (!form.dueDate) errs.dueDate = 'Due date is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSaving(true)
    await onSave({
      name: form.name.trim(),
      targetAmount: Number(form.targetAmount),
      dueDate: form.dueDate,
      icon: form.icon,
      color: form.color,
    })
    setSaving(false)
  }

  return (
    <div className="sg-modal-backdrop" onClick={onClose}>
      <div className="sg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sg-modal-header">
          <h2>{editingGoal ? 'Edit Goal' : 'New Savings Goal'}</h2>
          <button className="sg-modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="sg-modal-body">
            <div
              className="sg-modal-preview"
              style={{
                background: form.color + '12',
                borderColor: form.color + '50',
              }}
            >
              <div
                className="sg-modal-preview-icon"
                style={{ background: form.color + '22' }}
              >
                {form.icon}
              </div>
              <div>
                <div className="sg-modal-preview-name">
                  {form.name || 'Goal name'}
                </div>
                <div className="sg-modal-preview-sub">
                  {form.targetAmount ? fmtMoney(form.targetAmount) : 'Rs.0'} target
                </div>
              </div>
            </div>

            <div className="sg-form-field">
              <label>Goal name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. House Deposit"
                className={errors.name ? 'error' : ''}
                autoFocus
              />
              {errors.name && <span className="sg-field-error">{errors.name}</span>}
            </div>

            {/* Amounts */}
            <div className="sg-form-field">
              <label>Target amount (Rs.)</label>
              <input
                name="targetAmount"
                type="number"
                min="1"
                value={form.targetAmount}
                onChange={handleChange}
                placeholder="30000"
                className={errors.targetAmount ? 'error' : ''}
              />
              {errors.targetAmount && (
                <span className="sg-field-error">{errors.targetAmount}</span>
              )}
            </div>

            <div className="sg-form-field">
              <label>Due date</label>
              <input
                name="dueDate"
                type="date"
                min={todayDate}
                value={form.dueDate}
                onChange={handleChange}
                className={errors.dueDate ? 'error' : ''}
              />
              {errors.dueDate && (
                <span className="sg-field-error">{errors.dueDate}</span>
              )}
            </div>

            <div className="sg-form-field">
              <label>Icon</label>
              <div className="sg-icon-grid">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`sg-icon-btn ${form.icon === icon ? 'selected' : ''}`}
                    style={
                      form.icon === icon
                        ? { borderColor: form.color, background: form.color + '18' }
                        : {}
                    }
                    onClick={() => setForm((p) => ({ ...p, icon }))}
                    title={icon}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="sg-form-field">
              <label>Color</label>
              <div className="sg-color-row">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`sg-color-dot ${form.color === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="sg-modal-footer">
            <button type="button" className="sg-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sg-btn-save" disabled={saving}>
              {saving ? 'Saving…' : editingGoal ? 'Save changes' : 'Add goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SavingsGoals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [userId, setUserId] = useState(null)

  const fetchGoals = useCallback(async (userIdParam) => {
    try {
      const id = userIdParam || localStorage.getItem('userId')
      if (!id) {
        setError('User ID not found. Please log in again.')
        return
      }
      const res = await fetch(`${API_BASE}/savings-goals/user/${id}`)
      if (!res.ok) throw new Error()
      const goalData = await res.json()
      setGoals(goalData)
      setError('')
    } catch {
      setError('Could not connect to the server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      const parsedUserId = parseInt(storedUserId, 10)
      setUserId(parsedUserId)
      fetchGoals(parsedUserId)
    } else {
      setError('User not logged in. Please log in first.')
      setLoading(false)
    }
  }, [fetchGoals])

  async function handleSave(data) {
    try {
      const currentUserId = userId || localStorage.getItem('userId')
      if (!currentUserId) {
        setError('User ID not found. Please log in again.')
        return
      }
      const url = editingGoal
        ? `${API_BASE}/savings-goals/${editingGoal.id}`
        : `${API_BASE}/savings-goals`
      const res = await fetch(url, {
        method: editingGoal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          userId: parseInt(currentUserId),
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save')
      }
      await fetchGoals(currentUserId)
      closeModal()
      setError('')
    } catch (err) {
      setError(`Failed to save goal: ${err.message}`)
    }
  }

  // Transaction handlers - to be implemented when adding transaction UI
  // function handleTransactionInputChange(e) {}
  // async function handleAddTransaction(e) {}
  // function handleEditTransaction(tx) {}
  // async function handleDeleteTransaction(id) {}

  async function handleDelete(id) {
    try {
      await fetch(`${API_BASE}/savings-goals/${id}`, { method: 'DELETE' })
      setGoals((prev) => prev.filter((g) => g.id !== id))
      setError('')
    } catch {
      setError('Failed to delete goal.')
    }
  }

  function openAdd() {
    setEditingGoal(null)
    setShowModal(true)
  }

  function openEdit(goal) {
    setEditingGoal(goal)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingGoal(null)
  }

  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0
  const completedCount = goals.filter((g) => pct(g.savedAmount, g.targetAmount) >= 100).length

  const kpis = [
    { label: 'Total Goals', value: goals.length, icon: '🎯', note: `${completedCount} completed`, pos: true },
    { label: 'Total Saved', value: fmtMoney(totalSaved), icon: '💰', note: 'across all goals', pos: true },
    { label: 'Total Target', value: fmtMoney(totalTarget), icon: '🏆', note: 'combined targets', pos: true },
    { label: 'Overall Progress', value: `${overallPct}%`, icon: '📈', note: 'of total target reached', pos: overallPct > 0 },
  ]

  const hasGoals = goals.length > 0

  const doughnutData = {
    labels: goals.map((g) => g.name),
    datasets: [
      {
        data: goals.map((g) => g.targetAmount),
        backgroundColor: goals.map((g) => g.color),
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 10,
      },
    ],
  }

  const doughnutOptions = {
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const g = goals[ctx.dataIndex]
            const p = pct(g.savedAmount, g.targetAmount)
            return [
              ` Target: ${fmtMoney(g.targetAmount)}`,
              ` Saved:  ${fmtMoney(g.savedAmount)} (${p}%)`,
            ]
          },
        },
      },
    },
    maintainAspectRatio: false,
  }

  const barData = {
    labels: goals.map((g) => g.name),
    datasets: [
      {
        label: 'Progress',
        data: goals.map((g) => pct(g.savedAmount, g.targetAmount)),
        backgroundColor: goals.map((g) => g.color + 'cc'),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  const barOptions = {
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const g = goals[ctx.dataIndex]
            return ` ${pct(g.savedAmount, g.targetAmount)}% — ${fmtMoney(g.savedAmount)} of ${fmtMoney(g.targetAmount)}`
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: { color: '#f3f4f6' },
        border: { display: false },
        ticks: { color: '#9ca3af', font: { size: 12 }, callback: (v) => `${v}%` },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#374151', font: { size: 13, weight: '600' } },
      },
    },
    maintainAspectRatio: false,
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="db-root">
      <Sidebar
        activeNav="goals"
        onNavChange={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="db-main">
        <header className="db-header">
          <div className="db-header-left">
            <button
              className="db-hamburger"
              type="button"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <div>
              <h1 className="db-title">Savings Goals</h1>
              <p className="db-subtitle">{today}</p>
            </div>
          </div>
          <div className="db-header-right">
            <button className="btn-primary db-add-btn" type="button" onClick={openAdd}>
              + Add Goal
            </button>
          </div>
        </header>

        {error && <div className="sg-alert">⚠ {error}</div>}

        <section className="db-kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon">{k.icon}</span>
                <span className={`kpi-badge ${k.pos ? 'pos' : 'neg'}`}>
                  {k.pos ? '↑' : '↓'}
                </span>
              </div>
              <p className="kpi-label">{k.label}</p>
              <h2 className="kpi-value">{k.value}</h2>
              <span className={`kpi-change ${k.pos ? 'pos' : 'neg'}`}>{k.note}</span>
            </div>
          ))}
        </section>

        {hasGoals && (
          <section className="sg-charts-row">
            <div className="db-card sg-chart-card">
              <div className="db-card-header">
                <h3>Goal Distribution</h3>
                <span className="db-card-tag">by target amount</span>
              </div>
              <div className="sg-donut-wrap">
                <div className="sg-donut-chart">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  <div className="db-donut-center">
                    <strong style={{ fontSize: 13 }}>{fmtMoney(totalSaved)}</strong>
                    <span>SAVED</span>
                  </div>
                </div>
                <ul className="db-donut-legend">
                  {goals.map((g) => (
                    <li key={g.id}>
                      <span className="legend-dot" style={{ background: g.color }} />
                      <span className="legend-name">{g.name}</span>
                      <span className="legend-val">
                        {pct(g.savedAmount, g.targetAmount)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="db-card sg-chart-card">
              <div className="db-card-header">
                <h3>Progress by Goal</h3>
                <span className="db-card-tag db-card-tag-blue">% complete</span>
              </div>
              <div
                className="sg-bar-chart"
                style={{ height: Math.max(160, goals.length * 54) }}
              >
                <Bar data={barData} options={barOptions} />
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="db-card-header" style={{ marginBottom: 16 }}>
            <h3 className="sg-section-title">
              {goals.length > 0 ? `All Goals (${goals.length})` : 'Your Goals'}
            </h3>
            {goals.length > 0 && (
              <button className="db-text-btn" onClick={openAdd}>
                + New goal
              </button>
            )}
          </div>

          {loading ? (
            <div className="sg-empty">
              <div className="sg-empty-icon">⏳</div>
              <p>Loading goals…</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="sg-empty">
              <div className="sg-empty-icon">🎯</div>
              <h3>No savings goals yet</h3>
              <p>
                Set your first goal and start tracking your progress towards
                financial freedom.
              </p>
              <button className="sg-btn-primary-lg" onClick={openAdd}>
                + Create your first goal
              </button>
            </div>
          ) : (
            <div className="sg-cards-grid">
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <GoalModal
          editingGoal={editingGoal}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  )
}