import { supabase, isDemo } from '../lib/supabase'
import type { Company, DailyObservation, Department, DailyStaffingEvaluation, Location, LocationDepartment, LocationRole, Role, StaffingRule, UploadedFile } from '../types/database'
import {
  DEMO_COMPANY,
  DEMO_DEPARTMENTS,
  DEMO_LOCATION_DEPARTMENTS,
  DEMO_LOCATION_ROLES,
  DEMO_LOCATION,
  DEMO_LOCATION_2,
  DEMO_ROLES,
  DEMO_STAFFING_EVALUATIONS,
  DEMO_STAFFING_RULES,
  getDemoObservations,
} from '../data/demoSeed'

// In-memory store for demo uploads — keyed by locationId
const demoObservationsStore: Record<string, DailyObservation[]> = {}

export async function getCompanies(): Promise<Company[]> {
  if (isDemo) return [DEMO_COMPANY]
  const { data, error } = await supabase.from('companies').select('*').order('name')
  if (error) throw error
  return data as Company[]
}

export async function getLocations(companyId: string): Promise<Location[]> {
  if (isDemo) return [DEMO_LOCATION, DEMO_LOCATION_2]
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return data as Location[]
}

export async function getObservations(locationId: string): Promise<DailyObservation[]> {
  if (isDemo) return demoObservationsStore[locationId] ?? getDemoObservations()
  const { data, error } = await supabase
    .from('daily_observations')
    .select('*')
    .eq('location_id', locationId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
  if (error) throw error
  return data as DailyObservation[]
}

export async function saveObservations(observations: DailyObservation[]): Promise<void> {
  if (isDemo) {
    const locationId = observations[0]?.location_id
    if (locationId) demoObservationsStore[locationId] = observations
    return
  }
  const { error } = await supabase.from('daily_observations').upsert(observations)
  if (error) throw error
}

export async function deleteObservation(id: string): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('daily_observations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function getStaffingRules(locationId: string): Promise<StaffingRule[]> {
  if (isDemo) return DEMO_STAFFING_RULES
  const { data, error } = await supabase
    .from('staffing_rules')
    .select('*')
    .eq('location_id', locationId)
    .order('min_visitors')
  if (error) throw error
  return data as StaffingRule[]
}

export async function saveStaffingRule(rule: Omit<StaffingRule, 'id'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('staffing_rules').insert(rule)
  if (error) throw error
}

export async function deleteStaffingRule(id: string): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('staffing_rules').delete().eq('id', id)
  if (error) throw error
}

export async function getUploadedFiles(locationId: string): Promise<UploadedFile[]> {
  if (isDemo) return []
  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('location_id', locationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as UploadedFile[]
}

export async function createCompany(company: Omit<Company, 'id' | 'created_at'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('companies').insert(company)
  if (error) throw error
}

export async function createLocation(location: Omit<Location, 'id' | 'created_at'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('locations').insert(location)
  if (error) throw error
}

export async function getDepartments(companyId: string): Promise<Department[]> {
  if (isDemo) return DEMO_DEPARTMENTS.filter(d => d.company_id === companyId)
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return data as Department[]
}

export async function createDepartment(dept: Omit<Department, 'id' | 'created_at'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('departments').insert(dept)
  if (error) throw error
}

export async function deleteDepartment(id: string): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}

export async function getRoles(companyId: string): Promise<Role[]> {
  if (isDemo) return DEMO_ROLES.filter(r =>
    DEMO_DEPARTMENTS.some(d => d.id === r.department_id && d.company_id === companyId)
  )
  const { data: depts, error: deptsError } = await supabase
    .from('departments')
    .select('id')
    .eq('company_id', companyId)
  if (deptsError) throw deptsError
  const deptIds = depts.map(d => d.id as string)
  if (deptIds.length === 0) return []
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .in('department_id', deptIds)
    .order('name')
  if (error) throw error
  return data as Role[]
}

export async function createRole(role: Omit<Role, 'id' | 'created_at'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('roles').insert(role)
  if (error) throw error
}

export async function deleteRole(id: string): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error
}

export async function getLocationDepartments(locationId: string): Promise<LocationDepartment[]> {
  if (isDemo) return DEMO_LOCATION_DEPARTMENTS.filter(ld => ld.location_id === locationId)
  const { data, error } = await supabase
    .from('location_departments')
    .select('*')
    .eq('location_id', locationId)
  if (error) throw error
  return data as LocationDepartment[]
}

export async function upsertLocationDepartment(ld: Omit<LocationDepartment, 'id'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('location_departments')
    .upsert(ld, { onConflict: 'location_id,department_id' })
  if (error) throw error
}

export async function getLocationRoles(locationId: string): Promise<LocationRole[]> {
  if (isDemo) return DEMO_LOCATION_ROLES.filter(lr => lr.location_id === locationId)
  const { data, error } = await supabase
    .from('location_roles')
    .select('*')
    .eq('location_id', locationId)
  if (error) throw error
  return data as LocationRole[]
}

export async function upsertLocationRole(lr: Omit<LocationRole, 'id'>): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('location_roles')
    .upsert(lr, { onConflict: 'location_id,role_id' })
  if (error) throw error
}

export async function getDailyStaffingEvaluations(
  locationId: string,
  date: string
): Promise<DailyStaffingEvaluation[]> {
  if (isDemo) return DEMO_STAFFING_EVALUATIONS.filter(e =>
    e.location_id === locationId && e.date === date
  )
  const { data, error } = await supabase
    .from('daily_staffing_evaluations')
    .select('*')
    .eq('location_id', locationId)
    .eq('date', date)
  if (error) throw error
  return data as DailyStaffingEvaluation[]
}

export async function saveDailyStaffingEvaluations(
  evals: Omit<DailyStaffingEvaluation, 'id' | 'created_at'>[]
): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('daily_staffing_evaluations')
    .upsert(evals, { onConflict: 'location_id,department_id,date' })
  if (error) throw error
}
