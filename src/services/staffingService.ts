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
