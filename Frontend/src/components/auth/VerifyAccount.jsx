import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Auth.css'

const API_BASE = 'http://localhost:8080'
const CODE_LENGTH = 6

// ── left panel ────────────────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div className="auth-left">
      <div className="auth-left-brand">
        <span className="auth-left-brand-icon">S</span>
        <span className="auth-left-brand-name">SmartExpense</span>
      </div>

      <div className="auth-left-body">
        <h2>Almost there!</h2>
        <p>
          We sent a verification code to your email. Enter it below to activate your account and start tracking your expenses.
        </p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="auth-feature-icon">✉</span>
            <span>Check your inbox (and spam folder)</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">🔢</span>
            <span>Enter the 6-digit code we sent you</span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">🚀</span>
            <span>Start managing your finances instantly</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function VerifyAccount() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRefs = useRef([])

  useEffect(() => {
    if (!email) {
      navigate('/signup')
    }
  }, [email, navigate])

  function handleDigitChange(index, value) {
    if (value && !/^\d$/.test(value)) return

    const updated = [...digits]
    updated[index] = value
    setDigits(updated)
    setFormError('')

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    const updated = [...digits]
    for (let i = 0; i < CODE_LENGTH; i++) {
      updated[i] = pasted[i] || ''
    }
    setDigits(updated)
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1)
    inputRefs.current[focusIdx]?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < CODE_LENGTH) {
      setFormError('Please enter the full 6-digit code.')
      return
    }

    setFormError('')
    setSubmitting(true)

    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: parseInt(code, 10) }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Verification failed. Please try again.')
        return
      }

      setSuccess('Account verified! Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
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
            <h1>Verify your email</h1>
            <p>
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your account.
            </p>
          </div>

          <div className="auth-card">
            {formError && (
              <div className="auth-alert error">⚠ {formError}</div>
            )}
            {success && (
              <div className="auth-alert success">✓ {success}</div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-otp-inputs" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    className={`auth-otp-input ${formError ? 'error' : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Verifying…' : 'Verify account'}
              </button>
            </form>

            <div className="auth-resend-row">
              Didn&apos;t receive the code?{' '}
              <button type="button" onClick={() => navigate('/signup')}>
                Register again
              </button>
            </div>
          </div>

          <p className="auth-switch">
            Already verified?{' '}
            <button type="button" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
