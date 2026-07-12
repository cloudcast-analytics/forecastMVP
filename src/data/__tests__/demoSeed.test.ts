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
