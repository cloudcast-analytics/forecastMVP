import { Trash2 } from 'lucide-react'
import type { DailyObservation } from '../../types/database'
import { formatEuro, formatDate } from '../../lib/utils'
import { DemandBadge } from '../ui/Badge'
import type { DemandLevel } from '../../types/forecast'

interface DataTableProps {
  observations: DailyObservation[]
  onDelete: (id: string) => void
}

function getDemandLevel(obs: DailyObservation): DemandLevel {
  const v = obs.visitors ?? 0
  if (v < 100) return 'Low'
  if (v < 250) return 'Normal'
  if (v < 500) return 'High'
  return 'Very High'
}

export default function DataTable({ observations, onDelete }: DataTableProps) {
  if (observations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Geen observaties gevonden.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Datum</th>
            <th className="px-4 py-3 font-medium text-slate-600">Omzet</th>
            <th className="px-4 py-3 font-medium text-slate-600">Bezoekers</th>
            <th className="px-4 py-3 font-medium text-slate-600">Personeel</th>
            <th className="px-4 py-3 font-medium text-slate-600">Drukte</th>
            <th className="px-4 py-3 font-medium text-slate-600"></th>
          </tr>
        </thead>
        <tbody>
          {observations.map((obs, i) => (
            <tr
              key={obs.id}
              className={['border-b border-slate-100 hover:bg-slate-50', i % 2 === 0 ? '' : 'bg-slate-50/50'].join(' ')}
            >
              <td className="px-4 py-2.5 font-medium text-slate-800">{formatDate(obs.date)}</td>
              <td className="px-4 py-2.5 text-slate-700">
                {obs.revenue !== undefined ? formatEuro(obs.revenue) : '—'}
              </td>
              <td className="px-4 py-2.5 text-slate-700">
                {obs.visitors !== undefined ? obs.visitors.toLocaleString('nl-BE') : '—'}
              </td>
              <td className="px-4 py-2.5 text-slate-700">
                {obs.staff_scheduled !== undefined ? obs.staff_scheduled : '—'}
              </td>
              <td className="px-4 py-2.5">
                <DemandBadge level={getDemandLevel(obs)} />
              </td>
              <td className="px-4 py-2.5">
                <button
                  onClick={() => onDelete(obs.id)}
                  className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Verwijderen"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
