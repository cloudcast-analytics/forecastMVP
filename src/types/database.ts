export interface Company {
  id: string
  name: string
  sector: string
  contact_name: string
  contact_email: string
  phone: string
  website: string
  notes: string
  created_at: string
}

export interface Location {
  id: string
  company_id: string
  name: string
  address: string
  city: string
  country: string
  location_type: string
  max_capacity: number
  notes: string
  created_at: string
}

export interface DailyObservation {
  id: string
  company_id: string
  location_id: string
  upload_file_id?: string
  date: string
  revenue?: number
  visitors?: number
  transactions?: number
  staff_scheduled?: number
  staff_needed?: number
  occupancy_rate?: number
  notes?: string
  day_of_week: number
  month: number
  year: number
  week_number: number
  season: string
  is_weekend: boolean
  is_holiday: boolean
  is_school_holiday: boolean
  is_public_holiday: boolean
  special_event_name?: string
  deleted_at?: string
}

export interface UploadedFile {
  id: string
  company_id: string
  location_id: string
  filename: string
  file_type: string
  storage_path: string
  row_count: number
  uploaded_by: string
  status: string
  created_at: string
  deleted_at?: string
}

export interface StaffingRule {
  id: string
  company_id: string
  location_id: string
  min_visitors: number
  max_visitors?: number
  recommended_staff: number
  label: string
}

export interface WeatherData {
  id: string
  location_id: string
  date: string
  temperature_avg: number
  temperature_max: number
  rainfall_mm: number
  wind_speed: number
  weather_condition: string
  source?: string
}

export interface Department {
  id: string
  company_id: string
  name: string
  created_at: string
}

export interface Role {
  id: string
  department_id: string
  name: string
  created_at: string
}

export interface LocationDepartment {
  id: string
  location_id: string
  department_id: string
  is_active: boolean
}

export interface LocationRole {
  id: string
  location_id: string
  role_id: string
  headcount: number
}

export interface DailyStaffingEvaluation {
  id: string
  location_id: string
  department_id: string
  date: string
  rating: 'understaffed' | 'adequate' | 'overstaffed'
  created_at: string
}
