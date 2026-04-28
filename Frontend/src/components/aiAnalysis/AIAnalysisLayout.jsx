import { useState } from 'react'
import Sidebar from '../Sidebar'
import AIAnalysisPage from './AIAnalysisPage'

export default function AIAnalysisLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="db-root">
      <Sidebar
        activeNav="ai-analysis"
        onNavChange={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="db-main">
        <AIAnalysisPage onOpenSidebar={() => setSidebarOpen(true)} />
      </main>
    </div>
  )
}
