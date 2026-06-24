import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import DataTable from '../components/data/DataTable'
import ConfirmModal from '../components/ui/ConfirmModal'
import { useApp } from '../context/AppContext'
import { getObservations, deleteObservation } from '../services/supabaseService'
import type { DailyObservation } from '../types/database'

export default function DataPage() {
  const { selectedLocation, isDemo } = useApp()
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [filtered, setFiltered] = useState<DailyObservation[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    getObservations(selectedLocation.id).then(data => {
      const active = data.filter(o => !o.deleted_at)
      setObservations(active)
      setFiltered(active)
      setLoading(false)
    })
  }, [selectedLocation])

  useEffect(() => {
    let result = observations
    if (fromDate) result = result.filter(o => o.date >= fromDate)
    if (toDate) result = result.filter(o => o.date <= toDate)
    setFiltered(result.sort((a, b) => b.date.localeCompare(a.date)))
  }, [fromDate, toDate, observations])

  async function handleDelete(id: string) {
    await deleteObservation(id)
    setObservations(prev => prev.filter(o => o.id !== id))
    setDeleteId(null)
  }

  function exportCSV() {
    const cols = ['date', 'revenue', 'visitors', 'transactions', 'staff_scheduled', 'occupancy_rate']
    const header = cols.join(';')
    const rows = filtered.map(o =>
      cols.map(c => (o as unknown as Record<string, unknown>)[c] ?? '').join(';')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cloudcast-data-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mijn data</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} records</p>
        </div>
        <Button variant="secondary" onClick={exportCSV}>
          <Download size={15} />
          Exporteer CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Van</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tot</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(fromDate || toDate) && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate('') }}>
              Wis filters
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Data laden...</p>
      ) : (
        <DataTable
          observations={filtered}
          onDelete={id => {
            if (isDemo) return
            setDeleteId(id)
          }}
        />
      )}

      {deleteId && (
        <ConfirmModal
          title="Observatie verwijderen"
          message="Weet je zeker dat je deze observatie wil verwijderen? Dit heeft invloed op de kwaliteit van je forecast."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
          confirmLabel="Verwijderen"
        />
      )}
    </Layout>
  )
}
