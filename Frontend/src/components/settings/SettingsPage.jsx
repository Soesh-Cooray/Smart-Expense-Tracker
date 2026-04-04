import { useState } from 'react'
import Sidebar from '../Sidebar'
import './SettingsPage.css'

const API_BASE = 'http://localhost:8080'

<<<<<<< HEAD
=======
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

>>>>>>> main
export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [name, setName] = useState(localStorage.getItem('userName') || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
<<<<<<< HEAD
=======
  const pwStrength = getPasswordStrength(newPassword)
  const isPasswordStrong = pwStrength.score === 4
>>>>>>> main

  const storedUserId = localStorage.getItem('userId')
  const userId = storedUserId ? parseInt(storedUserId, 10) : null

<<<<<<< HEAD
=======
  const strengthSegClass = (idx) => {
    if (pwStrength.score > idx) return `settings-pw-strength-seg filled-${pwStrength.cls}`
    return 'settings-pw-strength-seg'
  }

>>>>>>> main
  async function handleNameUpdate(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!userId) {
      setError('User not logged in.')
      return
    }

    if (!name.trim()) {
      setError('Name cannot be empty.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')

      localStorage.setItem('userName', data.name || name.trim())
      setMessage('Name updated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!userId) {
      setError('User not logged in.')
      return
    }

<<<<<<< HEAD
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
=======
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (pwStrength.score < 4) {
      setError('New password must be strong (8+ chars with uppercase, number, and symbol).')
>>>>>>> main
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update password')

      setCurrentPassword('')
      setNewPassword('')
      setMessage('Password changed successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!userId) {
      setError('User not logged in.')
      return
    }

    if (!window.confirm('Are you sure? This will permanently delete your account and all your data.')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          currentPassword: deletePassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete account')

      localStorage.removeItem('userId')
      localStorage.removeItem('userName')
      localStorage.removeItem('userEmail')
      window.location.href = '/login'
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-root">
      <Sidebar
        activeNav="settings"
        onNavChange={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="settings-main">
        <header className="settings-header">
          <div className="settings-header-left">
            <button className="settings-hamburger" type="button" onClick={() => setSidebarOpen(true)}>☰</button>
            <div>
              <h1 className="settings-title">Account Settings</h1>
              <p className="settings-subtitle">Update your profile, secure your account, and manage ownership data.</p>
            </div>
          </div>
        </header>

        {(message || error) && (
          <section className={`settings-alert ${error ? 'error' : 'success'}`}>
            <p>{error || message}</p>
          </section>
        )}

        <section className="settings-card">
          <div className="settings-card-head">
            <h3>Profile</h3>
            <span className="settings-pill">Public Info</span>
          </div>
          <form onSubmit={handleNameUpdate} className="settings-form">
            <label className="settings-label" htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
            <button className="settings-btn primary" type="submit" disabled={loading}>Save Name</button>
          </form>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <h3>Security</h3>
            <span className="settings-pill">Private</span>
          </div>
          <form onSubmit={handlePasswordUpdate} className="settings-form">
            <label className="settings-label" htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              required
            />
            <label className="settings-label" htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
<<<<<<< HEAD
              placeholder="New password (min 6 chars)"
              required
            />
            <button className="settings-btn primary" type="submit" disabled={loading}>Update Password</button>
=======
              placeholder="New password (min 8 chars)"
              required
            />
            {newPassword && (
              <div className="settings-pw-strength">
                <div className="settings-pw-strength-bar">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={strengthSegClass(i)} />
                  ))}
                </div>
                <span className={`settings-pw-strength-label ${pwStrength.cls}`}>
                  {pwStrength.label} password
                </span>
              </div>
            )}
            <button className="settings-btn primary" type="submit" disabled={loading || !isPasswordStrong}>Update Password</button>
>>>>>>> main
          </form>
        </section>

        <section className="settings-card danger">
          <div className="settings-card-head">
            <h3>Danger Zone</h3>
            <span className="settings-pill danger">Permanent</span>
          </div>
          <form onSubmit={handleDeleteAccount} className="settings-form">
            <p className="settings-danger-text">
              Deleting your account will permanently remove all expenses, savings goals, subscriptions, and your profile.
            </p>
            <label className="settings-label" htmlFor="confirm-delete">Confirm with current password</label>
            <input
              id="confirm-delete"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter current password to confirm"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="settings-btn danger"
            >
              Delete Account
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
