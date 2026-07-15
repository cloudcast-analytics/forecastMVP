import { supabase, isDemo } from '../lib/supabase'
import type { Company, DailyObservation, Department, DailyStaffingEvaluation, Location, LocationDepartment, LocationRole, Role, UploadedFile } from '../types/database'
import type { DepartmentStaffingRule } from '../types/staffing'
import type { Order, Product, SupplierConfig as InventorySupplierConfig } from '../types/inventory'
import type { Evenement, HourlySale } from '../types/events'
import {
  DEMO_COMPANY,
  DEMO_DEPARTMENT_STAFFING_RULES,
  DEMO_DEPARTMENT_STAFFING_RULES_2,
  DEMO_DEPARTMENTS,
  DEMO_EVENTS,
  DEMO_LOCATION_DEPARTMENTS,
  DEMO_LOCATION_DEPARTMENTS_2,
  DEMO_LOCATION_ROLES,
  DEMO_LOCATION_ROLES_2,
  DEMO_LOCATION,
  DEMO_LOCATION_2,
  DEMO_ORDERS,
  DEMO_PRODUCTS,
  DEMO_PRODUCTS_2,
  DEMO_ROLES,
  DEMO_SUPPLIER,
  DEMO_SUPPLIER_2,
  getDemoObservations,
} from '../data/demoSeed'

// ─── Inventory types ──────────────────────────────────────────────────────────
export interface InventoryItem {
  id: string
  company_id: string
  location_id: string
  name: string
  category: string
  unit: string
  current_stock: number
  min_stock: number
  rpos_product_id?: string | null
  updated_at: string
}

export interface SupplierConfig {
  location_id: string
  supplier_name: string
  supplier_email: string
}

// ─── Inventory functions ──────────────────────────────────────────────────────
export async function getInventoryItems(locationId: string): Promise<InventoryItem[]> {
  if (isDemo) return []
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('location_id', locationId)
    .order('category')
    .order('name')
  if (error) throw error
  return data as InventoryItem[]
}

export async function upsertInventoryItem(
  item: Omit<InventoryItem, 'updated_at'>
): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('inventory_items')
    .upsert(item, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteInventoryItem(id: string): Promise<void> {
  if (isDemo) return
  const { error } = await supabase.from('inventory_items').delete().eq('id', id)
  if (error) throw error
}

export async function adjustStock(
  itemId: string,
  delta: number,
  reason: 'manual' | 'delivery' | 'correction' = 'manual'
): Promise<void> {
  if (isDemo) return
  const { data: item, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('current_stock')
    .eq('id', itemId)
    .single()
  if (fetchErr) throw fetchErr
  const newStock = Math.max(0, (item.current_stock as number) + delta)
  const { error: updateErr } = await supabase
    .from('inventory_items')
    .update({ current_stock: newStock })
    .eq('id', itemId)
  if (updateErr) throw updateErr
  await supabase.from('inventory_transactions').insert({
    item_id: itemId, quantity_delta: delta, reason,
  })
}

export async function getSupplierConfig(locationId: string): Promise<SupplierConfig | null> {
  if (isDemo) return null
  const { data } = await supabase
    .from('supplier_config')
    .select('*')
    .eq('location_id', locationId)
    .single()
  return data as SupplierConfig | null
}

export async function upsertSupplierConfig(cfg: SupplierConfig): Promise<void> {
  if (isDemo) return
  const { error } = await supabase
    .from('supplier_config')
    .upsert(cfg, { onConflict: 'location_id' })
  if (error) throw error
}
// Per-location in-memory stores for demo mode — mutations update these
const demoStores = {
  observations: {} as Record<string, DailyObservation[]>,
  locationDepartments: {
    'demo-location': DEMO_LOCATION_DEPARTMENTS.map(d => ({ ...d })),
    'demo-location-2': DEMO_LOCATION_DEPARTMENTS_2.map(d => ({ ...d })),
  } as Record<string, LocationDepartment[]>,
  locationRoles: {
    'demo-location': DEMO_LOCATION_ROLES.map(r => ({ ...r })),
    'demo-location-2': DEMO_LOCATION_ROLES_2.map(r => ({ ...r })),
  } as Record<string, LocationRole[]>,
  staffingEvaluations: {} as Record<string, DailyStaffingEvaluation[]>,
  departmentStaffingRules: {
    'demo-location': DEMO_DEPARTMENT_STAFFING_RULES.map(r => ({ ...r })),
    'demo-location-2': DEMO_DEPARTMENT_STAFFING_RULES_2.map(r => ({ ...r })),
  } as Record<string, DepartmentStaffingRule[]>,
  products: {
    'demo-location': DEMO_PRODUCTS.map(p => ({ ...p })),
    'demo-location-2': DEMO_PRODUCTS_2.map(p => ({ ...p })),
  } as Record<string, Product[]>,
  supplierConfigs: {
    'demo-location': { ...DEMO_SUPPLIER },
    'demo-location-2': { ...DEMO_SUPPLIER_2 },
  } as Record<string, InventorySupplierConfig>,
  orders: {
    'demo-location': [...DEMO_ORDERS],
    'demo-location-2': [],
  } as Record<string, Order[]>,
  events: {
    'demo-location': [...DEMO_EVENTS],
    'demo-location-2': [],
  } as Record<string, Evenement[]>,
  hourlySales: {} as Record<string, HourlySale[]>,
}

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
  if (isDemo) {
    if (!demoStores.observations[locationId]) {
      demoStores.observations[locationId] = getDemoObservations(locationId)
    }
    return demoStores.observations[locationId]
  }
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
    if (locationId) demoStores.observations[locationId] = observations
    return
  }
  const deduped = Object.values(
    observations.reduce((acc, o) => ({ ...acc, [o.date]: o }), {} as Record<string, typeof observations[0]>)
  )
  const { error } = await supabase
    .from('daily_observations')
    .upsert(deduped, { onConflict: 'location_id,date' })
  if (error) throw error
}

export async function deleteObservation(id: string): Promise<void> {
  if (isDemo) {
    for (const locationId of Object.keys(demoStores.observations)) {
      demoStores.observations[locationId] = demoStores.observations[locationId].filter(o => o.id !== id)
    }
    return
  }
  const { error } = await supabase
    .from('daily_observations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
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
  if (isDemo) return DEMO_ROLES.filter(r => DEMO_DEPARTMENTS.some(d => d.id === r.department_id && d.company_id === companyId))
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
  if (isDemo) return demoStores.locationDepartments[locationId] ?? []
  const { data, error } = await supabase
    .from('location_departments')
    .select('*')
    .eq('location_id', locationId)
  if (error) throw error
  return data as LocationDepartment[]
}

export async function upsertLocationDepartment(ld: Omit<LocationDepartment, 'id'>): Promise<void> {
  if (isDemo) {
    const store = demoStores.locationDepartments[ld.location_id] ?? []
    const idx = store.findIndex(x => x.location_id === ld.location_id && x.department_id === ld.department_id)
    if (idx >= 0) store[idx] = { ...store[idx], ...ld }
    else store.push({ id: `ld-${Date.now()}`, ...ld })
    demoStores.locationDepartments[ld.location_id] = store
    return
  }
  const { error } = await supabase
    .from('location_departments')
    .upsert(ld, { onConflict: 'location_id,department_id' })
  if (error) throw error
}

export async function getLocationRoles(locationId: string): Promise<LocationRole[]> {
  if (isDemo) return demoStores.locationRoles[locationId] ?? []
  const { data, error } = await supabase
    .from('location_roles')
    .select('*')
    .eq('location_id', locationId)
  if (error) throw error
  return data as LocationRole[]
}

export async function upsertLocationRole(lr: Omit<LocationRole, 'id'>): Promise<void> {
  if (isDemo) {
    const store = demoStores.locationRoles[lr.location_id] ?? []
    const idx = store.findIndex(x => x.location_id === lr.location_id && x.role_id === lr.role_id)
    if (idx >= 0) store[idx] = { ...store[idx], ...lr }
    else store.push({ id: `lr-${Date.now()}`, ...lr })
    demoStores.locationRoles[lr.location_id] = store
    return
  }
  const { error } = await supabase
    .from('location_roles')
    .upsert(lr, { onConflict: 'location_id,role_id' })
  if (error) throw error
}

export async function getDailyStaffingEvaluations(locationId: string, date: string): Promise<DailyStaffingEvaluation[]> {
  if (isDemo) {
    return (demoStores.staffingEvaluations[locationId] ?? []).filter(e => e.date === date)
  }
  const { data, error } = await supabase
    .from('daily_staffing_evaluations')
    .select('*')
    .eq('location_id', locationId)
    .eq('date', date)
  if (error) throw error
  return data as DailyStaffingEvaluation[]
}

export async function saveDailyStaffingEvaluations(evals: Omit<DailyStaffingEvaluation, 'id' | 'created_at'>[]): Promise<void> {
  if (isDemo) {
    for (const e of evals) {
      const store = demoStores.staffingEvaluations[e.location_id] ?? []
      const idx = store.findIndex(x => x.location_id === e.location_id && x.department_id === e.department_id && x.date === e.date)
      const record: DailyStaffingEvaluation = {
        id: `eval-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        created_at: new Date().toISOString(),
        ...e,
      }
      if (idx >= 0) store[idx] = record
      else store.push(record)
      demoStores.staffingEvaluations[e.location_id] = store
    }
    return
  }
  const { error } = await supabase
    .from('daily_staffing_evaluations')
    .upsert(evals, { onConflict: 'location_id,department_id,date' })
  if (error) throw error
}

export async function getDepartmentStaffingRules(locationId: string): Promise<DepartmentStaffingRule[]> {
  if (isDemo) return demoStores.departmentStaffingRules[locationId] ?? []
  const { data, error } = await supabase
    .from('department_staffing_rules')
    .select('*, departments(name)')
    .eq('location_id', locationId)
  if (error) throw error
  return (data as (DepartmentStaffingRule & { departments: { name: string } | null })[]).map(row => ({
    ...row,
    department_name: row.departments?.name ?? '',
  }))
}

export async function upsertDepartmentStaffingRule(rule: Omit<DepartmentStaffingRule, 'id'> & { id?: string }): Promise<void> {
  if (isDemo) {
    const store = demoStores.departmentStaffingRules[rule.location_id] ?? []
    const idx = store.findIndex(x => x.department_id === rule.department_id)
    if (idx >= 0) store[idx] = { ...store[idx], ...rule, id: store[idx].id }
    else store.push({ ...rule, id: rule.id ?? `dsr-${Date.now()}` })
    demoStores.departmentStaffingRules[rule.location_id] = store
    return
  }
  const { department_name: _omit, ...dbRule } = rule
  const { error } = await supabase
    .from('department_staffing_rules')
    .upsert(dbRule, { onConflict: 'location_id,department_id' })
  if (error) throw error
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(locationId: string): Promise<Product[]> {
  if (isDemo) return demoStores.products[locationId] ?? []
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('location_id', locationId)
    .order('category')
    .order('name')
  if (error) throw error
  return data as Product[]
}

export async function upsertProduct(product: Product): Promise<void> {
  if (isDemo) {
    const store = demoStores.products[product.location_id] ?? []
    const idx = store.findIndex(p => p.id === product.id)
    if (idx >= 0) store[idx] = product
    else store.push(product)
    demoStores.products[product.location_id] = store
    return
  }
  const { error } = await supabase.from('products').upsert(product, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteProduct(id: string, locationId: string): Promise<void> {
  if (isDemo) {
    demoStores.products[locationId] = (demoStores.products[locationId] ?? []).filter(p => p.id !== id)
    return
  }
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function updateProductStock(productId: string, locationId: string, newStock: number): Promise<void> {
  if (isDemo) {
    const store = demoStores.products[locationId] ?? []
    const idx = store.findIndex(p => p.id === productId)
    if (idx >= 0) store[idx] = { ...store[idx], current_stock: Math.max(0, newStock) }
    return
  }
  const { error } = await supabase.from('products').update({ current_stock: newStock }).eq('id', productId)
  if (error) throw error
}

// ─── Supplier config ──────────────────────────────────────────────────────────

export async function getInventorySupplierConfig(locationId: string): Promise<InventorySupplierConfig | null> {
  if (isDemo) return demoStores.supplierConfigs[locationId] ?? null
  const { data } = await supabase
    .from('supplier_config')
    .select('*')
    .eq('location_id', locationId)
    .single()
  return data as InventorySupplierConfig | null
}

export async function upsertInventorySupplierConfig(cfg: InventorySupplierConfig): Promise<void> {
  if (isDemo) {
    demoStores.supplierConfigs[cfg.location_id] = { ...cfg }
    return
  }
  const { error } = await supabase
    .from('supplier_config')
    .upsert(cfg, { onConflict: 'location_id' })
  if (error) throw error
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getOrders(locationId: string): Promise<Order[]> {
  if (isDemo) return demoStores.orders[locationId] ?? []
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_lines(*)')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Order[]
}

export async function upsertOrder(order: Order): Promise<void> {
  if (isDemo) {
    const store = demoStores.orders[order.location_id] ?? []
    const idx = store.findIndex(o => o.id === order.id)
    if (idx >= 0) store[idx] = order
    else store.push(order)
    demoStores.orders[order.location_id] = store
    return
  }
  const { lines, ...orderRow } = order
  const { error: orderErr } = await supabase.from('orders').upsert(orderRow, { onConflict: 'id' })
  if (orderErr) throw orderErr
  for (const line of lines) {
    const { error: lineErr } = await supabase.from('order_lines').upsert({ ...line, order_id: order.id }, { onConflict: 'order_id,product_id' })
    if (lineErr) throw lineErr
  }
}

// ─── Evenementen ──────────────────────────────────────────────────────────────

export async function getEvents(locationId: string): Promise<Evenement[]> {
  if (isDemo) return [...(demoStores.events[locationId] ?? [])]
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('location_id', locationId)
    .order('date')
  if (error) throw error
  return data as Evenement[]
}

export async function upsertEvent(event: Evenement): Promise<void> {
  if (isDemo) {
    const store = demoStores.events[event.location_id] ?? []
    const idx = store.findIndex(e => e.id === event.id)
    if (idx >= 0) store[idx] = event
    else store.push(event)
    demoStores.events[event.location_id] = store
    return
  }
  const { error } = await supabase.from('events').upsert(event, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteEvent(id: string, locationId: string): Promise<void> {
  if (isDemo) {
    demoStores.events[locationId] = (demoStores.events[locationId] ?? []).filter(e => e.id !== id)
    return
  }
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

// ─── Hourly sales ─────────────────────────────────────────────────────────────

export async function getHourlySales(locationId: string): Promise<HourlySale[]> {
  if (isDemo) return demoStores.hourlySales[locationId] ?? []
  const { data, error } = await supabase
    .from('hourly_sales')
    .select('*')
    .eq('location_id', locationId)
    .order('date')
    .order('hour')
  if (error) throw error
  return data as HourlySale[]
}

export async function upsertHourlySales(sales: HourlySale[]): Promise<void> {
  if (!sales.length) return
  const locationId = sales[0].location_id
  if (isDemo) {
    const existing = demoStores.hourlySales[locationId] ?? []
    const byKey = new Map(existing.map(s => [`${s.date}-${s.hour}-${s.category}`, s]))
    for (const s of sales) byKey.set(`${s.date}-${s.hour}-${s.category}`, s)
    demoStores.hourlySales[locationId] = [...byKey.values()]
    return
  }
  const { error } = await supabase.from('hourly_sales').upsert(sales, { onConflict: 'location_id,date,hour,category' })
  if (error) throw error
}

