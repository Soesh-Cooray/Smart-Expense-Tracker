import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Sidebar.css'

const navItems = [
  { id: 'overview',  label: 'Dashboard',  icon: '⊞',  path: '/dashboard' },
  { id: 'expenses',  label: 'Expenses',  icon: '📉',  path: '/expenses' },
  { id: 'income',    label: 'Income',    icon: '📈',  path: '/income' },
  { id: 'budgets',   label: 'Budgets',   icon: '📊',  path: '/dashboard?tab=budgets' },
  { id: 'goals',     label: 'Goals',     icon: '🎯',  path: '/goals' },
  { id: 'settings',  label: 'Settings',  icon: '⚙',   path: '/settings' },
]

/**
 * Reusable sidebar navigation component.
 *
 * Props:
 *   activeNav  {string}   – id of the currently active nav item
 *   onNavChange{function} – called with the new item id when a nav button is clicked
 *   isOpen     {boolean}  – controls mob
 *   ile slide-in state
 *   onClose    {function} – called when the overlay is clicked (mobile close)
 */
export default function Sidebar({ activeNav, onNavChange, isOpen, onClose }) {
  const navigate = useNavigate()
  const [userName] = useState(() => localStorage.getItem('userName') || 'User')
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '')

  function handleNavClick(item) {
    if (item.path) {
      navigate(item.path)
    } else {
      onNavChange(item.id)
    }
    onClose()
  }

  function handleLogout() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    onClose()
    navigate('/login')
  }

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'U'

  return (
    <>
      <aside className={`db-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="db-brand">
          <span className="db-brand-icon">S</span>
          <span className="db-brand-name">SmartExpense</span>
        </div>

        <nav className="db-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`db-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <span className="db-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="db-sidebar-footer">
          <div className="db-user">
            <div className="db-avatar">{initials}</div>
            <div>
              <p className="db-user-name">{userName}</p>
              <p className="db-user-email">{userEmail || 'No email'}</p>
            </div>
          </div>
          <button type="button" className="db-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {isOpen && <div className="db-overlay" onClick={onClose} />}
    </>
  )
}
