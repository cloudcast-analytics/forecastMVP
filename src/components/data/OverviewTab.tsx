import { useEffect, useState } from 'react'
import { Download, Trash2, Info } from 'lucide-react'
import Button from '../ui/Button'
import DataTable from './DataTable'
import ConfirmModal from '../ui/ConfirmModal'
import { useApp } from '../../context/AppContext'
import { getObservations, deleteObservation, getUploadedFiles } from '../../services/supabaseService'
import type { DailyObservation, UploadedFile } from '../../types/database'
import { formatDate } from '../../lib/utils'

export default function OverviewTab() {
  const { selectedLocation, isDemo } = useApp()
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [filtered, setFiltered] = useState<DailyObservation[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    Promise.all([
      getObservations(selectedLocation.id),
      getUploadedFiles(selectedLocation.id),
    ]).then(([obs, f]) => {
      const active = obs.filter(o => !o.deleted_at)
      setObservations(active)
      setFiltered(active)
      setFiles(f)
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

  function handleDeleteFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
    setConfirmDeleteFile(null)
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
    <div>
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-800">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          CloudCast gebruikt bij voorkeur geaggregeerde dagdata. Persoonsgegevens zijn niet nodig voor revenue forecasting.
          Upload geen bestanden met namen, adressen of andere identificerende gegevens.
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-slate-900 text-sm">{filtered.length} records</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {fromDate || toDate ? 'Gefilterd op datumbereik' : 'Alle beschikbare data'}
          </p>
        </div>
        <Button variant="secondary" onClick={exportCSV}>
          <Download size={15} />
          Exporteer CSV
        </Button>
      </div>

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

      <h2 className="text-base font-semibold text-slate-800 mt-8 mb-3">Geüploade bestanden</h2>

      {loading ? (
        <p className="text-slate-400 text-sm">Laden...</p>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          {isDemo ? 'In demo-modus worden geen bestanden bijgehouden.' : 'Nog geen bestanden geüpload.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Bestandsnaam</th>
                <th className="px-4 py-3 font-medium text-slate-600">Datum upload</th>
                <th className="px-4 py-3 font-medium text-slate-600">Rijen</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{f.filename}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(f.created_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{f.row_count.toLocaleString('nl-BE')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDeleteFile(f.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Verwijder upload"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {confirmDeleteFile && (
        <ConfirmModal
          title="Upload verwijderen"
          message="Wil je dit bestand verwijderen? De geïmporteerde observaties blijven behouden, maar de forecast-modelkwaliteit kan dalen als je ook de records verwijdert."
          onConfirm={() => handleDeleteFile(confirmDeleteFile)}
          onCancel={() => setConfirmDeleteFile(null)}
          confirmLabel="Verwijderen"
        />
      )}
    </div>
  )
}
