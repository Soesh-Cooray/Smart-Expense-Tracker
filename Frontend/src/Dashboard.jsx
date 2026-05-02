import { useCallback, useEffect, useMemo, useState } from 'react'
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

function transactionIcon(type, category) {
  if (type === 'income') return '💰'
  if (type === 'savings') return '🎯'
  return categoryIcon(category)
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
  const [expenseBreakdownRange, setExpenseBreakdownRange] = useState('all')
  const [incomeBreakdownRange, setIncomeBreakdownRange] = useState('all')
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [savingsTransactions, setSavingsTransactions] = useState([])
  const [savingsGoals, setSavingsGoals] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [userId] = useState(() => {
    const storedUserId = localStorage.getItem('userId')
    return storedUserId ? parseInt(storedUserId, 10) : null
  })

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return
    try {
      const [expensesRes, goalsRes, incomesRes, savingsTxRes, subsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/expenses/user/${userId}`),
        axios.get(`${API_BASE}/savings-goals/user/${userId}`),
        axios.get(`${API_BASE}/api/income/user/${userId}`),
        axios.get(`${API_BASE}/savings-transactions/user/${userId}`),
        axios.get(`${API_BASE}/api/subscriptions/user/${userId}`),
      ])

      const userExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : []
      const userGoals = Array.isArray(goalsRes.data) ? goalsRes.data : []
      const userIncomes = Array.isArray(incomesRes.data) ? incomesRes.data : []
      const userSavingsTransactions = Array.isArray(savingsTxRes.data) ? savingsTxRes.data : []
      const userSubs = Array.isArray(subsRes.data) ? subsRes.data : []

      setExpenses(userExpenses)
      setSavingsGoals(userGoals)
      setIncomes(userIncomes)
      setSavingsTransactions(userSavingsTransactions)
      setSubscriptions(userSubs)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setExpenses([])
      setIncomes([])
      setSavingsTransactions([])
      setSavingsGoals([])
      setSubscriptions([])
    }
  }, [userId])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

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

  const monthlyExpenseCount = useMemo(() => {
    const now = new Date()
    return expenses.filter((expense) => {
      const expenseDate = toDate(expense.date)
      if (!expenseDate) return false
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
    }).length
  }, [expenses])

  const totalGoalSaved = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + Number(goal.savedAmount || 0), 0),
    [savingsGoals]
  )

  const monthlyIncome = useMemo(() => {
    const now = new Date()
    return incomes
      .filter((income) => {
        const incomeDate = toDate(income.date)
        if (!incomeDate) return false
        return incomeDate.getMonth() === now.getMonth() && incomeDate.getFullYear() === now.getFullYear()
      })
      .reduce((sum, income) => sum + Number(income.amount || 0), 0)
  }, [incomes])

  const monthlyIncomeCount = useMemo(() => {
    const now = new Date()
    return incomes.filter((income) => {
      const incomeDate = toDate(income.date)
      if (!incomeDate) return false
      return incomeDate.getMonth() === now.getMonth() && incomeDate.getFullYear() === now.getFullYear()
    }).length
  }, [incomes])

  const totalSubscriptions = useMemo(() => {
    return subscriptions
      .filter((s) => (s.status || '').toLowerCase() === 'active')
      .reduce((sum, s) => sum + Number(s.amount || 0), 0)
  }, [subscriptions])

  const kpis = [
    {
      label: 'Monthly Income',
      value: formatMoney(monthlyIncome),
      change: `${monthlyIncomeCount} monthly income record${monthlyIncomeCount === 1 ? '' : 's'}`,
      positive: true,
      icon: '💰',
    },
    {
      label: 'Monthly Expenses',
      value: formatMoney(monthlyExpenses),
      change: `${monthlyExpenseCount} monthly expense record${monthlyExpenseCount === 1 ? '' : 's'}`,
      positive: false,
      icon: '📉',
    },
    {
      label: 'Total Saved',
      value: formatMoney(totalGoalSaved),
      change: `${savingsGoals.length} goals`,
      positive: true,
      icon: '🏦',
    },
    {
      label: 'Active Subscriptions',
      value: formatMoney(totalSubscriptions),
      change: `${subscriptions.filter((s) => (s.status || '').toLowerCase() === 'active').length} active`,
      positive: false,
      icon: '📱',
    },
  ]

  const expenseBreakdownRecords = useMemo(() => {
    if (expenseBreakdownRange === 'all') return expenses
    const now = new Date()
    return expenses.filter((expense) => {
      const expenseDate = toDate(expense.date)
      if (!expenseDate) return false
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
    })
  }, [expenses, expenseBreakdownRange])

  const incomeBreakdownRecords = useMemo(() => {
    if (incomeBreakdownRange === 'all') return incomes
    const now = new Date()
    return incomes.filter((income) => {
      const incomeDate = toDate(income.date)
      if (!incomeDate) return false
      return incomeDate.getMonth() === now.getMonth() && incomeDate.getFullYear() === now.getFullYear()
    })
  }, [incomes, incomeBreakdownRange])

  const expenseBreakdownTotal = useMemo(
    () => expenseBreakdownRecords.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenseBreakdownRecords]
  )

  const incomeBreakdownTotal = useMemo(
    () => incomeBreakdownRecords.reduce((sum, i) => sum + Number(i.amount || 0), 0),
    [incomeBreakdownRecords]
  )

  const categoryTotals = useMemo(() => {
    const totals = {}
    expenseBreakdownRecords.forEach((expense) => {
      const key = expense.category || 'Other'
      totals[key] = (totals[key] || 0) + Number(expense.amount || 0)
    })
    return totals
  }, [expenseBreakdownRecords])

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

  const incomeCategoryTotals = useMemo(() => {
    const totals = {}
    incomeBreakdownRecords.forEach((income) => {
      const key = income.category || 'Other'
      totals[key] = (totals[key] || 0) + Number(income.amount || 0)
    })
    return totals
  }, [incomeBreakdownRecords])

  const incomeDoughnutData = useMemo(() => {
    const labels = Object.keys(incomeCategoryTotals)
    const data = Object.values(incomeCategoryTotals)

    if (!labels.length) {
      return {
        labels: ['No income'],
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
  }, [incomeCategoryTotals])

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

  const incomeLineData = useMemo(() => {
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

    incomes.forEach((income) => {
      const date = toDate(income.date)
      if (!date) {
        console.warn('Invalid income date:', income.date)
        return
      }
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (Object.prototype.hasOwnProperty.call(monthTotals, key)) {
        monthTotals[key] += Number(income.amount || 0)
      }
    })

    console.log('Income trend data:', { months: months.map(m => m.label), totals: months.map((m) => monthTotals[m.key]) })

    return {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: 'Income',
          data: months.map((m) => monthTotals[m.key]),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#16a34a',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [incomes])

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
          backgroundColor: topGoals.map((goal, idx) => goal.color || CHART_COLORS[idx % CHART_COLORS.length]),
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }
  }, [savingsGoals])

  const goalNameById = useMemo(
    () => Object.fromEntries(savingsGoals.map((goal) => [goal.id, goal.name])),
    [savingsGoals]
  )

  const recentTransactions = useMemo(() => {
    const expenseTx = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      type: 'expense',
      date: expense.date,
      amount: Number(expense.amount || 0),
      name: expense.description || expense.title || 'Expense',
      detail: expense.category || 'Other',
      category: expense.category,
    }))

    const incomeTx = incomes.map((income) => ({
      id: `income-${income.id}`,
      type: 'income',
      date: income.date,
      amount: Number(income.amount || 0),
      name: income.title || income.description || 'Income',
      detail: income.category || 'Other',
      category: income.category,
    }))

    const savingsTx = savingsTransactions.map((tx) => ({
      id: `savings-${tx.id}`,
      type: 'savings',
      date: tx.date,
      amount: Number(tx.amount || 0),
      name: 'Savings',
      detail: goalNameById[tx.savingsGoalId] || 'Goal',
      category: 'Savings',
    }))

    return [...expenseTx, ...incomeTx, ...savingsTx]
      .sort((a, b) => {
        const dateA = toDate(a.date)
        const dateB = toDate(b.date)
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0)
      })
      .slice(0, 5)
  }, [expenses, incomes, savingsTransactions, goalNameById])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })



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
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="db-text-btn"
                      onClick={() => setExpenseBreakdownRange((prev) => (prev === 'all' ? 'month' : 'all'))}
                    >
                      {expenseBreakdownRange === 'all' ? 'Current Month' : 'All Time'}
                    </button>
                    <span className="db-card-tag">{expenseBreakdownRange === 'all' ? 'All time' : 'Current month'}</span>
                  </div>
                </div>
                <div className="db-donut-wrap">
                  <div className="db-donut-chart">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                    <div className="db-donut-center">
                      <strong>{formatMoney(expenseBreakdownTotal)}</strong>
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

            <section className="db-charts-row">
              <div className="db-card db-chart-card">
                <div className="db-card-header">
                  <h3>Income Breakdown</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="db-text-btn"
                      onClick={() => setIncomeBreakdownRange((prev) => (prev === 'all' ? 'month' : 'all'))}
                    >
                      {incomeBreakdownRange === 'all' ? 'Current Month' : 'All Time'}
                    </button>
                    <span className="db-card-tag">{incomeBreakdownRange === 'all' ? 'All time' : 'Current month'}</span>
                  </div>
                </div>
                <div className="db-donut-wrap">
                  <div className="db-donut-chart">
                    <Doughnut data={incomeDoughnutData} options={doughnutOptions} />
                    <div className="db-donut-center">
                      <strong>{formatMoney(incomeBreakdownTotal)}</strong>
                      <span>TOTAL</span>
                    </div>
                  </div>
                  <ul className="db-donut-legend">
                    {incomeDoughnutData.labels.map((label, i) => (
                      <li key={label}>
                        <span className="legend-dot" style={{ background: incomeDoughnutData.datasets[0].backgroundColor[i] }} />
                        <span className="legend-name">{label}</span>
                        <span className="legend-val">{formatMoney(incomeDoughnutData.datasets[0].data[i])}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="db-card db-chart-card">
                <div className="db-card-header">
                  <h3>6-Month Income Trend</h3>
                </div>
                <div className="db-line-chart">
                  <Line data={incomeLineData} options={lineOptions} />
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
                  <h3>Recent Transactions</h3>
                </div>
                <ul className="db-tx-list">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <li key={tx.id} className="db-tx-item">
                        <span className="db-tx-icon">{transactionIcon(tx.type, tx.category)}</span>
                        <div className="db-tx-info">
                          <span className="db-tx-name">{tx.name}</span>
                          <span className="db-tx-meta">{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} · {tx.detail} · {formatDate(tx.date)}</span>
                        </div>
                        <span className={`db-tx-amount ${tx.type === 'expense' ? 'neg' : tx.type === 'income' ? 'pos' : 'neutral'}`}>
                          {tx.type === 'expense' ? '-' : '+'}{formatMoney(tx.amount)}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="db-tx-item">
                      <span className="db-tx-meta">No recent transactions found for this user.</span>
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