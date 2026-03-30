import { useState } from 'react'
import Sidebar from '../Sidebar'
import IncomePage from './IncomePage'

export default function IncomeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="db-root">
      <Sidebar
        activeNav="income"
        onNavChange={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="db-main">
        <IncomePage onOpenSidebar={() => setSidebarOpen(true)} />
      </main>
    </div>
  )
}
