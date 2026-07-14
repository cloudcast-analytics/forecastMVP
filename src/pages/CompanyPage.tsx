import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, MapPin } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { createLocation } from '../services/supabaseService'

export default function CompanyPage() {
  const { role, selectedCompany, locations, selectedLocation, setSelectedLocation, isDemo } = useApp()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', city: '', country: 'België',
    location_type: '', max_capacity: '', notes: '',
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

  if (role !== 'admin') {
    return (
      <Layout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Mijn locaties</h1>
          <p className="text-slate-500 text-sm mt-1">{selectedCompany?.name ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {locations.map(l => (
            <button
              key={l.id}
              onClick={() => { setSelectedLocation(l); navigate('/dashboard') }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${l.id === selectedLocation?.id ? 'bg-blue-50' : ''}`}
            >
              <MapPin size={15} className="text-slate-400 flex-shrink-0" />
              <span className="flex-1 font-medium text-slate-900 text-sm">{l.name}</span>
              <span className="text-sm text-slate-500">{l.city}</span>
              {l.id === selectedLocation?.id && (
                <span className="text-xs text-blue-600 font-medium">Actief</span>
              )}
            </button>
          ))}
          {locations.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nog geen locaties.</div>
          )}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bedrijf</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900 text-sm">{selectedCompany?.name ?? '—'}</h2>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400 text-xs mb-0.5">Sector</dt>
            <dd className="text-slate-700">{selectedCompany?.sector || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs mb-0.5">Contactpersoon</dt>
            <dd className="text-slate-700">{selectedCompany?.contact_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs mb-0.5">E-mail</dt>
            <dd className="text-slate-700">{selectedCompany?.contact_email || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs mb-0.5">Telefoon</dt>
            <dd className="text-slate-700">{selectedCompany?.phone || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 text-sm">Locaties</h2>
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
