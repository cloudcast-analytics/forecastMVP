import type { DailyObservation, StaffingRule } from '../types/database'
import type { ForecastDay, DemandLevel } from '../types/forecast'
import { getSeason } from '../lib/utils'
import { getMockWeather } from './weatherService'

// Belgian public holidays (static for near-term forecasting)
const BELGIAN_PUBLIC_HOLIDAYS: Set<string> = new Set([
  '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-14',
  '2026-05-25', '2026-07-21', '2026-08-15', '2026-11-01',
  '2026-11-11', '2026-12-25',
])

// Belgian school holiday ranges
const SCHOOL_HOLIDAY_RANGES: [string, string][] = [
  ['2025-10-27', '2025-11-02'],
  ['2025-12-22', '2026-01-04'],
  ['2026-02-16', '2026-02-22'],
  ['2026-04-06', '2026-04-19'],
  ['2026-07-01', '2026-08-31'],
]

function isSchoolHoliday(dateStr: string): boolean {
  return SCHOOL_HOLIDAY_RANGES.some(([s, e]) => dateStr >= s && dateStr <= e)
}

function isPublicHoliday(dateStr: string): boolean {
  return BELGIAN_PUBLIC_HOLIDAYS.has(dateStr)
}

function getSeasonMultiplier(month: number): number {
  const isSummer = month >= 6 && month <= 8
  const isWinter = month <= 2 || month === 12
  if (isSummer) return 1.1
  if (isWinter) return 0.85
  return 1.0
}

function getDemandLevel(predicted: number, avg: number): DemandLevel {
  const ratio = predicted / avg
  if (ratio < 0.75) return 'Low'
  if (ratio < 1.15) return 'Normal'
  if (ratio < 1.5) return 'High'
  return 'Very High'
}

function getRecommendedStaff(visitors: number, rules: StaffingRule[]): number {
  if (rules.length === 0) {
    if (visitors > 500) return 20
    if (visitors > 250) return 14
    if (visitors > 100) return 9
    return 6
  }
  const sorted = [...rules].sort((a, b) => a.min_visitors - b.min_visitors)
  for (const rule of sorted) {
    const withinMax = rule.max_visitors === undefined || visitors <= rule.max_visitors
    if (visitors >= rule.min_visitors && withinMax) {
      return rule.recommended_staff
    }
  }
  return sorted[sorted.length - 1].recommended_staff
}

export function generateForecast(
  observations: DailyObservation[],
  horizonDays: number,
  staffingRules: StaffingRule[],
  locationId: string,
): ForecastDay[] {
  // Calculate average per day_of_week
  const byDow: Record<number, { revenues: number[]; visitors: number[] }> = {}
  for (let i = 0; i < 7; i++) byDow[i] = { revenues: [], visitors: [] }

  for (const obs of observations) {
    if (obs.revenue !== undefined) byDow[obs.day_of_week].revenues.push(obs.revenue)
    if (obs.visitors !== undefined) byDow[obs.day_of_week].visitors.push(obs.visitors)
  }

  const avgByDow: Record<number, { revenue: number; visitors: number }> = {}
  for (let i = 0; i < 7; i++) {
    const revs = byDow[i].revenues
    const viss = byDow[i].visitors
    avgByDow[i] = {
      revenue: revs.length > 0 ? revs.reduce((a, b) => a + b, 0) / revs.length : 5000,
      visitors: viss.length > 0 ? viss.reduce((a, b) => a + b, 0) / viss.length : 150,
    }
  }

  const overallAvgRevenue =
    observations.reduce((s, o) => s + (o.revenue ?? 0), 0) / Math.max(observations.length, 1)

  // Generate future dates
  const today = new Date()
  const futureDates: string[] = []
  for (let i = 1; i <= horizonDays; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    futureDates.push(d.toISOString().split('T')[0])
  }

  const weatherData = getMockWeather(locationId, futureDates)
  const weatherMap: Record<string, (typeof weatherData)[0]> = {}
  for (const w of weatherData) weatherMap[w.date] = w

  const results: ForecastDay[] = []

  for (const dateStr of futureDates) {
    const date = new Date(dateStr)
    const dow = date.getDay()
    const month = date.getMonth() + 1
    const isWeekend = dow === 0 || dow === 6

    const base = avgByDow[dow]
    let revenue = base.revenue
    let visitors = base.visitors

    // Season multiplier
    const seasonMult = getSeasonMultiplier(month)
    revenue *= seasonMult
    visitors *= seasonMult

    // Weekend boost
    if (isWeekend) {
      revenue *= 1.1
      visitors *= 1.1
    }

    // Weather adjustments
    const weather = weatherMap[dateStr]
    const reasons: string[] = []
    if (weather) {
      if (weather.rainfall_mm > 5) {
        revenue *= 0.85
        visitors *= 0.85
        reasons.push('Regen verwacht')
      } else if (weather.temperature_max > 22) {
        revenue *= 1.08
        visitors *= 1.08
        reasons.push('Warm weer')
      }
    }

    // Holiday adjustments
    const pubHol = isPublicHoliday(dateStr)
    const schoolHol = isSchoolHoliday(dateStr)
    if (pubHol) {
      revenue *= 1.15
      visitors *= 1.15
      reasons.push('Officiële feestdag')
    }
    if (schoolHol && !isWeekend) {
      revenue *= 1.2
      visitors *= 1.2
      reasons.push('Schoolvakantie')
    }

    // Season reason
    const season = getSeason(month)
    if (season === 'summer') reasons.push('Zomerseizoen')
    else if (season === 'winter') reasons.push('Winterseizoen')

    if (isWeekend) reasons.push('Weekend')

    const predicted_revenue = Math.round(revenue)
    const predicted_visitors = Math.round(visitors)
    const confidence_low = Math.round(predicted_revenue * 0.85)
    const confidence_high = Math.round(predicted_revenue * 1.15)
    const demand_level = getDemandLevel(predicted_revenue, overallAvgRevenue)
    const recommended_staff = getRecommendedStaff(predicted_visitors, staffingRules)
    const key_reason = reasons.length > 0 ? reasons.join(', ') : 'Standaard dag'

    results.push({
      forecast_date: dateStr,
      predicted_revenue,
      predicted_visitors,
      confidence_low,
      confidence_high,
      demand_level,
      recommended_staff,
      key_reason,
    })
  }

  return results
}
