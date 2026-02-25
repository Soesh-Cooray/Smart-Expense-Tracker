import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Index from './Index.jsx'
import Login from './components/auth/Login.jsx'
import Signup from './components/auth/Signup.jsx'
import VerifyAccount from './components/auth/VerifyAccount.jsx'
import Dashboard from './Dashboard.jsx'
import SavingsGoals from './components/savings/SavingsGoals.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<VerifyAccount />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/goals" element={<SavingsGoals />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
