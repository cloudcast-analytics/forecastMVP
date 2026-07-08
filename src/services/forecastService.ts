import type { DailyObservation, StaffingRule } from '../types/database'
import type { ForecastDay, DemandLevel } from '../types/forecast'
import { getSeason } from '../lib/utils'
import { getMockWeather } from './weatherService'

const BACKEND_URL = import.meta.env.VITE_FORECAST_API_URL as string | undefined

// Belgian public holidays (static for near-term forecasting)
const BELGIAN_PUBLIC_HOLIDAYS: Set<string> = new Set([
  '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-14',
  '2026-05-25', '2026-07-21', '2026-08-15', '2026-11-01',
  '2026-11-11', '2026-12-25',
])

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
  if (month >= 6 && month <= 8) return 1.1
  if (month <= 2 || month === 12) return 0.85
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
    if (visitors >= rule.min_visitors && withinMax) return rule.recommended_staff
  }
  return sorted[sorted.length - 1].recommended_staff
}

// Map XGBoost backend response to ForecastDay[]
function mapBackendResponse(
  data: { date: string; forecast: number; lower_bound: number; upper_bound: number }[],
  observations: DailyObservation[],
  rules: StaffingRule[],
): ForecastDay[] {
  const overallAvg = observations.reduce((s, o) => s + (o.revenue ?? 0), 0) / Math.max(observations.length, 1)
  const avgRevenuePerVisitor = (() => {
    const withVisitors = observations.filter(o => o.visitors && o.revenue)
    if (withVisitors.length === 0) return 35
    return withVisitors.reduce((s, o) => s + (o.revenue! / o.visitors!), 0) / withVisitors.length
  })()

  return data.map(d => {
    const predicted_revenue = Math.round(d.forecast)
    const predicted_visitors = Math.round(d.forecast / avgRevenuePerVisitor)
    return {
      forecast_date: d.date,
      predicted_revenue,
      predicted_visitors,
      confidence_low: Math.round(d.lower_bound),
      confidence_high: Math.round(d.upper_bound),
      demand_level: getDemandLevel(predicted_revenue, overallAvg),
      recommended_staff: getRecommendedStaff(predicted_visitors, rules),
      key_reason: 'XGBoost voorspelling',
    }
  })
}

// Client-side statistical fallback (used when backend is unavailable)
function generateForecastClientSide(
  observations: DailyObservation[],
  horizonDays: number,
  staffingRules: StaffingRule[],
  locationId: string,
): ForecastDay[] {
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

  return futureDates.map(dateStr => {
    const date = new Date(dateStr)
    const dow = date.getDay()
    const month = date.getMonth() + 1
    const isWeekend = dow === 0 || dow === 6

    const base = avgByDow[dow]
    let revenue = base.revenue * getSeasonMultiplier(month)
    let visitors = base.visitors * getSeasonMultiplier(month)
    if (isWeekend) { revenue *= 1.1; visitors *= 1.1 }

    const reasons: string[] = []
    const weather = weatherMap[dateStr]
    if (weather) {
      if (weather.rainfall_mm > 5) { revenue *= 0.85; visitors *= 0.85; reasons.push('Regen verwacht') }
      else if (weather.temperature_max > 22) { revenue *= 1.08; visitors *= 1.08; reasons.push('Warm weer') }
    }

    if (isPublicHoliday(dateStr)) { revenue *= 1.15; visitors *= 1.15; reasons.push('Officiële feestdag') }
    if (isSchoolHoliday(dateStr) && !isWeekend) { revenue *= 1.2; visitors *= 1.2; reasons.push('Schoolvakantie') }

    const season = getSeason(month)
    if (season === 'summer') reasons.push('Zomerseizoen')
    else if (season === 'winter') reasons.push('Winterseizoen')
    if (isWeekend) reasons.push('Weekend')

    const predicted_revenue = Math.round(revenue)
    const predicted_visitors = Math.round(visitors)

    return {
      forecast_date: dateStr,
      predicted_revenue,
      predicted_visitors,
      confidence_low: Math.round(predicted_revenue * 0.85),
      confidence_high: Math.round(predicted_revenue * 1.15),
      demand_level: getDemandLevel(predicted_revenue, overallAvgRevenue),
      recommended_staff: getRecommendedStaff(predicted_visitors, staffingRules),
      key_reason: reasons.length > 0 ? reasons.join(', ') : 'Standaard dag',
    }
  })
}

export async function generateForecast(
  observations: DailyObservation[],
  horizonDays: number,
  staffingRules: StaffingRule[],
  locationId: string,
  locationCity = 'Genk',
): Promise<ForecastDay[]> {
  // Try XGBoost backend if configured and enough data
  if (BACKEND_URL && observations.length >= 60) {
    try {
      const response = await fetch(`${BACKEND_URL}/forecast/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          observations: observations.map(o => ({ date: o.date, revenue: o.revenue ?? 0 })),
          location: locationCity,
          country: 'BE',
        }),
      })
      if (response.ok) {
        const data = await response.json()
        return mapBackendResponse(data, observations, staffingRules)
      }
    } catch {
      // Backend unavailable — fall through to client-side model
    }
  }

  return generateForecastClientSide(observations, horizonDays, staffingRules, locationId)
}
