import { useEffect, useState, type ChangeEvent } from 'react'
import { Save } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import {
  getDepartments,
  getLocationDepartments,
  getDepartmentStaffingRules,
  upsertDepartmentStaffingRule,
} from '../services/supabaseService'
import { getLocationSettings, saveLocationSettings, type LocationSettings } from '../services/settingsService'
import type { Department } from '../types/database'
import type { DepartmentStaffingRule } from '../types/staffing'

interface RuleForm {
  base_staff: string
  busy_staff: string
  event_guest_threshold: string
  event_staff: string
}

function toForm(rule?: DepartmentStaffingRule): RuleForm {
  return {
    base_staff: rule ? String(rule.base_staff) : '1',
    busy_staff: rule ? String(rule.busy_staff) : '1',
    event_guest_threshold: rule?.event_guest_threshold !== undefined ? String(rule.event_guest_threshold) : '',
    event_staff: rule?.event_staff !== undefined ? String(rule.event_staff) : '',
  }
}

export default function StaffingPage() {
  const { selectedLocation } = useApp()
  const [departments, setDepartments] = useState<Department[]>([])
  const [forms, setForms] = useState<Record<string, RuleForm>>({})
  const [rules, setRules] = useState<DepartmentStaffingRule[]>([])
  const [settings, setSettings] = useState<LocationSettings>({ hourly_wage: 14, shift_hours: 8 })
  const [savedDept, setSavedDept] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedLocation) return
    setSettings(getLocationSettings(selectedLocation.id))
    Promise.all([
      getDepartments(selectedLocation.company_id),
      getLocationDepartments(selectedLocation.id),
      getDepartmentStaffingRules(selectedLocation.id),
    ]).then(([depts, locDepts, r]) => {
      const activeIds = new Set(locDepts.filter(ld => ld.is_active).map(ld => ld.department_id))
      const active = depts.filter(d => activeIds.has(d.id))
      setDepartments(active)
      setRules(r)
      setForms(Object.fromEntries(active.map(d => [d.id, toForm(r.find(x => x.department_id === d.id))])))
    })
  }, [selectedLocation])

  async function handleSave(dept: Department) {
    if (!selectedLocation) return
    const f = forms[dept.id]
    const existing = rules.find(r => r.department_id === dept.id)
    await upsertDepartmentStaffingRule({
      id: existing?.id,
      location_id: selectedLocation.id,
      department_id: dept.id,
      department_name: dept.name,
      base_staff: Number(f.base_staff) || 1,
      busy_staff: Number(f.busy_staff) || 1,
      event_guest_threshold: f.event_guest_threshold ? Number(f.event_guest_threshold) : undefined,
      event_staff: f.event_staff ? Number(f.event_staff) : undefined,
    })
    setRules(await getDepartmentStaffingRules(selectedLocation.id))
    setSavedDept(dept.id)
    setTimeout(() => setSavedDept(null), 2000)
  }

  function handleSettingsChange(next: LocationSettings) {
    setSettings(next)
    if (selectedLocation) saveLocationSettings(selectedLocation.id, next)
  }

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Personeelsregels</h1>
        <p className="text-slate-500 text-sm mt-1">Bezetting per afdeling — basis, bij drukte en bij evenementen</p>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        {departments.map(dept => {
          const f = forms[dept.id]
          if (!f) return null
          const set = (key: keyof RuleForm) => (e: ChangeEvent<HTMLInputElement>) =>
            setForms(prev => ({ ...prev, [dept.id]: { ...prev[dept.id], [key]: e.target.value } }))

          return (
            <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">{dept.name}</h3>
                <Button onClick={() => handleSave(dept)}>
                  <Save size={14} />
                  {savedDept === dept.id ? 'Opgeslagen ?' : 'Opslaan'}
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Basisbezetting</label>
                  <input type="number" min="0" value={f.base_staff} onChange={set('base_staff')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bij drukte</label>
                  <input type="number" min="0" value={f.busy_staff} onChange={set('busy_staff')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Evenement vanaf … gasten (leeg = n.v.t.)</label>
                  <input type="number" min="0" value={f.event_guest_threshold} onChange={set('event_guest_threshold')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bezetting bij evenement</label>
                  <input type="number" min="0" value={f.event_staff} onChange={set('event_staff')} className={inputCls} />
                </div>
              </div>
            </div>
          )
        })}
        {departments.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            Geen actieve afdelingen voor deze locatie. Activeer afdelingen op de Organisatie-pagina.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-xl">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Loonkosten</h3>
        <p className="text-xs text-slate-500 mb-4">Gebruikt voor de besparingsindicator op het dashboard.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Gemiddeld uurloon (€)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={settings.hourly_wage}
              className={inputCls}
              onChange={e => handleSettingsChange({ ...settings, hourly_wage: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Shifturen per dag</label>
            <input
              type="number"
              min="0"
              value={settings.shift_hours}
              className={inputCls}
              onChange={e => handleSettingsChange({ ...settings, shift_hours: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}

