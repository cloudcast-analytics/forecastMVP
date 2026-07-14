import { describe, expect, it, vi } from 'vitest'
import { getDemoObservations, DEMO_DEPARTMENT_STAFFING_RULES } from '../../data/demoSeed'
import { generateForecast } from '../forecastService'
import { computeStaffing } from '../staffingService'

vi.stubGlobal('fetch', () => Promise.reject(new Error('offline in test')))

describe('generateForecast (client-side fallback)', () => {
  it('bezetting en drukteniveau zijn consistent: zelfde niveau geeft engine-uitkomst', async () => {
    const obs = getDemoObservations('demo-location')
    const forecast = await generateForecast(obs, 14, DEMO_DEPARTMENT_STAFFING_RULES, 'demo-location', 'Genk')

    expect(forecast).toHaveLength(14)
    for (const day of forecast) {
      const expected = computeStaffing(DEMO_DEPARTMENT_STAFFING_RULES, day.demand_level)
      expect(day.recommended_staff).toBe(expected.total)
      expect(day.staff_by_department).toEqual(expected.per_department)
    }
  })

  it('geeft 0 personeel zonder regels', async () => {
    const obs = getDemoObservations('demo-location')
    const forecast = await generateForecast(obs, 7, [], 'demo-location', 'Genk')

    for (const day of forecast) {
      expect(day.recommended_staff).toBe(0)
      expect(day.staff_by_department).toEqual([])
    }
  })
})

