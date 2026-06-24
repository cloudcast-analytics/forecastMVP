import React, { useState } from 'react'
import { Plus, MapPin } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { createLocation } from '../services/supabaseService'

export default function LocationsPage() {
  const { locations, selectedCompany, isDemo } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    country: 'België',
    location_type: '',
    max_capacity: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompany) return
    setSaving(true)
    await createLocation({
      ...form,
      company_id: selectedCompany.id,
      max_capacity: Number(form.max_capacity) || 0,
    })
    setSaving(false)
    setShowModal(false)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Locaties</h1>
        {!isDemo && (
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Nieuwe locatie
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Naam</th>
              <th className="px-4 py-3 font-medium text-slate-600">Stad</th>
              <th className="px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 font-medium text-slate-600">Max capaciteit</th>
            </tr>
          </thead>
          <tbody>
            {locations.map(l => (
              <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                  <MapPin size={15} className="text-slate-400" />
                  {l.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{l.city}</td>
                <td className="px-4 py-3 text-slate-600">{l.location_type}</td>
                <td className="px-4 py-3 text-slate-600">{l.max_capacity.toLocaleString('nl-BE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {locations.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Nog geen locaties.</div>
        )}
      </div>

      {showModal && (
        <Modal title="Nieuwe locatie toevoegen" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {[
              { key: 'name', label: 'Naam', required: true },
              { key: 'address', label: 'Adres', required: false },
              { key: 'city', label: 'Stad', required: true },
              { key: 'country', label: 'Land', required: false },
              { key: 'location_type', label: 'Type locatie', required: false },
              { key: 'max_capacity', label: 'Max capaciteit', required: false },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input
                  type={key === 'max_capacity' ? 'number' : 'text'}
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuleren</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  )
}
