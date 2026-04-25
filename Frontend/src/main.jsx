import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Index from './Index.jsx'
import Login from './components/auth/Login.jsx'
import Signup from './components/auth/Signup.jsx'
import VerifyAccount from './components/auth/VerifyAccount.jsx'
import ForgotPassword from './components/auth/ForgotPassword.jsx'
import Dashboard from './Dashboard.jsx'
import SavingsGoals from './components/savings/SavingsGoals.jsx'
import IncomeLayout from './components/income/IncomeLayout.jsx'
import ExpenseLayout from './components/expenses/ExpenseLayout.jsx'
import AIAnalysisLayout from './components/aiAnalysis/AIAnalysisLayout.jsx'
import SettingsPage from './components/settings/SettingsPage.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify" element={<VerifyAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/goals" element={<SavingsGoals />} />
          <Route path="/income" element={<IncomeLayout />} />
          <Route path="/expenses" element={<ExpenseLayout />} />
          <Route path="/ai-analysis" element={<AIAnalysisLayout />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>,
)