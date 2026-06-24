import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { parseCSV } from '../../services/dataImportService'

interface FileUploadProps {
  onFileLoaded: (rows: Record<string, string>[], filename: string) => void
}

export default function FileUpload({ onFileLoaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function processFile(file: File) {
    setError(null)
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result as string
        try {
          const rows = parseCSV(text)
          if (rows.length === 0) {
            setError('Bestand is leeg of kon niet worden geparsed.')
            return
          }
          onFileLoaded(rows, file.name)
        } catch {
          setError('Fout bij het lezen van het CSV-bestand.')
        }
      }
      reader.readAsText(file, 'utf-8')
    } else if (ext === 'xlsx') {
      // Dynamic import for xlsx
      import('xlsx').then(XLSX => {
        const reader = new FileReader()
        reader.onload = e => {
          const data = e.target?.result
          const wb = XLSX.read(data, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
          if (json.length === 0) {
            setError('Bestand is leeg of kon niet worden geparsed.')
            return
          }
          // Convert all values to strings
          const rows = json.map(row => {
            const r: Record<string, string> = {}
            for (const key of Object.keys(row)) {
              r[key] = String(row[key])
            }
            return r
          })
          onFileLoaded(rows, file.name)
        }
        reader.readAsBinaryString(file)
      })
    } else {
      setError('Alleen CSV- en XLSX-bestanden zijn toegestaan.')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={[
        'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
        dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={onInputChange}
      />
      <Upload size={32} className="mx-auto mb-3 text-slate-400" />
      <p className="text-slate-700 font-medium">Sleep een bestand hierheen of klik om te uploaden</p>
      <p className="text-slate-400 text-sm mt-1">Ondersteunde formaten: CSV, XLSX</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
