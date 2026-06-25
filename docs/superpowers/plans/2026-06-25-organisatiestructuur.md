# Organisatiestructuur Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Organisatiestructuur module — a `/organization` page where each company defines departments and roles, configures per-location activation and headcount, and logs a daily staffing evaluation per department.

**Architecture:** Company-wide departments/roles live in `departments`/`roles` tables. Per-location customisation uses `location_departments` (active toggle) and `location_roles` (headcount). `OrganizationPage.tsx` is a single component with two tabs sharing the same state; `renderStructuur`/`renderBezetting` are arrow functions inside the component. The service layer follows the existing `supabaseService.ts` pattern: `if (isDemo) return DEMO_DATA` for reads, `if (isDemo) return` for writes; the component manages local state mutations in demo mode.

**Tech Stack:** React 19, TypeScript ~6, Vite 8, Tailwind CSS 3, Supabase, lucide-react

## Global Constraints

- All user-visible text in Dutch
- Follow existing patterns: `useApp()` for context, `isDemo` from `../lib/supabase`, `Button`/`Layout`/`ConfirmModal` from `src/components/`
- No new npm dependencies
- Every file must pass `npm run build` (runs `tsc -b && vite build`)
- Demo mode must be fully interactive (all mutations work against local component state, writes to Supabase are no-ops)

---

### Task 1: Supabase SQL migration

**Files:**
- Create: `supabase/migrations/001_organisation.sql` (reference file — actual execution is in Supabase dashboard)

**Interfaces:**
- Produces: 5 tables — `departments`, `roles`, `location_departments`, `location_roles`, `daily_staffing_evaluations`

- [ ] **Step 1: Run SQL in Supabase SQL editor**

Open your Supabase project → SQL editor and run:

```sql
create table departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table location_departments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  is_active boolean not null default true,
  unique(location_id, department_id)
);

create table location_roles (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  headcount integer not null default 0,
  unique(location_id, role_id)
);

create table daily_staffing_evaluations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  date date not null,
  rating text not null check (rating in ('understaffed', 'adequate', 'overstaffed')),
  created_at timestamptz not null default now(),
  unique(location_id, department_id, date)
);
```

- [ ] **Step 2: Save migration file and commit**

Create `supabase/migrations/001_organisation.sql` with the SQL above, then:

```bash
git add supabase/migrations/001_organisation.sql
git commit -m "feat: SQL migration voor organisatiestructuur tabellen"
```

---

### Task 2: TypeScript types + demo seed data

**Files:**
- Modify: `src/types/database.ts`
- Modify: `src/data/demoSeed.ts`

**Interfaces:**
- Produces:
  - Types: `Department`, `Role`, `LocationDepartment`, `LocationRole`, `DailyStaffingEvaluation`
  - Constants: `DEMO_DEPARTMENTS`, `DEMO_ROLES`, `DEMO_LOCATION_DEPARTMENTS`, `DEMO_LOCATION_ROLES`, `DEMO_STAFFING_EVALUATIONS`

- [ ] **Step 1: Append interfaces to `src/types/database.ts`**

Add after the last interface (`WeatherData`) in the file:

```typescript
export interface Department {
  id: string
  company_id: string
  name: string
  created_at: string
}

export interface Role {
  id: string
  department_id: string
  name: string
  created_at: string
}

export interface LocationDepartment {
  id: string
  location_id: string
  department_id: string
  is_active: boolean
}

export interface LocationRole {
  id: string
  location_id: string
  role_id: string
  headcount: number
}

export interface DailyStaffingEvaluation {
  id: string
  location_id: string
  department_id: string
  date: string
  rating: 'understaffed' | 'adequate' | 'overstaffed'
  created_at: string
}
```

- [ ] **Step 2: Update the import in `src/data/demoSeed.ts`**

Replace the existing import at line 1 with:

```typescript
import type { Company, DailyObservation, Department, DailyStaffingEvaluation, Location, LocationDepartment, LocationRole, Role, StaffingRule } from '../types/database'
```

- [ ] **Step 3: Add demo constants to `src/data/demoSeed.ts`**

Insert the following before the `seededRand` function (after `DEMO_STAFFING_RULES`):

```typescript
export const DEMO_DEPARTMENTS: Department[] = [
  { id: 'dept-keuken', company_id: 'demo-company', name: 'Keuken', created_at: '2025-01-01' },
  { id: 'dept-zaal',   company_id: 'demo-company', name: 'Zaal',   created_at: '2025-01-01' },
  { id: 'dept-kassa',  company_id: 'demo-company', name: 'Kassa',  created_at: '2025-01-01' },
  { id: 'dept-bar',    company_id: 'demo-company', name: 'Bar',    created_at: '2025-01-01' },
]

export const DEMO_ROLES: Role[] = [
  { id: 'role-chef',            department_id: 'dept-keuken', name: 'Chef-kok',       created_at: '2025-01-01' },
  { id: 'role-souschef',        department_id: 'dept-keuken', name: 'Sous-chef',       created_at: '2025-01-01' },
  { id: 'role-kok',             department_id: 'dept-keuken', name: 'Kok',             created_at: '2025-01-01' },
  { id: 'role-kelner',          department_id: 'dept-zaal',   name: 'Kelner',          created_at: '2025-01-01' },
  { id: 'role-gastheer',        department_id: 'dept-zaal',   name: 'Gastheer/vrouw',  created_at: '2025-01-01' },
  { id: 'role-kassamedewerker', department_id: 'dept-kassa',  name: 'Kassamedewerker', created_at: '2025-01-01' },
  { id: 'role-barman',          department_id: 'dept-bar',    name: 'Barman',          created_at: '2025-01-01' },
  { id: 'role-barhulp',         department_id: 'dept-bar',    name: 'Barhulp',         created_at: '2025-01-01' },
]

export const DEMO_LOCATION_DEPARTMENTS: LocationDepartment[] = [
  { id: 'ld-keuken', location_id: 'demo-location', department_id: 'dept-keuken', is_active: true  },
  { id: 'ld-zaal',   location_id: 'demo-location', department_id: 'dept-zaal',   is_active: true  },
  { id: 'ld-kassa',  location_id: 'demo-location', department_id: 'dept-kassa',  is_active: true  },
  { id: 'ld-bar',    location_id: 'demo-location', department_id: 'dept-bar',    is_active: false },
]

export const DEMO_LOCATION_ROLES: LocationRole[] = [
  { id: 'lr-chef',            location_id: 'demo-location', role_id: 'role-chef',            headcount: 1 },
  { id: 'lr-souschef',        location_id: 'demo-location', role_id: 'role-souschef',        headcount: 2 },
  { id: 'lr-kok',             location_id: 'demo-location', role_id: 'role-kok',             headcount: 4 },
  { id: 'lr-kelner',          location_id: 'demo-location', role_id: 'role-kelner',          headcount: 6 },
  { id: 'lr-gastheer',        location_id: 'demo-location', role_id: 'role-gastheer',        headcount: 2 },
  { id: 'lr-kassamedewerker', location_id: 'demo-location', role_id: 'role-kassamedewerker', headcount: 3 },
]

export const DEMO_STAFFING_EVALUATIONS: DailyStaffingEvaluation[] = []
```

- [ ] **Step 4: Verify**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts src/data/demoSeed.ts
git commit -m "feat: types en demo seed voor organisatiestructuur"
```

---

### Task 3: Service layer

**Files:**
- Modify: `src/services/supabaseService.ts`

**Interfaces:**
- Consumes: `Department`, `Role`, `LocationDepartment`, `LocationRole`, `DailyStaffingEvaluation` from `../types/database`; `DEMO_DEPARTMENTS`, `DEMO_ROLES`, `DEMO_LOCATION_DEPARTMENTS`, `DEMO_LOCATION_ROLES`, `DEMO_STAFFING_EVALUATIONS` from `../data/demoSeed`
- Produces (exact signatures):
  - `getDepartments(companyId: string): Promise<Department[]>`
  - `createDepartment(dept: Omit<Department, 'id' | 'created_at'>): Promise<void>`
  - `deleteDepartment(id: string): Promise<void>`
  - `getRoles(companyId: string): Promise<Role[]>`
  - `createRole(role: Omit<Role, 'id' | 'created_at'>): Promise<void>`
  - `deleteRole(id: string): Promise<void>`
  - `getLocationDepartments(locationId: string): Promise<LocationDepartment[]>`
  - `upsertLocationDepartment(ld: Omit<LocationDepartment, 'id'>): Promise<void>`
  - `getLocationRoles(locationId: string): Promise<LocationRole[]>`
  - `upsertLocationRole(lr: Omit<LocationRole, 'id'>): Promise<void>`
  - `getDailyStaffingEvaluations(locationId: string, date: string): Promise<DailyStaffingEvaluation[]>`
  - `saveDailyStaffingEvaluations(evals: Omit<DailyStaffingEvaluation, 'id' | 'created_at'>[]): Promise<void>`

- [ ] **Step 1: Update the type import at the top of `src/services/supabaseService.ts`**

Replace the existing `import type { ... }` line with:

```typescript
import type { Company, DailyObservation, Department, DailyStaffingEvaluation, Location, LocationDepartment, LocationRole, Role, StaffingRule, UploadedFile } from '../types/database'
```

- [ ] **Step 2: Update the demoSeed import in `src/services/supabaseService.ts`**

Replace the existing demoSeed import with:

```typescript
import {
  DEMO_COMPANY,
  DEMO_DEPARTMENTS,
  DEMO_LOCATION_DEPARTMENTS,
  DEMO_LOCATION_ROLES,
  DEMO_LOCATION,
  DEMO_ROLES,
  DEMO_STAFFING_EVALUATIONS,
  DEMO_STAFFING_RULES,
  getDemoObservations,
} from '../data/demoSeed'
```

- [ ] **Step 3: Append all organisation functions after `createLocation` in `src/services/supabaseService.ts`**

```typescript
export async function getDepartments(companyId: string): Promise<Department[]> {
  if (isDemo) return DEMO_DEPARTMENTS.filter(d => d.company_id === companyId)
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return data as Department[]
}

export async function createDepartment(dept: Omit<Department, 'id' | 'created_at'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('departments').insert(dept)
  if (error) throw error
}

export async function deleteDepartment(id: string): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}

export async function getRoles(companyId: string): Promise<Role[]> {
  if (isDemo) return DEMO_ROLES.filter(r =>
    DEMO_DEPARTMENTS.some(d => d.id === r.department_id && d.company_id === companyId)
  )
  const { data: depts, error: deptsError } = await supabase
    .from('departments')
    .select('id')
    .eq('company_id', companyId)
  if (deptsError) throw deptsError
  const deptIds = depts.map(d => d.id as string)
  if (deptIds.length === 0) return []
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .in('department_id', deptIds)
    .order('name')
  if (error) throw error
  return data as Role[]
}

export async function createRole(role: Omit<Role, 'id' | 'created_at'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('roles').insert(role)
  if (error) throw error
}

export async function deleteRole(id: string): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error
}

export async function getLocationDepartments(locationId: string): Promise<LocationDepartment[]> {
  if (isDemo) return DEMO_LOCATION_DEPARTMENTS.filter(ld => ld.location_id === locationId)
  const { data, error } = await supabase
    .from('location_departments')
    .select('*')
    .eq('location_id', locationId)
  if (error) throw error
  return data as LocationDepartment[]
}

export async function upsertLocationDepartment(ld: Omit<LocationDepartment, 'id'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('location_departments')
    .upsert(ld, { onConflict: 'location_id,department_id' })
  if (error) throw error
}

export async function getLocationRoles(locationId: string): Promise<LocationRole[]> {
  if (isDemo) return DEMO_LOCATION_ROLES.filter(lr => lr.location_id === locationId)
  const { data, error } = await supabase
    .from('location_roles')
    .select('*')
    .eq('location_id', locationId)
  if (error) throw error
  return data as LocationRole[]
}

export async function upsertLocationRole(lr: Omit<LocationRole, 'id'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('location_roles')
    .upsert(lr, { onConflict: 'location_id,role_id' })
  if (error) throw error
}

export async function getDailyStaffingEvaluations(
  locationId: string,
  date: string
): Promise<DailyStaffingEvaluation[]> {
  if (isDemo) return DEMO_STAFFING_EVALUATIONS.filter(e =>
    e.location_id === locationId && e.date === date
  )
  const { data, error } = await supabase
    .from('daily_staffing_evaluations')
    .select('*')
    .eq('location_id', locationId)
    .eq('date', date)
  if (error) throw error
  return data as DailyStaffingEvaluation[]
}

export async function saveDailyStaffingEvaluations(
  evals: Omit<DailyStaffingEvaluation, 'id' | 'created_at'>[]
): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('daily_staffing_evaluations')
    .upsert(evals, { onConflict: 'location_id,department_id,date' })
  if (error) throw error
}
```

- [ ] **Step 4: Verify**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/services/supabaseService.ts
git commit -m "feat: service layer voor organisatiestructuur"
```

---

### Task 4: Page skeleton + route + sidebar

**Files:**
- Create: `src/pages/OrganizationPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Layout.tsx`

**Interfaces:**
- Produces: `/organization` renders a page with title "Organisatie" and two tab buttons that switch between placeholder text

- [ ] **Step 1: Create `src/pages/OrganizationPage.tsx`**

```tsx
import React, { useState } from 'react'
import Layout from '../components/layout/Layout'

type Tab = 'structuur' | 'bezetting'

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('structuur')

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organisatie</h1>
          <p className="text-slate-500 text-sm mt-1">Afdelingen, functies en bezettingsevaluatie</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {(['structuur', 'bezetting'] as Tab[]).map(tab => (
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
            {tab === 'structuur' ? 'Structuur' : 'Bezetting evaluatie'}
          </button>
        ))}
      </div>

      {activeTab === 'structuur' && (
        <p className="text-slate-400 text-sm">Structuur komt hier.</p>
      )}
      {activeTab === 'bezetting' && (
        <p className="text-slate-400 text-sm">Bezetting evaluatie komt hier.</p>
      )}
    </Layout>
  )
}
```

- [ ] **Step 2: Add route in `src/App.tsx`**

Add the import after the existing `DataManagementPage` import (around line 12):

```typescript
import OrganizationPage from './pages/OrganizationPage'
```

Add the route before `<Route path="*" ...>`:

```tsx
<Route
  path="/organization"
  element={<ProtectedRoute><OrganizationPage /></ProtectedRoute>}
/>
```

- [ ] **Step 3: Add nav item in `src/components/layout/Sidebar.tsx`**

Add `Building` to the lucide-react import:

```typescript
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
} from 'lucide-react'
```

Replace the `navItems` array:

```typescript
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
```

- [ ] **Step 4: Add nav item to mobile drawer in `src/components/layout/Layout.tsx`**

Add `Building` to the lucide-react import:

```typescript
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
} from 'lucide-react'
```

Replace the `navItems` array in `Layout.tsx`:

```typescript
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
```

- [ ] **Step 5: Verify build and browser**

```bash
npm run build
npm run dev
```

Open `http://localhost:5173`. Expected:
- "Organisatie" appears in the sidebar with a Building icon
- Clicking it loads the page with title "Organisatie" and two tab buttons
- Tabs switch between placeholder text

- [ ] **Step 6: Commit**

```bash
git add src/pages/OrganizationPage.tsx src/App.tsx src/components/layout/Sidebar.tsx src/components/layout/Layout.tsx
git commit -m "feat: pagina skeleton, route en sidebar voor organisatie"
```

---

### Task 5: Full OrganizationPage — beide tabs

**Files:**
- Modify: `src/pages/OrganizationPage.tsx` (full replacement)

**Interfaces:**
- Consumes (from `../services/supabaseService`): `getDepartments`, `createDepartment`, `deleteDepartment`, `getRoles`, `createRole`, `deleteRole`, `getLocationDepartments`, `upsertLocationDepartment`, `getLocationRoles`, `upsertLocationRole`, `getDailyStaffingEvaluations`, `saveDailyStaffingEvaluations`
- Consumes (from `../types/database`): `Department`, `LocationDepartment`, `LocationRole`, `Role`

- [ ] **Step 1: Replace `src/pages/OrganizationPage.tsx` with the full implementation**

```tsx
import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import {
  getDepartments, createDepartment, deleteDepartment,
  getRoles, createRole, deleteRole,
  getLocationDepartments, upsertLocationDepartment,
  getLocationRoles, upsertLocationRole,
  getDailyStaffingEvaluations, saveDailyStaffingEvaluations,
} from '../services/supabaseService'
import type { Department, LocationDepartment, LocationRole, Role } from '../types/database'

type Tab = 'structuur' | 'bezetting'
type Rating = 'understaffed' | 'adequate' | 'overstaffed'

export default function OrganizationPage() {
  const { selectedCompany, selectedLocation, isDemo } = useApp()
  const [activeTab, setActiveTab] = useState<Tab>('structuur')

  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [locationDepts, setLocationDepts] = useState<LocationDepartment[]>([])
  const [locationRoles, setLocationRoles] = useState<LocationRole[]>([])

  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [addingDept, setAddingDept] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [addingRoleFor, setAddingRoleFor] = useState<string | null>(null)
  const [newRoleName, setNewRoleName] = useState('')

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const [savingEval, setSavingEval] = useState(false)
  const [evalSaved, setEvalSaved] = useState(false)

  useEffect(() => {
    if (!selectedCompany) return
    Promise.all([
      getDepartments(selectedCompany.id),
      getRoles(selectedCompany.id),
    ]).then(([depts, r]) => {
      setDepartments(depts)
      setRoles(r)
    })
  }, [selectedCompany])

  useEffect(() => {
    if (!selectedLocation) {
      setLocationDepts([])
      setLocationRoles([])
      return
    }
    Promise.all([
      getLocationDepartments(selectedLocation.id),
      getLocationRoles(selectedLocation.id),
    ]).then(([ld, lr]) => {
      setLocationDepts(ld)
      setLocationRoles(lr)
    })
  }, [selectedLocation])

  useEffect(() => {
    if (!selectedLocation || activeTab !== 'bezetting') return
    getDailyStaffingEvaluations(selectedLocation.id, selectedDate).then(evals => {
      const map: Record<string, Rating> = {}
      evals.forEach(e => { map[e.department_id] = e.rating })
      setRatings(map)
    })
  }, [selectedLocation, selectedDate, activeTab])

  function isDeptActive(deptId: string): boolean {
    const ld = locationDepts.find(ld => ld.department_id === deptId)
    return ld ? ld.is_active : false
  }

  function getHeadcount(roleId: string): number {
    return locationRoles.find(lr => lr.role_id === roleId)?.headcount ?? 0
  }

  function toggleExpand(deptId: string) {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      next.has(deptId) ? next.delete(deptId) : next.add(deptId)
      return next
    })
  }

  async function handleAddDept(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompany || !newDeptName.trim()) return
    await createDepartment({ company_id: selectedCompany.id, name: newDeptName.trim() })
    if (isDemo) {
      setDepartments(prev => [...prev, {
        id: `dept-${Date.now()}`,
        company_id: selectedCompany.id,
        name: newDeptName.trim(),
        created_at: new Date().toISOString(),
      }])
    } else {
      setDepartments(await getDepartments(selectedCompany.id))
    }
    setNewDeptName('')
    setAddingDept(false)
  }

  async function handleDeleteDept(id: string) {
    await deleteDepartment(id)
    setDepartments(prev => prev.filter(d => d.id !== id))
    setRoles(prev => prev.filter(r => r.department_id !== id))
    setLocationDepts(prev => prev.filter(ld => ld.department_id !== id))
  }

  async function handleAddRole(e: React.FormEvent, deptId: string) {
    e.preventDefault()
    if (!selectedCompany || !newRoleName.trim()) return
    await createRole({ department_id: deptId, name: newRoleName.trim() })
    if (isDemo) {
      setRoles(prev => [...prev, {
        id: `role-${Date.now()}`,
        department_id: deptId,
        name: newRoleName.trim(),
        created_at: new Date().toISOString(),
      }])
    } else {
      setRoles(await getRoles(selectedCompany.id))
    }
    setNewRoleName('')
    setAddingRoleFor(null)
  }

  async function handleDeleteRole(id: string) {
    await deleteRole(id)
    setRoles(prev => prev.filter(r => r.id !== id))
    setLocationRoles(prev => prev.filter(lr => lr.role_id !== id))
  }

  function handleToggleDept(deptId: string) {
    if (!selectedLocation) return
    const newIsActive = !isDeptActive(deptId)
    upsertLocationDepartment({
      location_id: selectedLocation.id,
      department_id: deptId,
      is_active: newIsActive,
    })
    const existing = locationDepts.find(ld => ld.department_id === deptId)
    if (existing) {
      setLocationDepts(prev => prev.map(ld =>
        ld.department_id === deptId ? { ...ld, is_active: newIsActive } : ld
      ))
    } else {
      setLocationDepts(prev => [...prev, {
        id: `ld-${Date.now()}`,
        location_id: selectedLocation.id,
        department_id: deptId,
        is_active: newIsActive,
      }])
    }
  }

  function handleHeadcountBlur(roleId: string, value: string) {
    if (!selectedLocation) return
    const headcount = Math.max(0, parseInt(value, 10) || 0)
    upsertLocationRole({ location_id: selectedLocation.id, role_id: roleId, headcount })
    const existing = locationRoles.find(lr => lr.role_id === roleId)
    if (existing) {
      setLocationRoles(prev => prev.map(lr =>
        lr.role_id === roleId ? { ...lr, headcount } : lr
      ))
    } else {
      setLocationRoles(prev => [...prev, {
        id: `lr-${Date.now()}`,
        location_id: selectedLocation.id,
        role_id: roleId,
        headcount,
      }])
    }
  }

  async function handleSaveEvaluation() {
    if (!selectedLocation) return
    setSavingEval(true)
    const activeDepts = departments.filter(d => isDeptActive(d.id))
    await saveDailyStaffingEvaluations(
      activeDepts.map(d => ({
        location_id: selectedLocation.id,
        department_id: d.id,
        date: selectedDate,
        rating: ratings[d.id] ?? 'adequate',
      }))
    )
    setSavingEval(false)
    setEvalSaved(true)
    setTimeout(() => setEvalSaved(false), 2000)
  }

  const activeDepts = departments.filter(d => isDeptActive(d.id))

  const renderStructuur = () => (
    <div>
      {!selectedLocation && (
        <div className="mb-4 text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          Selecteer een locatie om per-locatie instellingen (actief/inactief, headcount) te zien.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {departments.map((dept, idx) => {
          const deptRoles = roles.filter(r => r.department_id === dept.id)
          const isExpanded = expandedDepts.has(dept.id)
          const isActive = isDeptActive(dept.id)

          return (
            <div key={dept.id} className={idx > 0 ? 'border-t border-slate-100' : ''}>
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <button
                  onClick={() => toggleExpand(dept.id)}
                  className="text-slate-400 flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <span className="flex-1 font-medium text-slate-900 text-sm">{dept.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {deptRoles.length} functie{deptRoles.length !== 1 ? 's' : ''}
                </span>
                {selectedLocation && (
                  <button
                    onClick={() => handleToggleDept(dept.id)}
                    className={[
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0',
                      isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {isActive ? 'Actief' : 'Inactief'}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteDept(dept.id)}
                  className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-100">
                  {deptRoles.map(role => (
                    <div
                      key={role.id}
                      className="flex items-center gap-3 pl-12 pr-4 py-2.5 border-t border-slate-100 first:border-t-0"
                    >
                      <span className="flex-1 text-sm text-slate-700">{role.name}</span>
                      {selectedLocation && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Headcount</span>
                          <input
                            type="number"
                            min="0"
                            defaultValue={getHeadcount(role.id)}
                            onBlur={e => handleHeadcountBlur(role.id, e.target.value)}
                            className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {addingRoleFor === dept.id ? (
                    <form
                      onSubmit={e => handleAddRole(e, dept.id)}
                      className="flex items-center gap-2 pl-12 pr-4 py-2.5 border-t border-slate-100"
                    >
                      <input
                        autoFocus
                        type="text"
                        placeholder="Naam functie"
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button size="sm" type="submit" disabled={!newRoleName.trim()}>
                        Toevoegen
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={() => { setAddingRoleFor(null); setNewRoleName('') }}
                      >
                        Annuleren
                      </Button>
                    </form>
                  ) : (
                    <button
                      onClick={() => { setAddingRoleFor(dept.id); setNewRoleName('') }}
                      className="flex items-center gap-2 pl-12 pr-4 py-2.5 w-full text-left text-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors"
                    >
                      <Plus size={13} /> Functie toevoegen
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {addingDept ? (
          <form
            onSubmit={handleAddDept}
            className={[
              'flex items-center gap-2 px-4 py-3',
              departments.length > 0 ? 'border-t border-slate-100' : '',
            ].join(' ')}
          >
            <input
              autoFocus
              type="text"
              placeholder="Naam afdeling"
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" type="submit" disabled={!newDeptName.trim()}>
              Toevoegen
            </Button>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => { setAddingDept(false); setNewDeptName('') }}
            >
              Annuleren
            </Button>
          </form>
        ) : (
          <button
            onClick={() => setAddingDept(true)}
            className={[
              'flex items-center gap-2 px-4 py-3 w-full text-left text-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors',
              departments.length > 0 ? 'border-t border-slate-100' : '',
            ].join(' ')}
          >
            <Plus size={14} /> Afdeling toevoegen
          </button>
        )}
      </div>

      {departments.length === 0 && !addingDept && (
        <p className="text-center text-slate-400 text-sm mt-8">
          Nog geen afdelingen. Voeg er een toe.
        </p>
      )}
    </div>
  )

  const renderBezetting = () => {
    if (!selectedLocation) {
      return (
        <div className="text-center py-12 text-slate-400 text-sm">
          Selecteer een locatie om de dagelijkse bezetting te evalueren.
        </div>
      )
    }

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-slate-700">Datum</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {activeDepts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Geen actieve afdelingen voor deze locatie. Activeer afdelingen via de Structuur tab.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {activeDepts.map((dept, idx) => (
              <div
                key={dept.id}
                className={[
                  'flex items-center gap-4 px-4 py-4',
                  idx > 0 ? 'border-t border-slate-100' : '',
                ].join(' ')}
              >
                <span className="w-36 text-sm font-medium text-slate-900">{dept.name}</span>
                <div className="flex gap-2">
                  {(['understaffed', 'adequate', 'overstaffed'] as Rating[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setRatings(prev => ({ ...prev, [dept.id]: r }))}
                      className={[
                        'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                        ratings[dept.id] === r
                          ? r === 'understaffed'
                            ? 'bg-red-500 text-white border-red-500'
                            : r === 'adequate'
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {r === 'understaffed' ? 'Onderbezet' : r === 'adequate' ? 'Goed' : 'Overbezet'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button
            onClick={handleSaveEvaluation}
            disabled={savingEval || activeDepts.length === 0}
          >
            {savingEval ? 'Opslaan...' : 'Evaluatie opslaan'}
          </Button>
          {evalSaved && (
            <span className="text-sm text-green-600 font-medium">Opgeslagen!</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organisatie</h1>
          <p className="text-slate-500 text-sm mt-1">Afdelingen, functies en bezettingsevaluatie</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {(['structuur', 'bezetting'] as Tab[]).map(tab => (
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
            {tab === 'structuur' ? 'Structuur' : 'Bezetting evaluatie'}
          </button>
        ))}
      </div>

      {activeTab === 'structuur' && renderStructuur()}
      {activeTab === 'bezetting' && renderBezetting()}
    </Layout>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 3: Test in browser (demo mode)**

```bash
npm run dev
```

Open `http://localhost:5173` → navigeer naar Organisatie. Controleer het volgende:

**Tab 1 — Structuur:**
- [ ] Vier afdelingen zichtbaar: Keuken, Zaal, Kassa, Bar
- [ ] Hint "Selecteer een locatie..." verschijnt NIET (demo heeft altijd een locatie geselecteerd)
- [ ] Keuken, Zaal, Kassa tonen groene "Actief" badge; Bar toont grijze "Inactief"
- [ ] Klik chevron op Keuken → accordion opent met Chef-kok (1), Sous-chef (2), Kok (4)
- [ ] Headcount-velden tonen juiste demo waarden; aanpassen en tabben weg werkt
- [ ] Klik "Inactief" op Bar → wordt direct "Actief" (lokale state)
- [ ] Klik "Afdeling toevoegen" → inline form verschijnt, naam invullen, submit → dept in lijst
- [ ] Klik chevron, klik "Functie toevoegen" → functie verschijnt onder de afdeling
- [ ] Trash-icoon op functie → verdwijnt; trash-icoon op afdeling → afdeling + functies verdwijnen

**Tab 2 — Bezetting evaluatie:**
- [ ] Keuken, Zaal, Kassa zichtbaar; Bar ontbreekt (is_active: false in seed)
- [ ] Datum-veld toont vandaag
- [ ] Klik "Onderbezet" voor Keuken → rode highlight
- [ ] Klik "Goed" voor Zaal → groene highlight
- [ ] Klik "Overbezet" voor Kassa → oranje highlight
- [ ] Klik "Evaluatie opslaan" → kort "Opgeslagen!" tekst verschijnt

- [ ] **Step 4: Commit**

```bash
git add src/pages/OrganizationPage.tsx
git commit -m "feat: volledige organisatie pagina met structuur en bezetting tabs"
```
