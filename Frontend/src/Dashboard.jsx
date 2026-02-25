import { useState } from 'react'
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
import Sidebar from './components/Sidebar'
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

// ── static mock data ────────────────────────────────────────────────────────

const kpis = [
  { label: 'Total Balance', value: 'Rs.24,830', change: '+Rs.1,240', positive: true, icon: '💳' },
  { label: 'Monthly Income', value: 'Rs.7,500', change: '+Rs.500 vs last month', positive: true, icon: '📈' },
  { label: 'Monthly Expenses', value: 'Rs.4,320', change: '-Rs.210 vs last month', positive: true, icon: '📉' },
  { label: 'Savings Rate', value: '42%', change: '+3% vs last month', positive: true, icon: '🏦' },
]

const transactions = [
  { id: 1, name: 'Salary Deposit', category: 'Income', date: 'Feb 25', amount: '+Rs.7,500', positive: true, icon: '💰' },
  { id: 2, name: 'Monthly Rent', category: 'Housing', date: 'Feb 24', amount: '-Rs.1,500', positive: false, icon: '🏠' },
  { id: 3, name: 'Grocery Store', category: 'Food', date: 'Feb 23', amount: '-Rs.245', positive: false, icon: '🛒' },
  { id: 4, name: 'Netflix', category: 'Entertainment', date: 'Feb 22', amount: '-Rs.18', positive: false, icon: '🎬' },
  { id: 5, name: 'Freelance Payment', category: 'Income', date: 'Feb 21', amount: '+Rs.850', positive: true, icon: '💼' },
  { id: 6, name: 'Electricity Bill', category: 'Utilities', date: 'Feb 20', amount: '-Rs.85', positive: false, icon: '⚡' },
  { id: 7, name: 'Gym Membership', category: 'Health', date: 'Feb 19', amount: '-Rs.55', positive: false, icon: '🏋️' },
  { id: 8, name: 'Uber Ride', category: 'Transport', date: 'Feb 18', amount: '-Rs.24', positive: false, icon: '🚗' },
]

const budgets = [
  { category: 'Housing', spent: 1500, limit: 1800, color: '#1d4ed8' },
  { category: 'Food & Dining', spent: 620, limit: 800, color: '#16a34a' },
  { category: 'Transport', spent: 310, limit: 400, color: '#f59e0b' },
  { category: 'Entertainment', spent: 180, limit: 200, color: '#8b5cf6' },
  { category: 'Health & Fitness', spent: 155, limit: 250, color: '#ec4899' },
  { category: 'Utilities', spent: 210, limit: 300, color: '#06b6d4' },
]

const savingsGoals = [
  { name: 'House Deposit', saved: 18500, goal: 30000, icon: '🏡', color: '#1d4ed8', deadline: 'Dec 2026' },
  { name: 'Emergency Fund', saved: 4200, goal: 5000, icon: '🛡️', color: '#16a34a', deadline: 'Jun 2025' },
  { name: 'New Laptop', saved: 650, goal: 1200, icon: '💻', color: '#8b5cf6', deadline: 'Aug 2025' },
  { name: 'Vacation Fund', saved: 920, goal: 3500, icon: '✈️', color: '#f59e0b', deadline: 'Nov 2025' },
]

// ── chart configs ────────────────────────────────────────────────────────────

const doughnutData = {
  labels: ['Housing', 'Food', 'Transport', 'Entertainment', 'Health', 'Utilities'],
  datasets: [
    {
      data: [1500, 620, 310, 180, 155, 210],
      backgroundColor: ['#1d4ed8', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
      borderColor: '#fff',
      borderWidth: 3,
      hoverOffset: 6,
    },
  ],
}

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

const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']

const lineData = {
  labels: months,
  datasets: [
    {
      label: 'Income',
      data: [6800, 7000, 7200, 7000, 7500, 7500],
      borderColor: '#16a34a',
      backgroundColor: 'rgba(22,163,74,0.08)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#16a34a',
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: 'Expenses',
      data: [4900, 4600, 5100, 4400, 4530, 4320],
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239,68,68,0.07)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#ef4444',
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
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

const barData = {
  labels: months,
  datasets: [
    {
      label: 'Savings',
      data: [1900, 2400, 2100, 2600, 2970, 3180],
      backgroundColor: 'rgba(29,78,216,0.85)',
      borderRadius: 6,
      borderSkipped: false,
    },
  ],
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

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(spent, limit) {
  return Math.min(100, Math.round((spent / limit) * 100))
}

function budgetStatus(p) {
  if (p >= 90) return 'danger'
  if (p >= 75) return 'warn'
  return 'ok'
}

// ── sub-components ───────────────────────────────────────────────────────────

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

function BudgetRow({ b }) {
  const p = pct(b.spent, b.limit)
  const status = budgetStatus(p)
  return (
    <div className="budget-row">
      <div className="budget-meta">
        <div className="budget-dot" style={{ background: b.color }} />
        <span className="budget-name">{b.category}</span>
        <span className="budget-amounts">
          <b>Rs.{b.spent.toLocaleString()}</b> / Rs.{b.limit.toLocaleString()}
        </span>
      </div>
      <div className="budget-bar-bg">
        <div
          className={`budget-bar-fill status-${status}`}
          style={{ width: `${p}%`, background: status === 'ok' ? b.color : undefined }}
        />
      </div>
      <span className="budget-pct">{p}%</span>
    </div>
  )
}

function GoalCard({ g }) {
  const p = pct(g.saved, g.goal)
  return (
    <div className="goal-card">
      <div className="goal-top">
        <span className="goal-icon">{g.icon}</span>
        <div className="goal-info">
          <h4>{g.name}</h4>
          <span className="goal-deadline">Target: {g.deadline}</span>
        </div>
        <span className="goal-pct" style={{ color: g.color }}>{p}%</span>
      </div>
      <div className="goal-amounts">
        <span>Rs.{g.saved.toLocaleString()} saved</span>
        <span>Rs.{g.goal.toLocaleString()} goal</span>
      </div>
      <div className="goal-bar-bg">
        <div className="goal-bar-fill" style={{ width: `${p}%`, background: g.color }} />
      </div>
    </div>
  )
}

// ── main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const categoryColors = ['#1d4ed8', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
  const categoryLabels = doughnutData.labels

  return (
    <div className="db-root">
      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main area ── */}
      <main className="db-main">
        {/* Top header */}
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
            <button className="btn-primary db-add-btn" type="button">+ Add Transaction</button>
          </div>
        </header>

        {/* KPI cards */}
        <section className="db-kpi-grid">
          {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
        </section>

        {/* Charts row */}
        <section className="db-charts-row">
          {/* Doughnut – expense breakdown */}
          <div className="db-card db-chart-card">
            <div className="db-card-header">
              <h3>Expense Breakdown</h3>
              <span className="db-card-tag">Feb 2025</span>
            </div>
            <div className="db-donut-wrap">
              <div className="db-donut-chart">
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div className="db-donut-center">
                  <strong>Rs.2,975</strong>
                  <span>TOTAL</span>
                </div>
              </div>
              <ul className="db-donut-legend">
                {categoryLabels.map((label, i) => (
                  <li key={label}>
                    <span className="legend-dot" style={{ background: categoryColors[i] }} />
                    <span className="legend-name">{label}</span>
                    <span className="legend-val">Rs.{doughnutData.datasets[0].data[i].toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Line – income vs expenses */}
          <div className="db-card db-chart-card">
            <div className="db-card-header">
              <h3>Income vs Expenses</h3>
              <div className="db-chart-legend">
                <span><span className="legend-dot" style={{ background: '#16a34a' }} />Income</span>
                <span><span className="legend-dot" style={{ background: '#ef4444' }} />Expenses</span>
              </div>
            </div>
            <div className="db-line-chart">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>
        </section>

        {/* Savings bar + budget row */}
        <section className="db-mid-row">
          {/* Monthly savings bar chart */}
          <div className="db-card">
            <div className="db-card-header">
              <h3>Monthly Savings</h3>
              <span className="db-card-tag db-card-tag-blue">6-month trend</span>
            </div>
            <div className="db-bar-chart">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>

          {/* Budget tracker */}
          <div className="db-card db-budget-card">
            <div className="db-card-header">
              <h3>Budget Tracker</h3>
              <span className="db-card-tag">Feb 2025</span>
            </div>
            <div className="db-budget-list">
              {budgets.map((b) => <BudgetRow key={b.category} b={b} />)}
            </div>
          </div>
        </section>

        {/* Savings goals + recent transactions row */}
        <section className="db-bot-row">
          {/* Savings goals */}
          <div className="db-card">
            <div className="db-card-header">
              <h3>Savings Goals</h3>
              <button className="db-text-btn" type="button">+ New Goal</button>
            </div>
            <div className="db-goals-grid">
              {savingsGoals.map((g) => <GoalCard key={g.name} g={g} />)}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="db-card db-tx-card">
            <div className="db-card-header">
              <h3>Recent Transactions</h3>
              <button className="db-text-btn" type="button">View all</button>
            </div>
            <ul className="db-tx-list">
              {transactions.map((tx) => (
                <li key={tx.id} className="db-tx-item">
                  <span className="db-tx-icon">{tx.icon}</span>
                  <div className="db-tx-info">
                    <span className="db-tx-name">{tx.name}</span>
                    <span className="db-tx-meta">{tx.category} · {tx.date}</span>
                  </div>
                  <span className={`db-tx-amount ${tx.positive ? 'pos' : 'neg'}`}>{tx.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
