# Navigatie & Sidebar Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desktop sidebar inklapbaar maken, mobile drawer consistent maken met de desktop sidebar, en een globale locatieselector toevoegen in het bedrijfsblok.

**Architecture:** Twee bestanden worden volledig herschreven: `Sidebar.tsx` krijgt collapse state (localStorage), een ingeklapte icon-only modus, en een locatieselector in het bedrijfsblok. `Layout.tsx` krijgt een uitgebreide mobile drawer met dezelfde drie zones als de desktop sidebar. Geen nieuwe bestanden, geen nieuwe routes, geen AppContext-wijzigingen.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, lucide-react, localStorage API

## Global Constraints

- Alle gebruikerstekst in het Nederlands
- Geen nieuwe npm-dependencies
- `npm run build` moet slagen na elke taak
- Geen wijzigingen aan AppContext, routes, of andere pagina's
- Stijl consistent houden met bestaande sidebar (glassmorphism, `rgba(255,255,255,0.55)`, border-radius `12px`)
- localStorage key exact: `sidebar-collapsed` (waarden: `"true"` of `"false"`)

---

## Bestandsstructuur

```
src/components/layout/
  Sidebar.tsx     ← Task 1: volledig herschreven
  Layout.tsx      ← Task 2: mobile drawer sectie uitgebreid
```

---

## Task 1: Collapsible Sidebar + Locatieselector

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (volledig vervangen)

**Interfaces:**
- Consumes: `useApp()` → `{ selectedCompany, selectedLocation, setSelectedLocation, locations, logout, currentUser, isDemo }`
- Produces: collapsed sidebar state bewaard in `localStorage` onder key `sidebar-collapsed`

- [ ] **Stap 1: Vervang `src/components/layout/Sidebar.tsx` volledig met de onderstaande code**

```tsx
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
  ChevronLeft,
  ChevronRight,
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
      padding: '20px 12px',
      background: 'rgba(255,255,255,0.55)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(255,255,255,0.4)',
      boxShadow: '1px 0 12px rgba(26,68,232,0.03)',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '4px 12px',
        marginBottom: '8px',
        whiteSpace: 'nowrap',
      }}>
        <img
          src="/logo-icon.png"
          alt=""
          style={{
            height: '30px',
            width: 'auto',
            flexShrink: 0,
            filter: 'drop-shadow(0 2px 4px rgba(26,68,232,.12))',
          }}
        />
        {!collapsed && (
          <span style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '17px',
            fontWeight: 400,
            color: '#1a1f36',
          }}>
            CloudCast
          </span>
        )}
      </div>

      {/* Company/location context — verborgen als ingeklapt */}
      {!collapsed && (selectedCompany || isDemo) && (
        <div style={{
          margin: '4px 12px 16px',
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
          {/* Locatieselector: plain tekst bij 1 locatie, dropdown bij 2+ */}
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

      {/* Footer: logout + collapse toggle */}
      <div style={{
        padding: '16px 14px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: collapsed ? 'center' : 'flex-start',
      }}>
        {!collapsed && currentUser?.email && (
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#1a1f36' }}>
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
        <button
          onClick={toggleCollapsed}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0,
            border: 'none',
            background: 'none',
            fontSize: '12px',
            color: '#9ca3af',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && 'Inklappen'}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Stap 2: Verifieer build**

```bash
cd C:\shit\Bezig\CloudCast_Anal\forecastmvp
npm run build
```

Verwacht: `✓ built in X.XXs` zonder TypeScript-fouten.

- [ ] **Stap 3: Visuele check**

Start dev server: `npm run dev` → open `http://localhost:5173`

Controleer:
- Sidebar toont "CloudCast" logo + tekst + bedrijfsblok + nav labels + footer
- "Inklappen" knop onderaan klapt de sidebar in tot 64px breed
- In ingeklapte staat: alleen iconen zichtbaar, gecentreerd, geen labels, geen bedrijfsblok, geen e-mail
- "ChevronRight" icoon klapt terug uit
- Na refresh: ingeklapte staat blijft bewaard (localStorage)
- In demo mode: bedrijfsblok toont "Waterfront Genk" + Demo-badge + locatienaam als plain tekst (1 locatie)

- [ ] **Stap 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: collapsible sidebar met locatieselector"
```

---

## Task 2: Mobile Drawer Consistentie

**Files:**
- Modify: `src/components/layout/Layout.tsx` (volledig vervangen)

**Interfaces:**
- Consumes: `useApp()` → `{ selectedCompany, selectedLocation, setSelectedLocation, locations, logout, currentUser, isDemo }`
- Consumes: company block markup patroon uit Task 1 (zelfde structuur, zelfde stijlen)

- [ ] **Stap 1: Vervang `src/components/layout/Layout.tsx` volledig met de onderstaande code**

```tsx
import React, { useState } from 'react'
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
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import Sidebar from './Sidebar'
import { useApp } from '../../context/AppContext'

interface LayoutProps {
  children: React.ReactNode
}

const navItems = [
  { to: '/dashboard',                label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/companies',                label: 'Bedrijven',   icon: Building2 },
  { to: '/locations',                label: 'Locaties',    icon: MapPin },
  { to: '/data/upload',              label: 'Upload',      icon: Upload },
  { to: '/data',                     label: 'Data',        icon: Database },
  { to: '/forecast',                 label: 'Forecast',    icon: TrendingUp },
  { to: '/staffing',                 label: 'Personeel',   icon: Users },
  { to: '/organization',             label: 'Organisatie', icon: Building },
  { to: '/settings/data-management', label: 'Beheer',      icon: Settings },
]

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { selectedCompany, selectedLocation, setSelectedLocation, locations, logout, currentUser, isDemo } = useApp()
  const navigate = useNavigate()

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
              <div style={{
                margin: '12px 12px 4px',
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
            <nav style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
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
      </main>
    </div>
  )
}
```

- [ ] **Stap 2: Verifieer build**

```bash
cd C:\shit\Bezig\CloudCast_Anal\forecastmvp
npm run build
```

Verwacht: `✓ built in X.XXs` zonder TypeScript-fouten.

- [ ] **Stap 3: Visuele check (mobiel/small screen)**

Verklein het browservenster tot onder de `lg` breakpoint (< 1024px).

Controleer:
- Topbalk toont logo + hamburger (drie streepjes)
- Klikken op hamburger opent de drawer
- Drawer toont: bedrijfsblok bovenaan → navigatie-items → account-email + uitlogknop onderaan
- Klikken op kruisje sluit de drawer
- Klikken naast de drawer (overlay) sluit de drawer
- In demo mode: bedrijfsblok toont "Waterfront Genk" + Demo-badge + "Genk" als locatienaam

- [ ] **Stap 4: Commit**

```bash
git add src/components/layout/Layout.tsx
git commit -m "feat: mobile drawer met bedrijfsblok en account footer"
```
