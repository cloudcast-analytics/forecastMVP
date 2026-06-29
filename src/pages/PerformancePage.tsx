import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Euro, Users, CalendarDays, Award } from 'lucide-react'
import Layout from '../components/layout/Layout'
import { useApp } from '../context/AppContext'
import { getObservations } from '../services/supabaseService'
import type { DailyObservation } from '../types/database'
import { formatEuro } from '../lib/utils'

type Period = '7d' | '30d' | '90d' | 'year'
type View = 'omzet' | 'bezoekers'

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90, 'year': 365 }
const PERIOD_LABEL: Record<Period, string> = { '7d': 'Afgelopen 7 dagen', '30d': 'Afgelopen 30 dagen', '90d': 'Afgelopen kwartaal', 'year': 'Afgelopen jaar' }

function subDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() - n); return r
}
function fmt(d: Date): string { return d.toISOString().split('T')[0] }
function shortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
}

function filterByRange(obs: DailyObservation[], from: string, to: string) {
  return obs.filter(o => o.date >= from && o.date <= to && !o.deleted_at)
}

function calcKpis(obs: DailyObservation[]) {
  const withRev = obs.filter(o => o.revenue != null)
  if (!withRev.length) return null
  const totalRevenue = withRev.reduce((s, o) => s + (o.revenue ?? 0), 0)
  const avgRevenue = totalRevenue / withRev.length
  const best = withRev.reduce((a, b) => (b.revenue ?? 0) > (a.revenue ?? 0) ? b : a)
  const worst = withRev.reduce((a, b) => (b.revenue ?? 0) < (a.revenue ?? 0) ? b : a)
  const totalVisitors = obs.filter(o => o.visitors != null).reduce((s, o) => s + (o.visitors ?? 0), 0)
  return { totalRevenue, avgRevenue, best, worst, totalVisitors, days: withRev.length }
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: number
  icon: React.ReactNode
  color: string
}

function KpiCard({ label, value, sub, trend, icon, color }: KpiCardProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.4)',
      boxShadow: '0 4px 16px rgba(26,68,232,0.06)',
      borderRadius: '16px',
      padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9 }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: '26px', fontWeight: 700, color: '#1a1f36', lineHeight: 1.1, marginBottom: '4px' }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: '#6b7280' }}>{sub}</p>}
      {trend != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
          {trend >= 0
            ? <TrendingUp size={13} color="#16a34a" />
            : <TrendingDown size={13} color="#dc2626" />}
          <span style={{ fontSize: '12px', fontWeight: 500, color: trend >= 0 ? '#16a34a' : '#dc2626' }}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs. vorige periode
          </span>
        </div>
      )}
    </div>
  )
}

export default function PerformancePage() {
  const { selectedLocation } = useApp()
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [period, setPeriod] = useState<Period>('30d')
  const [view, setView] = useState<View>('omzet')
  const [compare, setCompare] = useState(false)

  useEffect(() => {
    if (!selectedLocation) return
    getObservations(selectedLocation.id).then(setObservations)
  }, [selectedLocation])

  const today = fmt(new Date())
  const days = PERIOD_DAYS[period]

  const currentFrom = fmt(subDays(new Date(), days))
  const prevFrom = fmt(subDays(new Date(), days * 2))
  const prevTo = fmt(subDays(new Date(), days + 1))

  const current = useMemo(() => filterByRange(observations, currentFrom, today), [observations, currentFrom, today])
  const previous = useMemo(() => filterByRange(observations, prevFrom, prevTo), [observations, prevFrom, prevTo])

  const kpis = useMemo(() => calcKpis(current), [current])
  const prevKpis = useMemo(() => calcKpis(previous), [previous])

  const trend = kpis && prevKpis && prevKpis.totalRevenue > 0
    ? ((kpis.totalRevenue - prevKpis.totalRevenue) / prevKpis.totalRevenue) * 100
    : undefined

  // Chart data
  const chartData = useMemo(() => {
    const sorted = [...current].sort((a, b) => a.date.localeCompare(b.date))
    return sorted.map(o => ({
      date: shortDate(o.date),
      dateRaw: o.date,
      omzet: o.revenue ?? 0,
      bezoekers: o.visitors ?? 0,
    }))
  }, [current])

  const compareData = useMemo(() => {
    if (!compare) return []
    const sorted = [...previous].sort((a, b) => a.date.localeCompare(b.date))
    return sorted.map(o => ({
      date: shortDate(o.date),
      omzetVorig: o.revenue ?? 0,
      bezoekersVorig: o.visitors ?? 0,
    }))
  }, [previous, compare])

  // Merge for compare chart
  const mergedData = useMemo(() => {
    if (!compare) return chartData
    const len = Math.max(chartData.length, compareData.length)
    return Array.from({ length: len }, (_, i) => ({
      ...chartData[i],
      ...compareData[i],
      label: `Dag ${i + 1}`,
    }))
  }, [chartData, compareData, compare])

  const weatherCorr = useMemo(() => {
    // Group by weather condition from observations
    const groups: Record<string, number[]> = {}
    current.forEach(o => {
      if (!o.revenue) return
      const key = o.is_school_holiday ? 'Schoolvakantie' : o.is_weekend ? 'Weekend' : 'Doordeweeks'
      if (!groups[key]) groups[key] = []
      groups[key].push(o.revenue)
    })
    return Object.entries(groups).map(([label, vals]) => ({
      label,
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    })).sort((a, b) => b.avg - a.avg)
  }, [current])

  const hasData = current.length > 0

  return (
    <Layout>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1f36', marginBottom: '4px' }}>Performance</h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>{PERIOD_LABEL[period]} · {selectedLocation?.name ?? '—'}</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '12px', padding: '4px' }}>
          {(['7d', '30d', '90d', 'year'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: period === p ? 600 : 400,
              background: period === p ? '#1a44e8' : 'transparent',
              color: period === p ? '#fff' : '#6b7280',
              transition: 'all 0.15s',
            }}>
              {p === 'year' ? '1 jaar' : p}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} style={{ accentColor: '#1a44e8' }} />
          Vergelijk met vorige periode
        </label>
      </div>

      {!hasData && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9ca3af', fontSize: '14px' }}>
          Geen data beschikbaar voor deze periode. Upload eerst historische data.
        </div>
      )}

      {hasData && kpis && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            <KpiCard
              label="Totale omzet"
              value={formatEuro(kpis.totalRevenue)}
              sub={`${kpis.days} dagen met data`}
              trend={trend}
              icon={<Euro size={16} color="#fff" />}
              color="rgba(26,68,232,0.8)"
            />
            <KpiCard
              label="Gem. dagomzet"
              value={formatEuro(kpis.avgRevenue)}
              sub="Per dag gemiddeld"
              icon={<TrendingUp size={16} color="#fff" />}
              color="rgba(99,60,220,0.7)"
            />
            <KpiCard
              label="Beste dag"
              value={formatEuro(kpis.best.revenue ?? 0)}
              sub={shortDate(kpis.best.date)}
              icon={<Award size={16} color="#fff" />}
              color="rgba(22,163,74,0.8)"
            />
            <KpiCard
              label="Totale bezoekers"
              value={kpis.totalVisitors.toLocaleString('nl-BE')}
              sub={`${Math.round(kpis.totalVisitors / kpis.days)} gem./dag`}
              icon={<Users size={16} color="#fff" />}
              color="rgba(234,88,12,0.8)"
            />
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
            {(['omzet', 'bezoekers'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(26,68,232,0.2)',
                cursor: 'pointer', fontSize: '13px', fontWeight: view === v ? 600 : 400,
                background: view === v ? 'rgba(26,68,232,0.08)' : 'transparent',
                color: view === v ? '#1a44e8' : '#6b7280',
              }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Main chart */}
          <div style={{
            background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.4)', borderRadius: '16px', padding: '20px 16px 12px', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1f36', marginBottom: '16px', paddingLeft: '4px' }}>
              {view === 'omzet' ? 'Omzet per dag' : 'Bezoekers per dag'}
              {compare && ' — huidig vs. vorige periode'}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={compare ? mergedData : chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey={compare ? 'label' : 'date'} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                  tickFormatter={v => view === 'omzet' ? `€${(v/1000).toFixed(0)}k` : String(v)} width={48} />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    view === 'omzet' ? formatEuro(val) : val,
                    name === 'omzet' ? 'Huidig' : name === 'omzetVorig' ? 'Vorig' : name === 'bezoekers' ? 'Huidig' : 'Vorig',
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}
                />
                {compare && <Legend wrapperStyle={{ fontSize: 12 }} />}
                <Line dataKey={view} stroke="#1a44e8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                {compare && <Line dataKey={view === 'omzet' ? 'omzetVorig' : 'bezoekersVorig'} stroke="#a5b4fc" strokeWidth={2} dot={false} strokeDasharray="4 2" />}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Weather correlation */}
          {weatherCorr.length > 1 && (
            <div style={{
              background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.4)', borderRadius: '16px', padding: '20px 16px 12px',
            }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1f36', marginBottom: '16px', paddingLeft: '4px' }}>
                Gemiddelde omzet per dagtype
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weatherCorr} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `€${(v/1000).toFixed(0)}k`} width={48} />
                  <Tooltip formatter={(v: number) => [formatEuro(v), 'Gem. omzet']} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                  <Bar dataKey="avg" fill="#1a44e8" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
