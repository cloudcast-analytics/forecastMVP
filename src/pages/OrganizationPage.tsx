import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import {
  getDepartments, createDepartment, deleteDepartment,
  getRoles, createRole, deleteRole,
  getLocationDepartments, upsertLocationDepartment,
  getLocationRoles, upsertLocationRole,
  getDailyStaffingEvaluations, saveDailyStaffingEvaluations,
} from '../services/supabaseService'
import { getLocationSettings, saveLocationSettings, type LocationModules } from '../services/settingsService'
import type { Department, LocationDepartment, LocationRole, Role } from '../types/database'

type Tab = 'structuur' | 'bezetting' | 'modules'
type Rating = 'understaffed' | 'adequate' | 'overstaffed'

export default function OrganizationPage() {
  const { selectedCompany, selectedLocation, isDemo } = useApp()
  const [activeTab, setActiveTab] = useState<Tab>('structuur')

  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [locationDepts, setLocationDepts] = useState<LocationDepartment[]>([])
  const [locationRoles, setLocationRoles] = useState<LocationRole[]>([])

  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [addingDept, setAddingDept] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [addingRoleFor, setAddingRoleFor] = useState<string | null>(null)
  const [newRoleName, setNewRoleName] = useState('')

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const [savingEval, setSavingEval] = useState(false)
  const [evalSaved, setEvalSaved] = useState(false)
  const [modules, setModules] = useState<LocationModules>({ voorraad: true, evenementen: true, uur_trends: true })
  const [modulesSaved, setModulesSaved] = useState(false)

  useEffect(() => {
    if (!selectedCompany) return
    Promise.all([
      getDepartments(selectedCompany.id),
      getRoles(selectedCompany.id),
    ]).then(([depts, r]) => {
      setDepartments(depts)
      setRoles(r)
    })
  }, [selectedCompany])

  useEffect(() => {
    if (!selectedLocation) {
      setLocationDepts([])
      setLocationRoles([])
      return
    }
    const s = getLocationSettings(selectedLocation.id)
    setModules(s.modules)
    Promise.all([
      getLocationDepartments(selectedLocation.id),
      getLocationRoles(selectedLocation.id),
    ]).then(([ld, lr]) => {
      setLocationDepts(ld)
      setLocationRoles(lr)
    })
  }, [selectedLocation])

  useEffect(() => {
    if (!selectedLocation || activeTab !== 'bezetting') return
    getDailyStaffingEvaluations(selectedLocation.id, selectedDate).then(evals => {
      const map: Record<string, Rating> = {}
      evals.forEach(e => { map[e.department_id] = e.rating })
      setRatings(map)
    })
  }, [selectedLocation, selectedDate, activeTab])

  function isDeptActive(deptId: string): boolean {
    const ld = locationDepts.find(ld => ld.department_id === deptId)
    return ld ? ld.is_active : false
  }

  function getHeadcount(roleId: string): number {
    return locationRoles.find(lr => lr.role_id === roleId)?.headcount ?? 0
  }

  function toggleExpand(deptId: string) {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      next.has(deptId) ? next.delete(deptId) : next.add(deptId)
      return next
    })
  }

  async function handleAddDept(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompany || !newDeptName.trim()) return
    await createDepartment({ company_id: selectedCompany.id, name: newDeptName.trim() })
    if (isDemo) {
      setDepartments(prev => [...prev, {
        id: `dept-${Date.now()}`,
        company_id: selectedCompany.id,
        name: newDeptName.trim(),
        created_at: new Date().toISOString(),
      }])
    } else {
      setDepartments(await getDepartments(selectedCompany.id))
    }
    setNewDeptName('')
    setAddingDept(false)
  }

  async function handleDeleteDept(id: string) {
    await deleteDepartment(id)
    setDepartments(prev => prev.filter(d => d.id !== id))
    setRoles(prev => prev.filter(r => r.department_id !== id))
    setLocationDepts(prev => prev.filter(ld => ld.department_id !== id))
  }

  async function handleAddRole(e: React.FormEvent, deptId: string) {
    e.preventDefault()
    if (!selectedCompany || !newRoleName.trim()) return
    await createRole({ department_id: deptId, name: newRoleName.trim() })
    if (isDemo) {
      setRoles(prev => [...prev, {
        id: `role-${Date.now()}`,
        department_id: deptId,
        name: newRoleName.trim(),
        created_at: new Date().toISOString(),
      }])
    } else {
      setRoles(await getRoles(selectedCompany.id))
    }
    setNewRoleName('')
    setAddingRoleFor(null)
  }

  async function handleDeleteRole(id: string) {
    await deleteRole(id)
    setRoles(prev => prev.filter(r => r.id !== id))
    setLocationRoles(prev => prev.filter(lr => lr.role_id !== id))
  }

  function handleToggleDept(deptId: string) {
    if (!selectedLocation) return
    const newIsActive = !isDeptActive(deptId)
    upsertLocationDepartment({
      location_id: selectedLocation.id,
      department_id: deptId,
      is_active: newIsActive,
    })
    const existing = locationDepts.find(ld => ld.department_id === deptId)
    if (existing) {
      setLocationDepts(prev => prev.map(ld =>
        ld.department_id === deptId ? { ...ld, is_active: newIsActive } : ld
      ))
    } else {
      setLocationDepts(prev => [...prev, {
        id: `ld-${Date.now()}`,
        location_id: selectedLocation.id,
        department_id: deptId,
        is_active: newIsActive,
      }])
    }
  }

  function handleHeadcountBlur(roleId: string, value: string) {
    if (!selectedLocation) return
    const headcount = Math.max(0, parseInt(value, 10) || 0)
    upsertLocationRole({ location_id: selectedLocation.id, role_id: roleId, headcount })
    const existing = locationRoles.find(lr => lr.role_id === roleId)
    if (existing) {
      setLocationRoles(prev => prev.map(lr =>
        lr.role_id === roleId ? { ...lr, headcount } : lr
      ))
    } else {
      setLocationRoles(prev => [...prev, {
        id: `lr-${Date.now()}`,
        location_id: selectedLocation.id,
        role_id: roleId,
        headcount,
      }])
    }
  }

  async function handleSaveEvaluation() {
    if (!selectedLocation) return
    setSavingEval(true)
    const activeDepts = departments.filter(d => isDeptActive(d.id))
    await saveDailyStaffingEvaluations(
      activeDepts.map(d => ({
        location_id: selectedLocation.id,
        department_id: d.id,
        date: selectedDate,
        rating: ratings[d.id] ?? 'adequate',
      }))
    )
    setSavingEval(false)
    setEvalSaved(true)
    setTimeout(() => setEvalSaved(false), 2000)
  }

  const activeDepts = departments.filter(d => isDeptActive(d.id))

  const renderStructuur = () => (
    <div>
      {!selectedLocation && (
        <div className="mb-4 text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          Selecteer een locatie om per-locatie instellingen (actief/inactief, headcount) te zien.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {departments.map((dept, idx) => {
          const deptRoles = roles.filter(r => r.department_id === dept.id)
          const isExpanded = expandedDepts.has(dept.id)
          const isActive = isDeptActive(dept.id)

          return (
            <div key={dept.id} className={idx > 0 ? 'border-t border-slate-100' : ''}>
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <button
                  onClick={() => toggleExpand(dept.id)}
                  className="text-slate-400 flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <span className="flex-1 font-medium text-slate-900 text-sm">{dept.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {deptRoles.length} functie{deptRoles.length !== 1 ? 's' : ''}
                </span>
                {selectedLocation && (
                  <button
                    onClick={() => handleToggleDept(dept.id)}
                    className={[
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0',
                      isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {isActive ? 'Actief' : 'Inactief'}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteDept(dept.id)}
                  className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-100">
                  {deptRoles.map(role => (
                    <div
                      key={`${role.id}-${selectedLocation?.id ?? 'none'}`}
                      className="flex items-center gap-3 pl-12 pr-4 py-2.5 border-t border-slate-100 first:border-t-0"
                    >
                      <span className="flex-1 text-sm text-slate-700">{role.name}</span>
                      {selectedLocation && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Headcount</span>
                          <input
                            type="number"
                            min="0"
                            defaultValue={getHeadcount(role.id)}
                            onBlur={e => handleHeadcountBlur(role.id, e.target.value)}
                            className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {addingRoleFor === dept.id ? (
                    <form
                      onSubmit={e => handleAddRole(e, dept.id)}
                      className="flex items-center gap-2 pl-12 pr-4 py-2.5 border-t border-slate-100"
                    >
                      <input
                        autoFocus
                        type="text"
                        placeholder="Naam functie"
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button size="sm" type="submit" disabled={!newRoleName.trim()}>
                        Toevoegen
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={() => { setAddingRoleFor(null); setNewRoleName('') }}
                      >
                        Annuleren
                      </Button>
                    </form>
                  ) : (
                    <button
                      onClick={() => { setAddingRoleFor(dept.id); setNewRoleName('') }}
                      className="flex items-center gap-2 pl-12 pr-4 py-2.5 w-full text-left text-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors"
                    >
                      <Plus size={13} /> Functie toevoegen
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {addingDept ? (
          <form
            onSubmit={handleAddDept}
            className={[
              'flex items-center gap-2 px-4 py-3',
              departments.length > 0 ? 'border-t border-slate-100' : '',
            ].join(' ')}
          >
            <input
              autoFocus
              type="text"
              placeholder="Naam afdeling"
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" type="submit" disabled={!newDeptName.trim()}>
              Toevoegen
            </Button>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => { setAddingDept(false); setNewDeptName('') }}
            >
              Annuleren
            </Button>
          </form>
        ) : (
          <button
            onClick={() => setAddingDept(true)}
            className={[
              'flex items-center gap-2 px-4 py-3 w-full text-left text-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors',
              departments.length > 0 ? 'border-t border-slate-100' : '',
            ].join(' ')}
          >
            <Plus size={14} /> Afdeling toevoegen
          </button>
        )}
      </div>

      {departments.length === 0 && !addingDept && (
        <p className="text-center text-slate-400 text-sm mt-8">
          Nog geen afdelingen. Voeg er een toe.
        </p>
      )}
    </div>
  )

  const renderBezetting = () => {
    if (!selectedLocation) {
      return (
        <div className="text-center py-12 text-slate-400 text-sm">
          Selecteer een locatie om de dagelijkse bezetting te evalueren.
        </div>
      )
    }

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-slate-700">Datum</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {activeDepts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Geen actieve afdelingen voor deze locatie. Activeer afdelingen via de Structuur tab.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {activeDepts.map((dept, idx) => (
              <div
                key={dept.id}
                className={[
                  'flex items-center gap-4 px-4 py-4',
                  idx > 0 ? 'border-t border-slate-100' : '',
                ].join(' ')}
              >
                <span className="w-36 text-sm font-medium text-slate-900">{dept.name}</span>
                <div className="flex gap-2">
                  {(['understaffed', 'adequate', 'overstaffed'] as Rating[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setRatings(prev => ({ ...prev, [dept.id]: r }))}
                      className={[
                        'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                        ratings[dept.id] === r
                          ? r === 'understaffed'
                            ? 'bg-red-500 text-white border-red-500'
                            : r === 'adequate'
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {r === 'understaffed' ? 'Onderbezet' : r === 'adequate' ? 'Goed' : 'Overbezet'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button
            onClick={handleSaveEvaluation}
            disabled={savingEval || activeDepts.length === 0}
          >
            {savingEval ? 'Opslaan...' : 'Evaluatie opslaan'}
          </Button>
          {evalSaved && (
            <span className="text-sm text-green-600 font-medium">Opgeslagen!</span>
          )}
        </div>
      </div>
    )
  }

  const MODULE_LABELS: Record<keyof LocationModules, { label: string; desc: string }> = {
    voorraad: { label: 'Voorraad & bestellen', desc: 'Productcatalogus, bestelflow en leverancierscommunicatie.' },
    evenementen: { label: 'Evenementen', desc: 'Evenementenkalender met automatische doorwerking in forecast en bezettingsadvies.' },
    uur_trends: { label: 'Uur-trends productmix', desc: 'Uurpatroon per productcategorie op de Performance-pagina.' },
  }

  function handleToggleModule(key: keyof LocationModules) {
    if (!selectedLocation) return
    const next = { ...modules, [key]: !modules[key] }
    setModules(next)
    const s = getLocationSettings(selectedLocation.id)
    saveLocationSettings(selectedLocation.id, { ...s, modules: next })
    setModulesSaved(true)
    setTimeout(() => setModulesSaved(false), 2000)
  }

  const renderModules = () => {
    if (!selectedLocation) {
      return (
        <div className="text-center py-12 text-slate-400 text-sm">
          Selecteer een locatie om modules in te stellen.
        </div>
      )
    }
    return (
      <div>
        <p className="text-sm text-slate-500 mb-6">
          Schakel modules per locatie aan of uit. Uitgeschakelde modules verdwijnen uit de navigatie.
        </p>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {(Object.keys(MODULE_LABELS) as (keyof LocationModules)[]).map((key, idx) => {
            const { label, desc } = MODULE_LABELS[key]
            const on = modules[key]
            return (
              <div
                key={key}
                className={`flex items-center gap-4 px-5 py-4 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <div style={{ flex: 1 }}>
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => handleToggleModule(key)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '99px',
                    background: on ? '#1a44e8' : '#d1d5db',
                    border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: on ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            )
          })}
        </div>
        {modulesSaved && (
          <p className="text-sm text-green-600 font-medium mt-3">Wijzigingen opgeslagen.</p>
        )}
      </div>
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organisatie</h1>
          <p className="text-slate-500 text-sm mt-1">Afdelingen, functies en bezettingsevaluatie</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {(['structuur', 'bezetting', 'modules'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {tab === 'structuur' ? 'Structuur' : tab === 'bezetting' ? 'Bezetting evaluatie' : 'Modules'}
          </button>
        ))}
      </div>

      {activeTab === 'structuur' && renderStructuur()}
      {activeTab === 'bezetting' && renderBezetting()}
      {activeTab === 'modules' && renderModules()}
    </Layout>
  )
}
