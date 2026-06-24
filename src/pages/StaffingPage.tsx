import React, { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import ConfirmModal from '../components/ui/ConfirmModal'
import { useApp } from '../context/AppContext'
import { getStaffingRules, saveStaffingRule, deleteStaffingRule } from '../services/supabaseService'
import type { StaffingRule } from '../types/database'

export default function StaffingPage() {
  const { selectedCompany, selectedLocation, isDemo } = useApp()
  const [rules, setRules] = useState<StaffingRule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ min_visitors: '', max_visitors: '', recommended_staff: '', label: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selectedLocation) return
    getStaffingRules(selectedLocation.id).then(setRules)
  }, [selectedLocation])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompany || !selectedLocation) return
    setSaving(true)
    const rule = {
      company_id: selectedCompany.id,
      location_id: selectedLocation.id,
      min_visitors: Number(form.min_visitors),
      max_visitors: form.max_visitors ? Number(form.max_visitors) : undefined,
      recommended_staff: Number(form.recommended_staff),
      label: form.label,
    }
    await saveStaffingRule(rule)
    if (isDemo) {
      // In demo mode, simulate adding locally with a fake id
      setRules(prev => [...prev, { id: `local-${Date.now()}`, ...rule }])
    } else {
      const updated = await getStaffingRules(selectedLocation.id)
      setRules(updated)
    }
    setSaving(false)
    setShowForm(false)
    setForm({ min_visitors: '', max_visitors: '', recommended_staff: '', label: '' })
  }

  async function handleDelete(id: string) {
    await deleteStaffingRule(id)
    setRules(prev => prev.filter(r => r.id !== id))
    setDeleteId(null)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Personeelsregels</h1>
          <p className="text-slate-500 text-sm mt-1">
            Op basis van verwacht bezoekersaantal
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus size={16} />
          Regel toevoegen
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Nieuwe regel</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Min bezoekers</label>
              <input type="number" required value={form.min_visitors} onChange={e => setForm(f => ({ ...f, min_visitors: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max bezoekers (leeg = onbeperkt)</label>
              <input type="number" value={form.max_visitors} onChange={e => setForm(f => ({ ...f, max_visitors: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Aanbevolen personeel</label>
              <input type="number" required value={form.recommended_staff} onChange={e => setForm(f => ({ ...f, recommended_staff: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
              <input type="text" required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="bv. Druk"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Annuleren</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Label</th>
              <th className="px-4 py-3 font-medium text-slate-600">Min bezoekers</th>
              <th className="px-4 py-3 font-medium text-slate-600">Max bezoekers</th>
              <th className="px-4 py-3 font-medium text-slate-600">Aanbevolen personeel</th>
              <th className="px-4 py-3 font-medium text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.label}</td>
                <td className="px-4 py-3 text-slate-700">{r.min_visitors.toLocaleString('nl-BE')}</td>
                <td className="px-4 py-3 text-slate-700">{r.max_visitors !== undefined ? r.max_visitors.toLocaleString('nl-BE') : '∞'}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.recommended_staff}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDeleteId(r.id)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Nog geen personeelsregels.</div>
        )}
      </div>

      {deleteId && (
        <ConfirmModal
          title="Regel verwijderen"
          message="Weet je zeker dat je deze personeelsregel wil verwijderen?"
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </Layout>
  )
}
