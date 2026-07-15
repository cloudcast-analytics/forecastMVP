import type { DailyObservation } from '../types/database'
import type { ForecastDay } from '../types/forecast'
import type { DepartmentStaffingRule } from '../types/staffing'
import type { Evenement } from '../types/events'
import { getSeason } from '../lib/utils'
import { getMockWeather } from './weatherService'
import { isPublicHoliday, isSchoolHoliday } from '../lib/calendar'
import { computeStaffing, getDemandLevel } from './staffingService'

const BACKEND_URL = import.meta.env.VITE_FORECAST_API_URL as string | undefined

// Sector defaults — used when customer data is insufficient for a class
const SECTOR_MONTH_FACTORS: Record<number, number> = {
  1: 0.82, 2: 0.84, 3: 0.92, 4: 0.98, 5: 1.05,
  6: 1.15, 7: 1.20, 8: 1.18, 9: 1.02, 10: 0.95,
  11: 0.88, 12: 0.85,
}
const SECTOR_SCHOOL_HOLIDAY_FACTOR = 1.22
const SECTOR_PUBLIC_HOLIDAY_FACTOR = 1.18
const WEATHER_RAIN_FACTOR = 0.84
const WEATHER_HOT_FACTOR = 1.09

interface DerivedFactors {
  avgByDow: Record<number, { revenue: number; visitors: number }>
  monthFactor: Record<number, number>
  schoolHolidayFactor: number
  publicHolidayFactor: number
  overallAvg: number
  avgRevPerVisitor: number
  dataSource: Record<string, 'data' | 'sector_default'>
}

/**
 * Derives all forecast factors from the customer's own historical observations.
 * Falls back to sector defaults when a class has fewer than 4 data points.
 */
function deriveFactors(observations: DailyObservation[]): DerivedFactors {
  const obsWithRev = observations.filter(o => o.revenue !== undefined && !o.deleted_at)
  const obsWithVis = observations.filter(o => o.visitors !== undefined && !o.deleted_at)

  const overallAvg = obsWithRev.length > 0
    ? obsWithRev.reduce((s, o) => s + o.revenue!, 0) / obsWithRev.length
    : 5000

  const avgRevPerVisitor = (() => {
    const both = observations.filter(o => o.revenue && o.visitors && !o.deleted_at)
    return both.length > 0
      ? both.reduce((s, o) => s + o.revenue! / o.visitors!, 0) / both.length
      : 32
  })()

  // ── 1. Per-weekday averages (Sunday=0 … Saturday=6) ──────────────────────
  const byDow: Record<number, { revenues: number[]; visitors: number[] }> = {}
  for (let i = 0; i < 7; i++) byDow[i] = { revenues: [], visitors: [] }

  for (const obs of obsWithRev) byDow[obs.day_of_week].revenues.push(obs.revenue!)
  for (const obs of obsWithVis) byDow[obs.day_of_week].visitors.push(obs.visitors!)

  const avgByDow: Record<number, { revenue: number; visitors: number }> = {}
  for (let i = 0; i < 7; i++) {
    const revs = byDow[i].revenues
    const viss = byDow[i].visitors
    // Fallback: weekends assumed 15% above overall, weekdays 5% below
    const isWe = i === 0 || i === 6
    avgByDow[i] = {
      revenue: revs.length >= 2 ? revs.reduce((a, b) => a + b, 0) / revs.length : overallAvg * (isWe ? 1.15 : 0.95),
      visitors: viss.length >= 2 ? viss.reduce((a, b) => a + b, 0) / viss.length : 150 * (isWe ? 1.15 : 0.95),
    }
  }

  // ── 2. Month-of-year factors (relative to overall average) ────────────────
  const byMonth: Record<number, number[]> = {}
  for (const obs of obsWithRev) {
    const m = new Date(obs.date).getMonth() + 1
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(obs.revenue!)
  }

  const monthFactor: Record<number, number> = {}
  const dataSource: Record<string, 'data' | 'sector_default'> = {}

  for (let m = 1; m <= 12; m++) {
    const vals = byMonth[m]
    if (vals && vals.length >= 4) {
      monthFactor[m] = (vals.reduce((a, b) => a + b, 0) / vals.length) / overallAvg
      dataSource[`month_${m}`] = 'data'
    } else {
      monthFactor[m] = SECTOR_MONTH_FACTORS[m]
      dataSource[`month_${m}`] = 'sector_default'
    }
  }

  // ── 3. School-holiday factor (weekdays only — weekends already captured in avgByDow) ──
  const schoolWeekdays = obsWithRev.filter(o => o.is_school_holiday && !o.is_weekend && !o.is_public_holiday)
  const regularWeekdays = obsWithRev.filter(o => !o.is_school_holiday && !o.is_weekend && !o.is_public_holiday)

  let schoolHolidayFactor = SECTOR_SCHOOL_HOLIDAY_FACTOR
  dataSource['school_holiday'] = 'sector_default'
  if (schoolWeekdays.length >= 4 && regularWeekdays.length >= 4) {
    const schoolAvg = schoolWeekdays.reduce((s, o) => s + o.revenue!, 0) / schoolWeekdays.length
    const regularAvg = regularWeekdays.reduce((s, o) => s + o.revenue!, 0) / regularWeekdays.length
    if (regularAvg > 0) {
      schoolHolidayFactor = schoolAvg / regularAvg
      dataSource['school_holiday'] = 'data'
    }
  }

  // ── 4. Public-holiday factor (ratio vs. same-weekday baseline) ────────────
  const pubHolidays = obsWithRev.filter(o => o.is_public_holiday)

  let publicHolidayFactor = SECTOR_PUBLIC_HOLIDAY_FACTOR
  dataSource['public_holiday'] = 'sector_default'
  if (pubHolidays.length >= 3) {
    const ratios = pubHolidays.map(o => {
      const base = avgByDow[o.day_of_week].revenue
      return base > 0 ? o.revenue! / base : 1
    })
    publicHolidayFactor = ratios.reduce((a, b) => a + b, 0) / ratios.length
    dataSource['public_holiday'] = 'data'
  }

  return { avgByDow, monthFactor, schoolHolidayFactor, publicHolidayFactor, overallAvg, avgRevPerVisitor, dataSource }
}

function mapBackendResponse(
  data: { date: string; forecast: number; lower_bound: number; upper_bound: number }[],
  observations: DailyObservation[],
  deptRules: DepartmentStaffingRule[],
): ForecastDay[] {
  const overallAvg = observations.reduce((sum, obs) => sum + (obs.revenue ?? 0), 0) / Math.max(observations.length, 1)
  const avgRevPerVisitor = (() => {
    const withVisitors = observations.filter(o => o.visitors && o.revenue)
    if (withVisitors.length === 0) return 35
    return withVisitors.reduce((sum, obs) => sum + (obs.revenue! / obs.visitors!), 0) / withVisitors.length
  })()

  return data.map(item => {
    const predicted_revenue = Math.round(item.forecast)
    const predicted_visitors = Math.round(item.forecast / avgRevPerVisitor)
    const demand_level = getDemandLevel(predicted_revenue, overallAvg)
    const advice = computeStaffing(deptRules, demand_level)
    return {
      forecast_date: item.date,
      predicted_revenue,
      predicted_visitors,
      confidence_low: Math.round(item.lower_bound),
      confidence_high: Math.round(item.upper_bound),
      demand_level,
      recommended_staff: advice.total,
      staff_by_department: advice.per_department,
      key_reason: 'XGBoost voorspelling',
    }
  })
}

function generateForecastClientSide(
  observations: DailyObservation[],
  horizonDays: number,
  deptRules: DepartmentStaffingRule[],
  locationId: string,
  events: Evenement[] = [],
): ForecastDay[] {
  const { avgByDow, monthFactor, schoolHolidayFactor, publicHolidayFactor, overallAvg, avgRevPerVisitor } =
    deriveFactors(observations)

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

    // Baseline: weekday average × month factor
    // avgByDow already captures the weekend premium from historical data —
    // no separate weekend multiplier to avoid double-counting.
    const base = avgByDow[dow]
    const mf = monthFactor[month] ?? getSeason(month) === 'summer' ? 1.15 : getSeason(month) === 'winter' ? 0.85 : 1.0
    let revenue = base.revenue * mf
    let visitors = base.visitors * mf

    const reasons: string[] = []
    const season = getSeason(month)
    if (season === 'summer') reasons.push('Zomerseizoen')
    else if (season === 'winter') reasons.push('Winterseizoen')
    if (isWeekend) reasons.push('Weekend')

    // Calendar factors — derived from data, sector default as fallback
    const pubHoliday = isPublicHoliday(dateStr)
    const schoolHol = isSchoolHoliday(dateStr)

    if (pubHoliday) {
      revenue *= publicHolidayFactor
      visitors *= publicHolidayFactor
      reasons.push('Officiële feestdag')
    } else if (schoolHol && !isWeekend) {
      revenue *= schoolHolidayFactor
      visitors *= schoolHolidayFactor
      reasons.push('Schoolvakantie')
    }

    // Weather factors — still sector defaults (no historical weather stored on observations)
    const weather = weatherMap[dateStr]
    if (weather) {
      if (weather.rainfall_mm > 5) {
        revenue *= WEATHER_RAIN_FACTOR
        visitors *= WEATHER_RAIN_FACTOR
        reasons.push('Regen verwacht')
      } else if (weather.temperature_max > 22) {
        revenue *= WEATHER_HOT_FACTOR
        visitors *= WEATHER_HOT_FACTOR
        reasons.push('Warm weer')
      }
    }

    // Events — extra bezoekers bovenop de baseline
    const event = events.find(e => e.date === dateStr)
    if (event) {
      const revPerGuest = visitors > 0 ? revenue / visitors : avgRevPerVisitor
      visitors += event.expected_guests
      revenue += event.expected_guests * revPerGuest
      reasons.unshift(`Evenement: ${event.name}`)
    }

    const predicted_revenue = Math.round(revenue)
    const predicted_visitors = Math.round(visitors)
    const demand_level = getDemandLevel(predicted_revenue, overallAvg)
    const advice = computeStaffing(deptRules, demand_level, event?.expected_guests)

    // Confidence interval: narrows as more data is available
    const nObs = observations.filter(o => !o.deleted_at).length
    const confWidth = nObs >= 90 ? 0.10 : nObs >= 30 ? 0.15 : 0.22

    return {
      forecast_date: dateStr,
      predicted_revenue,
      predicted_visitors,
      confidence_low: Math.round(predicted_revenue * (1 - confWidth)),
      confidence_high: Math.round(predicted_revenue * (1 + confWidth)),
      demand_level,
      recommended_staff: advice.total,
      staff_by_department: advice.per_department,
      key_reason: reasons.length > 0 ? reasons.join(' · ') : 'Standaard dag',
    }
  })
}

export async function generateForecast(
  observations: DailyObservation[],
  horizonDays: number,
  deptRules: DepartmentStaffingRule[],
  locationId: string,
  locationCity = 'Genk',
  events: Evenement[] = [],
): Promise<ForecastDay[]> {
  // Try the backend whenever available — the >= 60 gate is removed per spec
  if (BACKEND_URL) {
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
        return mapBackendResponse(data, observations, deptRules)
      }
    } catch {
      // Backend unavailable — fall through to baseline model
    }
  }

  return generateForecastClientSide(observations, horizonDays, deptRules, locationId, events)
}
