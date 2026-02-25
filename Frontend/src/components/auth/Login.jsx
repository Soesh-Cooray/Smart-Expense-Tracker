import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

const API_BASE = 'http://localhost:8080'

// ── helpers ──────────────────────────────────────────────────────────────────

function validate(fields) {
  const errors = {}
  if (!fields.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!fields.password) {
    errors.password = 'Password is required.'
  } else if (fields.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }
  return errors
}

// ── left panel ────────────────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div className="auth-left">
      <div className="auth-left-brand">
        <span className="auth-left-brand-icon">S</span>
        <span className="auth-left-brand-name">SmartExpense</span>
      </div>

      <div className="auth-left-body">
        <h2>Welcome back to smarter finance.</h2>
        <p>
          Pick up right where you left off. Your budgets, goals, and insights are waiting for you.
        </p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="auth-feature-icon">📊</span>
            <span>Real-time spending insights</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">🎯</span>
            <span>Automated savings goal tracking</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">🤖</span>
            <span>AI-powered expense categorization</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate()

  const [fields, setFields] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validation = validate(fields)
    if (Object.keys(validation).length) {
      setErrors(validation)
      return
    }
    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email,
          password: fields.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Login failed. Please try again.')
        return
      }

      navigate('/dashboard')
    } catch {
      setFormError('Could not connect to server. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-root">
      <LeftPanel />

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h1>Sign in to your account</h1>
            <p>Enter your credentials to access your financial dashboard.</p>
          </div>

          <div className="auth-card">
            {formError && (
              <div className="auth-alert error">⚠ {formError}</div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="auth-field">
                <label htmlFor="login-email">Email address</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">✉</span>
                  <input
                    id="login-email"
                    className={`auth-input ${errors.email ? 'error' : ''}`}
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={fields.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="auth-field-error">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="auth-field">
                <div className="auth-field-meta">
                  <label htmlFor="login-password">Password</label>
                  <button
                    type="button"
                    className="auth-inline-link"
                    onClick={() => {}}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    id="login-password"
                    className={`auth-input ${errors.password ? 'error' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={fields.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.password && <p className="auth-field-error">{errors.password}</p>}
              </div>

              {/* Remember me */}
              <div className="auth-checkbox-row" style={{ marginBottom: 24 }}>
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>
                  <label htmlFor="remember-me">Keep me signed in for 30 days</label>
                </span>
              </div>

              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span>or continue with</span>
              <div className="auth-divider-line" />
            </div>

            <button type="button" className="auth-oauth-btn">
              <span className="auth-oauth-icon">G</span>
              Continue with Google
            </button>
          </div>

          <p className="auth-switch">
            Don&apos;t have an account?{' '}
            <button type="button" onClick={() => navigate('/signup')}>
              Create one free
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
