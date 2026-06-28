import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Building,
  MapPin,
  Upload,
  Database,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const navItems = [
  { to: '/dashboard',                label: 'Dashboard',         icon: LayoutDashboard },
  { to: '/companies',                label: 'Bedrijven',         icon: Building2 },
  { to: '/locations',                label: 'Locaties',          icon: MapPin },
  { to: '/data/upload',              label: 'Upload data',       icon: Upload },
  { to: '/data',                     label: 'Mijn data',         icon: Database },
  { to: '/forecast',                 label: 'Forecast',          icon: TrendingUp },
  { to: '/staffing',                 label: 'Personeelsregels',  icon: Users },
  { to: '/organization',             label: 'Organisatie',       icon: Building },
  { to: '/settings/data-management', label: 'Data beheer',       icon: Settings },
]

export default function Sidebar() {
  const { selectedCompany, selectedLocation, setSelectedLocation, locations, logout, currentUser, isDemo } = useApp()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside style={{
      width: collapsed ? '64px' : '240px',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      background: 'rgba(255,255,255,0.55)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(255,255,255,0.4)',
      boxShadow: '1px 0 12px rgba(26,68,232,0.03)',
      overflow: 'hidden',
    }}>
      {/* Hamburger toggle — bovenaan, altijd zichtbaar */}
      <button
        onClick={toggleCollapsed}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: '#1a1f36',
          alignSelf: collapsed ? 'center' : 'flex-start',
          marginBottom: '12px',
          flexShrink: 0,
        }}
      >
        <Menu size={20} />
      </button>

      {/* Logo — verborgen als ingeklapt */}
      {!collapsed && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 12px',
          marginBottom: '16px',
          whiteSpace: 'nowrap',
        }}>
          <img
            src="/logo-icon.png"
            alt=""
            style={{
              height: '28px',
              width: 'auto',
              flexShrink: 0,
              filter: 'drop-shadow(0 2px 4px rgba(26,68,232,.12))',
            }}
          />
          <span style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '17px',
            fontWeight: 400,
            color: '#1a1f36',
          }}>
            CloudCast
          </span>
        </div>
      )}

      {/* Company/location context — verborgen als ingeklapt */}
      {!collapsed && (selectedCompany || isDemo) && (
        <div style={{
          margin: '0 12px 16px',
          padding: '10px 12px',
          borderRadius: '12px',
          background: 'rgba(26,68,232,0.05)',
          border: '1px solid rgba(26,68,232,0.1)',
        }}>
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Bedrijf
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1f36', lineHeight: 1.3 }}>
            {selectedCompany?.name ?? 'Waterfront Genk'}
          </p>
          {isDemo && (
            <span style={{
              display: 'inline-block',
              marginTop: '4px',
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
          )}
          {locations.length === 1 && selectedLocation && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {selectedLocation.name}
            </p>
          )}
          {locations.length > 1 && (
            <select
              value={selectedLocation?.id ?? ''}
              onChange={e => {
                const loc = locations.find(l => l.id === e.target.value) ?? null
                setSelectedLocation(loc)
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
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px',
              padding: collapsed ? '9px 0' : '9px 14px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? '#1a44e8' : '#6b7280',
              background: isActive ? 'rgba(26,68,232,0.08)' : 'transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} color={isActive ? '#1a44e8' : '#9ca3af'} />
                {!collapsed && label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer: alleen logout */}
      <div style={{
        padding: '16px 14px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignItems: collapsed ? 'center' : 'flex-start',
      }}>
        {!collapsed && currentUser?.email && (
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
          {!collapsed && 'Uitloggen'}
        </button>
      </div>
    </aside>
  )
}
