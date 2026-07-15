import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building,
  Calendar,
  TrendingUp,
  BarChart2,
  Package,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import Sidebar from './Sidebar'
import Cloudy from '../cloudy/Cloudy'
import { useApp } from '../../context/AppContext'

interface LayoutProps {
  children: React.ReactNode
}

const allNavItems = [
  { to: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard, adminOnly: false },
  { to: '/forecast',     label: 'Forecast',         icon: TrendingUp,      adminOnly: false },
  { to: '/performance',  label: 'Performance',      icon: BarChart2,       adminOnly: false },
  { to: '/voorraad',     label: 'Voorraad',         icon: Package,         adminOnly: false },
  { to: '/evenementen',  label: 'Evenementen',      icon: Calendar,        adminOnly: false },
  { to: '/staffing',     label: 'Personeelsregels', icon: Users,           adminOnly: false },
  { to: '/organization', label: 'Organisatie',      icon: Building,        adminOnly: false },
  { to: '/data',         label: 'Data beheer',      icon: Settings,        adminOnly: false },
]

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { selectedCompany, selectedLocation, setSelectedLocation, locations, logout, currentUser, isDemo, role, demoViewRole, setDemoViewRole } = useApp()
  const navigate = useNavigate()
  const navItems = allNavItems.filter(item => !item.adminOnly || role === 'admin')

  async function handleLogout() {
    await logout()
    navigate('/login')
    setMobileOpen(false)
  }

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
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Bedrijfsblok */}
            {(selectedCompany || isDemo) && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { navigate('/company'); setMobileOpen(false) }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { navigate('/company'); setMobileOpen(false) } }}
                style={{
                  margin: '12px 12px 4px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'rgba(26,68,232,0.05)',
                  border: '1px solid rgba(26,68,232,0.1)',
                  cursor: 'pointer',
                }}
              >
                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bedrijf
                </p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1f36', lineHeight: 1.3 }}>
                  {selectedCompany?.name ?? 'Waterfront Genk'}
                </p>
                {isDemo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      background: '#1a44e8',
                      color: 'white',
                      padding: '1px 8px',
                      borderRadius: '99px',
                      letterSpacing: '0.03em',
                    }}>
                      Demo
                    </span>
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{ display: 'flex', borderRadius: '99px', overflow: 'hidden', border: '1px solid rgba(26,68,232,0.2)' }}
                    >
                      {(['admin', 'customer'] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => setDemoViewRole(r)}
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 8px',
                            border: 'none',
                            cursor: 'pointer',
                            background: demoViewRole === r ? '#1a44e8' : 'transparent',
                            color: demoViewRole === r ? 'white' : '#6b7280',
                          }}
                        >
                          {r === 'admin' ? 'Admin' : 'Klant'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {locations.length === 1 && selectedLocation && (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {selectedLocation.name}
                  </p>
                )}
                {locations.length > 1 && (
                  <select
                    value={selectedLocation?.id ?? ''}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const loc = locations.find(l => l.id === e.target.value) ?? null
                      setSelectedLocation(loc)
                      setMobileOpen(false)
                    }}
                    style={{
                      marginTop: '6px',
                      width: '100%',
                      fontSize: '12px',
                      color: '#1a1f36',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: 0,
                    }}
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Navigatie */}
            <nav style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto' }}>
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

            {/* Footer: account + uitloggen */}
            <div style={{
              padding: '16px 26px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
            }}>
              {currentUser?.email && (
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#1a1f36', marginBottom: '4px' }}>
                  {currentUser.email}
                </p>
              )}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  fontSize: '12px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <LogOut size={13} />
                Uitloggen
              </button>
            </div>
          </div>
          {/* Overlay om drawer te sluiten */}
          <div style={{ flex: 1 }} onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main
        style={{ flex: 1, overflow: 'auto', paddingTop: '56px' }}
        className="lg:pt-0"
      >
        <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
        <Cloudy />
      </main>
    </div>
  )
}
