import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CompaniesPage from './pages/CompaniesPage'
import LocationsPage from './pages/LocationsPage'
import UploadPage from './pages/UploadPage'
import DataPage from './pages/DataPage'
import ForecastPage from './pages/ForecastPage'
import StaffingPage from './pages/StaffingPage'
import DataManagementPage from './pages/DataManagementPage'
import OrganizationPage from './pages/OrganizationPage'

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
        path="/companies"
        element={<ProtectedRoute><CompaniesPage /></ProtectedRoute>}
      />
      <Route
        path="/locations"
        element={<ProtectedRoute><LocationsPage /></ProtectedRoute>}
      />
      <Route
        path="/data/upload"
        element={<ProtectedRoute><UploadPage /></ProtectedRoute>}
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
        path="/settings/data-management"
        element={<ProtectedRoute><DataManagementPage /></ProtectedRoute>}
      />
      <Route
        path="/organization"
        element={<ProtectedRoute><OrganizationPage /></ProtectedRoute>}
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
