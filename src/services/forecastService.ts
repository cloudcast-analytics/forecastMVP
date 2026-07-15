import type { DailyObservation } from '../types/database'
import type { ForecastDay } from '../types/forecast'
import type { DepartmentStaffingRule } from '../types/staffing'
import type { Evenement } from '../types/events'
import { getSeason } from '../lib/utils'
import { getMockWeather } from './weatherService'
import { isPublicHoliday, isSchoolHoliday } from '../lib/calendar'
import { computeStaffing, getDemandLevel } from './staffingService'

const BACKEND_URL = import.meta.env.VITE_FORECAST_API_URL as string | undefined

function getSeasonMultiplier(month: number): number {
  if (month >= 6 && month <= 8) return 1.1
  if (month <= 2 || month === 12) return 0.85
  return 1.0
}

function mapBackendResponse(
  data: { date: string; forecast: number; lower_bound: number; upper_bound: number }[],
  observations: DailyObservation[],
  deptRules: DepartmentStaffingRule[],
): ForecastDay[] {
  const overallAvg = observations.reduce((sum, obs) => sum + (obs.revenue ?? 0), 0) / Math.max(observations.length, 1)
  const avgRevenuePerVisitor = (() => {
    const withVisitors = observations.filter(o => o.visitors && o.revenue)
    if (withVisitors.length === 0) return 35
    return withVisitors.reduce((sum, obs) => sum + (obs.revenue! / obs.visitors!), 0) / withVisitors.length
  })()

  return data.map(item => {
    const predicted_revenue = Math.round(item.forecast)
    const predicted_visitors = Math.round(item.forecast / avgRevenuePerVisitor)
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

  const overallAvgRevenue = observations.reduce((sum, obs) => sum + (obs.revenue ?? 0), 0) / Math.max(observations.length, 1)

  const today = new Date()
  const futureDates: string[] = []
  for (let i = 1; i <= horizonDays; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    futureDates.push(d.toISOString().split('T')[0])
  }

  const weatherData = getMockWeather(locationId, futureDates)
  const weatherMap: Record<string, (typeof weatherData)[0]> = {}
  for (const weather of weatherData) weatherMap[weather.date] = weather

  return futureDates.map(dateStr => {
    const date = new Date(dateStr)
    const dow = date.getDay()
    const month = date.getMonth() + 1
    const isWeekend = dow === 0 || dow === 6

    const base = avgByDow[dow]
    let revenue = base.revenue * getSeasonMultiplier(month)
    let visitors = base.visitors * getSeasonMultiplier(month)
    if (isWeekend) {
      revenue *= 1.1
      visitors *= 1.1
    }

    const reasons: string[] = []
    const weather = weatherMap[dateStr]
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

    if (isPublicHoliday(dateStr)) {
      revenue *= 1.15
      visitors *= 1.15
      reasons.push('Officiële feestdag')
    }
    if (isSchoolHoliday(dateStr) && !isWeekend) {
      revenue *= 1.2
      visitors *= 1.2
      reasons.push('Schoolvakantie')
    }

    const season = getSeason(month)
    if (season === 'summer') reasons.push('Zomerseizoen')
    else if (season === 'winter') reasons.push('Winterseizoen')
    if (isWeekend) reasons.push('Weekend')

    const event = events.find(e => e.date === dateStr)
    if (event) {
      const avgRevPerVisitor = overallAvgRevenue > 0 && visitors > 0 ? revenue / visitors : 12
      visitors += event.expected_guests
      revenue += event.expected_guests * avgRevPerVisitor
      reasons.unshift(`Evenement: ${event.name}`)
    }

    const predicted_revenue = Math.round(revenue)
    const predicted_visitors = Math.round(visitors)
    const demand_level = getDemandLevel(predicted_revenue, overallAvgRevenue)
    const advice = computeStaffing(deptRules, demand_level, event?.expected_guests)

    return {
      forecast_date: dateStr,
      predicted_revenue,
      predicted_visitors,
      confidence_low: Math.round(predicted_revenue * 0.85),
      confidence_high: Math.round(predicted_revenue * 1.15),
      demand_level,
      recommended_staff: advice.total,
      staff_by_department: advice.per_department,
      key_reason: reasons.length > 0 ? reasons.join(', ') : 'Standaard dag',
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
        return mapBackendResponse(data, observations, deptRules)
      }
    } catch {
      // Backend unavailable — fall through to client-side model
    }
  }

  return generateForecastClientSide(observations, horizonDays, deptRules, locationId, events)
}

