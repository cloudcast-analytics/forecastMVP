import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyObservation } from '../../types/database'
import { formatEuro } from '../../lib/utils'

interface RevenueChartProps {
  observations: DailyObservation[]
}

export default function RevenueChart({ observations }: RevenueChartProps) {
  const last90 = [...observations]
    .filter(o => !o.deleted_at && o.revenue !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90)
    .map(o => ({
      date: o.date.slice(5), // MM-DD
      revenue: o.revenue ?? 0,
    }))

  const formatYAxis = (v: number) => `€${(v / 1000).toFixed(0)}k`

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Omzet — afgelopen 90 dagen</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={last90} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            interval={13}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            formatter={(v) => [formatEuro(Number(v)), 'Omzet']}
            labelStyle={{ fontSize: 12, color: '#475569' }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
