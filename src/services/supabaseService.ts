import { supabase, isDemo } from '../lib/supabase'
import type { Company, DailyObservation, Location, StaffingRule, UploadedFile } from '../types/database'
import {
  DEMO_COMPANY,
  DEMO_LOCATION,
  DEMO_STAFFING_RULES,
  getDemoObservations,
} from '../data/demoSeed'

export async function getCompanies(): Promise<Company[]> {
  if (isDemo) return [DEMO_COMPANY]
  const { data, error } = await supabase.from('companies').select('*').order('name')
  if (error) throw error
  return data as Company[]
}

export async function getLocations(companyId: string): Promise<Location[]> {
  if (isDemo) return [DEMO_LOCATION]
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return data as Location[]
}

export async function getObservations(locationId: string): Promise<DailyObservation[]> {
  if (isDemo) return getDemoObservations()
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
  if (isDemo) return
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
