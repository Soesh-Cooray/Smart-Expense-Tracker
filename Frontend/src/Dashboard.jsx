import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
} from 'chart.js'
import { Doughnut, Line, Bar } from 'react-chartjs-2'
import { useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import IncomePage from './components/income/IncomePage'
import './Dashboard.css'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler
)

const API_BASE = 'http://localhost:8080'
const CHART_COLORS = ['#1d4ed8', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#0ea5e9']

const doughnutOptions = {
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` Rs.${ctx.parsed.toLocaleString()}`,
      },
    },
  },
  maintainAspectRatio: false,
}

const lineOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: Rs.${ctx.parsed.y.toLocaleString()}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 12 } } },
    y: {
      grid: { color: '#f3f4f6' },
      border: { display: false },
      ticks: { color: '#9ca3af', font: { size: 12 }, callback: (v) => `Rs.${(v / 1000).toFixed(0)}k` },
    },
  },
  maintainAspectRatio: false,
}

const barOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` Saved: Rs.${ctx.parsed.y.toLocaleString()}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 12 } } },
    y: {
      grid: { color: '#f3f4f6' },
      border: { display: false },
      ticks: { color: '#9ca3af', font: { size: 12 }, callback: (v) => `Rs.${(v / 1000).toFixed(0)}k` },
    },
  },
  maintainAspectRatio: false,
}

function formatMoney(value) {
  return `Rs.${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function toDate(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    const [year, month, day] = value
    return new Date(year, month - 1, day)
  }
  return new Date(value)
}

function formatDate(value) {
  const date = toDate(value)
  if (!date || Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function percent(saved, target) {
  if (!target) return 0
  return Math.min(100, Math.round((saved / target) * 100))
}

function categoryIcon(category) {
  const key = (category || '').toLowerCase()
  if (key.includes('food')) return '🍔'
  if (key.includes('transport')) return '🚗'
  if (key.includes('health')) return '🏥'
  if (key.includes('shop')) return '🛒'
  if (key.includes('entertain')) return '🎬'
  if (key.includes('utility')) return '⚡'
  if (key.includes('housing')) return '🏠'
  return '💸'
}

function KpiCard({ kpi }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-icon">{kpi.icon}</span>
        <span className={`kpi-badge ${kpi.positive ? 'pos' : 'neg'}`}>{kpi.positive ? '↑' : '↓'}</span>
      </div>
      <p className="kpi-label">{kpi.label}</p>
      <h2 className="kpi-value">{kpi.value}</h2>
      <span className={`kpi-change ${kpi.positive ? 'pos' : 'neg'}`}>{kpi.change}</span>
    </div>
  )
}

function GoalCard({ g }) {
  const p = percent(g.savedAmount, g.targetAmount)
  return (
    <div className="goal-card">
      <div className="goal-top">
        <span className="goal-icon">{g.icon || '🎯'}</span>
        <div className="goal-info">
          <h4>{g.name}</h4>
          <span className="goal-deadline">Target date: {formatDate(g.dueDate)}</span>
        </div>
        <span className="goal-pct" style={{ color: g.color || '#1d4ed8' }}>{p}%</span>
      </div>
      <div className="goal-amounts">
        <span>{formatMoney(g.savedAmount)} saved</span>
        <span>{formatMoney(g.targetAmount)} goal</span>
      </div>
      <div className="goal-bar-bg">
        <div className="goal-bar-fill" style={{ width: `${p}%`, background: g.color || '#1d4ed8' }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const location = useLocation()
  const activeNav = new URLSearchParams(location.search).get('tab') || 'overview'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [subscriptions, setSubscriptions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [savingsGoals, setSavingsGoals] = useState([])
  const [totalSubscriptions, setTotalSubscriptions] = useState(0)
  const [loadingData, setLoadingData] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: '',
    billingCycle: 'Monthly',
    startDate: '',
    nextPaymentDate: '',
    status: 'Active',
  })
  const [userId] = useState(() => {
    const storedUserId = localStorage.getItem('userId')
    return storedUserId ? parseInt(storedUserId, 10) : null
  })

  const fetchDashboardData = async () => {
    if (!userId) return
    setLoadingData(true)
    try {
      const [subsRes, expensesRes, goalsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/subscriptions/user/${userId}`),
        axios.get(`${API_BASE}/api/expenses/user/${userId}`),
        axios.get(`${API_BASE}/savings-goals/user/${userId}`),
      ])

      const userSubs = Array.isArray(subsRes.data) ? subsRes.data : []
      const userExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : []
      const userGoals = Array.isArray(goalsRes.data) ? goalsRes.data : []

      setSubscriptions(userSubs)
      setExpenses(userExpenses)
      setSavingsGoals(userGoals)
      setTotalSubscriptions(
        userSubs
          .filter((sub) => (sub.status || '').toLowerCase() === 'active')
          .reduce((sum, sub) => sum + Number(sub.amount || 0), 0)
      )
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setSubscriptions([])
      setExpenses([])
      setSavingsGoals([])
      setTotalSubscriptions(0)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const monthlyExpenses = useMemo(() => {
    const now = new Date()
    return expenses
      .filter((expense) => {
        const expenseDate = toDate(expense.date)
        if (!expenseDate) return false
        return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  }, [expenses])

  const totalGoalTarget = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + Number(goal.targetAmount || 0), 0),
    [savingsGoals]
  )

  const totalGoalSaved = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + Number(goal.savedAmount || 0), 0),
    [savingsGoals]
  )

  const savingsRate = totalGoalTarget > 0 ? Math.round((totalGoalSaved / totalGoalTarget) * 100) : 0

  const kpis = [
    {
      label: 'Total Saved',
      value: formatMoney(totalGoalSaved),
      change: `${savingsGoals.length} goals`,
      positive: true,
      icon: '🏦',
    },
    {
      label: 'Monthly Expenses',
      value: formatMoney(monthlyExpenses),
      change: `${expenses.length} total expenses`,
      positive: false,
      icon: '📉',
    },
    {
      label: 'Active Subscriptions',
      value: formatMoney(totalSubscriptions),
      change: `${subscriptions.filter((s) => (s.status || '').toLowerCase() === 'active').length} active`,
      positive: false,
      icon: '📱',
    },
    {
      label: 'Savings Progress',
      value: `${savingsRate}%`,
      change: `${formatMoney(totalGoalSaved)} of ${formatMoney(totalGoalTarget)}`,
      positive: true,
      icon: '🎯',
    },
  ]

  const categoryTotals = useMemo(() => {
    const totals = {}
    expenses.forEach((expense) => {
      const key = expense.category || 'Other'
      totals[key] = (totals[key] || 0) + Number(expense.amount || 0)
    })
    return totals
  }, [expenses])

  const doughnutData = useMemo(() => {
    const labels = Object.keys(categoryTotals)
    const data = Object.values(categoryTotals)

    if (!labels.length) {
      return {
        labels: ['No expenses'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#cbd5e1'],
            borderColor: '#fff',
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      }
    }

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]),
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    }
  }, [categoryTotals])

  const lineData = useMemo(() => {
    const now = new Date()
    const months = []
    const monthTotals = {}

    for (let i = 5; i >= 0; i -= 1) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
      const label = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      months.push({ key, label })
      monthTotals[key] = 0
    }

    expenses.forEach((expense) => {
      const date = toDate(expense.date)
      if (!date) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (Object.prototype.hasOwnProperty.call(monthTotals, key)) {
        monthTotals[key] += Number(expense.amount || 0)
      }
    })

    return {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: 'Expenses',
          data: months.map((m) => monthTotals[m.key]),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ef4444',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [expenses])

  const barData = useMemo(() => {
    const topGoals = [...savingsGoals]
      .sort((a, b) => Number(b.targetAmount || 0) - Number(a.targetAmount || 0))
      .slice(0, 6)

    return {
      labels: topGoals.map((goal) => goal.name),
      datasets: [
        {
          label: 'Saved Amount',
          data: topGoals.map((goal) => Number(goal.savedAmount || 0)),
          backgroundColor: 'rgba(29,78,216,0.85)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }
  }, [savingsGoals])

  const recentTransactions = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8),
    [expenses]
  )

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) {
      alert('Please log in first.')
      return
    }

    try {
      if (editingId) {
        await axios.put(`${API_BASE}/api/subscriptions/${editingId}`, {
          ...formData,
          userId,
          amount: parseFloat(formData.amount),
        })
      } else {
        await axios.post(`${API_BASE}/api/subscriptions`, {
          ...formData,
          userId,
          amount: parseFloat(formData.amount),
        })
      }

      setFormData({
        name: '',
        category: '',
        amount: '',
        billingCycle: 'Monthly',
        startDate: '',
        nextPaymentDate: '',
        status: 'Active',
      })
      setEditingId(null)
      setShowForm(false)
      fetchDashboardData()
    } catch (error) {
      console.error('Error saving subscription:', error)
      alert('Error saving subscription. Please try again.')
    }
  }

  const handleEdit = (subscription) => {
    setFormData({
      name: subscription.name,
      category: subscription.category,
      amount: subscription.amount,
      billingCycle: subscription.billingCycle,
      startDate: subscription.startDate,
      nextPaymentDate: subscription.nextPaymentDate,
      status: subscription.status,
    })
    setEditingId(subscription.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription?')) return
    try {
      await axios.delete(`${API_BASE}/api/subscriptions/${id}`)
      fetchDashboardData()
    } catch (error) {
      console.error('Error deleting subscription:', error)
      alert('Error deleting subscription. Please try again.')
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      category: '',
      amount: '',
      billingCycle: 'Monthly',
      startDate: '',
      nextPaymentDate: '',
      status: 'Active',
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (activeNav === 'income') {
    return (
      <div className="db-root">
        <Sidebar activeNav={activeNav} onNavChange={() => {}} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="db-main">
          <IncomePage onOpenSidebar={() => setSidebarOpen(true)} />
        </main>
      </div>
    )
  }

  if (activeNav !== 'overview') {
    return (
      <div className="db-root">
        <Sidebar activeNav={activeNav} onNavChange={() => {}} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="db-main">
          <header className="db-header">
            <div className="db-header-left">
              <button className="db-hamburger" type="button" onClick={() => setSidebarOpen(true)}>☰</button>
              <div>
                <h1 className="db-title">{activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}</h1>
                <p className="db-subtitle">This section is under construction.</p>
              </div>
            </div>
          </header>

          <section className="db-card">
            <div className="db-card-header" style={{ marginBottom: 8 }}>
              <h3>Coming Soon</h3>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
              Switch to Income from the sidebar to use the dynamic CRUD page with chart visualization.
            </p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="db-root">
      <Sidebar activeNav={activeNav} onNavChange={() => {}} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="db-main">
        <header className="db-header">
          <div className="db-header-left">
            <button className="db-hamburger" type="button" onClick={() => setSidebarOpen(true)}>☰</button>
            <div>
              <h1 className="db-title">Financial Overview</h1>
              <p className="db-subtitle">{today}</p>
            </div>
          </div>
          <div className="db-header-right">
            <button className="db-icon-btn" type="button" title="Notifications">🔔</button>
          </div>
        </header>

        {!userId && (
          <section className="db-card">
            <p style={{ margin: 0, color: '#ef4444' }}>User not logged in. Please log in first.</p>
          </section>
        )}

        {userId && (
          <>
            <section className="db-kpi-grid">
              {kpis.map((k) => (
                <KpiCard key={k.label} kpi={k} />
              ))}
            </section>

            <section className="db-charts-row">
              <div className="db-card db-chart-card">
                <div className="db-card-header">
                  <h3>Expense Breakdown</h3>
                  <span className="db-card-tag">By category</span>
                </div>
                <div className="db-donut-wrap">
                  <div className="db-donut-chart">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                    <div className="db-donut-center">
                      <strong>{formatMoney(expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}</strong>
                      <span>TOTAL</span>
                    </div>
                  </div>
                  <ul className="db-donut-legend">
                    {doughnutData.labels.map((label, i) => (
                      <li key={label}>
                        <span className="legend-dot" style={{ background: doughnutData.datasets[0].backgroundColor[i] }} />
                        <span className="legend-name">{label}</span>
                        <span className="legend-val">{formatMoney(doughnutData.datasets[0].data[i])}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="db-card db-chart-card">
                <div className="db-card-header">
                  <h3>6-Month Expense Trend</h3>
                </div>
                <div className="db-line-chart">
                  <Line data={lineData} options={lineOptions} />
                </div>
              </div>
            </section>

            <section className="db-mid-row">
              <div className="db-card">
                <div className="db-card-header">
                  <h3>Savings Progress</h3>
                  <span className="db-card-tag db-card-tag-blue">Top goals</span>
                </div>
                <div className="db-bar-chart">
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>

              <div className="db-card db-budget-card">
                <div className="db-card-header">
                  <h3>📱 Active Subscriptions</h3>
                  <button
                    className="db-text-btn"
                    type="button"
                    onClick={() => {
                      if (showForm && !editingId) {
                        setShowForm(false)
                      } else {
                        setEditingId(null)
                        setFormData({
                          name: '',
                          category: '',
                          amount: '',
                          billingCycle: 'Monthly',
                          startDate: '',
                          nextPaymentDate: '',
                          status: 'Active',
                        })
                        setShowForm(true)
                      }
                    }}
                  >
                    {showForm && !editingId ? '✕ Cancel' : '+ Add Subscription'}
                  </button>
                </div>

                {showForm && (
                  <div className="db-sub-form">
                    <form onSubmit={handleSubmit}>
                      <div className="db-form-grid">
                        <input type="text" name="name" placeholder="Subscription Name" value={formData.name} onChange={handleInputChange} required />
                        <input type="text" name="category" placeholder="Category" value={formData.category} onChange={handleInputChange} />
                        <input type="number" name="amount" placeholder="Amount" step="0.01" value={formData.amount} onChange={handleInputChange} required />
                        <select name="billingCycle" value={formData.billingCycle} onChange={handleInputChange}>
                          <option value="Monthly">Monthly</option>
                          <option value="Yearly">Yearly</option>
                          <option value="Weekly">Weekly</option>
                        </select>
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} />
                        <input type="date" name="nextPaymentDate" value={formData.nextPaymentDate} onChange={handleInputChange} />
                        <select name="status" value={formData.status} onChange={handleInputChange}>
                          <option value="Active">Active</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Paused">Paused</option>
                        </select>
                      </div>
                      <div className="db-form-actions">
                        <button type="submit" className="db-btn-submit">{editingId ? '✏️ Update' : '➕ Add'} Subscription</button>
                        <button type="button" className="db-btn-cancel" onClick={handleCancel}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {loadingData ? (
                  <div className="db-loading">
                    <p>⏳ Loading subscriptions...</p>
                  </div>
                ) : subscriptions.length > 0 ? (
                  <>
                    <div className="db-subscriptions-list">
                      {subscriptions.map((sub) => (
                        <div key={sub.id} className="db-subscription-item">
                          <div className="db-sub-left">
                            <div className="db-sub-icon">🔔</div>
                            <div className="db-sub-info">
                              <p className="db-sub-name">{sub.name}</p>
                              <div className="db-sub-meta">
                                <span className="db-sub-category">📂 {sub.category}</span>
                                <span className="db-sub-status">● {sub.status}</span>
                              </div>
                            </div>
                          </div>
                          <div className="db-sub-right">
                            <div className="db-sub-amount">
                              <p className="db-sub-price">{formatMoney(sub.amount)}</p>
                              <span className="db-sub-cycle">📅 {sub.billingCycle}</span>
                            </div>
                            <div className="db-sub-actions">
                              <button className="db-sub-btn db-sub-edit" onClick={() => handleEdit(sub)} title="Edit">✏️</button>
                              <button className="db-sub-btn db-sub-delete" onClick={() => handleDelete(sub.id)} title="Delete">🗑️</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="db-sub-footer">
                      <div className="db-sub-summary">
                        <span>Total {subscriptions.length} Subscriptions</span>
                        <strong className="db-sub-total-amount">{formatMoney(totalSubscriptions)}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="db-empty-state">
                    <p className="db-empty-icon">📭</p>
                    <p className="db-empty-text">No subscriptions found for this user</p>
                    <p className="db-empty-hint">Add subscriptions to track recurring expenses</p>
                  </div>
                )}
              </div>
            </section>

            <section className="db-bot-row">
              <div className="db-card">
                <div className="db-card-header">
                  <h3>Savings Goals</h3>
                </div>
                <div className="db-goals-grid">
                  {savingsGoals.length > 0 ? (
                    savingsGoals.map((goal) => <GoalCard key={goal.id} g={goal} />)
                  ) : (
                    <p style={{ margin: 0, color: '#64748b' }}>No savings goals found for this user.</p>
                  )}
                </div>
              </div>

              <div className="db-card db-tx-card">
                <div className="db-card-header">
                  <h3>Recent Expenses</h3>
                </div>
                <ul className="db-tx-list">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <li key={tx.id} className="db-tx-item">
                        <span className="db-tx-icon">{categoryIcon(tx.category)}</span>
                        <div className="db-tx-info">
                          <span className="db-tx-name">{tx.description || tx.title || 'Expense'}</span>
                          <span className="db-tx-meta">{tx.category || 'Other'} · {formatDate(tx.date)}</span>
                        </div>
                        <span className="db-tx-amount neg">-{formatMoney(tx.amount)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="db-tx-item">
                      <span className="db-tx-meta">No expenses found for this user.</span>
                    </li>
                  )}
                </ul>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}