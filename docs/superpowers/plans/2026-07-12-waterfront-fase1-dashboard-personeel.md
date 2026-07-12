# Waterfront Fase 1 — Actiegericht Dashboard + Personeelslogica per Afdeling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het dashboard herbouwen rond de vier vragen van de uitbater (omzet, wie waar inplannen, besparing, bestellen) met een afdeling-gebaseerde personeelsengine en horeca-realistische demodata, zodat elke getoonde rij intern consistent is.

**Architecture:** Een nieuwe pure functie-laag (`staffingService.ts`) berekent bezetting per afdeling uit configureerbare regels; drukte-label en bezetting komen uit dezelfde berekening. De demodata-generator gebruikt diezelfde engine (twee passes: eerst omzet/bezoekers, dan bezetting), waardoor inconsistentie per constructie onmogelijk is. UI-pagina's (Dashboard, Forecast, Personeelsregels) consumeren de engine via `forecastService` en nieuwe CRUD-functies in `supabaseService`.

**Tech Stack:** React 19 + TypeScript + Vite (bestaand), Vitest (nieuw, alleen devDependency), Supabase (bestaand patroon: demo-modus in-memory stores + echte tabellen).

**Spec:** `docs/superpowers/specs/2026-07-12-waterfront-feedback-design.md` (Sectie 1 + succescriteria 1 en 2)

## Global Constraints

- Alle UI-teksten in het Nederlands; datums in Belgisch formaat (`nl-BE`).
- Demo-modus volgt het bestaande patroon: in-memory `demoStores` in `supabaseService.ts`, seed-constanten in `demoSeed.ts`, `if (isDemo)` early-return per servicefunctie.
- Geen nieuwe runtime-dependencies; enige nieuwe devDependency is `vitest`.
- `npm run build` (tsc -b && vite build) en `npm run lint` (oxlint) moeten na elke taak slagen.
- Bestaande visuele stijl behouden: glass-cards (`rgba(255,255,255,0.8)` + `backdropFilter: blur(12px)`, borderRadius 16px), kleuren `#1a44e8` (blauw), `#059669` (groen), `#7c3aed` (paars).
- Op klantgerichte schermen (Dashboard, Forecast) géén meta-informatie: geen aantallen datapunten, geen datakwaliteit, geen betrouwbaarheidsranges als tekst.
- Fase 2 (voorraad/bestelflow), fase 3 (evenementen/uur-import/uur-trends) en de cold-start-blend vallen **buiten** dit plan.

---

### Task 1: Staffing-engine (`staffingService.ts`) + Vitest-setup

**Files:**
- Modify: `package.json` (vitest devDependency + test-script)
- Create: `src/types/staffing.ts`
- Create: `src/services/staffingService.ts`
- Test: `src/services/__tests__/staffingService.test.ts`

**Interfaces:**
- Consumes: `DemandLevel` uit `src/types/forecast.ts` (bestaand: `'Low' | 'Normal' | 'High' | 'Very High'`)
- Produces:
  - `DepartmentStaffingRule`, `DepartmentAdvice`, `StaffingAdvice` (types, zie Step 2)
  - `getDemandLevel(predicted: number, avg: number): DemandLevel`
  - `computeStaffing(rules: DepartmentStaffingRule[], demandLevel: DemandLevel, eventGuests?: number): StaffingAdvice`
  - `maxStaffing(rules: DepartmentStaffingRule[]): number`

- [ ] **Step 1: Installeer vitest en voeg test-script toe**

```bash
npm install -D vitest
```

In `package.json` onder `"scripts"` toevoegen:

```json
"test": "vitest run"
```

- [ ] **Step 2: Maak de types aan**

Create `src/types/staffing.ts`:

```ts
export interface DepartmentStaffingRule {
  id: string
  location_id: string
  department_id: string
  department_name: string
  base_staff: number
  busy_staff: number
  event_guest_threshold?: number
  event_staff?: number
}

export interface DepartmentAdvice {
  department_id: string
  department_name: string
  staff: number
  reason: 'basis' | 'druk' | 'evenement'
}

export interface StaffingAdvice {
  per_department: DepartmentAdvice[]
  total: number
}
```

- [ ] **Step 3: Schrijf de falende tests**

Create `src/services/__tests__/staffingService.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeStaffing, getDemandLevel, maxStaffing } from '../staffingService'
import type { DepartmentStaffingRule } from '../../types/staffing'

const RULES: DepartmentStaffingRule[] = [
  { id: 'r1', location_id: 'loc', department_id: 'd-buiten', department_name: 'Bar buiten', base_staff: 2, busy_staff: 3, event_guest_threshold: 50, event_staff: 3 },
  { id: 'r2', location_id: 'loc', department_id: 'd-binnen', department_name: 'Bar binnen', base_staff: 2, busy_staff: 2 },
  { id: 'r3', location_id: 'loc', department_id: 'd-keuken', department_name: 'Keuken', base_staff: 1, busy_staff: 2 },
]

describe('getDemandLevel', () => {
  it('geeft Low onder 75% van gemiddelde', () => expect(getDemandLevel(700, 1000)).toBe('Low'))
  it('geeft Normal rond gemiddelde', () => expect(getDemandLevel(1000, 1000)).toBe('Normal'))
  it('geeft High boven 115% van gemiddelde', () => expect(getDemandLevel(1200, 1000)).toBe('High'))
  it('geeft Very High boven 150% van gemiddelde', () => expect(getDemandLevel(1600, 1000)).toBe('Very High'))
  it('geeft Normal bij gemiddelde 0 (geen data)', () => expect(getDemandLevel(500, 0)).toBe('Normal'))
})

describe('computeStaffing', () => {
  it('gebruikt basisbezetting op een normale dag', () => {
    const advies = computeStaffing(RULES, 'Normal')
    expect(advies.per_department.map(d => d.staff)).toEqual([2, 2, 1])
    expect(advies.total).toBe(5)
    expect(advies.per_department.every(d => d.reason === 'basis')).toBe(true)
  })

  it('schaalt op naar drukbezetting bij High', () => {
    const advies = computeStaffing(RULES, 'High')
    expect(advies.per_department.map(d => d.staff)).toEqual([3, 2, 2])
    expect(advies.total).toBe(7)
    expect(advies.per_department[0].reason).toBe('druk')
    expect(advies.per_department[1].reason).toBe('basis') // busy == base → geen opschaling
  })

  it('schaalt Bar buiten op naar 3 bij evenement boven drempel', () => {
    const advies = computeStaffing(RULES, 'Normal', 80)
    expect(advies.per_department[0].staff).toBe(3)
    expect(advies.per_department[0].reason).toBe('evenement')
    expect(advies.total).toBe(6)
  })

  it('negeert evenement onder de drempel', () => {
    const advies = computeStaffing(RULES, 'Normal', 30)
    expect(advies.per_department[0].staff).toBe(2)
    expect(advies.total).toBe(5)
  })

  it('evenement verlaagt nooit een al hogere drukbezetting', () => {
    const advies = computeStaffing(RULES, 'Very High', 80)
    expect(advies.per_department[0].staff).toBe(3)
    expect(advies.total).toBe(7)
  })
})

describe('maxStaffing', () => {
  it('sommeert de maximale bezetting per afdeling', () => {
    expect(maxStaffing(RULES)).toBe(3 + 2 + 2)
  })
})
```

- [ ] **Step 4: Run de tests — verwacht FAIL**

Run: `npx vitest run src/services/__tests__/staffingService.test.ts`
Expected: FAIL — "Cannot find module '../staffingService'"

- [ ] **Step 5: Implementeer de engine**

Create `src/services/staffingService.ts`:

```ts
import type { DemandLevel } from '../types/forecast'
import type { DepartmentStaffingRule, DepartmentAdvice, StaffingAdvice } from '../types/staffing'

// Eén bron voor drukteniveau — dashboard, forecast en demodata gebruiken allemaal deze functie
export function getDemandLevel(predicted: number, avg: number): DemandLevel {
  if (avg <= 0) return 'Normal'
  const ratio = predicted / avg
  if (ratio < 0.75) return 'Low'
  if (ratio < 1.15) return 'Normal'
  if (ratio < 1.5) return 'High'
  return 'Very High'
}

export function computeStaffing(
  rules: DepartmentStaffingRule[],
  demandLevel: DemandLevel,
  eventGuests?: number,
): StaffingAdvice {
  const per_department: DepartmentAdvice[] = rules.map(rule => {
    let staff = rule.base_staff
    let reason: DepartmentAdvice['reason'] = 'basis'
    if (demandLevel === 'High' || demandLevel === 'Very High') {
      staff = rule.busy_staff
      if (rule.busy_staff !== rule.base_staff) reason = 'druk'
    }
    if (
      rule.event_guest_threshold !== undefined &&
      rule.event_staff !== undefined &&
      eventGuests !== undefined &&
      eventGuests >= rule.event_guest_threshold &&
      rule.event_staff > staff
    ) {
      staff = rule.event_staff
      reason = 'evenement'
    }
    return { department_id: rule.department_id, department_name: rule.department_name, staff, reason }
  })
  return { per_department, total: per_department.reduce((s, d) => s + d.staff, 0) }
}

// Vaste 'veilige' planning: wat de manager zonder forecast zou inplannen (altijd het maximum)
export function maxStaffing(rules: DepartmentStaffingRule[]): number {
  return rules.reduce((s, r) => s + Math.max(r.base_staff, r.busy_staff, r.event_staff ?? 0), 0)
}
```

- [ ] **Step 6: Run de tests — verwacht PASS**

Run: `npx vitest run src/services/__tests__/staffingService.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 7: Build en commit**

Run: `npm run build` — Expected: succes.

```bash
git add package.json package-lock.json src/types/staffing.ts src/services/staffingService.ts src/services/__tests__/staffingService.test.ts
git commit -m "feat: afdeling-gebaseerde personeelsengine + vitest setup"
```

---

### Task 2: Waterfront demo-organisatie & afdelingsregels in seed

**Files:**
- Modify: `src/data/demoSeed.ts` (vervang `DEMO_DEPARTMENTS`, `DEMO_ROLES`, `DEMO_LOCATION_DEPARTMENTS`, `DEMO_LOCATION_DEPARTMENTS_2`, `DEMO_LOCATION_ROLES`, `DEMO_LOCATION_ROLES_2`; voeg `DEMO_DEPARTMENT_STAFFING_RULES` en `DEMO_DEPARTMENT_STAFFING_RULES_2` toe)

**Interfaces:**
- Consumes: `DepartmentStaffingRule` uit `src/types/staffing.ts` (Task 1)
- Produces: `DEMO_DEPARTMENT_STAFFING_RULES: DepartmentStaffingRule[]` en `DEMO_DEPARTMENT_STAFFING_RULES_2: DepartmentStaffingRule[]` — geïmporteerd door Task 3 (generator) en Task 4 (demo store). Afdelings-ids: `dept-bar-buiten`, `dept-bar-binnen`, `dept-keuken`.

- [ ] **Step 1: Vervang de organisatie-constanten in `src/data/demoSeed.ts`**

Vervang de bestaande blokken `DEMO_DEPARTMENTS` t/m `DEMO_LOCATION_ROLES_2` (regels 56–103) door:

```ts
export const DEMO_DEPARTMENTS: Department[] = [
  { id: 'dept-bar-buiten', company_id: 'demo-company', name: 'Bar buiten', created_at: '2026-01-01' },
  { id: 'dept-bar-binnen', company_id: 'demo-company', name: 'Bar binnen', created_at: '2026-01-01' },
  { id: 'dept-keuken',     company_id: 'demo-company', name: 'Keuken',     created_at: '2026-01-01' },
]

export const DEMO_ROLES: Role[] = [
  { id: 'role-buiten-bartender', department_id: 'dept-bar-buiten', name: 'Bartender',   created_at: '2026-01-01' },
  { id: 'role-buiten-runner',    department_id: 'dept-bar-buiten', name: 'Runner',      created_at: '2026-01-01' },
  { id: 'role-binnen-bartender', department_id: 'dept-bar-binnen', name: 'Bartender',   created_at: '2026-01-01' },
  { id: 'role-kok',              department_id: 'dept-keuken',     name: 'Kok',         created_at: '2026-01-01' },
]

export const DEMO_LOCATION_DEPARTMENTS: LocationDepartment[] = [
  { id: 'ld-buiten', location_id: 'demo-location', department_id: 'dept-bar-buiten', is_active: true },
  { id: 'ld-binnen', location_id: 'demo-location', department_id: 'dept-bar-binnen', is_active: true },
  { id: 'ld-keuken', location_id: 'demo-location', department_id: 'dept-keuken',     is_active: true },
]

export const DEMO_LOCATION_DEPARTMENTS_2: LocationDepartment[] = [
  { id: 'ld2-buiten', location_id: 'demo-location-2', department_id: 'dept-bar-buiten', is_active: true },
  { id: 'ld2-binnen', location_id: 'demo-location-2', department_id: 'dept-bar-binnen', is_active: true },
  { id: 'ld2-keuken', location_id: 'demo-location-2', department_id: 'dept-keuken',     is_active: false },
]

export const DEMO_LOCATION_ROLES: LocationRole[] = [
  { id: 'lr-buiten-bartender', location_id: 'demo-location', role_id: 'role-buiten-bartender', headcount: 2 },
  { id: 'lr-buiten-runner',    location_id: 'demo-location', role_id: 'role-buiten-runner',    headcount: 1 },
  { id: 'lr-binnen-bartender', location_id: 'demo-location', role_id: 'role-binnen-bartender', headcount: 2 },
  { id: 'lr-kok',              location_id: 'demo-location', role_id: 'role-kok',              headcount: 1 },
]

export const DEMO_LOCATION_ROLES_2: LocationRole[] = [
  { id: 'lr2-buiten-bartender', location_id: 'demo-location-2', role_id: 'role-buiten-bartender', headcount: 1 },
  { id: 'lr2-binnen-bartender', location_id: 'demo-location-2', role_id: 'role-binnen-bartender', headcount: 1 },
]
```

- [ ] **Step 2: Voeg de afdelingsregels toe**

Direct onder `DEMO_LOCATION_ROLES_2` toevoegen (import `DepartmentStaffingRule` bovenaan vanuit `../types/staffing`):

```ts
// Bezettingsregels uit het Waterfront-gesprek: buiten 2 (3 bij groot feest/drukte), binnen 2, keuken 1
export const DEMO_DEPARTMENT_STAFFING_RULES: DepartmentStaffingRule[] = [
  { id: 'dsr-buiten', location_id: 'demo-location', department_id: 'dept-bar-buiten', department_name: 'Bar buiten', base_staff: 2, busy_staff: 3, event_guest_threshold: 50, event_staff: 3 },
  { id: 'dsr-binnen', location_id: 'demo-location', department_id: 'dept-bar-binnen', department_name: 'Bar binnen', base_staff: 2, busy_staff: 2 },
  { id: 'dsr-keuken', location_id: 'demo-location', department_id: 'dept-keuken',     department_name: 'Keuken',     base_staff: 1, busy_staff: 2 },
]

export const DEMO_DEPARTMENT_STAFFING_RULES_2: DepartmentStaffingRule[] = [
  { id: 'dsr2-buiten', location_id: 'demo-location-2', department_id: 'dept-bar-buiten', department_name: 'Bar buiten', base_staff: 1, busy_staff: 2, event_guest_threshold: 50, event_staff: 2 },
  { id: 'dsr2-binnen', location_id: 'demo-location-2', department_id: 'dept-bar-binnen', department_name: 'Bar binnen', base_staff: 1, busy_staff: 2 },
]
```

- [ ] **Step 3: Build om typefouten te vangen**

Run: `npm run build`
Expected: succes (de oude role-ids worden nergens buiten dit bestand gerefereerd — controleer met `npx oxlint` en grep: `role-chef|dept-zaal|dept-kassa` mag alleen nog in git-historie voorkomen).

- [ ] **Step 4: Commit**

```bash
git add src/data/demoSeed.ts
git commit -m "feat: Waterfront demo-organisatie (Bar buiten/Bar binnen/Keuken) + afdelingsregels"
```

---

### Task 3: Gedeelde kalender + realistische demo-observaties (TDD)

**Files:**
- Create: `src/lib/calendar.ts`
- Modify: `src/data/demoSeed.ts` (vervang `getDemoObservations` volledig, verwijder lokale holiday-helpers)
- Modify: `src/services/forecastService.ts` (regels 8–30: vervang lokale holiday-constanten door import uit `src/lib/calendar.ts`)
- Test: `src/data/__tests__/demoSeed.test.ts`

**Interfaces:**
- Consumes: `computeStaffing`, `getDemandLevel` (Task 1), `DEMO_DEPARTMENT_STAFFING_RULES(_2)` (Task 2)
- Produces:
  - `src/lib/calendar.ts`: `isPublicHoliday(dateStr: string): boolean`, `isSchoolHoliday(dateStr: string): boolean`
  - `getDemoObservations(locationId?: string): DailyObservation[]` — zelfde signatuur als nu, maar seizoensdata van 1 april t/m gisteren, met bezetting uit de engine

- [ ] **Step 1: Maak de gedeelde kalender**

Create `src/lib/calendar.ts` (inhoud verhuisd uit `forecastService.ts` regels 9–30, uitgebreid met 2026-04 t/m 2026-09):

```ts
// Belgische feestdagen en schoolvakanties — één bron voor forecast én demodata
export const BELGIAN_PUBLIC_HOLIDAYS: Set<string> = new Set([
  '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-14',
  '2026-05-25', '2026-07-21', '2026-08-15', '2026-11-01',
  '2026-11-11', '2026-12-25',
])

export const SCHOOL_HOLIDAY_RANGES: [string, string][] = [
  ['2025-10-27', '2025-11-02'],
  ['2025-12-22', '2026-01-04'],
  ['2026-02-16', '2026-02-22'],
  ['2026-04-06', '2026-04-19'],
  ['2026-07-01', '2026-08-31'],
]

export function isPublicHoliday(dateStr: string): boolean {
  return BELGIAN_PUBLIC_HOLIDAYS.has(dateStr)
}

export function isSchoolHoliday(dateStr: string): boolean {
  return SCHOOL_HOLIDAY_RANGES.some(([s, e]) => dateStr >= s && dateStr <= e)
}
```

In `src/services/forecastService.ts`: verwijder regels 8–30 (`BELGIAN_PUBLIC_HOLIDAYS` t/m `isPublicHoliday`) en importeer in plaats daarvan:

```ts
import { isPublicHoliday, isSchoolHoliday } from '../lib/calendar'
```

- [ ] **Step 2: Schrijf de falende tests voor de generator**

Create `src/data/__tests__/demoSeed.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getDemoObservations, DEMO_DEPARTMENT_STAFFING_RULES } from '../demoSeed'
import { computeStaffing, getDemandLevel } from '../../services/staffingService'

describe('getDemoObservations (Waterfront-profiel)', () => {
  const obs = getDemoObservations('demo-location')

  it('loopt van 1 april dit jaar t/m gisteren (seizoenszaak, ~3 maanden actief)', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const year = yesterday.getFullYear()
    expect(obs[0].date).toBe(`${year}-04-01`)
    expect(obs[obs.length - 1].date).toBe(yesterday.toISOString().split('T')[0])
  })

  it('heeft horeca-realistische omzet per bezoeker (€10–14)', () => {
    for (const o of obs) {
      const perVisitor = o.revenue! / o.visitors!
      expect(perVisitor).toBeGreaterThanOrEqual(10)
      expect(perVisitor).toBeLessThanOrEqual(14)
    }
  })

  it('heeft bezetting binnen het Waterfront-bereik (5–7)', () => {
    for (const o of obs) {
      expect(o.staff_scheduled).toBeGreaterThanOrEqual(5)
      expect(o.staff_scheduled).toBeLessThanOrEqual(7)
    }
  })

  it('is intern consistent: bezetting komt exact uit de engine voor het drukteniveau van die dag', () => {
    const avg = obs.reduce((s, o) => s + o.revenue!, 0) / obs.length
    for (const o of obs) {
      const demand = getDemandLevel(o.revenue!, avg)
      const expected = computeStaffing(DEMO_DEPARTMENT_STAFFING_RULES, demand, o.special_event_name ? 80 : undefined)
      // Zonder event-gastenaantal per dag: bezetting moet minimaal basis en maximaal engine-max zijn
      expect(o.staff_scheduled).toBeGreaterThanOrEqual(computeStaffing(DEMO_DEPARTMENT_STAFFING_RULES, demand).total)
      expect(o.staff_scheduled).toBeLessThanOrEqual(expected.total)
    }
  })

  it('is deterministisch (zelfde output bij herhaalde aanroep)', () => {
    const again = getDemoObservations('demo-location')
    expect(again.map(o => o.revenue)).toEqual(obs.map(o => o.revenue))
  })
})
```

- [ ] **Step 3: Run de tests — verwacht FAIL**

Run: `npx vitest run src/data/__tests__/demoSeed.test.ts`
Expected: FAIL — datums beginnen op `2025-01-01`, omzet per bezoeker is 35, bezetting tot 22.

- [ ] **Step 4: Herschrijf `getDemoObservations`**

Vervang in `src/data/demoSeed.ts` de volledige functie `getDemoObservations` (en de lokale `publicHolidays`/`schoolHolidayRanges`/`isSchoolHoliday`-helpers) door:

```ts
import { isPublicHoliday, isSchoolHoliday } from '../lib/calendar'
import { computeStaffing, getDemandLevel } from '../services/staffingService'

// Evenementen met verwacht aantal gasten (drempel voor 3e persoon buiten: 50)
function demoEvents(year: number): Record<string, { name: string; guests: number }> {
  return {
    [`${year}-04-26`]: { name: 'Lente-opening',  guests: 40 },
    [`${year}-05-14`]: { name: 'Hemelvaart BBQ', guests: 60 },
    [`${year}-05-30`]: { name: 'Privéfeest',     guests: 80 },
    [`${year}-06-20`]: { name: 'Zomerfestival',  guests: 120 },
    [`${year}-06-27`]: { name: 'Privéfeest',     guests: 35 },
    [`${year}-07-05`]: { name: 'Waterski Cup',   guests: 90 },
    [`${year}-07-18`]: { name: 'Privéfeest',     guests: 55 },
    [`${year}-08-08`]: { name: 'Zomerkermis',    guests: 100 },
    [`${year}-08-22`]: { name: 'Cocktailavond',  guests: 45 },
  }
}

// Terraszaak-drukte per maand (april rustig opstarten, hoogzomer piek)
const MONTH_FACTOR: Record<number, number> = { 4: 0.75, 5: 0.9, 6: 1.05, 7: 1.15, 8: 1.15, 9: 0.85 }

export function getDemoObservations(locationId = 'demo-location'): DailyObservation[] {
  const scale = locationId === 'demo-location-2' ? 0.7 : 1.0
  const rules = locationId === 'demo-location-2' ? DEMO_DEPARTMENT_STAFFING_RULES_2 : DEMO_DEPARTMENT_STAFFING_RULES
  const maxCapacity = locationId === 'demo-location-2' ? 800 : 1200

  // Seizoenszaak: open sinds 1 april dit jaar, data t/m gisteren
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const start = new Date(year, 3, 1) // 1 april
  const events = demoEvents(year)

  // Pass 1: bezoekers en omzet per dag
  type DayDraft = { dateStr: string; d: Date; visitors: number; revenue: number; event?: { name: string; guests: number } }
  const drafts: DayDraft[] = []
  for (let d = new Date(start); d <= yesterday; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    const month = d.getMonth() + 1
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const event = events[dateStr]

    const seed = year * 10000 + month * 100 + d.getDate()
    const rand1 = seededRand(seed)
    const rand2 = seededRand(seed + 1000)
    const rand3 = seededRand(seed + 2000)

    // Bezoekers: terraszaak-profiel
    let visitors = isWeekend ? 220 + rand1 * 160 : 90 + rand1 * 70
    visitors *= MONTH_FACTOR[month] ?? 1.0

    const isRainy = rand3 < 0.3
    if (isRainy) visitors *= 0.45 // regen halveert een terraszaak

    if (event) visitors *= 1.2
    if (isPublicHoliday(dateStr)) visitors *= 1.2
    if (isSchoolHoliday(dateStr) && !isWeekend) visitors *= 1.15

    const finalVisitors = Math.round(visitors * scale)
    const revenuePerVisitor = 10.5 + rand2 * 3 // €10,50–13,50 (drankgericht terras)
    drafts.push({ dateStr, d: new Date(d), visitors: finalVisitors, revenue: Math.round(finalVisitors * revenuePerVisitor), event })
  }

  // Pass 2: drukteniveau + bezetting uit dezelfde engine als dashboard/forecast → per constructie consistent
  const avgRevenue = drafts.reduce((s, x) => s + x.revenue, 0) / Math.max(drafts.length, 1)

  return drafts.map(({ dateStr, d, visitors, revenue, event }) => {
    const demand = getDemandLevel(revenue, avgRevenue)
    const staff = computeStaffing(rules, demand, event?.guests).total
    const dayOfWeek = d.getDay()
    const month = d.getMonth() + 1
    return {
      id: `demo-obs-${locationId}-${dateStr}`,
      company_id: 'demo-company',
      location_id: locationId,
      date: dateStr,
      revenue,
      visitors,
      transactions: Math.round(visitors * 0.9),
      staff_scheduled: staff,
      staff_needed: staff,
      occupancy_rate: Math.min(100, Math.round((visitors / maxCapacity) * 100)),
      day_of_week: dayOfWeek,
      month,
      year: d.getFullYear(),
      week_number: getWeekNumber(d),
      season: getSeason(month),
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
      is_holiday: isPublicHoliday(dateStr) || isSchoolHoliday(dateStr),
      is_school_holiday: isSchoolHoliday(dateStr),
      is_public_holiday: isPublicHoliday(dateStr),
      special_event_name: event?.name,
    }
  })
}
```

Let op: de bestaande `seededRand`-functie blijft staan. De oude constanten `publicHolidays`, `schoolHolidayRanges`, de lokale `isSchoolHoliday` en `specialEvents` binnen de oude functie verdwijnen.

- [ ] **Step 5: Run alle tests — verwacht PASS**

Run: `npx vitest run`
Expected: PASS (staffingService- én demoSeed-tests)

Kanttekening bij de bereik-test (5–7): bezetting demo-location is Low/Normal → 5, High/Very High → 7, evenement op rustige dag → 6. Als de test faalt omdat een waarde buiten bereik valt, is de generator fout — niet de test.

- [ ] **Step 6: Build, lint en commit**

Run: `npm run build && npm run lint` — Expected: beide succes.

```bash
git add src/lib/calendar.ts src/data/demoSeed.ts src/data/__tests__/demoSeed.test.ts src/services/forecastService.ts
git commit -m "feat: realistische Waterfront-demodata (seizoen, terrasprofiel, engine-consistente bezetting)"
```

---

### Task 4: Service-CRUD voor afdelingsregels + SQL-migratie

**Files:**
- Modify: `src/services/supabaseService.ts`
- Create: `supabase/migrations/002_department_staffing_rules.sql`
- Test: `src/services/__tests__/supabaseServiceDemo.test.ts`

**Interfaces:**
- Consumes: `DEMO_DEPARTMENT_STAFFING_RULES(_2)` (Task 2), `DepartmentStaffingRule` (Task 1)
- Produces:
  - `getDepartmentStaffingRules(locationId: string): Promise<DepartmentStaffingRule[]>`
  - `upsertDepartmentStaffingRule(rule: Omit<DepartmentStaffingRule, 'id'> & { id?: string }): Promise<void>`

- [ ] **Step 1: Schrijf de falende test (demo-modus)**

Create `src/services/__tests__/supabaseServiceDemo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getDepartmentStaffingRules, upsertDepartmentStaffingRule } from '../supabaseService'

// .env heeft geen VITE_SUPABASE_URL in testomgeving → isDemo is true (zie src/lib/supabase.ts)
describe('department staffing rules (demo store)', () => {
  it('geeft de Waterfront-regels voor demo-location', async () => {
    const rules = await getDepartmentStaffingRules('demo-location')
    expect(rules.map(r => r.department_name)).toEqual(['Bar buiten', 'Bar binnen', 'Keuken'])
    expect(rules[0].base_staff).toBe(2)
    expect(rules[0].event_staff).toBe(3)
  })

  it('werkt een bestaande regel bij via upsert', async () => {
    await upsertDepartmentStaffingRule({
      id: 'dsr-keuken', location_id: 'demo-location', department_id: 'dept-keuken',
      department_name: 'Keuken', base_staff: 2, busy_staff: 2,
    })
    const rules = await getDepartmentStaffingRules('demo-location')
    expect(rules.find(r => r.department_id === 'dept-keuken')?.base_staff).toBe(2)
  })
})
```

Vooraf controleren: als `src/lib/supabase.ts` bij ontbrekende env-variabelen crasht in plaats van `isDemo = true` te zetten, lees dat bestand en mock zonodig via `vi.mock`. Verwachting op basis van bestaand demo-gedrag: geen mock nodig.

- [ ] **Step 2: Run de test — verwacht FAIL**

Run: `npx vitest run src/services/__tests__/supabaseServiceDemo.test.ts`
Expected: FAIL — "has no exported member 'getDepartmentStaffingRules'"

- [ ] **Step 3: Implementeer store + functies**

In `src/services/supabaseService.ts`:

Voeg aan de imports uit `../data/demoSeed` toe: `DEMO_DEPARTMENT_STAFFING_RULES, DEMO_DEPARTMENT_STAFFING_RULES_2`, en importeer het type: `import type { DepartmentStaffingRule } from '../types/staffing'`.

Voeg aan `demoStores` toe:

```ts
departmentStaffingRules: {
  'demo-location':   DEMO_DEPARTMENT_STAFFING_RULES.map(r => ({ ...r })),
  'demo-location-2': DEMO_DEPARTMENT_STAFFING_RULES_2.map(r => ({ ...r })),
} as Record<string, DepartmentStaffingRule[]>,
```

Voeg de functies toe (naast de bestaande staffing-functies):

```ts
export async function getDepartmentStaffingRules(locationId: string): Promise<DepartmentStaffingRule[]> {
  if (isDemo) return demoStores.departmentStaffingRules[locationId] ?? []
  const { data, error } = await supabase
    .from('department_staffing_rules')
    .select('*, departments(name)')
    .eq('location_id', locationId)
  if (error) throw error
  return (data as (DepartmentStaffingRule & { departments: { name: string } | null })[]).map(row => ({
    ...row,
    department_name: row.departments?.name ?? '',
  }))
}

export async function upsertDepartmentStaffingRule(
  rule: Omit<DepartmentStaffingRule, 'id'> & { id?: string }
): Promise<void> {
  if (isDemo) {
    const store = demoStores.departmentStaffingRules[rule.location_id] ?? []
    const idx = store.findIndex(x => x.department_id === rule.department_id)
    if (idx >= 0) store[idx] = { ...store[idx], ...rule }
    else store.push({ id: `dsr-${Date.now()}`, ...rule })
    demoStores.departmentStaffingRules[rule.location_id] = store
    return
  }
  const { department_name: _omit, ...dbRule } = rule // naam komt via join, niet uit tabel
  const { error } = await supabase
    .from('department_staffing_rules')
    .upsert(dbRule, { onConflict: 'location_id,department_id' })
  if (error) throw error
}
```

- [ ] **Step 4: Maak de migratie**

Create `supabase/migrations/002_department_staffing_rules.sql`:

```sql
-- Personeelsregels per afdeling (vervangt de platte staffing_rules op termijn)
create table if not exists department_staffing_rules (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  base_staff int not null default 1,
  busy_staff int not null default 1,
  event_guest_threshold int,
  event_staff int,
  unique (location_id, department_id)
);

alter table department_staffing_rules enable row level security;

create policy "authenticated read department_staffing_rules"
  on department_staffing_rules for select to authenticated using (true);

create policy "authenticated write department_staffing_rules"
  on department_staffing_rules for all to authenticated using (true) with check (true);
```

Controleer eerst het policy-patroon in `supabase/migrations/001_organisation.sql` en volg exact datzelfde patroon als het afwijkt van bovenstaande.

- [ ] **Step 5: Run tests, build, commit**

Run: `npx vitest run && npm run build` — Expected: PASS + succes.

```bash
git add src/services/supabaseService.ts supabase/migrations/002_department_staffing_rules.sql src/services/__tests__/supabaseServiceDemo.test.ts
git commit -m "feat: CRUD + migratie voor afdelingspersoneelsregels"
```

---

### Task 5: forecastService op afdelingsregels

**Files:**
- Modify: `src/types/forecast.ts`
- Modify: `src/services/forecastService.ts`
- Modify: `src/pages/DashboardPage.tsx` (alleen call-site, regels 9–10, 92–103, 118–126 — volledige herbouw volgt in Task 7)
- Modify: `src/pages/ForecastPage.tsx` (alleen call-site, regels 8, 79, 84–94, 103–117 — opschoning volgt in Task 8)
- Test: `src/services/__tests__/forecastService.test.ts`

**Interfaces:**
- Consumes: `computeStaffing`, `getDemandLevel` (Task 1), `getDepartmentStaffingRules` (Task 4)
- Produces:
  - `ForecastDay` krijgt nieuw veld `staff_by_department: DepartmentAdvice[]`
  - Nieuwe signatuur: `generateForecast(observations: DailyObservation[], horizonDays: number, deptRules: DepartmentStaffingRule[], locationId: string, locationCity?: string): Promise<ForecastDay[]>`

- [ ] **Step 1: Breid `ForecastDay` uit**

In `src/types/forecast.ts`:

```ts
import type { DepartmentAdvice } from './staffing'

export type DemandLevel = 'Low' | 'Normal' | 'High' | 'Very High'

export interface ForecastDay {
  forecast_date: string
  predicted_revenue: number
  predicted_visitors: number
  confidence_low: number
  confidence_high: number
  demand_level: DemandLevel
  recommended_staff: number
  staff_by_department: DepartmentAdvice[]
  key_reason: string
}
```

- [ ] **Step 2: Schrijf de falende test**

Create `src/services/__tests__/forecastService.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { generateForecast } from '../forecastService'
import { getDemoObservations, DEMO_DEPARTMENT_STAFFING_RULES } from '../../data/demoSeed'
import { computeStaffing } from '../staffingService'

// Forceer het client-side pad: als VITE_FORECAST_API_URL in .env staat zou de test anders het netwerk op gaan
vi.stubGlobal('fetch', () => Promise.reject(new Error('offline in test')))

describe('generateForecast (client-side fallback)', () => {
  it('bezetting en drukteniveau zijn consistent: zelfde niveau ⇒ zelfde bezetting', async () => {
    const obs = getDemoObservations('demo-location')
    const forecast = await generateForecast(obs, 14, DEMO_DEPARTMENT_STAFFING_RULES, 'demo-location', 'Genk')
    expect(forecast).toHaveLength(14)
    for (const day of forecast) {
      const expected = computeStaffing(DEMO_DEPARTMENT_STAFFING_RULES, day.demand_level)
      expect(day.recommended_staff).toBe(expected.total)
      expect(day.staff_by_department).toEqual(expected.per_department)
    }
  })

  it('geeft 0 personeel + hint zonder regels (nooit meer een verzonnen 14)', async () => {
    const obs = getDemoObservations('demo-location')
    const forecast = await generateForecast(obs, 7, [], 'demo-location', 'Genk')
    for (const day of forecast) {
      expect(day.recommended_staff).toBe(0)
      expect(day.staff_by_department).toEqual([])
    }
  })
})
```

- [ ] **Step 3: Run de test — verwacht FAIL**

Run: `npx vitest run src/services/__tests__/forecastService.test.ts`
Expected: FAIL — type-/signatuurfouten (`staffingRules: StaffingRule[]` verwacht).

- [ ] **Step 4: Pas `forecastService.ts` aan**

1. Vervang de imports:

```ts
import type { DailyObservation } from '../types/database'
import type { ForecastDay } from '../types/forecast'
import type { DepartmentStaffingRule } from '../types/staffing'
import { computeStaffing, getDemandLevel } from './staffingService'
import { getSeason } from '../lib/utils'
import { isPublicHoliday, isSchoolHoliday } from '../lib/calendar'
import { getMockWeather } from './weatherService'
```

2. Verwijder de lokale functies `getDemandLevel` (regels 38–44) en `getRecommendedStaff` (regels 46–59) — inclusief de hardcoded 6/9/14/20-fallback.

3. In `mapBackendResponse` en `generateForecastClientSide`: vervang de parameter `rules: StaffingRule[]` / `staffingRules: StaffingRule[]` door `deptRules: DepartmentStaffingRule[]` en vervang de bezettingsberekening per dag door:

```ts
const demand_level = getDemandLevel(predicted_revenue, overallAvg)
const advies = computeStaffing(deptRules, demand_level)
```

met in het return-object: `demand_level`, `recommended_staff: advies.total`, `staff_by_department: advies.per_department`.

(In `generateForecastClientSide` heet `overallAvg` momenteel `overallAvgRevenue` — gebruik die bestaande variabele.)

4. Publieke signatuur:

```ts
export async function generateForecast(
  observations: DailyObservation[],
  horizonDays: number,
  deptRules: DepartmentStaffingRule[],
  locationId: string,
  locationCity = 'Genk',
): Promise<ForecastDay[]>
```

- [ ] **Step 5: Werk de twee call-sites mechanisch bij**

`src/pages/DashboardPage.tsx`:
- Import: `getStaffingRules` → `getDepartmentStaffingRules`; type-import `StaffingRule` → `DepartmentStaffingRule` uit `../types/staffing`.
- State: `const [rules, setRules] = useState<DepartmentStaffingRule[]>([])`.
- In de `Promise.all`: `getStaffingRules(selectedLocation.id)` → `getDepartmentStaffingRules(selectedLocation.id)`.
- `getTodayEstimate` compileert hierna niet meer (verwacht `StaffingRule[]`) — vervang tijdelijk de bezettingsregel in `getTodayEstimate` door:

```ts
import { computeStaffing, getDemandLevel } from '../services/staffingService'
// ...
const overallAvg = observations.reduce((s, o) => s + (o.revenue ?? 0), 0) / Math.max(observations.length, 1)
const recommendedStaff = computeStaffing(rules, getDemandLevel(predictedRevenue, overallAvg)).total
```

(verwijder de oude `let recommendedStaff = predictedVisitors > 500 ? 20 : ...`-blok en de flat-rule-loop; volledige herbouw van deze pagina volgt in Task 7).

`src/pages/ForecastPage.tsx`: zelfde mechanische wijziging — import, state-type `DepartmentStaffingRule[]`, `getDepartmentStaffingRules` in de `Promise.all`.

- [ ] **Step 6: Run alle tests + build — verwacht PASS**

Run: `npx vitest run && npm run build`
Expected: PASS + build-succes.

- [ ] **Step 7: Commit**

```bash
git add src/types/forecast.ts src/services/forecastService.ts src/services/__tests__/forecastService.test.ts src/pages/DashboardPage.tsx src/pages/ForecastPage.tsx
git commit -m "feat: forecast gebruikt afdelingsengine — einde inconsistente bezetting"
```

---

### Task 6: Locatie-instellingen (uurloon/shifturen) + StaffingPage per afdeling

**Files:**
- Create: `src/services/settingsService.ts`
- Rewrite: `src/pages/StaffingPage.tsx`
- Modify: `src/services/supabaseService.ts` (verwijder `getStaffingRules`, `saveStaffingRule`, `deleteStaffingRule`)
- Modify: `src/data/demoSeed.ts` (verwijder `DEMO_STAFFING_RULES`, `DEMO_STAFFING_RULES_2`)
- Modify: `src/types/database.ts` (verwijder interface `StaffingRule`)
- Test: `src/services/__tests__/settingsService.test.ts`

**Interfaces:**
- Consumes: `getDepartments`, `getLocationDepartments`, `getDepartmentStaffingRules`, `upsertDepartmentStaffingRule` (bestaand + Task 4)
- Produces:
  - `LocationSettings { hourly_wage: number; shift_hours: number }`
  - `getLocationSettings(locationId: string): LocationSettings` (defaults: €14/u, 8u)
  - `saveLocationSettings(locationId: string, settings: LocationSettings): void`

- [ ] **Step 1: Schrijf de falende test voor settings**

Create `src/services/__tests__/settingsService.test.ts`:

```ts
// @vitest-environment jsdom  ← alleen als localStorage ontbreekt in node; probeer eerst zonder
import { describe, it, expect, beforeEach } from 'vitest'
import { getLocationSettings, saveLocationSettings } from '../settingsService'

describe('locationSettings', () => {
  beforeEach(() => localStorage.clear())

  it('geeft defaults zonder opgeslagen instellingen', () => {
    expect(getLocationSettings('loc-x')).toEqual({ hourly_wage: 14, shift_hours: 8 })
  })

  it('bewaart en leest instellingen per locatie', () => {
    saveLocationSettings('loc-x', { hourly_wage: 16.5, shift_hours: 9 })
    expect(getLocationSettings('loc-x').hourly_wage).toBe(16.5)
    expect(getLocationSettings('loc-y').hourly_wage).toBe(14)
  })
})
```

Als `localStorage` niet bestaat in de node-testomgeving: `npm install -D jsdom` en zet de `@vitest-environment jsdom`-comment bovenaan het testbestand aan.

- [ ] **Step 2: Run — verwacht FAIL, implementeer dan**

Create `src/services/settingsService.ts`:

```ts
export interface LocationSettings {
  hourly_wage: number // gemiddeld uurloon in €
  shift_hours: number // gemiddelde shifturen per dag
}

const DEFAULTS: LocationSettings = { hourly_wage: 14, shift_hours: 8 }

export function getLocationSettings(locationId: string): LocationSettings {
  try {
    const raw = localStorage.getItem(`cloudcast_settings_${locationId}`)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveLocationSettings(locationId: string, settings: LocationSettings): void {
  localStorage.setItem(`cloudcast_settings_${locationId}`, JSON.stringify(settings))
}
```

Run: `npx vitest run src/services/__tests__/settingsService.test.ts` — Expected: PASS.

- [ ] **Step 3: Herschrijf StaffingPage**

Rewrite `src/pages/StaffingPage.tsx` volledig:

```tsx
import { useEffect, useState, type ChangeEvent } from 'react'
import { Save } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import {
  getDepartments, getLocationDepartments,
  getDepartmentStaffingRules, upsertDepartmentStaffingRule,
} from '../services/supabaseService'
import { getLocationSettings, saveLocationSettings, type LocationSettings } from '../services/settingsService'
import type { Department } from '../types/database'
import type { DepartmentStaffingRule } from '../types/staffing'

interface RuleForm {
  base_staff: string
  busy_staff: string
  event_guest_threshold: string
  event_staff: string
}

function toForm(rule?: DepartmentStaffingRule): RuleForm {
  return {
    base_staff: rule ? String(rule.base_staff) : '1',
    busy_staff: rule ? String(rule.busy_staff) : '1',
    event_guest_threshold: rule?.event_guest_threshold !== undefined ? String(rule.event_guest_threshold) : '',
    event_staff: rule?.event_staff !== undefined ? String(rule.event_staff) : '',
  }
}

export default function StaffingPage() {
  const { selectedLocation } = useApp()
  const [departments, setDepartments] = useState<Department[]>([])
  const [forms, setForms] = useState<Record<string, RuleForm>>({})
  const [rules, setRules] = useState<DepartmentStaffingRule[]>([])
  const [settings, setSettings] = useState<LocationSettings>({ hourly_wage: 14, shift_hours: 8 })
  const [savedDept, setSavedDept] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedLocation) return
    setSettings(getLocationSettings(selectedLocation.id))
    Promise.all([
      getDepartments(selectedLocation.company_id),
      getLocationDepartments(selectedLocation.id),
      getDepartmentStaffingRules(selectedLocation.id),
    ]).then(([depts, locDepts, r]) => {
      const activeIds = new Set(locDepts.filter(ld => ld.is_active).map(ld => ld.department_id))
      const active = depts.filter(d => activeIds.has(d.id))
      setDepartments(active)
      setRules(r)
      setForms(Object.fromEntries(active.map(d => [d.id, toForm(r.find(x => x.department_id === d.id))])))
    })
  }, [selectedLocation])

  async function handleSave(dept: Department) {
    if (!selectedLocation) return
    const f = forms[dept.id]
    const existing = rules.find(r => r.department_id === dept.id)
    await upsertDepartmentStaffingRule({
      id: existing?.id,
      location_id: selectedLocation.id,
      department_id: dept.id,
      department_name: dept.name,
      base_staff: Number(f.base_staff) || 1,
      busy_staff: Number(f.busy_staff) || 1,
      event_guest_threshold: f.event_guest_threshold ? Number(f.event_guest_threshold) : undefined,
      event_staff: f.event_staff ? Number(f.event_staff) : undefined,
    })
    setRules(await getDepartmentStaffingRules(selectedLocation.id))
    setSavedDept(dept.id)
    setTimeout(() => setSavedDept(null), 2000)
  }

  function handleSettingsChange(next: LocationSettings) {
    setSettings(next)
    if (selectedLocation) saveLocationSettings(selectedLocation.id, next)
  }

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Personeelsregels</h1>
        <p className="text-slate-500 text-sm mt-1">Bezetting per afdeling — basis, bij drukte en bij evenementen</p>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        {departments.map(dept => {
          const f = forms[dept.id]
          if (!f) return null
          const set = (key: keyof RuleForm) => (e: ChangeEvent<HTMLInputElement>) =>
            setForms(prev => ({ ...prev, [dept.id]: { ...prev[dept.id], [key]: e.target.value } }))
          return (
            <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">{dept.name}</h3>
                <Button onClick={() => handleSave(dept)}>
                  <Save size={14} />
                  {savedDept === dept.id ? 'Opgeslagen ✓' : 'Opslaan'}
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Basisbezetting</label>
                  <input type="number" min="0" value={f.base_staff} onChange={set('base_staff')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bij drukte</label>
                  <input type="number" min="0" value={f.busy_staff} onChange={set('busy_staff')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Evenement vanaf … gasten (leeg = n.v.t.)</label>
                  <input type="number" min="0" value={f.event_guest_threshold} onChange={set('event_guest_threshold')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bezetting bij evenement</label>
                  <input type="number" min="0" value={f.event_staff} onChange={set('event_staff')} className={inputCls} />
                </div>
              </div>
            </div>
          )
        })}
        {departments.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            Geen actieve afdelingen voor deze locatie. Activeer afdelingen op de Organisatie-pagina.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-xl">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Loonkosten</h3>
        <p className="text-xs text-slate-500 mb-4">Gebruikt voor de besparingsindicator op het dashboard.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Gemiddeld uurloon (€)</label>
            <input type="number" min="0" step="0.5" value={settings.hourly_wage} className={inputCls}
              onChange={e => handleSettingsChange({ ...settings, hourly_wage: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Shifturen per dag</label>
            <input type="number" min="0" value={settings.shift_hours} className={inputCls}
              onChange={e => handleSettingsChange({ ...settings, shift_hours: Number(e.target.value) || 0 })} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
```

- [ ] **Step 4: Verwijder de platte-regel-restanten**

- `src/services/supabaseService.ts`: verwijder `getStaffingRules`, `saveStaffingRule`, `deleteStaffingRule`, de `staffingRules`-key in `demoStores`, en de imports `DEMO_STAFFING_RULES`, `DEMO_STAFFING_RULES_2`, `StaffingRule`.
- `src/data/demoSeed.ts`: verwijder `DEMO_STAFFING_RULES` en `DEMO_STAFFING_RULES_2` (en het `StaffingRule` type-import).
- `src/types/database.ts`: verwijder interface `StaffingRule`.

Verifieer: `grep -rn "StaffingRule\b" src/` (zonder `DepartmentStaffingRule`-hits) — Expected: 0 resultaten.
De Supabase-tabel `staffing_rules` blijft bestaan (geen destructieve migratie).

- [ ] **Step 5: Run tests + build + lint, commit**

Run: `npx vitest run && npm run build && npm run lint` — Expected: alles groen.

```bash
git add -A src/ package.json package-lock.json
git commit -m "feat: personeelsregels per afdeling UI + loonkosteninstellingen; platte regels verwijderd"
```

---

### Task 7: Dashboard herbouw rond de vier uitbatersvragen

**Files:**
- Rewrite: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `computeStaffing`, `getDemandLevel`, `maxStaffing` (Task 1), `getDepartmentStaffingRules` (Task 4), `getLocationSettings` (Task 6), `generateForecast` met nieuwe signatuur (Task 5), bestaande `getObservations`, `getMockWeather`, `formatEuro`
- Produces: geen nieuwe interfaces (bladzijde-component)

- [ ] **Step 1: Herschrijf `src/pages/DashboardPage.tsx` volledig**

Structuur van boven naar beneden: header + weer (behouden), lage-voorraad-alert (behouden), KPI-rij (omzet / bezoekers / besparing), personeel-per-afdeling-kaart, bestelmoment-kaart, 7-daagse forecaststrip, dagplanning per uur (behouden, bezetting geschaald op engine-totaal), snelle acties (behouden).

```tsx
import { useEffect, useState, useMemo, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Upload, BarChart2, Package, ChevronRight,
  Users, AlertTriangle, Sun, Cloud, CloudRain, Thermometer, Wind, PiggyBank, ShoppingCart,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import { useApp } from '../context/AppContext'
import { getObservations, getDepartmentStaffingRules } from '../services/supabaseService'
import { generateForecast } from '../services/forecastService'
import { computeStaffing, getDemandLevel, maxStaffing } from '../services/staffingService'
import { getLocationSettings } from '../services/settingsService'
import { getMockWeather } from '../services/weatherService'
import type { DailyObservation } from '../types/database'
import type { DepartmentStaffingRule } from '../types/staffing'
import type { ForecastDay } from '../types/forecast'
import { formatEuro } from '../lib/utils'

// Typisch dagpatroon voor outdoor waterfront (% van dagelijkse bezoekers per uur)
const HOURLY_PATTERN = [
  { hour: 10, pct: 0.04 }, { hour: 11, pct: 0.07 }, { hour: 12, pct: 0.13 },
  { hour: 13, pct: 0.15 }, { hour: 14, pct: 0.10 }, { hour: 15, pct: 0.09 },
  { hour: 16, pct: 0.11 }, { hour: 17, pct: 0.10 }, { hour: 18, pct: 0.09 },
  { hour: 19, pct: 0.07 }, { hour: 20, pct: 0.04 }, { hour: 21, pct: 0.02 },
]
const TOTAL_PCT = HOURLY_PATTERN.reduce((s, h) => s + h.pct, 0)

const NL_DAYS = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag']
const NL_DAYS_SHORT = ['zo','ma','di','wo','do','vr','za']
const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']

const CARD_STYLE: CSSProperties = {
  background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
}

function busyStyle(visitors: number, peak: number) {
  const r = visitors / peak
  if (r < 0.4) return { label: 'Rustig',  bar: '#86efac' }
  if (r < 0.7) return { label: 'Normaal', bar: '#fcd34d' }
  return             { label: 'Druk',    bar: '#f87171' }
}

// Volgend bestelmoment: eerstvolgende zondag of woensdag
function nextOrderMoment(from: Date): { date: Date; label: string } {
  for (let i = 0; i <= 7; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    if (d.getDay() === 0 || d.getDay() === 3) {
      if (i === 0 && from.getHours() >= 20) continue // vanavond al geweest
      return { date: d, label: i === 0 ? 'vanavond' : `${NL_DAYS[d.getDay()].toLowerCase()} ${d.getDate()} ${NL_MONTHS[d.getMonth()]}` }
    }
  }
  return { date: from, label: 'vandaag' }
}

function getTodayEstimate(observations: DailyObservation[], rules: DepartmentStaffingRule[]) {
  const today = new Date()
  const dow = today.getDay()
  const month = today.getMonth() + 1
  const sameDow = observations.filter(o => o.day_of_week === dow)
  const avgRevenue  = sameDow.length > 0 ? sameDow.reduce((s, o) => s + (o.revenue  ?? 0), 0) / sameDow.length : 1500
  const avgVisitors = sameDow.length > 0 ? sameDow.reduce((s, o) => s + (o.visitors ?? 0), 0) / sameDow.length : 120
  const isSummer = month >= 6 && month <= 8
  const mult = (isSummer ? 1.1 : 1.0) * ((dow === 0 || dow === 6) ? 1.1 : 1.0)
  const predictedRevenue  = Math.round(avgRevenue  * mult)
  const predictedVisitors = Math.round(avgVisitors * mult)
  const overallAvg = observations.reduce((s, o) => s + (o.revenue ?? 0), 0) / Math.max(observations.length, 1)
  const demand = getDemandLevel(predictedRevenue, overallAvg)
  const advice = computeStaffing(rules, demand)
  return { predictedRevenue, predictedVisitors, demand, advice }
}

function WeatherIcon({ condition, size = 20 }: { condition: string; size?: number }) {
  if (condition === 'Regen') return <CloudRain size={size} color="#60a5fa" />
  if (condition === 'Zonnig') return <Sun size={size} color="#fbbf24" />
  return <Cloud size={size} color="#9ca3af" />
}

export default function DashboardPage() {
  const { selectedLocation } = useApp()
  const navigate = useNavigate()
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [rules, setRules] = useState<DepartmentStaffingRule[]>([])
  const [weekForecast, setWeekForecast] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    Promise.all([
      getObservations(selectedLocation.id),
      getDepartmentStaffingRules(selectedLocation.id),
    ]).then(([obs, r]) => {
      setObservations(obs.filter(o => !o.deleted_at))
      setRules(r)
      setLoading(false)
    })
  }, [selectedLocation])

  useEffect(() => {
    if (observations.length === 0) { setWeekForecast([]); return }
    generateForecast(observations, 7, rules, selectedLocation?.id ?? 'x', selectedLocation?.city ?? 'Genk')
      .then(setWeekForecast)
      .catch(() => setWeekForecast([]))
  }, [observations, rules, selectedLocation])

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const todayWeather = useMemo(() => getMockWeather(selectedLocation?.id ?? 'x', [today])[0], [today, selectedLocation])

  const todayEst = useMemo(() => getTodayEstimate(observations, rules), [observations, rules])
  const settings = useMemo(() => getLocationSettings(selectedLocation?.id ?? 'default'), [selectedLocation])

  // Besparing: geadviseerde bezetting vs. vaste 'veilige' (maximale) planning
  const savedStaff = Math.max(0, maxStaffing(rules) - todayEst.advice.total)
  const savedEuro = Math.round(savedStaff * settings.hourly_wage * settings.shift_hours)

  const order = nextOrderMoment(now)

  const hourlyData = useMemo(() => {
    const peak = Math.max(...HOURLY_PATTERN.map(h => h.pct))
    return HOURLY_PATTERN.map(h => ({
      ...h,
      visitors: Math.round(todayEst.predictedVisitors * (h.pct / TOTAL_PCT)),
      peakVisitors: Math.round(todayEst.predictedVisitors * (peak / TOTAL_PCT)),
      staff: Math.max(1, Math.round((h.pct / peak) * todayEst.advice.total)),
    }))
  }, [todayEst])

  const lowStockAlerts = useMemo(() => {
    try {
      const raw = localStorage.getItem(`cloudcast_voorraad_${selectedLocation?.id ?? 'default'}`)
      const items: { name: string; current_stock: number; min_stock: number }[] = raw ? JSON.parse(raw) : []
      return items.filter(i => i.current_stock <= i.min_stock)
    } catch { return [] }
  }, [selectedLocation, now])

  const currentHour = now.getHours()
  const dateLabel = `${NL_DAYS[now.getDay()]} ${now.getDate()} ${NL_MONTHS[now.getMonth()]}`

  return (
    <Layout>
      {/* Header + weer */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goedemorgen 👋</h1>
          <p className="text-slate-500 text-sm mt-1">{dateLabel} — {selectedLocation?.name ?? 'jouw locatie'}</p>
        </div>
        {todayWeather && (
          <div style={{ ...CARD_STYLE, display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '14px', padding: '10px 16px' }}>
            <WeatherIcon condition={todayWeather.weather_condition} size={22} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>{todayWeather.weather_condition}</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                <Thermometer size={11} style={{ display: 'inline', marginRight: 2 }} />
                {todayWeather.temperature_max}°C &nbsp;
                <Wind size={11} style={{ display: 'inline', marginRight: 2 }} />
                {todayWeather.wind_speed} km/u
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Data laden...</p>
      ) : (
        <>
          {/* Lage voorraad */}
          {lowStockAlerts.length > 0 && (
            <button onClick={() => navigate('/voorraad')} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
              background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)',
              borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', cursor: 'pointer',
            }}>
              <AlertTriangle size={16} color="#ea580c" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: '#c2410c', flex: 1 }}>
                <strong>{lowStockAlerts.length} product{lowStockAlerts.length > 1 ? 'en' : ''} onder minimumvoorraad:</strong>{' '}
                {lowStockAlerts.map(i => i.name).join(', ')}
              </p>
              <ChevronRight size={14} color="#ea580c" />
            </button>
          )}

          {/* Vraag 1 + 3: omzet, bezoekers, besparing */}
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Vandaag verwacht
          </p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Verwachte omzet', value: formatEuro(todayEst.predictedRevenue), icon: TrendingUp, color: '#059669', bg: 'rgba(5,150,105,0.07)' },
              { label: 'Bezoekers', value: todayEst.predictedVisitors.toString(), icon: Users, color: '#1a44e8', bg: 'rgba(26,68,232,0.07)' },
              { label: 'Besparing t.o.v. vaste planning', value: savedStaff > 0 ? `${formatEuro(savedEuro)}` : '—', icon: PiggyBank, color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} style={{ ...CARD_STYLE, padding: '18px 20px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Icon size={18} color={color} />
                </div>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a1f36' }}>{value}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Vraag 2: wie waar inplannen */}
          <div style={{ ...CARD_STYLE, padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Inplannen vandaag</p>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>totaal <strong style={{ color: '#1a1f36' }}>{todayEst.advice.total}</strong> personen</span>
            </div>
            {rules.length === 0 ? (
              <button onClick={() => navigate('/staffing')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1a44e8', padding: 0 }}>
                Stel eerst personeelsregels per afdeling in →
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {todayEst.advice.per_department.map(dep => {
                  const base = rules.find(r => r.department_id === dep.department_id)?.base_staff ?? dep.staff
                  const delta = dep.staff - base
                  return (
                    <div key={dep.department_id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{dep.department_name}</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: '#1a1f36' }}>
                        {dep.staff} <span style={{ fontSize: '12px', fontWeight: 500, color: '#9ca3af' }}>pers.</span>
                      </p>
                      {delta > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c', background: 'rgba(234,88,12,0.08)', padding: '2px 8px', borderRadius: '99px' }}>
                          +{delta} wegens {dep.reason === 'evenement' ? 'evenement' : 'drukte'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Vraag 4: bestellen */}
          <div style={{ ...CARD_STYLE, padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5,150,105,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingCart size={18} color="#059669" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Volgend bestelmoment: {order.label}</p>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>Bekijk je voorraad en bereid de brouwerijbestelling voor.</p>
            </div>
            <button onClick={() => navigate('/voorraad')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Komende 7 dagen */}
          {weekForecast.length > 0 && (
            <div style={{ ...CARD_STYLE, padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Komende 7 dagen</p>
                <button onClick={() => navigate('/forecast')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#1a44e8' }}>
                  Volledige forecast →
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekForecast.length}, 1fr)`, gap: '8px' }}>
                {weekForecast.map(day => {
                  const d = new Date(day.forecast_date)
                  return (
                    <div key={day.forecast_date} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: '10px', background: '#f8fafc' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{NL_DAYS_SHORT[d.getDay()]} {d.getDate()}</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#1a1f36', margin: '6px 0 2px' }}>{formatEuro(day.predicted_revenue)}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af' }}>{day.recommended_staff} pers.</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Dagplanning per uur */}
          <div style={{ ...CARD_STYLE, padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Dagplanning vandaag</p>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Live — {now.getHours()}:{now.getMinutes().toString().padStart(2,'0')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {hourlyData.map(({ hour, visitors, peakVisitors, staff }) => {
                const busy = busyStyle(visitors, peakVisitors)
                const isPast    = hour < currentHour
                const isCurrent = hour === currentHour
                const pct = Math.round((visitors / peakVisitors) * 100)
                return (
                  <div key={hour} style={{
                    display: 'grid', gridTemplateColumns: '44px 1fr 70px auto',
                    alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px',
                    background: isCurrent ? 'rgba(26,68,232,0.05)' : 'transparent',
                    border: isCurrent ? '1px solid rgba(26,68,232,0.12)' : '1px solid transparent',
                    opacity: isPast ? 0.45 : 1,
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#1a44e8' : '#6b7280' }}>
                      {hour}:00{isCurrent ? ' ▶' : ''}
                    </span>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: busy.bar, borderRadius: '99px', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{busy.label}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right', whiteSpace: 'nowrap' }}>{staff} pers.</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Snelle acties */}
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Snelle acties
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: 'Forecast bekijken', sub: '14-daagse voorspelling', path: '/forecast', color: '#1a44e8', bg: 'rgba(26,68,232,0.07)' },
              { icon: Upload,     label: 'Data uploaden',     sub: 'Historische data importeren', path: '/data/upload', color: '#0891b2', bg: 'rgba(8,145,178,0.07)' },
              { icon: BarChart2,  label: 'Performance',       sub: 'Omzet & bezoekersanalyse', path: '/performance', color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
              { icon: Package,    label: 'Voorraad',           sub: 'Stockbeheer & bestellingen', path: '/voorraad', color: '#059669', bg: 'rgba(5,150,105,0.07)' },
            ].map(({ icon: Icon, label, sub, path, color, bg }) => (
              <button key={path} onClick={() => navigate(path)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: '12px', padding: '20px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.transform = 'translateY(0)'; b.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)' }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} color={color} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36', marginBottom: '2px' }}>{label}</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>{sub}</p>
                </div>
                <ChevronRight size={16} color="#d1d5db" style={{ alignSelf: 'flex-end' }} />
              </button>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
```

Controleer vooraf de route naar de personeelsregels-pagina in `src/App.tsx` (verwacht `/staffing` — pas de `navigate('/staffing')`-call aan als de route anders heet).

- [ ] **Step 2: Visuele verificatie in de browser**

Run: `npm run dev` en open `http://localhost:5173` (demo-modus).
Verwacht:
- KPI-rij toont omzet (~€1.500–4.500), bezoekers (~100–400), besparing in € of "—".
- "Inplannen vandaag" toont Bar buiten / Bar binnen / Keuken met 2/2/1 of 3/2/2, totaal 5–7.
- Geen enkele kaart toont datapunten-aantallen of datakwaliteit.
- Wissel naar Waterfront Hasselt: andere aantallen (2 afdelingen, totaal 2–4).

- [ ] **Step 3: Tests + build + lint, commit**

Run: `npx vitest run && npm run build && npm run lint` — Expected: alles groen.

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: dashboard herbouwd rond omzet, inplannen per afdeling, besparing en bestelmoment"
```

---

### Task 8: Forecast-pagina en -tabel opschonen

**Files:**
- Modify: `src/pages/ForecastPage.tsx`
- Modify: `src/components/forecast/ForecastTable.tsx`

**Interfaces:**
- Consumes: `ForecastDay.staff_by_department` (Task 5)
- Produces: geen nieuwe interfaces

- [ ] **Step 1: Verwijder meta-informatie van ForecastPage**

In `src/pages/ForecastPage.tsx` regel 123–125, vervang:

```tsx
<p className="text-slate-500 text-sm mt-1">
  Gebaseerd op {observations.length} historische observaties
</p>
```

door:

```tsx
<p className="text-slate-500 text-sm mt-1">
  Verwachte omzet, bezoekers en bezetting per dag
</p>
```

Vervang ook het onderste info-blok (regels 197–204, de `key_reason === 'XGBoost voorspelling'`-conditie) door één neutrale zin zonder modeljargon:

```tsx
<div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
  <Info size={14} className="flex-shrink-0 mt-0.5" />
  <span>Voorspelling op basis van jouw historische data, het weer en de kalender. Wordt nauwkeuriger naarmate er meer data binnenkomt.</span>
</div>
```

- [ ] **Step 2: Vervang de Betrouwbaarheid-kolom door een afdelingskolom**

Rewrite `src/components/forecast/ForecastTable.tsx`:

```tsx
import type { ForecastDay } from '../../types/forecast'
import { formatEuro, formatDate } from '../../lib/utils'
import DemandBadge from './DemandBadge'

interface ForecastTableProps {
  forecast: ForecastDay[]
}

export default function ForecastTable({ forecast }: ForecastTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Datum</th>
            <th className="px-4 py-3 font-medium text-slate-600">Verwachte omzet</th>
            <th className="px-4 py-3 font-medium text-slate-600">Bezoekers</th>
            <th className="px-4 py-3 font-medium text-slate-600">Drukteniveau</th>
            <th className="px-4 py-3 font-medium text-slate-600">Personeel</th>
            <th className="px-4 py-3 font-medium text-slate-600">Per afdeling</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((f, i) => (
            <tr key={f.forecast_date} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
              <td className="px-4 py-2.5 font-medium text-slate-800">{formatDate(f.forecast_date)}</td>
              <td className="px-4 py-2.5 text-slate-700">{formatEuro(f.predicted_revenue)}</td>
              <td className="px-4 py-2.5 text-slate-700">{f.predicted_visitors.toLocaleString('nl-BE')}</td>
              <td className="px-4 py-2.5">
                <DemandBadge level={f.demand_level} />
              </td>
              <td className="px-4 py-2.5 font-medium text-slate-700">{f.recommended_staff}</td>
              <td className="px-4 py-2.5 text-slate-500 text-xs">
                {f.staff_by_department.map(d => `${d.department_name} ${d.staff}`).join(' · ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

(De kolom "Reden"/`key_reason` verdwijnt uit de tabel — de redenen zitten al in de Cloudy-advieskaarten bovenaan de pagina; de betrouwbaarheidsband blijft zichtbaar in de grafiek, als visueel element zonder cijfers.)

- [ ] **Step 3: Visuele verificatie**

Run: `npm run dev`, open de Forecast-pagina, genereer een voorspelling.
Verwacht: tabel toont per rij een consistent trio (drukteniveau ↔ personeel ↔ per-afdeling-uitsplitsing die optelt tot het totaal); nergens observatie-aantallen of confidence-ranges als tekst.

- [ ] **Step 4: Tests + build + lint, commit**

Run: `npx vitest run && npm run build && npm run lint` — Expected: alles groen.

```bash
git add src/pages/ForecastPage.tsx src/components/forecast/ForecastTable.tsx
git commit -m "feat: forecast-weergave opgeschoond — meta-informatie weg, bezetting per afdeling erbij"
```

---

### Task 9: Eindverificatie + changelog

**Files:**
- Modify: `OVERZICHT_AANPASSINGEN.md`

- [ ] **Step 1: Volledige verificatieronde**

```bash
npx vitest run && npm run build && npm run lint
```

Expected: alle tests PASS, build en lint zonder fouten.

Daarna `npm run dev` en de succescriteria uit de spec nalopen:
1. Dashboard: elke getoonde bezetting komt uit de afdelingsregels; KPI's realistisch (omzet €1.000–5.500, bezetting 5–7 Genk / 2–4 Hasselt).
2. Forecast-tabel: geen twee rijen met hetzelfde drukteniveau en verschillende bezetting.
3. Personeelsregels-pagina: pas "Bij drukte" van Keuken aan naar 3 → dashboard en forecast tonen bij drukke dagen totaal 8.
4. Nergens op Dashboard/Forecast: datapunten, datakwaliteit of betrouwbaarheidsgetallen.

- [ ] **Step 2: Changelog bijwerken**

Bovenaan de changelog in `OVERZICHT_AANPASSINGEN.md` toevoegen:

```markdown
### 12-07-2026 — Vini G
- **Personeelsengine per afdeling** — Bezetting per afdeling (basis / drukte / evenement-drempel) vervangt de platte bezoekersregels. Drukteniveau en bezetting komen uit dezelfde berekening.
- **Dashboard herbouwd** — Gericht op de vier uitbatersvragen: verwachte omzet, wie waar inplannen (per afdeling, met delta), besparing t.o.v. vaste planning, volgend bestelmoment. Meta-informatie verwijderd.
- **Realistische demodata** — Waterfront-profiel: seizoenszaak vanaf 1 april, €10,50–13,50 per bezoeker, bezetting 5–7, evenementen met gastenaantallen.
- **Personeelsregels-pagina** — Per afdeling instelbaar + loonkosteninstellingen (uurloon, shifturen) voor de besparingsindicator.
- **Vitest** — Testsuite toegevoegd voor engine, demodata-consistentie en forecast.
```

En in de roadmap-sectie onderaan:

```markdown
### 7. Waterfront Fase 1 — Dashboard + personeelslogica
**Status:** [x] Afgerond (12-07-2026)

### 8. Waterfront Fase 2 — Voorraad & brouwerij-bestelflow
**Status:** [ ] Gepland — zie docs/superpowers/specs/2026-07-12-waterfront-feedback-design.md

### 9. Waterfront Fase 3 — Evenementen (incl. Google Calendar ICS-import van waterfront-genk.be), uur-import, uur-trends
**Status:** [ ] Gepland

### 10. Cold-start blend (baseline + XGBoost) in FastAPI-backend
**Status:** [ ] Gepland
```

- [ ] **Step 3: Commit**

```bash
git add OVERZICHT_AANPASSINGEN.md
git commit -m "docs: changelog Waterfront fase 1"
```
