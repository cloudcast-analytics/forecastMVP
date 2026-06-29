import {
  ComposedChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ForecastDay } from '../../types/forecast'
import { formatEuro } from '../../lib/utils'

interface ForecastChartProps {
  forecast: ForecastDay[]
}

export default function ForecastChart({ forecast }: ForecastChartProps) {
  const revenueData = forecast.map(f => ({
    date: f.forecast_date.slice(5),
    revenue: f.predicted_revenue,
    low: f.confidence_low,
    high: f.confidence_high,
  }))

  const staffData = forecast.map(f => ({
    date: f.forecast_date.slice(5),
    staff: f.recommended_staff,
  }))

  return (
    <div className="space-y-4">
      {/* Revenue + confidence band */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Verwachte omzet met betrouwbaarheidsband</h3>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => `€${(Number(v) / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(v, name) => {
                const num = Number(v)
                if (name === 'revenue') return [formatEuro(num), 'Verwacht']
                if (name === 'high') return [formatEuro(num), 'Max']
                if (name === 'low') return [formatEuro(num), 'Min']
                return [v, String(name)]
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Area
              type="monotone"
              dataKey="high"
              stroke="#93c5fd"
              strokeWidth={1}
              strokeDasharray="4 2"
              fill="#dbeafe"
              fillOpacity={0.5}
              name="high"
            />
            <Area
              type="monotone"
              dataKey="low"
              stroke="#93c5fd"
              strokeWidth={1}
              strokeDasharray="4 2"
              fill="#fff"
              fillOpacity={1}
              name="low"
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name="revenue"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Staff chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Aanbevolen personeel per dag</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={staffData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip
              formatter={(v) => [Number(v), 'Personeel']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="staff" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
