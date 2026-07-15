import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CompanyPage from './pages/CompanyPage'
import DataPage from './pages/DataPage'
import ForecastPage from './pages/ForecastPage'
import StaffingPage from './pages/StaffingPage'
import OrganizationPage from './pages/OrganizationPage'
import PerformancePage from './pages/PerformancePage'
import VoorraadPage from './pages/VoorraadPage'
import EvenementenPage from './pages/EvenementenPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
      />
      <Route
        path="/company"
        element={<ProtectedRoute><CompanyPage /></ProtectedRoute>}
      />
      <Route
        path="/data"
        element={<ProtectedRoute><DataPage /></ProtectedRoute>}
      />
      <Route
        path="/forecast"
        element={<ProtectedRoute><ForecastPage /></ProtectedRoute>}
      />
      <Route
        path="/staffing"
        element={<ProtectedRoute><StaffingPage /></ProtectedRoute>}
      />
      <Route
        path="/organization"
        element={<ProtectedRoute><OrganizationPage /></ProtectedRoute>}
      />
      <Route
        path="/performance"
        element={<ProtectedRoute><PerformancePage /></ProtectedRoute>}
      />
      <Route
        path="/voorraad"
        element={<ProtectedRoute><VoorraadPage /></ProtectedRoute>}
      />
      <Route
        path="/evenementen"
        element={<ProtectedRoute><EvenementenPage /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
