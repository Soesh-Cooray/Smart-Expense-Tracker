import './Index.css'

function Index() {
  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">S</span>
          <span className="brand-name">SmartExpense</span>
        </div>

        <nav className="nav-links">
          <a href="#">Dashboard</a>
          <a href="#">Expenses</a>
          <a href="#">Budgets</a>
          <a href="#">Reports</a>
        </nav>

        <div className="auth-actions">
          <button className="btn-link" type="button">
            Login
          </button>
          <button className="btn-primary" type="button">
            Sign Up
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <span className="tag">AI-POWERED FINANCIAL FREEDOM</span>
          <h1>
            Master Your Money,
            <br />
            <span>Effortlessly.</span>
          </h1>
          <p>
            Track expenses, set intelligent budgets, and get AI-driven insights to grow your wealth in one centralized,
            secure platform designed for modern life.
          </p>
          <div className="hero-actions">
            <button className="btn-primary big" type="button">
              Get Started Free
            </button>
            <button className="btn-secondary big" type="button">
              View Demo
            </button>
          </div>
          <p className="social-proof">Joined by 10k+ savers this month</p>
        </div>

        <div className="hero-card">
          <div className="hero-card-header">
            <div>
              <h3>Dashboard Overview</h3>
              <span>October 2023</span>
            </div>
            <span className="calendar">▣</span>
          </div>

          <div className="hero-card-grid">
            <div className="chart-card">
              <p>Spending by Category</p>
              <div className="chart-ring">
                <div className="chart-center">
                  <strong>$3,450</strong>
                  <span>TOTAL</span>
                </div>
              </div>
              <small>Rent • Food • Other</small>
            </div>
            <div className="activity-card">
              <p>Recent Activity</p>
              <ul>
                <li>
                  <span>Starbucks Coffee</span>
                  <b className="neg">-$5.40</b>
                </li>
                <li>
                  <span>Uber Ride</span>
                  <b className="neg">-$24.00</b>
                </li>
                <li>
                  <span>Salary Deposit</span>
                  <b className="pos">+$4,200</b>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="insights">
        <h2>Smart Insights &amp; Alerts</h2>
        <p className="section-subtitle">
          Get intelligent notifications that help you stay on top of your financial health without lifting a finger.
        </p>

        <div className="insight-grid">
          <article className="insight-card">
            <span className="insight-icon blue">⚙</span>
            <h3>Monthly Savings</h3>
            <p>You saved 15% more than your monthly average by reducing dining out.</p>
            <div className="progress">
              <span />
            </div>
          </article>

          <article className="insight-card">
            <span className="insight-icon red">🔔</span>
            <h3>Upcoming Bills</h3>
            <p>Electricity Bill due in 2 days ($85.00). Ensure funds are available.</p>
            <a href="#">Schedule Payment</a>
          </article>

          <article className="insight-card">
            <span className="insight-icon green">🚀</span>
            <h3>Investment Goal</h3>
            <p>You are on track to reach your House Deposit goal 3 months earlier than expected.</p>
            <small>Goal Tracking Active</small>
          </article>
        </div>
      </section>

      <section className="cta">
        <h2>Take control of your future today.</h2>
        <p>
          Join over 500,000+ users who have optimized their spending and reached their financial goals with SmartExpense.
        </p>
        <div className="cta-actions">
          <button className="btn-light" type="button">
            Start Your Free Trial
          </button>
          <button className="btn-outline" type="button">
            Contact Sales
          </button>
        </div>
        <small>No credit card required. Cancel anytime.</small>
      </section>

      <footer className="footer">
        <div className="footer-brand">
          <div className="brand">
            <span className="brand-icon">S</span>
            <span className="brand-name">SmartExpense</span>
          </div>
          <p>The smarter way to manage your personal and business finances. Simple, secure, and insightful.</p>
        </div>

        <div className="footer-cols">
          <div>
            <h4>Product</h4>
            <a href="#">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Security</a>
            <a href="#">Roadmap</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Press</a>
            <a href="#">Contact</a>
          </div>
          <div>
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </footer>

      <div className="copyright">© 2023 SmartExpense Inc. All rights reserved.</div>
    </div>
  )
}

export default Index
