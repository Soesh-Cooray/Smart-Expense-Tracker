import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Bar,
  BarChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import '../../Dashboard.css'
import './AIAnalysisPage.css'

const API_BASE = 'http://localhost:8080'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(value) {
  return `Rs.${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function formatMonthLabel(dateText) {
  if (!dateText) return 'N/A'
  const normalized = /^\d{4}-\d{2}$/.test(dateText) ? `${dateText}-01` : dateText
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getTrendWindowEnd(point) {
  return point?.windowEnd ?? point?.window_end ?? point?.windowStart ?? point?.window_start ?? null
}

function getRiskScore(probability) {
  return Number(probability || 0) * 100
}

function getScoreTone(score) {
  if (score < 40) return 'good'
  if (score < 60) return 'warn'
  return 'danger'
}

function getRiskInfo(riskLevel, isOverspender) {
  if (!isOverspender) return { tone: 'low', label: 'Stable Spending' }
  const level = (riskLevel || '').toLowerCase()
  if (level === 'high') return { tone: 'high', label: 'High Risk' }
  if (level === 'moderate') return { tone: 'moderate', label: 'Moderate Risk' }
  return { tone: 'low', label: 'Low Risk' }
}

function getRiskScoreLabel(score) {
  if (score < 20) return 'Very Low — well within budget'
  if (score < 40) return 'Low — some signals present but overall healthy'
  if (score < 60) return 'Moderate — clear overspending patterns detected'
  if (score < 80) return 'High — strong overspending signals across multiple areas'
  return 'Very High — extreme overspending behaviour detected'
}

function getForecastMonth(point) {
  return point?.yearMonth ?? point?.year_month ?? null
}

function getForecastAmount(point) {
  return Number(point?.predictedAmount ?? point?.predicted_amount ?? 0)
}

const FORECAST_CATEGORIES = [
  'food',
  'travel',
  'health',
  'utilities',
  'rent',
  'entertainment',
  'education',
  'misc',
  'others',
]

// ── Dot renderer — colour based on threshold ──────────────────────────────────
function RiskDot({ cx, cy, payload }) {
  if (cx == null || cy == null || !payload) return null
  const isOver = Number(payload.score || 0) > 40
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={isOver ? '#dc2626' : '#16a34a'}
      stroke="#fff"
      strokeWidth={2}
    />
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  const score = Number(point.score || 0)
  const isOver = score > 40

  return (
    <div className="ai-tooltip-box">
      <p className="ai-tooltip-title">{point.displayPeriod}</p>
      <p className="ai-tooltip-line">
        <span className="ai-tooltip-key">Risk Score: </span>
        <span className={`ai-tooltip-score ${isOver ? 'ai-tooltip-score--over' : 'ai-tooltip-score--under'}`}>
          {score.toFixed(1)}%
        </span>
      </p>
      <p className="ai-tooltip-line">
        <span className="ai-tooltip-key">Risk Level: </span>
        {point.risk_level || point.riskLevel || 'Unknown'}
      </p>
      <p className="ai-tooltip-line">
        <span className="ai-tooltip-key">Top Category: </span>
        {point.top_expense_category || point.topExpenseCategory || 'unknown'}
      </p>
    </div>
  )
}

function ForecastTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="ai-tooltip-box">
      <p className="ai-tooltip-title">{point.displayMonth}</p>
      <p className="ai-tooltip-line">
        <span className="ai-tooltip-key">Predicted Amount: </span>
        <span className="ai-tooltip-score ai-tooltip-score--forecast">
          {formatMoney(point.amount)}
        </span>
      </p>
      <p className="ai-tooltip-line">
        <span className="ai-tooltip-key">Step: </span>
        {point.step}
      </p>
    </div>
  )
}

// ── Tips accordion ────────────────────────────────────────────────────────────
const TIPS = [
  {
    id: 'income',
    title: 'Log all income transactions',
    body: 'If income transactions are missing, the model cannot accurately assess your cashflow. Make sure salary, freelance, and investment income are all recorded.',
  },
  {
    id: 'categories',
    title: 'Categorise every transaction',
    body: 'Uncategorised transactions reduce prediction accuracy. Assign categories like food, rent, travel, and health to get more meaningful insights.',
  },
  {
    id: 'history',
    title: 'Build 6+ months of history',
    body: 'The model compares your current spending to your personal historical baseline. More history means a more personalised and accurate prediction.',
  },
  {
    id: 'monthly',
    title: 'Check back monthly',
    body: 'Your analysis updates as new transactions are added. Revisit this page monthly to track whether your spending habits are improving or worsening over time.',
  },
]

function TipsAccordion() {
  const [openId, setOpenId] = useState(null)
  return (
    <section className="db-card">
      <div className="db-card-header">
        <h3>How to get more from this feature</h3>
      </div>
      <div className="ai-tips-list">
        {TIPS.map((tip) => {
          const isOpen = openId === tip.id
          return (
            <div key={tip.id} className="ai-tip-row">
              <button
                type="button"
                className="ai-tip-trigger"
                onClick={() => setOpenId(isOpen ? null : tip.id)}
                aria-expanded={isOpen}
              >
                <span>{tip.title}</span>
                <span className={`ai-tip-chevron${isOpen ? ' ai-tip-chevron--open' : ''}`}>▾</span>
              </button>
              {isOpen && <p className="ai-tip-body">{tip.body}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AIAnalysisPage({ onOpenSidebar }) {
  const [prediction, setPrediction]                   = useState(null)
  const [trend, setTrend]                             = useState([])
  const [trendAvailable, setTrendAvailable]           = useState(false)
  const [trendMessage, setTrendMessage]               = useState('')
  const [forecastCategory, setForecastCategory]       = useState('food')
  const [forecastMonthsAhead, setForecastMonthsAhead] = useState(3)
  const [forecastResult, setForecastResult]           = useState(null)
  const [forecastLoading, setForecastLoading]         = useState(false)
  const [forecastError, setForecastError]             = useState('')
  const [windowOptions, setWindowOptions]             = useState([])
  const [selectedWindowStart, setSelectedWindowStart] = useState('')
  const [loading, setLoading]                         = useState(true)
  const [error, setError]                             = useState('')
  const [scoreHelpOpen, setScoreHelpOpen]             = useState(false)

  const userId = useMemo(() => {
    const stored = localStorage.getItem('userId')
    return stored ? parseInt(stored, 10) : null
  }, [])

  const loadAnalysis = useCallback(async (windowStartMonth) => {
    const resolved = windowStartMonth || selectedWindowStart
    setLoading(true)
    setError('')
    try {
      const [predRes, trendRes] = await Promise.all([
        fetch(`${API_BASE}/api/prediction/overspending/user/${userId}?windowStartMonth=${encodeURIComponent(resolved)}`),
        fetch(`${API_BASE}/api/prediction/overspending/user/${userId}/trend`),
      ])

      const predData = await predRes.json().catch(() => ({}))
      if (!predRes.ok) throw new Error(predData.message || 'Failed to fetch AI analysis.')
      setPrediction(predData)

      const trendData = await trendRes.json().catch(() => ({}))
      if (trendRes.ok) {
        const list = Array.isArray(trendData.trend) ? trendData.trend : []
        setTrend(list)
        setTrendAvailable(Boolean(trendData.trendAvailable && list.length > 0))
        setTrendMessage(trendData.message || '')
      } else {
        setTrend([])
        setTrendAvailable(false)
        setTrendMessage(trendData.message || 'Trend analysis available after 3 months of transaction data.')
      }
    } catch (err) {
      console.error('AI analysis error:', err)
      setError(err.message || 'Failed to load AI analysis.')
      setPrediction(null)
      setTrend([])
      setTrendAvailable(false)
      setTrendMessage('')
    } finally {
      setLoading(false)
    }
  }, [userId, selectedWindowStart])

  const loadForecast = useCallback(async () => {
    if (!userId) {
      setForecastError('User not logged in. Please log in first.')
      return
    }

    setForecastLoading(true)
    setForecastError('')
    try {
      const res = await fetch(`${API_BASE}/api/prediction/forecast/user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: forecastCategory,
          monthsAhead: forecastMonthsAhead,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to generate future forecast.')
      setForecastResult(data)
    } catch (err) {
      console.error('Forecast error:', err)
      setForecastResult(null)
      setForecastError(err.message || 'Failed to generate future forecast.')
    } finally {
      setForecastLoading(false)
    }
  }, [forecastCategory, forecastMonthsAhead, userId])

  useEffect(() => {
    if (!userId) {
      setError('User not logged in. Please log in first.')
      setLoading(false)
      return
    }
    async function loadWindows() {
      setLoading(true)
      setError('')
      try {
        const res  = await fetch(`${API_BASE}/api/prediction/overspending/user/${userId}/windows`)
        const data = await res.json().catch(() => [])
        if (!res.ok) throw new Error(data.message || 'Failed to load analysis windows.')
        const options   = Array.isArray(data) ? data : []
        const latest    = options[options.length - 1]
        const initStart = latest?.windowStartMonth || ''
        setWindowOptions(options)
        setSelectedWindowStart(initStart)
        await loadAnalysis(initStart)
      } catch (err) {
        console.error('Window load error:', err)
        setError(err.message || 'Failed to load AI analysis.')
        setLoading(false)
      }
    }
    loadWindows()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ──────────────────────────────────────────────────────────
  const riskInfo  = getRiskInfo(prediction?.riskLevel, prediction?.overspender)
  const riskScore = getRiskScore(prediction?.probability)
  const scoreTone = getScoreTone(riskScore)

  const analysisPeriod = prediction?.windowStart && prediction?.windowEnd
    ? `${formatMonthLabel(prediction.windowStart)} — ${formatMonthLabel(prediction.windowEnd)} (3 months)`
    : 'Not available'

  const selectedWindowLabel = useMemo(() => {
    const match = windowOptions.find((o) => o.windowStartMonth === selectedWindowStart)
    return match?.label || 'Select window'
  }, [selectedWindowStart, windowOptions])

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData = useMemo(
    () => trend.map((point) => ({
      ...point,
      displayPeriod: formatMonthLabel(getTrendWindowEnd(point)),
      score: getRiskScore(point.probability),
    })),
    [trend]
  )

  const forecastChartData = useMemo(
    () => (forecastResult?.predictions || []).map((point) => ({
      ...point,
      displayMonth: formatMonthLabel(getForecastMonth(point)),
      amount: getForecastAmount(point),
    })),
    [forecastResult]
  )

  // gradient offset: where y=40 sits between min and max scores (fraction from top)
  const gradientOffset = useMemo(() => {
    if (!chartData.length) return 0.6
    const scores = chartData.map((d) => d.score)
    const max = Math.max(...scores, 41)
    const min = Math.min(...scores, 39)
    if (max === min) return 0.6
    return (max - 40) / (max - min)
  }, [chartData])

  const trendSummary = useMemo(() => {
    if (!trendAvailable || trend.length < 2) return ''
    const slice = trend.slice(-Math.min(4, trend.length))
    const first = Number(slice[0]?.probability || 0)
    const last  = Number(slice[slice.length - 1]?.probability || 0)
    const delta = last - first
    const n     = slice.length
    if (delta > 0.05)  return `⚠️ Your overspending risk has been increasing over the last ${n} windows.`
    if (delta < -0.05) return `✅ Your spending has improved over the last ${n} windows.`
    return `Your spending risk has stayed fairly steady over the last ${n} windows.`
  }, [trend, trendAvailable])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <header className="db-header">
        <div className="db-header-left">
          <button className="db-hamburger" type="button" onClick={onOpenSidebar}>☰</button>
          <div>
            <h1 className="db-title">AI Analysis</h1>
            <p className="db-subtitle">Overspending prediction from your recent transaction behaviour.</p>
            <p className="ai-period">Analysis Period: {analysisPeriod}</p>
          </div>
        </div>
        <div className="db-header-right">
          <div className="ai-window-selector-wrap">
            <label className="ai-window-selector-label" htmlFor="ai-window-select">3-month window</label>
            <select
              id="ai-window-select"
              className="ai-window-selector"
              value={selectedWindowStart}
              onChange={(e) => { const next = e.target.value; setSelectedWindowStart(next); loadAnalysis(next) }}
              disabled={loading || windowOptions.length === 0}
            >
              {windowOptions.length === 0
                ? <option value="">No windows available</option>
                : windowOptions.map((o) => (
                    <option key={o.windowStartMonth} value={o.windowStartMonth}>{o.label}</option>
                  ))
              }
            </select>
          </div>
          <button className="db-add-btn" type="button" onClick={() => loadAnalysis(selectedWindowStart)} disabled={loading}>
            {loading ? 'Analyzing…' : 'Refresh Analysis'}
          </button>
        </div>
      </header>

      {/* Error */}
      {error && <section className="db-card"><p className="ai-error">{error}</p></section>}

      {/* Loading */}
      {!error && loading && (
        <section className="db-card ai-loading-card">
          <div className="ai-spinner" />
          <p className="ai-muted">Running model prediction…</p>
        </section>
      )}

      {/* Main content */}
      {!error && !loading && prediction && (
        <>
          {/* Hero risk card */}
          <section className={`db-card ai-hero ai-${riskInfo.tone}`}>
            <div className="ai-hero-top">
              <span className={`ai-risk-pill ai-${riskInfo.tone}`}>{riskInfo.label}</span>
              <button
                type="button"
                className="ai-score-toggle"
                onClick={() => setScoreHelpOpen((p) => !p)}
                aria-expanded={scoreHelpOpen}
              >
                <span className="ai-score-label">Overspending Risk Score</span>
                <span className={`ai-score-value ai-score-value--${scoreTone}`}>{riskScore.toFixed(1)}%</span>
                <span className="ai-info-icon">i</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="ai-score-wrap">
              <div className="ai-progress-track" role="progressbar" aria-valuenow={riskScore} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`ai-progress-fill ai-${scoreTone}`}
                  style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
                />
              </div>
              <div className="ai-progress-scale">
                <span>0%</span><span>40%</span><span>60%</span><span>100%</span>
              </div>
              <p className="ai-score-hint">{getRiskScoreLabel(riskScore)}</p>
            </div>

            {/* Score explanation */}
            {scoreHelpOpen && (
              <div className="ai-score-help">
                <p>
                  <strong>What is this score?</strong><br />
                  This is your <em>Overspending Risk Score</em> — not a model confidence meter.
                  It shows how strongly your spending patterns in this 3-month window match
                  those of an overspender, based on 31 behavioural signals learned from training data.
                </p>
                <ul className="ai-score-help-list">
                  <li><span className="ai-dot ai-dot--green" /> 0–40% — Healthy spending patterns</li>
                  <li><span className="ai-dot ai-dot--yellow" /> 40–60% — Overspending signals detected</li>
                  <li><span className="ai-dot ai-dot--red" /> 60–100% — Strong overspending behaviour</li>
                </ul>
                <p>
                  <strong>How to improve it:</strong><br />
                  Log all income transactions, categorise every expense, and build up at least
                  6 months of history so the model can personalise its baseline for you.
                </p>
              </div>
            )}

            <h2 className="ai-title">
              {prediction.overspender ? 'Overspending likely this period' : 'Spending pattern looks healthy'}
            </h2>
            <p className="ai-message">{prediction.message || 'No insight returned from model.'}</p>
            <p className="ai-selected-window">Selected window: {selectedWindowLabel}</p>
          </section>

          {/* Stat cards */}
          <section className="ai-grid">
            <article className="db-card ai-stat-card">
              <p className="ai-stat-label">Risk Level</p>
              <h3 className={`ai-stat-value ai-stat-value--${riskInfo.tone}`}>{prediction.riskLevel || 'Unknown'}</h3>
            </article>
            <article className="db-card ai-stat-card">
              <p className="ai-stat-label">Window Expense</p>
              <h3 className="ai-stat-value">{formatMoney(prediction.windowExpense)}</h3>
            </article>
            <article className="db-card ai-stat-card">
              <p className="ai-stat-label">Window Income</p>
              <h3 className="ai-stat-value">{formatMoney(prediction.windowIncome)}</h3>
            </article>
            <article className="db-card ai-stat-card">
              <p className="ai-stat-label">Top Expense Category</p>
              <h3 className="ai-stat-value ai-stat-category">{prediction.topExpenseCategory || 'unknown'}</h3>
            </article>
          </section>

          {/* Trend chart */}
          <section className="db-card ai-trend-card">
            <div className="db-card-header">
              <h3>Spending Trend</h3>
              <span className="db-card-tag db-card-tag-blue">
                {trendAvailable ? `${trend.length} windows` : 'Unavailable'}
              </span>
            </div>

            {trendAvailable ? (
              <>
                <p className="ai-trend-legend">
                  <span className="ai-legend-dot ai-legend-dot--green" /> Below 40% (healthy)
                  &nbsp;&nbsp;
                  <span className="ai-legend-dot ai-legend-dot--red" /> Above 40% (overspending)
                </p>

                <div className="ai-trend-chart-wrap">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="riskLineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={gradientOffset} stopColor="#dc2626" />
                          <stop offset={gradientOffset} stopColor="#16a34a" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                      <XAxis dataKey="displayPeriod" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={45}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine
                        y={40}
                        stroke="#dc2626"
                        strokeDasharray="6 4"
                        strokeOpacity={0.55}
                        label={{ value: '40% threshold', position: 'insideTopRight', fill: '#dc2626', fontSize: 11, fontWeight: 600 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="url(#riskLineGradient)"
                        strokeWidth={3}
                        dot={<RiskDot />}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {(trendSummary || trendMessage) && (
                  <p className="ai-trend-summary">{trendSummary || trendMessage}</p>
                )}
              </>
            ) : (
              <p className="ai-muted">{trendMessage || 'Trend analysis available after 3 months of transaction data.'}</p>
            )}
          </section>

          {/* Category forecast */}
          <section className="db-card ai-forecast-card">
            <div className="db-card-header">
              <h3>Category Forecast</h3>
              <span className="db-card-tag db-card-tag-blue">
                {forecastResult?.predictions?.length ? `${forecastResult.predictions.length} months` : 'Plan ahead'}
              </span>
            </div>

            <p className="ai-muted ai-forecast-intro">
              Predict future monthly spend for a single category using your historical monthly totals.
            </p>

            <div className="ai-forecast-controls">
              <label className="ai-forecast-field">
                <span className="ai-forecast-label">Category</span>
                <select
                  className="ai-forecast-select"
                  value={forecastCategory}
                  onChange={(e) => setForecastCategory(e.target.value)}
                  disabled={forecastLoading}
                >
                  {FORECAST_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ai-forecast-field">
                <span className="ai-forecast-label">Months ahead</span>
                <select
                  className="ai-forecast-select"
                  value={forecastMonthsAhead}
                  onChange={(e) => setForecastMonthsAhead(Number(e.target.value))}
                  disabled={forecastLoading}
                >
                  {[1, 2, 3, 4, 5, 6, 9, 12].map((value) => (
                    <option key={value} value={value}>
                      {value} month{value > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="db-add-btn ai-forecast-button"
                onClick={loadForecast}
                disabled={forecastLoading}
              >
                {forecastLoading ? 'Forecasting…' : 'Generate Forecast'}
              </button>
            </div>

            {forecastLoading && (
              <div className="ai-loading-inline">
                <div className="ai-spinner" />
                <p className="ai-muted">Creating future forecast…</p>
              </div>
            )}

            {forecastError && <p className="ai-error ai-forecast-error">{forecastError}</p>}

            {forecastResult?.note && !forecastError && !forecastLoading && (
              <p className="ai-forecast-note">{forecastResult.note}</p>
            )}

            {!forecastLoading && forecastChartData.length > 0 && (
              <div className="ai-forecast-chart-wrap">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={forecastChartData} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                    <XAxis dataKey="displayMonth" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                    <YAxis
                      tickFormatter={(value) => `Rs.${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip content={<ForecastTooltip />} />
                    <Bar dataKey="amount" radius={[10, 10, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {!forecastLoading && !forecastError && !forecastChartData.length && (
              <p className="ai-muted">Generate a forecast to see projected spend for the selected category.</p>
            )}
          </section>

          {/* Low data warning */}
          {!prediction.predictionAvailable && (
            <section className="db-card">
              <p className="ai-muted">
                Not enough recent transactions to generate a high-confidence prediction.
                Log more transactions to improve accuracy.
              </p>
            </section>
          )}

          {/* Tips */}
          <TipsAccordion />
        </>
      )}
    </>
  )
}
