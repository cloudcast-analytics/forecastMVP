export interface DepartmentStaffingRule {
  id: string
  location_id: string
  department_id: string
  department_name: string
  base_staff: number
  busy_staff: number
  event_guest_threshold?: number
  event_staff?: number
}

export interface DepartmentAdvice {
  department_id: string
  department_name: string
  staff: number
  reason: 'basis' | 'druk' | 'evenement'
}

export interface StaffingAdvice {
  per_department: DepartmentAdvice[]
  total: number
}
