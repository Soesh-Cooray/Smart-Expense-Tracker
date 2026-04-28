import { useState } from 'react'
import Sidebar from '../Sidebar'
import Budget from './budget'

export default function BudgetLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="db-root">
      <Sidebar
        activeNav="budgets"
        onNavChange={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="db-main">
        <Budget onOpenSidebar={() => setSidebarOpen(true)} />
      </main>
    </div>
  )
}
