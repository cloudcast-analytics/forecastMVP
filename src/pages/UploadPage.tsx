import React, { useState } from 'react'
import { CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import FileUpload from '../components/data/FileUpload'
import ColumnMapper from '../components/data/ColumnMapper'
import { useApp } from '../context/AppContext'
import { validateRow } from '../services/validationService'
import { saveObservations } from '../services/supabaseService'
import type { DailyObservation } from '../types/database'
import { getDateFeatures } from '../lib/utils'

type Step = 'upload' | 'preview' | 'map' | 'validate' | 'done'

const CLOUDY_TIPS: Record<string, string> = {
  upload: 'Upload een CSV of Excel-bestand. Zorg dat rij 1 kolomnamen bevat en je een datumkolom hebt (bijv. "Datum" of "Date"). Omzet, bezoekers en personeel zijn optioneel maar verbeteren je forecast.',
  preview: 'Ziet dit er goed uit? Controleer of de rijen kloppen en je de juiste kolommen ziet. Zijn er lege rijen of rare waarden? Dat los je op in de volgende stap.',
  map: 'Koppel elke kolom aan het juiste veld. Een datumkolom is verplicht. Ontbrekende kolommen kun je leeg laten — die data wordt dan niet geïmporteerd.',
  validate: 'Ik heb je data gecontroleerd. Ongeldige rijen (bijv. ontbrekende datum of tekst in een getallenveld) worden overgeslagen. Geldige rijen kun je gewoon importeren.',
  done: 'Super! Je data is geïmporteerd. Ga naar de Forecast-pagina om te zien wat ik ervan maak. Hoe meer historische data je hebt, hoe nauwkeuriger de prognose.',
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
        <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{CLOUDY_TIPS[step]}</p>
      </div>
    </div>
  )
}

export default function UploadPage() {
  const { selectedCompany, selectedLocation } = useApp()
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [filename, setFilename] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validResults, setValidResults] = useState<{ valid: number; invalid: number; errors: string[] }>({ valid: 0, invalid: 0, errors: [] })
  const [saving, setSaving] = useState(false)

  function handleFileLoaded(loadedRows: Record<string, string>[], name: string) {
    setRows(loadedRows)
    setFilename(name)
    const firstRow = loadedRows[0] ?? {}
    const autoMap: Record<string, string> = {}
    for (const col of Object.keys(firstRow)) {
      const lower = col.toLowerCase()
      if (lower.includes('datum') || lower === 'date') autoMap[col] = 'date'
      else if (lower.includes('omzet') || lower.includes('revenue') || lower.includes('opbrengst')) autoMap[col] = 'revenue'
      else if (lower.includes('bezoeker') || lower.includes('visitor')) autoMap[col] = 'visitors'
      else if (lower.includes('transact')) autoMap[col] = 'transactions'
      else if (lower.includes('personeel') || lower.includes('staff')) autoMap[col] = 'staff_scheduled'
    }
    setMapping(autoMap)
    setStep('preview')
  }

  function handleValidate() {
    let validCount = 0
    let invalidCount = 0
    const errorMessages: string[] = []
    for (let i = 0; i < rows.length; i++) {
      const result = validateRow(rows[i], mapping, i)
      if (result.valid) validCount++
      else {
        invalidCount++
        if (errorMessages.length < 10) {
          errorMessages.push(`Rij ${i + 1}: ${result.errors.join(', ')}`)
        }
      }
    }
    setValidResults({ valid: validCount, invalid: invalidCount, errors: errorMessages })
    setStep('validate')
  }

  async function handleImport() {
    if (!selectedCompany || !selectedLocation) {
      alert('Selecteer eerst een locatie via de zijbalk voordat je data importeert.')
      return
    }
    setSaving(true)
    const observations: DailyObservation[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const result = validateRow(row, mapping, i)
      if (!result.valid) continue

      const dateField = Object.entries(mapping).find(([, v]) => v === 'date')?.[0]
      const revenueField = Object.entries(mapping).find(([, v]) => v === 'revenue')?.[0]
      const visitorsField = Object.entries(mapping).find(([, v]) => v === 'visitors')?.[0]
      const transField = Object.entries(mapping).find(([, v]) => v === 'transactions')?.[0]
      const staffField = Object.entries(mapping).find(([, v]) => v === 'staff_scheduled')?.[0]

      const dateStr = dateField ? row[dateField] : ''
      const features = getDateFeatures(dateStr)

      observations.push({
        id: `import-${Date.now()}-${i}`,
        company_id: selectedCompany.id,
        location_id: selectedLocation.id,
        date: dateStr,
        revenue: revenueField ? Number(row[revenueField]) : undefined,
        visitors: visitorsField ? Number(row[visitorsField]) : undefined,
        transactions: transField ? Number(row[transField]) : undefined,
        staff_scheduled: staffField ? Number(row[staffField]) : undefined,
        ...features,
        is_holiday: false,
        is_school_holiday: false,
        is_public_holiday: false,
      })
    }

    await saveObservations(observations)
    setSaving(false)
    setStep('done')
  }

  const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Data uploaden</h1>
        <p className="text-slate-500 text-sm mt-1">
          Locatie: <strong>{selectedLocation?.name ?? '—'}</strong>
        </p>
      </div>

      {!selectedLocation && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(234,88,12,0.07)', border: '1px solid rgba(234,88,12,0.25)',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
          fontSize: '13px', color: '#c2410c',
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span>Geen locatie geselecteerd. Kies eerst een locatie via de zijbalk om data te kunnen importeren.</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(['upload', 'preview', 'map', 'validate', 'done'] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = { upload: '1. Bestand', preview: '2. Voorbeeld', map: '3. Koppelen', validate: '4. Validatie', done: '5. Klaar' }
          const isDone = (['upload', 'preview', 'map', 'validate', 'done'] as Step[]).indexOf(s) < (['upload', 'preview', 'map', 'validate', 'done'] as Step[]).indexOf(step)
          const isCurrent = s === step
          return (
            <React.Fragment key={s}>
              <span className={[
                'px-3 py-1 rounded-full font-medium text-xs',
                isCurrent ? 'bg-blue-600 text-white' : isDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
              ].join(' ')}>
                {labels[s]}
              </span>
              {i < 4 && <span className="text-slate-300">→</span>}
            </React.Fragment>
          )
        })}
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
            Bestand: <strong>{filename}</strong> — {rows.length} rijen gevonden
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-6">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {detectedColumns.map(col => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-slate-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {detectedColumns.map(col => (
                      <td key={col} className="px-3 py-2 text-slate-700">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('upload')}>Terug</Button>
            <Button onClick={() => setStep('map')}>Verder naar koppelen</Button>
          </div>
        </div>
      )}

      {step === 'map' && (
        <div>
          <CloudyTip step="map" />
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <ColumnMapper detectedColumns={detectedColumns} mapping={mapping} onChange={setMapping} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('preview')}>Terug</Button>
            <Button onClick={handleValidate}>Valideer data</Button>
          </div>
        </div>
      )}

      {step === 'validate' && (
        <div>
          <CloudyTip step="validate" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle size={18} />
                <span className="font-semibold">{validResults.valid} geldige rijen</span>
              </div>
            </div>
            <div className={`border rounded-xl p-4 ${validResults.invalid > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`flex items-center gap-2 ${validResults.invalid > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                <AlertCircle size={18} />
                <span className="font-semibold">{validResults.invalid} ongeldige rijen</span>
              </div>
            </div>
          </div>
          {validResults.errors.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-slate-700 mb-2">Fouten (eerste 10):</p>
              <ul className="text-xs text-red-600 space-y-1">
                {validResults.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('map')}>Terug</Button>
            <Button onClick={handleImport} disabled={saving || validResults.valid === 0}>
              {saving ? 'Importeren...' : `${validResults.valid} rijen importeren`}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div>
          <CloudyTip step="done" />
          <div className="text-center py-12">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Import geslaagd!</h2>
            <p className="text-slate-500 text-sm mb-6">
              {validResults.valid} observaties zijn succesvol geïmporteerd.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setStep('upload')}>Nog een bestand uploaden</Button>
              <Button onClick={() => window.location.href = '/data'}>Naar mijn data</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
