import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

const API_BASE = 'http://localhost:8080'

// ── helpers ───────────────────────────────────────────────────────────────────

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', cls: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: 'Weak',   cls: 'weak'   },
    { label: 'Weak',   cls: 'weak'   },
    { label: 'Fair',   cls: 'fair'   },
    { label: 'Good',   cls: 'good'   },
    { label: 'Strong', cls: 'strong' },
  ]
  return { score, ...map[score] }
}

function validate(fields) {
  const errors = {}
  if (!fields.fullName.trim()) errors.fullName = 'Full name is required.'
  if (!fields.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!fields.password) {
    errors.password = 'Password is required.'
  } else if (fields.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }
  if (!fields.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
  } else if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
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
        <h2>Start your journey to financial freedom.</h2>
        <p>
          Join thousands of users who have taken control of their money with AI-powered insights, smart budgets, and goal tracking.
        </p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="auth-feature-icon">✨</span>
            <span>Free to get started — no credit card needed</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">🔐</span>
            <span>Bank-level security for your data</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">📈</span>
            <span>Personalised AI insights from day one</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">🎯</span>
            <span>Set and track savings goals visually</span>
          </div>
        </div>

        <div className="auth-stats">
          <div className="auth-stat-card">
            <div className="auth-stat-card-label">Active Users</div>
            <div className="auth-stat-card-value">12k+</div>
            <div className="auth-stat-card-change">↑ Growing daily</div>
          </div>
          <div className="auth-stat-card">
            <div className="auth-stat-card-label">Avg. Saved</div>
            <div className="auth-stat-card-value">Rs.8.4k</div>
            <div className="auth-stat-card-change">↑ Per user / month</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Signup() {
  const navigate = useNavigate()

  const [fields, setFields] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors]           = useState({})
  const [showPassword, setShowPassword]       = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms]     = useState(false)
  const [termsError, setTermsError]           = useState('')
  const [submitting, setSubmitting]           = useState(false)
  const [formError, setFormError]             = useState('')

  const pwStrength = getPasswordStrength(fields.password)

  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validation = validate(fields)
    if (Object.keys(validation).length) { setErrors(validation); return }
    if (!agreedToTerms) { setTermsError('You must agree to the terms to continue.'); return }
    setTermsError('')
    setFormError('')
    setSubmitting(true)

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fields.fullName,
          email: fields.email,
          password: fields.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Registration failed. Please try again.')
        return
      }

      navigate('/verify', { state: { email: fields.email } })
    } catch {
      setFormError('Could not connect to server. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  const strengthSegClass = (idx) => {
    if (pwStrength.score > idx) return `auth-pw-strength-seg filled-${pwStrength.cls}`
    return 'auth-pw-strength-seg'
  }

  return (
    <div className="auth-root">
      <LeftPanel />

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h1>Create your account</h1>
            <p>It only takes a minute to get started for free.</p>
          </div>

          <div className="auth-card">
            {formError && (
              <div className="auth-alert error">⚠ {formError}</div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Full name */}
              <div className="auth-field">
                <label htmlFor="su-fullname">Full name</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">👤</span>
                  <input
                    id="su-fullname"
                    className={`auth-input ${errors.fullName ? 'error' : ''}`}
                    type="text"
                    name="fullName"
                    placeholder="John Doe"
                    value={fields.fullName}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                </div>
                {errors.fullName && <p className="auth-field-error">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div className="auth-field">
                <label htmlFor="su-email">Email address</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">✉</span>
                  <input
                    id="su-email"
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
                <label htmlFor="su-password">Password</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    id="su-password"
                    className={`auth-input ${errors.password ? 'error' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Min. 8 characters"
                    value={fields.password}
                    onChange={handleChange}
                    autoComplete="new-password"
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

                {/* Password strength indicator */}
                {fields.password && (
                  <div className="auth-pw-strength">
                    <div className="auth-pw-strength-bar">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={strengthSegClass(i)} />
                      ))}
                    </div>
                    <span className={`auth-pw-strength-label ${pwStrength.cls}`}>
                      {pwStrength.label} password
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="auth-field">
                <label htmlFor="su-confirm">Confirm password</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    id="su-confirm"
                    className={`auth-input ${errors.confirmPassword ? 'error' : ''}`}
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={fields.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="auth-field-error">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms */}
              <div className="auth-checkbox-row">
                <input
                  id="su-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => { setAgreedToTerms(e.target.checked); setTermsError('') }}
                />
                <span>
                  <label htmlFor="su-terms">
                    I agree to the{' '}
                    <button type="button">Terms of Service</button>{' '}
                    and{' '}
                    <button type="button">Privacy Policy</button>
                  </label>
                </span>
              </div>
              {termsError && <p className="auth-field-error" style={{ marginTop: -12, marginBottom: 16 }}>{termsError}</p>}

              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create free account'}
              </button>
            </form>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span>or sign up with</span>
              <div className="auth-divider-line" />
            </div>

            <button type="button" className="auth-oauth-btn">
              <span className="auth-oauth-icon">G</span>
              Continue with Google
            </button>
          </div>

          <p className="auth-switch">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
