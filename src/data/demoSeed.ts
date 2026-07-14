import type { Company, DailyObservation, Department, DailyStaffingEvaluation, Location, LocationDepartment, LocationRole, Role } from '../types/database'
import type { DepartmentStaffingRule } from '../types/staffing'
import { getWeekNumber, getSeason } from '../lib/utils'
import { isPublicHoliday, isSchoolHoliday } from '../lib/calendar'
import { computeStaffing, getDemandLevel } from '../services/staffingService'

export const DEMO_COMPANY: Company = {
  id: 'demo-company',
  name: 'Waterfront Genk',
  sector: 'Leisure / Horeca',
  contact_name: 'Kris',
  contact_email: 'info@waterfront-genk.be',
  phone: '',
  website: 'waterfront-genk.be',
  notes: 'Demo account',
  created_at: '2025-01-01',
}

export const DEMO_LOCATION: Location = {
  id: 'demo-location',
  company_id: 'demo-company',
  name: 'Waterfront Genk',
  address: 'Waterfront 1',
  city: 'Genk',
  country: 'België',
  location_type: 'Leisure / Horeca',
  max_capacity: 1200,
  notes: '',
  created_at: '2025-01-01',
}

export const DEMO_LOCATION_2: Location = {
  id: 'demo-location-2',
  company_id: 'demo-company',
  name: 'Waterfront Hasselt',
  address: 'Kempische Steenweg 100',
  city: 'Hasselt',
  country: 'België',
  location_type: 'Leisure / Horeca',
  max_capacity: 800,
  notes: '',
  created_at: '2025-01-01',
}

export const DEMO_DEPARTMENTS: Department[] = [
  { id: 'dept-bar-buiten', company_id: 'demo-company', name: 'Bar buiten', created_at: '2026-01-01' },
  { id: 'dept-bar-binnen', company_id: 'demo-company', name: 'Bar binnen', created_at: '2026-01-01' },
  { id: 'dept-keuken', company_id: 'demo-company', name: 'Keuken', created_at: '2026-01-01' },
]

export const DEMO_ROLES: Role[] = [
  { id: 'role-buiten-bartender', department_id: 'dept-bar-buiten', name: 'Bartender', created_at: '2026-01-01' },
  { id: 'role-buiten-runner', department_id: 'dept-bar-buiten', name: 'Runner', created_at: '2026-01-01' },
  { id: 'role-binnen-bartender', department_id: 'dept-bar-binnen', name: 'Bartender', created_at: '2026-01-01' },
  { id: 'role-kok', department_id: 'dept-keuken', name: 'Kok', created_at: '2026-01-01' },
]

export const DEMO_LOCATION_DEPARTMENTS: LocationDepartment[] = [
  { id: 'ld-buiten', location_id: 'demo-location', department_id: 'dept-bar-buiten', is_active: true },
  { id: 'ld-binnen', location_id: 'demo-location', department_id: 'dept-bar-binnen', is_active: true },
  { id: 'ld-keuken', location_id: 'demo-location', department_id: 'dept-keuken', is_active: true },
]

export const DEMO_LOCATION_DEPARTMENTS_2: LocationDepartment[] = [
  { id: 'ld2-buiten', location_id: 'demo-location-2', department_id: 'dept-bar-buiten', is_active: true },
  { id: 'ld2-binnen', location_id: 'demo-location-2', department_id: 'dept-bar-binnen', is_active: true },
  { id: 'ld2-keuken', location_id: 'demo-location-2', department_id: 'dept-keuken', is_active: false },
]

export const DEMO_LOCATION_ROLES: LocationRole[] = [
  { id: 'lr-buiten-bartender', location_id: 'demo-location', role_id: 'role-buiten-bartender', headcount: 2 },
  { id: 'lr-buiten-runner', location_id: 'demo-location', role_id: 'role-buiten-runner', headcount: 1 },
  { id: 'lr-binnen-bartender', location_id: 'demo-location', role_id: 'role-binnen-bartender', headcount: 2 },
  { id: 'lr-kok', location_id: 'demo-location', role_id: 'role-kok', headcount: 1 },
]

export const DEMO_LOCATION_ROLES_2: LocationRole[] = [
  { id: 'lr2-buiten-bartender', location_id: 'demo-location-2', role_id: 'role-buiten-bartender', headcount: 1 },
  { id: 'lr2-binnen-bartender', location_id: 'demo-location-2', role_id: 'role-binnen-bartender', headcount: 1 },
]

export const DEMO_DEPARTMENT_STAFFING_RULES: DepartmentStaffingRule[] = [
  { id: 'dsr-buiten', location_id: 'demo-location', department_id: 'dept-bar-buiten', department_name: 'Bar buiten', base_staff: 2, busy_staff: 3, event_guest_threshold: 50, event_staff: 3 },
  { id: 'dsr-binnen', location_id: 'demo-location', department_id: 'dept-bar-binnen', department_name: 'Bar binnen', base_staff: 2, busy_staff: 2 },
  { id: 'dsr-keuken', location_id: 'demo-location', department_id: 'dept-keuken', department_name: 'Keuken', base_staff: 1, busy_staff: 2 },
]

export const DEMO_DEPARTMENT_STAFFING_RULES_2: DepartmentStaffingRule[] = [
  { id: 'dsr2-buiten', location_id: 'demo-location-2', department_id: 'dept-bar-buiten', department_name: 'Bar buiten', base_staff: 1, busy_staff: 2, event_guest_threshold: 50, event_staff: 2 },
  { id: 'dsr2-binnen', location_id: 'demo-location-2', department_id: 'dept-bar-binnen', department_name: 'Bar binnen', base_staff: 1, busy_staff: 2 },
]

export const DEMO_STAFFING_EVALUATIONS: DailyStaffingEvaluation[] = []

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function demoEvents(year: number): Record<string, { name: string; guests: number }> {
  return {
    [`${year}-04-26`]: { name: 'Lente-opening', guests: 40 },
    [`${year}-05-14`]: { name: 'Hemelvaart BBQ', guests: 60 },
    [`${year}-05-30`]: { name: 'Privéfeest', guests: 80 },
    [`${year}-06-20`]: { name: 'Zomerfestival', guests: 120 },
    [`${year}-06-27`]: { name: 'Privéfeest', guests: 35 },
    [`${year}-07-05`]: { name: 'Waterski Cup', guests: 90 },
    [`${year}-07-18`]: { name: 'Privéfeest', guests: 55 },
    [`${year}-08-08`]: { name: 'Zomerkermis', guests: 100 },
    [`${year}-08-22`]: { name: 'Cocktailavond', guests: 45 },
  }
}

const MONTH_FACTOR: Record<number, number> = { 4: 0.75, 5: 0.9, 6: 1.05, 7: 1.15, 8: 1.15, 9: 0.85 }

export function getDemoObservations(locationId = 'demo-location'): DailyObservation[] {
  const scale = locationId === 'demo-location-2' ? 0.7 : 1.0
  const rules = locationId === 'demo-location-2' ? DEMO_DEPARTMENT_STAFFING_RULES_2 : DEMO_DEPARTMENT_STAFFING_RULES
  const maxCapacity = locationId === 'demo-location-2' ? 800 : 1200

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const start = new Date(year, 3, 1)
  const events = demoEvents(year)

  type DayDraft = { dateStr: string; d: Date; visitors: number; revenue: number; event?: { name: string; guests: number } }
  const drafts: DayDraft[] = []
  for (let d = new Date(start); d <= yesterday; d.setDate(d.getDate() + 1)) {
    const dateStr = toLocalDateStr(d)
    const dayOfWeek = d.getDay()
    const month = d.getMonth() + 1
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const event = events[dateStr]

    const seed = year * 10000 + month * 100 + d.getDate()
    const rand1 = seededRand(seed)
    const rand2 = seededRand(seed + 1000)
    const rand3 = seededRand(seed + 2000)

    let visitors = isWeekend ? 220 + rand1 * 160 : 90 + rand1 * 70
    visitors *= MONTH_FACTOR[month] ?? 1.0

    const isRainy = rand3 < 0.3
    if (isRainy) visitors *= 0.45

    if (event) visitors *= 1.2
    if (isPublicHoliday(dateStr)) visitors *= 1.2
    if (isSchoolHoliday(dateStr) && !isWeekend) visitors *= 1.15

    const finalVisitors = Math.round(visitors * scale)
    const revenuePerVisitor = 10.5 + rand2 * 3
    drafts.push({ dateStr, d: new Date(d), visitors: finalVisitors, revenue: Math.round(finalVisitors * revenuePerVisitor), event })
  }

  const avgRevenue = drafts.reduce((sum, item) => sum + item.revenue, 0) / Math.max(drafts.length, 1)

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

