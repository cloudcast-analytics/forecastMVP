import type { ForecastDay } from '../../types/forecast'
import { formatEuro, formatDate } from '../../lib/utils'
import DemandBadge from './DemandBadge'

interface ForecastTableProps {
  forecast: ForecastDay[]
}

export default function ForecastTable({ forecast }: ForecastTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Datum</th>
            <th className="px-4 py-3 font-medium text-slate-600">Verwachte omzet</th>
            <th className="px-4 py-3 font-medium text-slate-600">Bezoekers</th>
            <th className="px-4 py-3 font-medium text-slate-600">Betrouwbaarheid</th>
            <th className="px-4 py-3 font-medium text-slate-600">Drukteniveau</th>
            <th className="px-4 py-3 font-medium text-slate-600">Personeel</th>
            <th className="px-4 py-3 font-medium text-slate-600">Reden</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((f, i) => (
            <tr key={f.forecast_date} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
              <td className="px-4 py-2.5 font-medium text-slate-800">{formatDate(f.forecast_date)}</td>
              <td className="px-4 py-2.5 text-slate-700">{formatEuro(f.predicted_revenue)}</td>
              <td className="px-4 py-2.5 text-slate-700">{f.predicted_visitors.toLocaleString('nl-BE')}</td>
              <td className="px-4 py-2.5 text-slate-500 text-xs">
                {formatEuro(f.confidence_low)} – {formatEuro(f.confidence_high)}
              </td>
              <td className="px-4 py-2.5">
                <DemandBadge level={f.demand_level} />
              </td>
              <td className="px-4 py-2.5 font-medium text-slate-700">{f.recommended_staff}</td>
              <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[180px] truncate">{f.key_reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
