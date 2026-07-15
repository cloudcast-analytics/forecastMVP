import { useState } from 'react'
import { CheckCircle, AlertCircle, Sparkles, Clock } from 'lucide-react'
import Button from '../ui/Button'
import FileUpload from './FileUpload'
import { useApp } from '../../context/AppContext'
import { upsertHourlySales } from '../../services/supabaseService'
import type { HourlySale } from '../../types/events'

type Step = 'upload' | 'preview' | 'done'

const TIPS: Record<string, string> = {
  upload: 'Upload een CSV met uurdata: kolommen datum, uur (0–23), categorie, aantal en omzet. Komma- of puntkomma-scheidingsteken werkt. Ik herken kolommen automatisch.',
  preview: 'Ik heb de kolommen herkend. Controleer of datum, uur en categorie er goed uitzien. Per combinatie van datum+uur+categorie wordt de oudere waarde overschreven.',
  done: 'Uurdata geïmporteerd. De uur-trends grafiek op de Performance-pagina gebruikt nu jouw echte data.',
}

function CloudyTip({ step }: { step: string }) {
  return (
    <div style={{
      display: 'flex', gap: '10px', alignItems: 'flex-start',
      background: 'rgba(26,68,232,0.05)', border: '1px solid rgba(26,68,232,0.12)',
      borderRadius: '12px', padding: '12px 14px', marginBottom: '20px',
    }}>
      <div style={{
        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #1a44e8, #6b3cdc)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={13} color="#fff" />
      </div>
      <div>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a44e8', marginBottom: '2px' }}>Cloudy zegt</p>
        <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{TIPS[step]}</p>
      </div>
    </div>
  )
}

interface ParsedRow {
  date: string
  hour: number
  category: string
  quantity: number
  revenue: number
  valid: boolean
  error?: string
}

function detectMapping(cols: string[]): Record<string, 'date' | 'hour' | 'category' | 'quantity' | 'revenue'> {
  const map: Record<string, 'date' | 'hour' | 'category' | 'quantity' | 'revenue'> = {}
  for (const col of cols) {
    const l = col.toLowerCase()
    if (l.includes('datum') || l === 'date') map[col] = 'date'
    else if (l === 'uur' || l === 'hour' || l.includes('uur')) map[col] = 'hour'
    else if (l.includes('categorie') || l.includes('category') || l.includes('product')) map[col] = 'category'
    else if (l.includes('aantal') || l === 'quantity' || l === 'qty') map[col] = 'quantity'
    else if (l.includes('omzet') || l.includes('revenue') || l.includes('bedrag')) map[col] = 'revenue'
  }
  return map
}

function parseRows(raw: Record<string, string>[], mapping: Record<string, string>): ParsedRow[] {
  const dateKey = Object.entries(mapping).find(([, v]) => v === 'date')?.[0]
  const hourKey = Object.entries(mapping).find(([, v]) => v === 'hour')?.[0]
  const catKey = Object.entries(mapping).find(([, v]) => v === 'category')?.[0]
  const qtyKey = Object.entries(mapping).find(([, v]) => v === 'quantity')?.[0]
  const revKey = Object.entries(mapping).find(([, v]) => v === 'revenue')?.[0]

  return raw.map(row => {
    const dateRaw = dateKey ? row[dateKey] : ''
    const hourRaw = hourKey ? row[hourKey] : ''
    const cat = catKey ? row[catKey]?.trim() : ''
    const qty = qtyKey ? Number(row[qtyKey]) : 0
    const rev = revKey ? Number(row[revKey]) : 0
    const hour = parseInt(hourRaw, 10)

    if (!dateRaw) return { date: '', hour: 0, category: '', quantity: 0, revenue: 0, valid: false, error: 'Geen datum' }
    if (isNaN(hour) || hour < 0 || hour > 23) return { date: dateRaw, hour: 0, category: '', quantity: 0, revenue: 0, valid: false, error: 'Ongeldig uur' }
    if (!cat) return { date: dateRaw, hour, category: '', quantity: 0, revenue: 0, valid: false, error: 'Geen categorie' }

    // Normalize date to yyyy-mm-dd
    let date = dateRaw.trim()
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(date)) {
      const [d, m, y] = date.split(/[\/\-\.]/)
      date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    return { date, hour, category: cat, quantity: isNaN(qty) ? 0 : qty, revenue: isNaN(rev) ? 0 : rev, valid: true }
  })
}

interface HourlyUploadTabProps {
  onImported: () => void
}

export default function HourlyUploadTab({ onImported }: HourlyUploadTabProps) {
  const { selectedCompany, selectedLocation } = useApp()
  const [step, setStep] = useState<Step>('upload')
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [filename, setFilename] = useState('')
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleFileLoaded(rows: Record<string, string>[], name: string) {
    setRawRows(rows)
    setFilename(name)
    const cols = Object.keys(rows[0] ?? {})
    const detected = detectMapping(cols)
    setMapping(detected as Record<string, string>)
    const p = parseRows(rows, detected as Record<string, string>)
    setParsed(p)
    setStep('preview')
  }

  async function handleImport() {
    if (!selectedCompany || !selectedLocation) {
      alert('Selecteer eerst een locatie.')
      return
    }
    setSaving(true)
    setSaveError(null)
    const valid = parsed.filter(r => r.valid)
    const sales: HourlySale[] = valid.map(r => ({
      id: crypto.randomUUID(),
      location_id: selectedLocation.id,
      date: r.date,
      hour: r.hour,
      category: r.category,
      quantity: r.quantity,
      revenue: r.revenue,
    }))
    try {
      await upsertHourlySales(sales)
      setStep('done')
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message ?? String(err))
    } finally {
      setSaving(false)
    }
  }

  const validCount = parsed.filter(r => r.valid).length
  const invalidCount = parsed.filter(r => !r.valid).length
  const previewRows = parsed.slice(0, 8)
  const cols = Object.keys(rawRows[0] ?? {})

  return (
    <div>
      <p className="text-slate-500 text-sm mb-4">
        Locatie: <strong>{selectedLocation?.name ?? '—'}</strong>
      </p>

      {!selectedLocation && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(234,88,12,0.07)', border: '1px solid rgba(234,88,12,0.25)',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
          fontSize: '13px', color: '#c2410c',
        }}>
          <span>⚠️</span>
          <span>Geen locatie geselecteerd. Kies eerst een locatie om data te importeren.</span>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(8,145,178,0.05)', border: '1px solid rgba(8,145,178,0.15)',
        borderRadius: '10px', padding: '10px 14px', marginBottom: '20px',
      }}>
        <Clock size={14} color="#0891b2" />
        <p style={{ fontSize: '12px', color: '#374151' }}>
          Verwacht formaat: <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>datum, uur, categorie, aantal, omzet</code>
          {' '}(koptekstrij vereist)
        </p>
      </div>

      {step === 'upload' && (
        <>
          <CloudyTip step="upload" />
          <FileUpload onFileLoaded={handleFileLoaded} />
        </>
      )}

      {step === 'preview' && (
        <div>
          <CloudyTip step="preview" />
          <p className="text-sm text-slate-600 mb-4">
            <strong>{filename}</strong> — {rawRows.length} rijen · {validCount} geldig · {invalidCount > 0 ? `${invalidCount} ongeldig` : 'geen fouten'}
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-4">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {cols.map(col => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-slate-600">
                      {col}
                      {mapping[col] && (
                        <span className="ml-1 text-blue-500">→ {mapping[col]}</span>
                      )}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 ${!row.valid ? 'bg-red-50' : ''}`}>
                    {cols.map(col => (
                      <td key={col} className="px-3 py-2 text-slate-700">{rawRows[i]?.[col] ?? ''}</td>
                    ))}
                    <td className="px-3 py-2">
                      {row.valid
                        ? <span className="text-green-600 text-xs">✓</span>
                        : <span className="text-red-600 text-xs">{row.error}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidCount > 0 && (
            <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <AlertCircle size={15} />
              <span>{invalidCount} ongeldige rijen worden overgeslagen.</span>
            </div>
          )}

          {saveError && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <strong>Fout:</strong> {saveError}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('upload')}>Terug</Button>
            <Button onClick={handleImport} disabled={saving || validCount === 0}>
              {saving ? 'Importeren...' : `${validCount} rijen importeren`}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div>
          <CloudyTip step="done" />
          <div className="text-center py-12">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Uurdata geïmporteerd</h2>
            <p className="text-slate-500 text-sm mb-6">
              {validCount} rijen succesvol verwerkt.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => { setStep('upload'); setRawRows([]); setParsed([]) }}>
                Nog een bestand
              </Button>
              <Button onClick={onImported}>Naar overzicht</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
