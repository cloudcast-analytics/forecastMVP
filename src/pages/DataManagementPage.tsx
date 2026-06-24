import { useEffect, useState } from 'react'
import { Download, Trash2, Info } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import ConfirmModal from '../components/ui/ConfirmModal'
import { useApp } from '../context/AppContext'
import { getUploadedFiles, getObservations } from '../services/supabaseService'
import type { UploadedFile, DailyObservation } from '../types/database'
import { formatDate } from '../lib/utils'

export default function DataManagementPage() {
  const { selectedLocation, isDemo } = useApp()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    Promise.all([
      getUploadedFiles(selectedLocation.id),
      getObservations(selectedLocation.id),
    ]).then(([f, o]) => {
      setFiles(f)
      setObservations(o.filter(obs => !obs.deleted_at))
      setLoading(false)
    })
  }, [selectedLocation])

  async function handleDeleteFile(id: string) {
    // In a real implementation this would call a Supabase function
    setFiles(prev => prev.filter(f => f.id !== id))
    setConfirmDeleteFile(null)
  }

  function exportAll() {
    const cols = ['date', 'revenue', 'visitors', 'transactions', 'staff_scheduled', 'occupancy_rate', 'season', 'is_weekend']
    const header = cols.join(';')
    const rows = observations.map(o =>
      cols.map(c => (o as unknown as Record<string, unknown>)[c] ?? '').join(';')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cloudcast-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Data beheer</h1>
        <p className="text-slate-500 text-sm mt-1">
          Geüploade bestanden en data-export voor {selectedLocation?.name}
        </p>
      </div>

      {/* Privacy info */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-800">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          CloudCast gebruikt bij voorkeur geaggregeerde dagdata. Persoonsgegevens zijn niet nodig voor revenue forecasting.
          Upload geen bestanden met namen, adressen of andere identificerende gegevens.
        </span>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 text-sm">Alle data exporteren</p>
            <p className="text-xs text-slate-500 mt-0.5">{observations.length} observaties beschikbaar</p>
          </div>
          <Button variant="secondary" onClick={exportAll}>
            <Download size={15} />
            Exporteer CSV
          </Button>
        </div>
      </div>

      {/* Uploaded files */}
      <h2 className="text-base font-semibold text-slate-800 mb-3">Geüploade bestanden</h2>

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

      {confirmDeleteFile && (
        <ConfirmModal
          title="Upload verwijderen"
          message="Wil je dit bestand verwijderen? De geïmporteerde observaties blijven behouden, maar de forecast-modelkwaliteit kan dalen als je ook de records verwijdert."
          onConfirm={() => handleDeleteFile(confirmDeleteFile)}
          onCancel={() => setConfirmDeleteFile(null)}
          confirmLabel="Verwijderen"
        />
      )}
    </Layout>
  )
}
