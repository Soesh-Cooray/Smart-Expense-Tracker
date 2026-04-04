import { useNavigate } from 'react-router-dom'
import './Sidebar.css'

const navItems = [
  { id: 'overview',  label: 'Overview',  icon: '⊞',  path: '/dashboard' },
  { id: 'expenses',  label: 'Expenses',  icon: '📉',  path: null },
  { id: 'income',    label: 'Income',    icon: '📈',  path: null },
  { id: 'budgets',   label: 'Budgets',   icon: '📊',  path: null },
  { id: 'goals',     label: 'Goals',     icon: '🎯',  path: '/goals' },
  { id: 'settings',  label: 'Settings',  icon: '⚙',   path: null },
]

/**
 * Reusable sidebar navigation component.
 *
 * Props:
 *   activeNav  {string}   – id of the currently active nav item
 *   onNavChange{function} – called with the new item id when a nav button is clicked
 *   isOpen     {boolean}  – controls mobile slide-in state
 *   onClose    {function} – called when the overlay is clicked (mobile close)
 */
export default function Sidebar({ activeNav, onNavChange, isOpen, onClose }) {
  const navigate = useNavigate()

  function handleNavClick(item) {
    if (item.path) {
      navigate(item.path)
    } else {
      onNavChange(item.id)
    }
    onClose()
  }

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
            <div className="db-avatar">JD</div>
            <div>
              <p className="db-user-name">John Doe</p>
              <p className="db-user-email">john@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {isOpen && <div className="db-overlay" onClick={onClose} />}
    </>
  )
}
