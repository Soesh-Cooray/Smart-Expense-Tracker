import { useState } from 'react'
import Sidebar from '../Sidebar'
import ExpensePage from './ExpensePage'

export default function ExpenseLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="db-root">
      <Sidebar
        activeNav="expenses"
        onNavChange={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="db-main">
        <ExpensePage onOpenSidebar={() => setSidebarOpen(true)} />
      </main>
    </div>
  )
}
