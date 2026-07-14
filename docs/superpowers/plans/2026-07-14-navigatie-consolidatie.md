# Navigatie-consolidatie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De sidebar-navigatie inkorten van 11 naar 7 items door "Bedrijven"/"Locaties" te vervangen door een klikbare context-kaart, en "Upload data"/"Mijn data"/"Data beheer" samen te voegen tot één "Data beheer"-tab met sub-tabs.

**Architecture:** `AppContext` krijgt een `demoViewRole`-state zodat de sidebar en de nieuwe `/company`-pagina in demo-modus kunnen wisselen tussen een admin- en klant-weergave. De context-kaart in `Sidebar.tsx` wordt klikbaar en navigeert naar één nieuwe route `/company`, die intern vertakt op rol. De drie data-pagina's worden samengevoegd tot één `DataPage.tsx`-container met twee sub-componenten (`OverviewTab`, `UploadTab`), zelfde patroon als de bestaande Organisatie-pagina's sub-tabs.

**Tech Stack:** React 19 + TypeScript + Vite (bestaand), Vitest (bestaand), react-router-dom (bestaand).

**Spec:** `docs/superpowers/specs/2026-07-14-navigatie-consolidatie-design.md`

## Global Constraints

- Alle UI-teksten in het Nederlands; datums in Belgisch formaat (`nl-BE`).
- Geen nieuwe dependencies — alles met de bestaande stack (`react-router-dom`, `lucide-react`, `vitest`).
- `npm run build` (tsc -b && vite build) en `npm run lint` (oxlint) moeten na elke taak slagen; `npx vitest run` moet na elke taak alle tests groen houden.
- Bestaande visuele stijl behouden: glass-cards, kleuren `#1a44e8` (blauw), `#059669` (groen), `#7c3aed` (paars), Tailwind-klassen zoals in de bestaande pagina's.
- Buiten scope: klant-uitnodigingsflow/accounttab (roadmap-item 11 in `OVERZICHT_AANPASSINGEN.md`), bewerken van bestaande bedrijfs-/locatiegegevens (blijft view-only/aanmaken zoals nu — geen "Bewerken"-knop op bedrijfsgegevens).

---

### Task 1: `AppContext` — `resolveRole` + demo-rolwisselaar (TDD)

**Files:**
- Modify: `src/context/AppContext.tsx`
- Test: `src/context/__tests__/AppContext.test.ts`

**Interfaces:**
- Produces:
  - `export type Role = 'admin' | 'customer' | null` (nieuw geëxporteerd, was lokaal)
  - `export type DemoViewRole = 'admin' | 'customer'`
  - `export function resolveRole(isDemoMode: boolean, demoViewRole: DemoViewRole, actualRole: Role): Role`
  - `AppContextValue` krijgt twee nieuwe velden: `demoViewRole: DemoViewRole`, `setDemoViewRole: (r: DemoViewRole) => void`

- [ ] **Step 1: Schrijf de falende test**

Create `src/context/__tests__/AppContext.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveRole } from '../AppContext'

describe('resolveRole', () => {
  it('gebruikt demoViewRole wanneer isDemo true is', () => {
    expect(resolveRole(true, 'customer', 'admin')).toBe('customer')
    expect(resolveRole(true, 'admin', null)).toBe('admin')
  })

  it('gebruikt de echte rol wanneer isDemo false is', () => {
    expect(resolveRole(false, 'customer', 'admin')).toBe('admin')
    expect(resolveRole(false, 'admin', null)).toBe(null)
  })
})
```

- [ ] **Step 2: Run de test — verwacht FAIL**

Run: `npx vitest run src/context/__tests__/AppContext.test.ts`
Expected: FAIL — "resolveRole is not exported"

- [ ] **Step 3: Herschrijf `AppContext.tsx`**

Rewrite `src/context/AppContext.tsx` volledig:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Company, Location } from '../types/database'
import { isDemo, supabase } from '../lib/supabase'
import { getCompanies, getLocations } from '../services/supabaseService'
import { DEMO_COMPANY, DEMO_LOCATION, DEMO_LOCATION_2 } from '../data/demoSeed'

export type Role = 'admin' | 'customer' | null
export type DemoViewRole = 'admin' | 'customer'

// Eén bron voor "welke rol zie ik nu": in demo-modus overschrijft de demo-wisselknop de echte rol
export function resolveRole(isDemoMode: boolean, demoViewRole: DemoViewRole, actualRole: Role): Role {
  return isDemoMode ? demoViewRole : actualRole
}

interface AppContextValue {
  selectedCompany: Company | null
  selectedLocation: Location | null
  setSelectedCompany: (c: Company | null) => void
  setSelectedLocation: (l: Location | null) => void
  companies: Company[]
  locations: Location[]
  currentUser: { email: string } | null
  isAuthenticated: boolean
  isDemo: boolean
  role: Role
  demoViewRole: DemoViewRole
  setDemoViewRole: (r: DemoViewRole) => void
  login: (email?: string) => void
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null)
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null)
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(isDemo)
  const [actualRole, setActualRole] = useState<Role>(isDemo ? 'admin' : null)
  const [demoViewRole, setDemoViewRole] = useState<DemoViewRole>('admin')
  const role = resolveRole(isDemo, demoViewRole, actualRole)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('user_id', userId)
      .single()

    if (!data) return

    setActualRole(data.role as Role)

    if (data.role === 'customer' && data.company_id) {
      // Customer: laad alleen zijn eigen bedrijf
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', data.company_id)
        .single()
      if (company) {
        setCompanies([company])
        setSelectedCompanyState(company)
      }
    } else {
      // Admin: laad alle bedrijven
      const all = await getCompanies()
      setCompanies(all)
      if (all.length > 0) setSelectedCompanyState(all[0])
    }
  }

  useEffect(() => {
    if (isDemo) {
      setCurrentUser({ email: 'demo@cloudcast.be' })
      setIsAuthenticated(true)
      setActualRole('admin')
      setCompanies([DEMO_COMPANY])
      setLocations([DEMO_LOCATION, DEMO_LOCATION_2])
      setSelectedCompanyState(DEMO_COMPANY)
      setSelectedLocationState(DEMO_LOCATION)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email ?? '' })
        setIsAuthenticated(true)
        loadProfile(session.user.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email ?? '' })
        setIsAuthenticated(true)
        loadProfile(session.user.id)
      } else {
        setCurrentUser(null)
        setIsAuthenticated(false)
        setActualRole(null)
        setCompanies([])
        setSelectedCompanyState(null)
        setSelectedLocationState(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!selectedCompany || isDemo) return
    getLocations(selectedCompany.id).then(data => {
      setLocations(data)
      if (data.length > 0) setSelectedLocationState(data[0])
    })
  }, [selectedCompany])

  function setSelectedCompany(c: Company | null) {
    setSelectedCompanyState(c)
  }

  function setSelectedLocation(l: Location | null) {
    setSelectedLocationState(l)
  }

  function login(email?: string) {
    setCurrentUser({ email: email ?? 'demo@cloudcast.be' })
    setIsAuthenticated(true)
    if (isDemo) {
      setActualRole('admin')
      setCompanies([DEMO_COMPANY])
      setLocations([DEMO_LOCATION, DEMO_LOCATION_2])
      setSelectedCompanyState(DEMO_COMPANY)
      setSelectedLocationState(DEMO_LOCATION)
    }
  }

  async function logout() {
    if (!isDemo) await supabase.auth.signOut()
    setCurrentUser(null)
    setIsAuthenticated(false)
    setActualRole(null)
    setCompanies([])
    setSelectedCompanyState(null)
    setSelectedLocationState(null)
  }

  return (
    <AppContext.Provider
      value={{
        selectedCompany,
        selectedLocation,
        setSelectedCompany,
        setSelectedLocation,
        companies,
        locations,
        currentUser,
        isAuthenticated,
        isDemo,
        role,
        demoViewRole,
        setDemoViewRole,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
```

- [ ] **Step 4: Run de test — verwacht PASS**

Run: `npx vitest run src/context/__tests__/AppContext.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Build en commit**

Run: `npm run build` — Expected: succes.

```bash
git add src/context/AppContext.tsx src/context/__tests__/AppContext.test.ts
git commit -m "feat: demo-rolwisselaar (admin/klant) in AppContext"
```

---

### Task 2: Sidebar — nav inkorten, context-kaart klikbaar, demo-rolwisselaar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `role`, `demoViewRole`, `setDemoViewRole` uit `useApp()` (Task 1)
- Produces: geen nieuwe interfaces (UI-component)

- [ ] **Step 1: Herschrijf `Sidebar.tsx` volledig**

Rewrite `src/components/layout/Sidebar.tsx`:

```tsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building,
  TrendingUp,
  BarChart2,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const allNavItems = [
  { to: '/dashboard',    label: 'Dashboard',        icon: LayoutDashboard, adminOnly: false, end: true },
  { to: '/forecast',     label: 'Forecast',          icon: TrendingUp,      adminOnly: false, end: true },
  { to: '/performance',  label: 'Performance',       icon: BarChart2,       adminOnly: false, end: true },
  { to: '/voorraad',     label: 'Voorraad',          icon: Package,         adminOnly: false, end: true },
  { to: '/staffing',     label: 'Personeelsregels',  icon: Users,           adminOnly: false, end: true },
  { to: '/organization', label: 'Organisatie',       icon: Building,        adminOnly: false, end: true },
  { to: '/data',         label: 'Data beheer',       icon: Settings,        adminOnly: false, end: true },
]

export default function Sidebar() {
  const {
    selectedCompany, selectedLocation, setSelectedLocation, locations,
    logout, currentUser, isDemo, role, demoViewRole, setDemoViewRole,
  } = useApp()
  const navItems = allNavItems.filter(item => !item.adminOnly || role === 'admin')
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
      {/* Hamburger toggle */}
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

      {/* Logo */}
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

      {/* Company/location context — klikbaar, navigeert naar /company */}
      {!collapsed && (selectedCompany || isDemo) && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/company')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/company') }}
          style={{
            margin: '0 12px 16px',
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
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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

      {/* Footer */}
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
```

- [ ] **Step 2: Build — verwacht succes**

Run: `npm run build`
Expected: succes. `App.tsx` is in deze taak niet aangepast, dus alle bestaande routes (`/companies`, `/locations`, `/data`, `/data/upload`, `/settings/data-management`) bestaan nog gewoon — alleen de nav-items ernaartoe zijn uit de sidebar verdwenen. Dat is geen build-fout, wel de reden voor de tijdelijke situatie in Step 3 hieronder.

- [ ] **Step 3: Visuele verificatie in de browser**

Run: `npm run dev`, open `http://localhost:5173`.
Verwacht:
- Sidebar toont 7 items: Dashboard, Forecast, Performance, Voorraad, Personeelsregels, Organisatie, Data beheer (laatste, tandwiel-icoon). Klikken op "Data beheer" navigeert naar `/data` en toont nog de **oude** inhoud van die pagina (de huidige "Mijn data"-tabel) — dat klopt, want `DataPage.tsx` wordt pas in Task 4 herschreven.
- Context-kaart bovenaan toont "Bekijk als: Admin / Klant"-schakelaar naast de Demo-badge. Klikken op "Klant" verandert de knopstijl (actief = blauw). Klikken ergens anders op de kaart navigeert naar `/company` — dat bestaat als route nog niet, dus je valt terug op de catch-all-route en landt op `/dashboard`. Dat is verwacht; de route wordt pas in Task 3 toegevoegd.
- De locatie-dropdown in de kaart blijft apart werken (wisselen van locatie navigeert niet weg).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: sidebar-navigatie ingekort, context-kaart klikbaar, demo-rolwisselaar"
```

---

### Task 3: `/company`-pagina (admin + klant-variant)

**Files:**
- Create: `src/pages/CompanyPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/cloudy/Cloudy.tsx`
- Delete: `src/pages/CompaniesPage.tsx`, `src/pages/LocationsPage.tsx`

**Interfaces:**
- Consumes: `role`, `selectedCompany`, `locations`, `selectedLocation`, `setSelectedLocation`, `isDemo` uit `useApp()` (Task 1); `createLocation` uit `supabaseService.ts` (bestaand)
- Produces: geen nieuwe interfaces (pagina-component)

- [ ] **Step 1: Maak `CompanyPage.tsx`**

Create `src/pages/CompanyPage.tsx`:

```tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, MapPin } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { createLocation } from '../services/supabaseService'

export default function CompanyPage() {
  const { role, selectedCompany, locations, selectedLocation, setSelectedLocation, isDemo } = useApp()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', city: '', country: 'België',
    location_type: '', max_capacity: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompany) return
    setSaving(true)
    await createLocation({
      ...form,
      company_id: selectedCompany.id,
      max_capacity: Number(form.max_capacity) || 0,
    })
    setSaving(false)
    setShowModal(false)
  }

  if (role !== 'admin') {
    return (
      <Layout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Mijn locaties</h1>
          <p className="text-slate-500 text-sm mt-1">{selectedCompany?.name ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {locations.map(l => (
            <button
              key={l.id}
              onClick={() => { setSelectedLocation(l); navigate('/dashboard') }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <MapPin size={15} className="text-slate-400 flex-shrink-0" />
              <span className="flex-1 font-medium text-slate-900 text-sm">{l.name}</span>
              <span className="text-sm text-slate-500">{l.city}</span>
            </button>
          ))}
          {locations.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nog geen locaties.</div>
          )}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bedrijf</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900 text-sm">{selectedCompany?.name ?? '—'}</h2>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400 text-xs mb-0.5">Sector</dt>
            <dd className="text-slate-700">{selectedCompany?.sector || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs mb-0.5">Contactpersoon</dt>
            <dd className="text-slate-700">{selectedCompany?.contact_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs mb-0.5">E-mail</dt>
            <dd className="text-slate-700">{selectedCompany?.contact_email || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs mb-0.5">Telefoon</dt>
            <dd className="text-slate-700">{selectedCompany?.phone || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 text-sm">Locaties</h2>
        {!isDemo && (
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Nieuwe locatie
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Naam</th>
              <th className="px-4 py-3 font-medium text-slate-600">Stad</th>
              <th className="px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 font-medium text-slate-600">Max capaciteit</th>
            </tr>
          </thead>
          <tbody>
            {locations.map(l => (
              <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                  <MapPin size={15} className="text-slate-400" />
                  {l.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{l.city}</td>
                <td className="px-4 py-3 text-slate-600">{l.location_type}</td>
                <td className="px-4 py-3 text-slate-600">{l.max_capacity.toLocaleString('nl-BE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {locations.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Nog geen locaties.</div>
        )}
      </div>

      {showModal && (
        <Modal title="Nieuwe locatie toevoegen" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {[
              { key: 'name', label: 'Naam', required: true },
              { key: 'address', label: 'Adres', required: false },
              { key: 'city', label: 'Stad', required: true },
              { key: 'country', label: 'Land', required: false },
              { key: 'location_type', label: 'Type locatie', required: false },
              { key: 'max_capacity', label: 'Max capaciteit', required: false },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input
                  type={key === 'max_capacity' ? 'number' : 'text'}
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuleren</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  )
}
```

- [ ] **Step 2: Werk de routing in `App.tsx` bij**

In `src/App.tsx`, vervang de imports:

```tsx
import DashboardPage from './pages/DashboardPage'
import CompaniesPage from './pages/CompaniesPage'
import LocationsPage from './pages/LocationsPage'
import UploadPage from './pages/UploadPage'
import DataPage from './pages/DataPage'
import ForecastPage from './pages/ForecastPage'
import StaffingPage from './pages/StaffingPage'
import DataManagementPage from './pages/DataManagementPage'
import OrganizationPage from './pages/OrganizationPage'
import PerformancePage from './pages/PerformancePage'
import VoorraadPage from './pages/VoorraadPage'
```

door:

```tsx
import DashboardPage from './pages/DashboardPage'
import CompanyPage from './pages/CompanyPage'
import UploadPage from './pages/UploadPage'
import DataPage from './pages/DataPage'
import ForecastPage from './pages/ForecastPage'
import StaffingPage from './pages/StaffingPage'
import DataManagementPage from './pages/DataManagementPage'
import OrganizationPage from './pages/OrganizationPage'
import PerformancePage from './pages/PerformancePage'
import VoorraadPage from './pages/VoorraadPage'
```

(`UploadPage`/`DataManagementPage` blijven nog even geïmporteerd — die routes verdwijnen pas in Task 4.)

Vervang de routes:

```tsx
      <Route
        path="/companies"
        element={<ProtectedRoute><CompaniesPage /></ProtectedRoute>}
      />
      <Route
        path="/locations"
        element={<ProtectedRoute><LocationsPage /></ProtectedRoute>}
      />
```

door:

```tsx
      <Route
        path="/company"
        element={<ProtectedRoute><CompanyPage /></ProtectedRoute>}
      />
```

- [ ] **Step 3: Voeg een Cloudy-context toe voor `/company`**

In `src/components/cloudy/Cloudy.tsx`, voeg in `PAGE_CONTEXT` (na de `/dashboard`-entry) toe:

```ts
  '/company': {
    greeting: 'Hier zie je je bedrijfsgegevens en locaties.',
    suggestions: ['Hoe voeg ik een locatie toe?', 'Wat doet CloudCast precies?'],
  },
```

- [ ] **Step 4: Verwijder de oude pagina's**

```bash
rm src/pages/CompaniesPage.tsx src/pages/LocationsPage.tsx
```

- [ ] **Step 5: Build — verwacht succes**

Run: `npm run build`
Expected: succes, zonder fouten. `App.tsx` importeert `UploadPage`/`DataManagementPage` nog steeds ongewijzigd (die routes verdwijnen pas in Task 4), dus die blijven gewoon werken. Controleer dat er geen enkele referentie meer overblijft naar `CompaniesPage`, `LocationsPage`, `/companies` of `/locations`.

- [ ] **Step 6: Visuele verificatie in de browser**

Run: `npm run dev`.
Verwacht:
- Klik op de context-kaart in de sidebar (met "Admin" actief in de demo-rolwisselaar) → navigeert naar `/company`, toont bedrijfsgegevens (Waterfront Genk) + locatietabel met "Waterfront Terras"/"Waterfront Strandje" (of de huidige demo-locaties) + "Nieuwe locatie"-knop.
- Zet de demo-rolwisselaar op "Klant" → klik opnieuw op de kaart → `/company` toont nu de simpele klikbare locatielijst i.p.v. de tabel.
- Klik op een locatie in de klant-variant → navigeert naar `/dashboard` en de geklikte locatie staat actief in de context-kaart.

- [ ] **Step 7: Commit**

```bash
git add src/pages/CompanyPage.tsx src/App.tsx src/components/cloudy/Cloudy.tsx
git rm src/pages/CompaniesPage.tsx src/pages/LocationsPage.tsx
git commit -m "feat: /company-pagina vervangt Bedrijven/Locaties, met admin- en klant-variant"
```

---

### Task 4: "Data beheer"-pagina (sub-tabs Overzicht/Uploaden)

**Files:**
- Rewrite: `src/pages/DataPage.tsx`
- Create: `src/components/data/OverviewTab.tsx`
- Create: `src/components/data/UploadTab.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/components/cloudy/Cloudy.tsx`
- Delete: `src/pages/UploadPage.tsx`, `src/pages/DataManagementPage.tsx`

**Interfaces:**
- Consumes: `getObservations`, `deleteObservation`, `getUploadedFiles`, `saveObservations` uit `supabaseService.ts` (bestaand); `validateRow` uit `validationService.ts` (bestaand); `getDateFeatures`, `formatDate` uit `lib/utils.ts` (bestaand)
- Produces:
  - `OverviewTab` — geen props
  - `UploadTab({ onImported: () => void })`

- [ ] **Step 1: Maak `OverviewTab.tsx`**

Create `src/components/data/OverviewTab.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Download, Trash2, Info } from 'lucide-react'
import Button from '../ui/Button'
import DataTable from './DataTable'
import ConfirmModal from '../ui/ConfirmModal'
import { useApp } from '../../context/AppContext'
import { getObservations, deleteObservation, getUploadedFiles } from '../../services/supabaseService'
import type { DailyObservation, UploadedFile } from '../../types/database'
import { formatDate } from '../../lib/utils'

export default function OverviewTab() {
  const { selectedLocation, isDemo } = useApp()
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [filtered, setFiltered] = useState<DailyObservation[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    Promise.all([
      getObservations(selectedLocation.id),
      getUploadedFiles(selectedLocation.id),
    ]).then(([obs, f]) => {
      const active = obs.filter(o => !o.deleted_at)
      setObservations(active)
      setFiltered(active)
      setFiles(f)
      setLoading(false)
    })
  }, [selectedLocation])

  useEffect(() => {
    let result = observations
    if (fromDate) result = result.filter(o => o.date >= fromDate)
    if (toDate) result = result.filter(o => o.date <= toDate)
    setFiltered(result.sort((a, b) => b.date.localeCompare(a.date)))
  }, [fromDate, toDate, observations])

  async function handleDelete(id: string) {
    await deleteObservation(id)
    setObservations(prev => prev.filter(o => o.id !== id))
    setDeleteId(null)
  }

  function handleDeleteFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
    setConfirmDeleteFile(null)
  }

  function exportCSV() {
    const cols = ['date', 'revenue', 'visitors', 'transactions', 'staff_scheduled', 'occupancy_rate']
    const header = cols.join(';')
    const rows = filtered.map(o =>
      cols.map(c => (o as unknown as Record<string, unknown>)[c] ?? '').join(';')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cloudcast-data-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-800">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          CloudCast gebruikt bij voorkeur geaggregeerde dagdata. Persoonsgegevens zijn niet nodig voor revenue forecasting.
          Upload geen bestanden met namen, adressen of andere identificerende gegevens.
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-slate-900 text-sm">{filtered.length} records</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {fromDate || toDate ? 'Gefilterd op datumbereik' : 'Alle beschikbare data'}
          </p>
        </div>
        <Button variant="secondary" onClick={exportCSV}>
          <Download size={15} />
          Exporteer CSV
        </Button>
      </div>

      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Van</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tot</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(fromDate || toDate) && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate('') }}>
              Wis filters
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Data laden...</p>
      ) : (
        <DataTable
          observations={filtered}
          onDelete={id => {
            if (isDemo) return
            setDeleteId(id)
          }}
        />
      )}

      <h2 className="text-base font-semibold text-slate-800 mt-8 mb-3">Geüploade bestanden</h2>

      {loading ? (
        <p className="text-slate-400 text-sm">Laden...</p>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          {isDemo ? 'In demo-modus worden geen bestanden bijgehouden.' : 'Nog geen bestanden geüpload.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Bestandsnaam</th>
                <th className="px-4 py-3 font-medium text-slate-600">Datum upload</th>
                <th className="px-4 py-3 font-medium text-slate-600">Rijen</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{f.filename}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(f.created_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{f.row_count.toLocaleString('nl-BE')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDeleteFile(f.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Verwijder upload"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          title="Observatie verwijderen"
          message="Weet je zeker dat je deze observatie wil verwijderen? Dit heeft invloed op de kwaliteit van je forecast."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
          confirmLabel="Verwijderen"
        />
      )}

      {confirmDeleteFile && (
        <ConfirmModal
          title="Upload verwijderen"
          message="Wil je dit bestand verwijderen? De geïmporteerde observaties blijven behouden, maar de forecast-modelkwaliteit kan dalen als je ook de records verwijdert."
          onConfirm={() => handleDeleteFile(confirmDeleteFile)}
          onCancel={() => setConfirmDeleteFile(null)}
          confirmLabel="Verwijderen"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Maak `UploadTab.tsx`**

Create `src/components/data/UploadTab.tsx`:

```tsx
import React, { useState } from 'react'
import { CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import Button from '../ui/Button'
import FileUpload from './FileUpload'
import ColumnMapper from './ColumnMapper'
import { useApp } from '../../context/AppContext'
import { validateRow } from '../../services/validationService'
import { saveObservations } from '../../services/supabaseService'
import type { DailyObservation } from '../../types/database'
import { getDateFeatures } from '../../lib/utils'

type Step = 'upload' | 'preview' | 'map' | 'validate' | 'done'

const CLOUDY_TIPS: Record<string, string> = {
  upload: 'Upload een CSV of Excel-bestand. Zorg dat rij 1 kolomnamen bevat en je een datumkolom hebt (bijv. "Datum" of "Date"). Omzet, bezoekers en personeel zijn optioneel maar verbeteren je forecast.',
  preview: 'Ziet dit er goed uit? Controleer of de rijen kloppen en je de juiste kolommen ziet. Zijn er lege rijen of rare waarden? Dat los je op in de volgende stap.',
  map: 'Koppel elke kolom aan het juiste veld. Een datumkolom is verplicht. Ontbrekende kolommen kun je leeg laten — die data wordt dan niet geïmporteerd.',
  validate: 'Ik heb je data gecontroleerd. Ongeldige rijen (bijv. ontbrekende datum of tekst in een getallenveld) worden overgeslagen. Geldige rijen kun je gewoon importeren.',
  done: 'Super! Je data is geïmporteerd. Ga naar Overzicht om te zien wat ik ervan maak. Hoe meer historische data je hebt, hoe nauwkeuriger de prognose.',
}

function CloudyTip({ step }: { step: string }) {
  return (
    <div style={{
      display: 'flex', gap: '10px', alignItems: 'flex-start',
      background: 'rgba(26,68,232,0.05)', border: '1px solid rgba(26,68,232,0.12)',
      borderRadius: '12px', padding: '12px 14px', marginBottom: '20px',
    }}>
      <div style={{
        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #1a44e8, #6b3cdc)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={13} color="#fff" />
      </div>
      <div>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a44e8', marginBottom: '2px' }}>Cloudy zegt</p>
        <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{CLOUDY_TIPS[step]}</p>
      </div>
    </div>
  )
}

interface UploadTabProps {
  onImported: () => void
}

export default function UploadTab({ onImported }: UploadTabProps) {
  const { selectedCompany, selectedLocation } = useApp()
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [filename, setFilename] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validResults, setValidResults] = useState<{ valid: number; invalid: number; errors: string[] }>({ valid: 0, invalid: 0, errors: [] })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleFileLoaded(loadedRows: Record<string, string>[], name: string) {
    setRows(loadedRows)
    setFilename(name)
    const firstRow = loadedRows[0] ?? {}
    const autoMap: Record<string, string> = {}
    for (const col of Object.keys(firstRow)) {
      const lower = col.toLowerCase()
      if (lower.includes('datum') || lower === 'date') autoMap[col] = 'date'
      else if (lower.includes('omzet') || lower.includes('revenue') || lower.includes('opbrengst')) autoMap[col] = 'revenue'
      else if (lower.includes('bezoeker') || lower.includes('visitor')) autoMap[col] = 'visitors'
      else if (lower.includes('transact')) autoMap[col] = 'transactions'
      else if (lower.includes('personeel') || lower.includes('staff')) autoMap[col] = 'staff_scheduled'
    }
    setMapping(autoMap)
    setStep('preview')
  }

  function handleValidate() {
    let validCount = 0
    let invalidCount = 0
    const errorMessages: string[] = []
    for (let i = 0; i < rows.length; i++) {
      const result = validateRow(rows[i], mapping, i)
      if (result.valid) validCount++
      else {
        invalidCount++
        if (errorMessages.length < 10) {
          errorMessages.push(`Rij ${i + 1}: ${result.errors.join(', ')}`)
        }
      }
    }
    setValidResults({ valid: validCount, invalid: invalidCount, errors: errorMessages })
    setStep('validate')
  }

  async function handleImport() {
    if (!selectedCompany || !selectedLocation) {
      alert('Selecteer eerst een locatie via de zijbalk voordat je data importeert.')
      return
    }
    setSaving(true)
    const observations: DailyObservation[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const result = validateRow(row, mapping, i)
      if (!result.valid) continue

      const dateField = Object.entries(mapping).find(([, v]) => v === 'date')?.[0]
      const revenueField = Object.entries(mapping).find(([, v]) => v === 'revenue')?.[0]
      const visitorsField = Object.entries(mapping).find(([, v]) => v === 'visitors')?.[0]
      const transField = Object.entries(mapping).find(([, v]) => v === 'transactions')?.[0]
      const staffField = Object.entries(mapping).find(([, v]) => v === 'staff_scheduled')?.[0]

      const dateStr = dateField ? row[dateField] : ''
      const features = getDateFeatures(dateStr)

      observations.push({
        id: crypto.randomUUID(),
        company_id: selectedCompany.id,
        location_id: selectedLocation.id,
        date: dateStr,
        revenue: revenueField ? Number(row[revenueField]) : undefined,
        visitors: visitorsField ? Number(row[visitorsField]) : undefined,
        transactions: transField ? Number(row[transField]) : undefined,
        staff_scheduled: staffField ? Number(row[staffField]) : undefined,
        ...features,
        is_holiday: false,
        is_school_holiday: false,
        is_public_holiday: false,
      })
    }

    try {
      await saveObservations(observations)
      setStep('done')
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err)
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <div>
      <p className="text-slate-500 text-sm mb-6">
        Locatie: <strong>{selectedLocation?.name ?? '—'}</strong>
      </p>

      {!selectedLocation && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(234,88,12,0.07)', border: '1px solid rgba(234,88,12,0.25)',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
          fontSize: '13px', color: '#c2410c',
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span>Geen locatie geselecteerd. Kies eerst een locatie via de zijbalk om data te kunnen importeren.</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(['upload', 'preview', 'map', 'validate', 'done'] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = { upload: '1. Bestand', preview: '2. Voorbeeld', map: '3. Koppelen', validate: '4. Validatie', done: '5. Klaar' }
          const isDone = (['upload', 'preview', 'map', 'validate', 'done'] as Step[]).indexOf(s) < (['upload', 'preview', 'map', 'validate', 'done'] as Step[]).indexOf(step)
          const isCurrent = s === step
          return (
            <React.Fragment key={s}>
              <span className={[
                'px-3 py-1 rounded-full font-medium text-xs',
                isCurrent ? 'bg-blue-600 text-white' : isDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
              ].join(' ')}>
                {labels[s]}
              </span>
              {i < 4 && <span className="text-slate-300">→</span>}
            </React.Fragment>
          )
        })}
      </div>

      {step === 'upload' && (
        <>
          <CloudyTip step="upload" />
          <FileUpload onFileLoaded={handleFileLoaded} />
        </>
      )}

      {step === 'preview' && (
        <div>
          <CloudyTip step="preview" />
          <p className="text-sm text-slate-600 mb-4">
            Bestand: <strong>{filename}</strong> — {rows.length} rijen gevonden
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-6">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {detectedColumns.map(col => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-slate-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {detectedColumns.map(col => (
                      <td key={col} className="px-3 py-2 text-slate-700">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('upload')}>Terug</Button>
            <Button onClick={() => setStep('map')}>Verder naar koppelen</Button>
          </div>
        </div>
      )}

      {step === 'map' && (
        <div>
          <CloudyTip step="map" />
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <ColumnMapper detectedColumns={detectedColumns} mapping={mapping} onChange={setMapping} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('preview')}>Terug</Button>
            <Button onClick={handleValidate}>Valideer data</Button>
          </div>
        </div>
      )}

      {step === 'validate' && (
        <div>
          <CloudyTip step="validate" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle size={18} />
                <span className="font-semibold">{validResults.valid} geldige rijen</span>
              </div>
            </div>
            <div className={`border rounded-xl p-4 ${validResults.invalid > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`flex items-center gap-2 ${validResults.invalid > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                <AlertCircle size={18} />
                <span className="font-semibold">{validResults.invalid} ongeldige rijen</span>
              </div>
            </div>
          </div>
          {validResults.errors.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-slate-700 mb-2">Fouten (eerste 10):</p>
              <ul className="text-xs text-red-600 space-y-1">
                {validResults.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
              <strong>Fout bij importeren:</strong> {saveError}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('map')}>Terug</Button>
            <Button onClick={handleImport} disabled={saving || validResults.valid === 0}>
              {saving ? 'Importeren...' : `${validResults.valid} rijen importeren`}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div>
          <CloudyTip step="done" />
          <div className="text-center py-12">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Import geslaagd!</h2>
            <p className="text-slate-500 text-sm mb-6">
              {validResults.valid} observaties zijn succesvol geïmporteerd.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setStep('upload')}>Nog een bestand uploaden</Button>
              <Button onClick={onImported}>Naar overzicht</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Herschrijf `DataPage.tsx` als container**

Rewrite `src/pages/DataPage.tsx`:

```tsx
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import OverviewTab from '../components/data/OverviewTab'
import UploadTab from '../components/data/UploadTab'

type Tab = 'overzicht' | 'uploaden'

export default function DataPage() {
  const location = useLocation()
  const initialTab: Tab = (location.state as { tab?: Tab } | null)?.tab === 'uploaden' ? 'uploaden' : 'overzicht'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Data beheer</h1>
        <p className="text-slate-500 text-sm mt-1">Upload, bekijk en beheer je historische data</p>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {(['overzicht', 'uploaden'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {tab === 'overzicht' ? 'Overzicht' : 'Uploaden'}
          </button>
        ))}
      </div>

      {activeTab === 'overzicht' && <OverviewTab />}
      {activeTab === 'uploaden' && <UploadTab onImported={() => setActiveTab('overzicht')} />}
    </Layout>
  )
}
```

- [ ] **Step 4: Werk de routing in `App.tsx` bij**

Vervang de imports:

```tsx
import UploadPage from './pages/UploadPage'
import DataPage from './pages/DataPage'
```

door:

```tsx
import DataPage from './pages/DataPage'
```

Verwijder de import `DataManagementPage from './pages/DataManagementPage'`.

Vervang de twee routes:

```tsx
      <Route
        path="/data/upload"
        element={<ProtectedRoute><UploadPage /></ProtectedRoute>}
      />
      <Route
        path="/data"
        element={<ProtectedRoute><DataPage /></ProtectedRoute>}
      />
```

door één route:

```tsx
      <Route
        path="/data"
        element={<ProtectedRoute><DataPage /></ProtectedRoute>}
      />
```

Verwijder daarnaast de route:

```tsx
      <Route
        path="/settings/data-management"
        element={<ProtectedRoute><DataManagementPage /></ProtectedRoute>}
      />
```

volledig (geen vervanging — deze route komt te vervallen, `/data` hierboven dekt dezelfde functionaliteit al).

- [ ] **Step 5: Werk de "Data uploaden"-snelknop op het Dashboard bij**

In `src/pages/DashboardPage.tsx`, regel 341, vervang:

```tsx
              { icon: Upload, label: 'Data uploaden', sub: 'Historische data importeren', path: '/data/upload', color: '#0891b2', bg: 'rgba(8,145,178,0.07)' },
```

door:

```tsx
              { icon: Upload, label: 'Data uploaden', sub: 'Historische data importeren', path: '/data', state: { tab: 'uploaden' }, color: '#0891b2', bg: 'rgba(8,145,178,0.07)' },
```

en de destructuring + click-handler in dezelfde `.map(...)`-blok:

```tsx
            ].map(({ icon: Icon, label, sub, path, color, bg }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
```

door:

```tsx
            ].map(({ icon: Icon, label, sub, path, state, color, bg }) => (
              <button
                key={path}
                onClick={() => navigate(path, state ? { state } : undefined)}
```

- [ ] **Step 6: Werk Cloudy's pagina-context bij**

In `src/components/cloudy/Cloudy.tsx`, verwijder de `/data/upload`-entry uit `PAGE_CONTEXT`:

```ts
  '/data/upload': {
    greeting: 'Klaar om data te uploaden? Ik begeleid je door het proces. Zorg dat je bestand een datumkolom heeft.',
    suggestions: ['Welk bestandsformaat werkt?', 'Wat zijn verplichte kolommen?', 'Wat als mijn data fouten heeft?'],
  },
```

en vervang de `/data`-entry door:

```ts
  '/data': {
    greeting: 'Hier beheer je je data: bekijk wat je al hebt geïmporteerd via "Overzicht", of upload een nieuw bestand via "Uploaden".',
    suggestions: ['Hoe upload ik data?', 'Hoe verwijder ik data?', 'Hoe exporteer ik data?'],
  },
```

Vervang in `RESPONSES` de tekst van `'hoe upload ik data'`:

```ts
  'hoe upload ik data': 'Ga naar "Upload data" in de navigatie. Je doorloopt 5 stappen: bestand → voorbeeld → koppelen → validatie → klaar.',
```

door:

```ts
  'hoe upload ik data': 'Ga naar "Data beheer" in de navigatie en open het tabje "Uploaden". Je doorloopt 5 stappen: bestand → voorbeeld → koppelen → validatie → klaar.',
```

- [ ] **Step 7: Verwijder de oude pagina's**

```bash
rm src/pages/UploadPage.tsx src/pages/DataManagementPage.tsx
```

- [ ] **Step 8: Build en lint — verwacht succes**

Run: `npm run build && npm run lint`
Expected: beide succes, geen resterende referenties naar `UploadPage`, `DataManagementPage`, `/data/upload` of `/settings/data-management`.

Verifieer: `grep -rn "UploadPage\|DataManagementPage\|data/upload\|settings/data-management" src/` — Expected: 0 resultaten.

- [ ] **Step 9: Visuele verificatie in de browser**

Run: `npm run dev`.
Verwacht:
- Klik op "Data beheer" in de sidebar → `/data` toont sub-tabs "Overzicht" (actief) en "Uploaden".
- "Overzicht" toont: privacy-notitie, recordaantal + één "Exporteer CSV"-knop, datumfilter, observatietabel, en daaronder "Geüploade bestanden" (leeg in demo-modus met de juiste boodschap).
- Klik op sub-tab "Uploaden" → toont de bekende 5-staps-wizard.
- Vanaf het Dashboard: klik op de snelknop "Data uploaden" → landt direct op `/data` met sub-tab "Uploaden" actief (niet "Overzicht").
- Doorloop de wizard met een testbestand tot en met "Klaar", klik "Naar overzicht" → schakelt naar sub-tab "Overzicht" zonder page-reload (URL blijft `/data`).

- [ ] **Step 10: Commit**

```bash
git add src/pages/DataPage.tsx src/components/data/OverviewTab.tsx src/components/data/UploadTab.tsx src/App.tsx src/pages/DashboardPage.tsx src/components/cloudy/Cloudy.tsx
git rm src/pages/UploadPage.tsx src/pages/DataManagementPage.tsx
git commit -m "feat: Data beheer-pagina met sub-tabs Overzicht/Uploaden vervangt drie losse data-pagina's"
```

---

### Task 5: Eindverificatie + changelog

**Files:**
- Modify: `OVERZICHT_AANPASSINGEN.md`

- [ ] **Step 1: Volledige verificatieronde**

```bash
npx vitest run && npm run build && npm run lint
```

Expected: alle tests PASS, build en lint zonder fouten.

Loop daarna de succescriteria uit de spec (`docs/superpowers/specs/2026-07-14-navigatie-consolidatie-design.md`) na in `npm run dev`:
1. Sidebar toont exact 7 items in de vastgelegde volgorde, "Data beheer" laatste met tandwiel-icoon.
2. Klik op de context-kaart (buiten de dropdown) navigeert naar `/company`; de dropdown wisselt onafhankelijk van locatie.
3. Demo-rolwisselaar verandert direct de sidebar-filtering én de `/company`-weergave.
4. Admin-variant van `/company`: bedrijfsgegevens + locatietabel op één pagina, "Nieuwe locatie" werkt.
5. Klant-variant van `/company`: klikbare locatielijst, klik wisselt locatie + navigeert naar `/dashboard`.
6. `/data`: sub-tabs Overzicht (eerst)/Uploaden (tweede), Overzicht toont tabel + filter + één exportknop + privacy-notitie + bestandenlijst.
7. Geslaagde import schakelt intern naar Overzicht, geen page-reload.
8. Geen kapotte links: navigeer manueel naar `/companies`, `/locations`, `/data/upload`, `/settings/data-management` — elk moet terugvallen op de catch-all route naar `/dashboard`.

- [ ] **Step 2: Changelog bijwerken**

Bovenaan de changelog in `OVERZICHT_AANPASSINGEN.md` toevoegen (na de meest recente entry):

```markdown
### 14-07-2026 — Vini G
- **Navigatie-consolidatie** — Sidebar teruggebracht van 11 naar 7 items. "Bedrijven"/"Locaties" vervangen door een klikbare bedrijf/locatie-kaart die naar één `/company`-pagina navigeert (admin: beheer, klant: locatielijst). "Upload data"/"Mijn data"/"Data beheer" samengevoegd tot één "Data beheer"-tab met sub-tabs Overzicht/Uploaden.
- **Demo-rolwisselaar** — In demo-modus kan je via de sidebar-kaart wisselen tussen "Admin" en "Klant" om beide weergaves te bekijken.
```

En in de roadmap-sectie onderaan, na item 11:

```markdown
### 12. Navigatie-consolidatie (sidebar, bedrijf/locaties, data-tabs)
**Status:** [x] Afgerond (14-07-2026)
```

- [ ] **Step 3: Commit**

```bash
git add OVERZICHT_AANPASSINGEN.md
git commit -m "docs: changelog navigatie-consolidatie"
```
