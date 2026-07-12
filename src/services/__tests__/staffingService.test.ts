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
