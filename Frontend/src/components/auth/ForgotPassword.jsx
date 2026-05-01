import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

const API_BASE = 'http://localhost:8080'

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', cls: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  const map = [
    { label: 'Weak', cls: 'weak' },
    { label: 'Weak', cls: 'weak' },
    { label: 'Fair', cls: 'fair' },
    { label: 'Good', cls: 'good' },
    { label: 'Strong', cls: 'strong' },
  ]

  return { score, ...map[score] }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function LeftPanel() {
  return (
    <div className="auth-left">
      <div className="auth-left-brand">
        <span className="auth-left-brand-icon">S</span>
        <span className="auth-left-brand-name">SmartExpense</span>
      </div>

      <div className="auth-left-body">
        <h2>Reset your password securely.</h2>
        <p>Enter your account email to receive a 6-digit reset code. Then set a new password and continue.</p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="auth-feature-icon">✉</span>
            <span>Receive a one-time reset code in your email</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">⏱</span>
            <span>Code expires in 10 minutes for your safety</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">🔐</span>
            <span>Create a new password and sign in again</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')

  const pwStrength = getPasswordStrength(newPassword)
  const isPasswordStrong = pwStrength.score === 4

  const strengthSegClass = (idx) => {
    if (pwStrength.score > idx) return `auth-pw-strength-seg filled-${pwStrength.cls}`
    return 'auth-pw-strength-seg'
  }

  async function handleSendCode(e) {
    e.preventDefault()
    setFormError('')
    setSuccess('')

    if (!email.trim()) {
      setFormError('Email is required.')
      return
    }
    if (!isValidEmail(email.trim())) {
      setFormError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to send reset code.')
        return
      }

      setSuccess(data.message || 'Reset code sent successfully.')
      setStep(2)
    } catch {
      setFormError('Could not connect to server. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setFormError('')
    setSuccess('')

    if (!code.trim()) {
      setFormError('Reset code is required.')
      return
    }
    if (newPassword.length < 6) {
      setFormError('New password must be at least 6 characters.')
      return
    }
    if (pwStrength.score < 4) {
      setFormError('New password must be strong (6+ chars with uppercase, number, and symbol).')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: parseInt(code, 10),
          newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to reset password.')
        return
      }

      setSuccess(data.message || 'Password reset successful.')
      setTimeout(() => navigate('/login'), 1400)
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
            <h1>Forgot Password</h1>
            <p>{step === 1 ? 'Request a reset code.' : `Reset password for ${email}`}</p>
          </div>

          <div className="auth-card">
            {formError && <div className="auth-alert error">⚠ {formError}</div>}
            {success && <div className="auth-alert success">✓ {success}</div>}

            {step === 1 ? (
              <form onSubmit={handleSendCode} noValidate>
                <div className="auth-field">
                  <label htmlFor="fp-email">Email address</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">✉</span>
                    <input
                      id="fp-email"
                      className="auth-input"
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting ? 'Sending code...' : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} noValidate>
                <div className="auth-field">
                  <label htmlFor="fp-code">Reset code</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">🔢</span>
                    <input
                      id="fp-code"
                      className="auth-input"
                      type="text"
                      name="code"
                      placeholder="6-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="fp-new-password">New password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">🔒</span>
                    <input
                      id="fp-new-password"
                      className="auth-input"
                      type="password"
                      name="newPassword"
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  {newPassword && (
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

                <div className="auth-field">
                  <label htmlFor="fp-confirm-password">Confirm new password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">🔒</span>
                    <input
                      id="fp-confirm-password"
                      className="auth-input"
                      type="password"
                      name="confirmPassword"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit" disabled={submitting || !isPasswordStrong}>
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>

          <p className="auth-switch">
            Remembered your password?{' '}
            <button type="button" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}