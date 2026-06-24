import React, { useState } from 'react'
import { Plus, Building2 } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { createCompany } from '../services/supabaseService'

export default function CompaniesPage() {
  const { companies, isDemo } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sector: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await createCompany(form)
    setSaving(false)
    setShowModal(false)
    setForm({ name: '', sector: '', contact_name: '', contact_email: '', phone: '', website: '', notes: '' })
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bedrijven</h1>
        {!isDemo && (
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Nieuw bedrijf
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Naam</th>
              <th className="px-4 py-3 font-medium text-slate-600">Sector</th>
              <th className="px-4 py-3 font-medium text-slate-600">Contactpersoon</th>
              <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
              {isDemo && <th className="px-4 py-3 font-medium text-slate-600">Status</th>}
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                  <Building2 size={15} className="text-slate-400" />
                  {c.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.sector}</td>
                <td className="px-4 py-3 text-slate-600">{c.contact_name}</td>
                <td className="px-4 py-3 text-slate-500">{c.contact_email}</td>
                {isDemo && (
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Demo</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Nog geen bedrijven.</div>
        )}
      </div>

      {showModal && (
        <Modal title="Nieuw bedrijf toevoegen" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {[
              { key: 'name', label: 'Naam', required: true },
              { key: 'sector', label: 'Sector', required: false },
              { key: 'contact_name', label: 'Contactpersoon', required: false },
              { key: 'contact_email', label: 'E-mail', required: false },
              { key: 'phone', label: 'Telefoon', required: false },
              { key: 'website', label: 'Website', required: false },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input
                  type="text"
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
