
const STANDARD_FIELDS = [
  { value: '', label: '— Niet importeren —' },
  { value: 'date', label: 'Datum' },
  { value: 'revenue', label: 'Omzet (€)' },
  { value: 'visitors', label: 'Bezoekers' },
  { value: 'transactions', label: 'Transacties' },
  { value: 'staff_scheduled', label: 'Personeel ingepland' },
  { value: 'staff_needed', label: 'Personeel nodig' },
  { value: 'occupancy_rate', label: 'Bezettingsgraad (%)' },
  { value: 'notes', label: 'Notities' },
]

interface ColumnMapperProps {
  detectedColumns: string[]
  mapping: Record<string, string>
  onChange: (mapping: Record<string, string>) => void
}

export default function ColumnMapper({ detectedColumns, mapping, onChange }: ColumnMapperProps) {
  function setField(col: string, val: string) {
    onChange({ ...mapping, [col]: val })
  }

  return (
    <div>
      <p className="text-sm text-slate-600 mb-4">
        Koppel de kolommen uit jouw bestand aan de standaardvelden van CloudCast.
      </p>
      <div className="space-y-2">
        {detectedColumns.map(col => (
          <div key={col} className="flex items-center gap-4">
            <span className="w-40 text-sm text-slate-700 font-mono truncate">{col}</span>
            <select
              value={mapping[col] ?? ''}
              onChange={e => setField(col, e.target.value)}
              className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STANDARD_FIELDS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
