import { useState } from 'react'
import Sidebar from '../Sidebar'
import SubscriptionManager from './SubscriptionManager.jsx'
import '../../Dashboard.css'

export default function SubscriptionPage() {
  const [activeNav, setActiveNav] = useState('subscriptions')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="db-root">
      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="db-main">
        <header className="db-header">
          <div className="db-header-left">
            <button className="db-hamburger" type="button" onClick={() => setSidebarOpen(true)}>☰</button>
            <div>
              <h1 className="db-title">Subscription Management</h1>
            </div>
          </div>
        </header>

        <section className="db-content">
          <SubscriptionManager />
        </section>
      </main>
    </div>
  )
}
