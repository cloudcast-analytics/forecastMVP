import type { DepartmentAdvice } from './staffing'

export type DemandLevel = 'Low' | 'Normal' | 'High' | 'Very High'

export interface ForecastDay {
  forecast_date: string
  predicted_revenue: number
  predicted_visitors: number
  confidence_low: number
  confidence_high: number
  demand_level: DemandLevel
  recommended_staff: number
  staff_by_department: DepartmentAdvice[]
  key_reason: string
}

