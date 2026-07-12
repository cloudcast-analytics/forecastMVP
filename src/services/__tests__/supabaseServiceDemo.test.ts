import { describe, it, expect } from 'vitest'
import { getDepartmentStaffingRules, upsertDepartmentStaffingRule } from '../supabaseService'

// .env heeft geen VITE_SUPABASE_URL in testomgeving → isDemo is true (zie src/lib/supabase.ts)
describe('department staffing rules (demo store)', () => {
  it('geeft de Waterfront-regels voor demo-location', async () => {
    const rules = await getDepartmentStaffingRules('demo-location')
    expect(rules.map(r => r.department_name)).toEqual(['Bar buiten', 'Bar binnen', 'Keuken'])
    expect(rules[0].base_staff).toBe(2)
    expect(rules[0].event_staff).toBe(3)
  })

  it('werkt een bestaande regel bij via upsert', async () => {
    await upsertDepartmentStaffingRule({
      id: 'dsr-keuken', location_id: 'demo-location', department_id: 'dept-keuken',
      department_name: 'Keuken', base_staff: 2, busy_staff: 2,
    })
    const rules = await getDepartmentStaffingRules('demo-location')
    expect(rules.find(r => r.department_id === 'dept-keuken')?.base_staff).toBe(2)
  })
})
