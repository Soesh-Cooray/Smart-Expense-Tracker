import { useNavigate } from 'react-router-dom'
import './Index.css'

const MODULES = [
  {
    title: 'Authentication and Verification',
    icon: '01',
    description: 'Secure onboarding with signup, login, and verification before entering the platform.',
    points: ['Email verification flow', 'Protected account access', 'Clean login and signup screens'],
  },
  {
    title: 'Financial Dashboard Overview',
    icon: '02',
    description: 'A real-time snapshot of your money with KPIs, spending distribution, and monthly trends.',
    points: ['Balance, income, and expense KPIs', 'Income vs expense charts', 'Recent transaction timeline'],
  },
  {
    title: 'Income Management',
    icon: '03',
    description: 'Track all income sources with powerful CRUD operations and interactive trend analytics.',
    points: ['Add, edit, view, and delete records', 'Category and search filters', 'Six-month performance chart'],
  },
  {
    title: 'Subscription Tracking',
    icon: '04',
    description: 'Monitor recurring payments so monthly commitments are always visible and controlled.',
    points: ['Subscription CRUD operations', 'Billing cycle and status controls', 'Total recurring cost summary'],
  },
  {
    title: 'Savings Goals Planner',
    icon: '05',
    description: 'Create personalized goals and stay motivated with progress bars and completion insights.',
    points: ['Goal creation and updates', 'Due-date urgency indicators', 'Progress and distribution visuals'],
  },
  {
    title: 'Smart Alerts and AI Insights',
    icon: '06',
    description: 'Get proactive reminders and data-driven recommendations for smarter financial decisions.',
    points: ['Bill due notifications', 'Spending pattern insights', 'Future-ready AI recommendation layer'],
  },
]

const JOURNEY = [
  {
    step: 'Create Account',
    detail: 'Join in minutes with secure registration and verification.',
  },
  {
    step: 'Connect Your Habits',
    detail: 'Start logging income, expenses, subscriptions, and goals.',
  },
  {
    step: 'Track Performance',
    detail: 'Use visual dashboards to monitor your financial health.',
  },
  {
    step: 'Improve with Insights',
    detail: 'Act on alerts and optimize spending with smart guidance.',
  },
]

const HIGHLIGHTS = [
  { label: 'Unified Money View', text: 'One place to manage your complete financial life.' },
  { label: 'Actionable Analytics', text: 'Charts and trends that help you make faster decisions.' },
  { label: 'Built for Growth', text: 'Designed to scale from student budgets to long-term goals.' },
]

function Index() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <div className="bg-orb bg-orb-one" />
      <div className="bg-orb bg-orb-two" />

      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-icon">S</span>
          <div>
            <p className="brand-name">Smart Expense Tracker</p>
            <span className="brand-sub">Personal Finance Intelligence</span>
          </div>
        </div>

        <div className="auth-actions">
          <button className="btn-link" type="button" onClick={() => navigate('/login')}>
            Login
          </button>
          <button className="btn-primary" type="button" onClick={() => navigate('/signup')}>
            Get Started
          </button>
        </div>
      </header>

      <main className="page-shell">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-tag">ALL-IN-ONE FINANCE COMMAND CENTER</span>
            <h1>Control Every Rupee with Clarity and Confidence</h1>
            <p>
              Manage income, subscriptions, savings goals, and smart alerts from one beautiful dashboard.
              Built to help you spend better, save faster, and stay in control every single month.
            </p>
            <div className="hero-actions">
              <button className="btn-primary lg" type="button" onClick={() => navigate('/signup')}>
                Start Free Today
              </button>
              <button className="btn-ghost lg" type="button" onClick={() => navigate('/login')}>
                Explore Demo Flow
              </button>
            </div>
          </div>

          <div className="hero-panel">
            <article className="panel-card panel-main">
              <p className="mini-label">Live Financial Snapshot</p>
              <h3>Monthly Control Score</h3>
              <strong>86%</strong>
              <div className="mini-progress">
                <span />
              </div>
              <small>Up by 12% compared to last month</small>
            </article>

            <article className="panel-card">
              <p className="mini-label">Active Subscriptions</p>
              <h4>8 Services Tracked</h4>
              <small>Monthly recurring: Rs.6,240</small>
            </article>

            <article className="panel-card">
              <p className="mini-label">Savings Goals</p>
              <h4>3 Goals In Progress</h4>
              <small>Combined completion: 61%</small>
            </article>
          </div>
        </section>

        <section className="highlight-strip">
          {HIGHLIGHTS.map((item) => (
            <article className="highlight-card" key={item.label}>
              <h3>{item.label}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="modules" id="features">
          <div className="section-head">
            <span className="section-tag">Feature Modules</span>
            <h2>Everything You Need in One Smart Platform</h2>
            <p>
              Each module is connected, so actions in one area strengthen insights across your full financial journey.
            </p>
          </div>

          <div className="module-grid">
            {MODULES.map((module) => (
              <article className="module-card" key={module.title}>
                <div className="module-top">
                  <span className="module-no">{module.icon}</span>
                  <h3>{module.title}</h3>
                </div>
                <p>{module.description}</p>
                <ul>
                  {module.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="journey">
          <div className="section-head left">
            <span className="section-tag">How It Works</span>
            <h2>From Setup to Smarter Decisions in Four Steps</h2>
          </div>

          <div className="journey-grid">
            {JOURNEY.map((item, index) => (
              <article className="journey-card" key={item.step}>
                <span className="journey-index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.step}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta">
          <h2>Ready to Transform Your Financial Routine?</h2>
          <p>
            Join Smart Expense Tracker and unlock a cleaner, simpler, and more intelligent way to manage money.
          </p>
          <div className="cta-actions">
            <button className="btn-light" type="button" onClick={() => navigate('/signup')}>
              Create Free Account
            </button>
            <button className="btn-dark" type="button" onClick={() => navigate('/login')}>
              I Already Have an Account
            </button>
          </div>
        </section>
      </main>

      <footer className="copyright">Copyright 2026 Smart Expense Tracker. All rights reserved.</footer>
    </div>
  )
}

export default Index
