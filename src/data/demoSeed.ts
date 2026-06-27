import type { Company, DailyObservation, Department, DailyStaffingEvaluation, Location, LocationDepartment, LocationRole, Role, StaffingRule } from '../types/database'
import { getWeekNumber, getSeason } from '../lib/utils'

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

export const DEMO_STAFFING_RULES: StaffingRule[] = [
  {
    id: 'rule-1',
    company_id: 'demo-company',
    location_id: 'demo-location',
    min_visitors: 0,
    max_visitors: 100,
    recommended_staff: 6,
    label: 'Rustig',
  },
  {
    id: 'rule-2',
    company_id: 'demo-company',
    location_id: 'demo-location',
    min_visitors: 100,
    max_visitors: 250,
    recommended_staff: 10,
    label: 'Normaal',
  },
  {
    id: 'rule-3',
    company_id: 'demo-company',
    location_id: 'demo-location',
    min_visitors: 250,
    max_visitors: 500,
    recommended_staff: 16,
    label: 'Druk',
  },
  {
    id: 'rule-4',
    company_id: 'demo-company',
    location_id: 'demo-location',
    min_visitors: 500,
    recommended_staff: 22,
    label: 'Zeer druk',
  },
]

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

// Simple seeded pseudo-random — deterministic so data is consistent
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export function getDemoObservations(): DailyObservation[] {
  const observations: DailyObservation[] = []

  // Belgian public holidays 2025
  const publicHolidays = new Set([
    '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-29',
    '2025-06-09', '2025-07-21', '2025-08-15', '2025-11-01',
    '2025-11-11', '2025-12-25',
  ])

  // Belgian school holidays 2025 (approximate)
  const schoolHolidayRanges: [string, string][] = [
    ['2025-01-01', '2025-01-05'],
    ['2025-02-24', '2025-03-02'],
    ['2025-04-14', '2025-04-27'],
    ['2025-07-01', '2025-08-31'],
    ['2025-10-27', '2025-11-02'],
    ['2025-12-22', '2025-12-31'],
  ]

  function isSchoolHoliday(dateStr: string): boolean {
    return schoolHolidayRanges.some(([start, end]) => dateStr >= start && dateStr <= end)
  }

  // Special events on ~10 days
  const specialEvents: Record<string, string> = {
    '2025-03-15': 'Foodtruck Festival',
    '2025-04-26': 'Paasmarkt',
    '2025-05-10': 'Moederdag Event',
    '2025-06-21': 'Zomerfestival',
    '2025-07-04': 'Koninginneweer',
    '2025-07-21': 'Nationale Feestdag',
    '2025-08-09': 'Zomerkermis',
    '2025-09-20': 'Najaarsmarkt',
    '2025-10-31': 'Halloween',
    '2025-12-06': 'Sinterklaas',
    '2025-12-13': 'Kerstmarkt',
  }

  const start = new Date('2025-01-01')
  const end = new Date('2025-12-31')

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isPubHoliday = publicHolidays.has(dateStr)
    const isSchoolHol = isSchoolHoliday(dateStr)
    const hasEvent = dateStr in specialEvents

    // Seed based on date for determinism
    const seed = year * 10000 + month * 100 + d.getDate()
    const rand1 = seededRand(seed)
    const rand2 = seededRand(seed + 1000)
    const rand3 = seededRand(seed + 2000)

    // Base revenue
    let baseRevenue = isWeekend
      ? 15000 + rand1 * 17000   // 15000–32000
      : 5000 + rand2 * 3000      // 5000–8000

    // Season multipliers
    const isSummer = month >= 6 && month <= 8
    const isWinter = month <= 2 || month === 12
    if (isSummer) baseRevenue *= 1.4
    if (isWinter) baseRevenue *= 0.6

    // Rain: ~30% of days
    const isRainy = rand3 < 0.3
    if (isRainy) baseRevenue *= 0.8

    // Events
    if (hasEvent) baseRevenue *= 1.3
    if (isPubHoliday) baseRevenue *= 1.15
    if (isSchoolHol && !isWeekend) baseRevenue *= 1.1

    const revenue = Math.round(baseRevenue)
    const visitors = Math.round(revenue / 35)

    // Staff
    let staff: number
    if (visitors > 500) staff = 18 + Math.round(rand1 * 4)
    else if (visitors > 250) staff = 14 + Math.round(rand2 * 4)
    else if (visitors > 100) staff = 8 + Math.round(rand1 * 4)
    else staff = 5 + Math.round(rand2 * 3)

    observations.push({
      id: `demo-obs-${dateStr}`,
      company_id: 'demo-company',
      location_id: 'demo-location',
      date: dateStr,
      revenue,
      visitors,
      transactions: Math.round(visitors * 0.6),
      staff_scheduled: staff,
      staff_needed: staff,
      occupancy_rate: Math.min(100, Math.round((visitors / 1200) * 100)),
      day_of_week: dayOfWeek,
      month,
      year,
      week_number: getWeekNumber(d),
      season: getSeason(month),
      is_weekend: isWeekend,
      is_holiday: isPubHoliday || isSchoolHol,
      is_school_holiday: isSchoolHol,
      is_public_holiday: isPubHoliday,
      special_event_name: hasEvent ? specialEvents[dateStr] : undefined,
    })
  }

  return observations
}
