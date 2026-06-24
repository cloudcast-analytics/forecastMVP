import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Upload,
  Database,
  TrendingUp,
  Users,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

const navItems = [
  { to: '/dashboard',                label: 'Dashboard', icon: LayoutDashboard },
  { to: '/companies',                label: 'Bedrijven', icon: Building2 },
  { to: '/locations',                label: 'Locaties',  icon: MapPin },
  { to: '/data/upload',              label: 'Upload',    icon: Upload },
  { to: '/data',                     label: 'Data',      icon: Database },
  { to: '/forecast',                 label: 'Forecast',  icon: TrendingUp },
  { to: '/staffing',                 label: 'Personeel', icon: Users },
  { to: '/settings/data-management', label: 'Beheer',    icon: Settings },
]

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div
      className="bg-mesh"
      style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div
        className="lg:hidden"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 40,
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.4)',
          boxShadow: '0 2px 12px rgba(26,68,232,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo-icon.png" alt="" style={{ height: '26px' }} />
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: '#1a1f36' }}>
            CloudCast
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1f36' }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex' }}
        >
          <div style={{
            width: '240px',
            paddingTop: '56px',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.4)',
          }}>
            <nav style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 14px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? '#1a44e8' : '#6b7280',
                    background: isActive ? 'rgba(26,68,232,0.08)' : 'transparent',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} color={isActive ? '#1a44e8' : '#9ca3af'} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
          <div style={{ flex: 1 }} onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        paddingTop: '56px',
      }}
        className="lg:pt-0"
      >
        <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
