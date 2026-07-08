import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Upload, BarChart2, Package, ChevronRight,
  Users, AlertTriangle, Sun, Cloud, CloudRain, Thermometer, Wind,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import { useApp } from '../context/AppContext'
import { getObservations, getStaffingRules } from '../services/supabaseService'
import { generateForecast } from '../services/forecastService'
import { getMockWeather } from '../services/weatherService'
import type { DailyObservation, StaffingRule } from '../types/database'
import type { ForecastDay } from '../types/forecast'
import { formatEuro } from '../lib/utils'

// Typisch dagpatroon voor outdoor waterfront (% van dagelijkse bezoekers per uur)
const HOURLY_PATTERN = [
  { hour: 10, pct: 0.04, zones: ['Terras'] },
  { hour: 11, pct: 0.07, zones: ['Terras'] },
  { hour: 12, pct: 0.13, zones: ['Keuken', 'Terras'] },
  { hour: 13, pct: 0.15, zones: ['Keuken', 'Terras'] },
  { hour: 14, pct: 0.10, zones: ['Terras', 'Cocktailbar'] },
  { hour: 15, pct: 0.09, zones: ['Terras', 'Cocktailbar'] },
  { hour: 16, pct: 0.11, zones: ['Cocktailbar'] },
  { hour: 17, pct: 0.10, zones: ['Cocktailbar'] },
  { hour: 18, pct: 0.09, zones: ['Keuken', 'Terras'] },
  { hour: 19, pct: 0.07, zones: ['Keuken', 'Terras'] },
  { hour: 20, pct: 0.04, zones: ['Bar'] },
  { hour: 21, pct: 0.02, zones: ['Bar'] },
]
const TOTAL_PCT = HOURLY_PATTERN.reduce((s, h) => s + h.pct, 0)

const ZONE_STYLE: Record<string, { bg: string; color: string }> = {
  Cocktailbar: { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
  Terras:      { bg: 'rgba(5,150,105,0.12)',  color: '#059669' },
  Keuken:      { bg: 'rgba(234,88,12,0.12)',  color: '#ea580c' },
  Bar:         { bg: 'rgba(8,145,178,0.12)',  color: '#0891b2' },
}

function busyStyle(visitors: number, peak: number) {
  const r = visitors / peak
  if (r < 0.4) return { label: 'Rustig',  bar: '#86efac', text: '#166534' }
  if (r < 0.7) return { label: 'Normaal', bar: '#fcd34d', text: '#92400e' }
  return             { label: 'Druk',    bar: '#f87171', text: '#991b1b' }
}

function getTodayEstimate(observations: DailyObservation[], rules: StaffingRule[]) {
  const today = new Date()
  const dow = today.getDay()
  const month = today.getMonth() + 1
  const sameDow = observations.filter(o => o.day_of_week === dow)
  const avgRevenue  = sameDow.length > 0 ? sameDow.reduce((s, o) => s + (o.revenue  ?? 0), 0) / sameDow.length : 3000
  const avgVisitors = sameDow.length > 0 ? sameDow.reduce((s, o) => s + (o.visitors ?? 0), 0) / sameDow.length : 150
  const isSummer = month >= 6 && month <= 8
  const isWinter = month <= 2 || month === 12
  const mult = (isSummer ? 1.1 : isWinter ? 0.85 : 1.0) * ((dow === 0 || dow === 6) ? 1.1 : 1.0)
  const predictedVisitors = Math.round(avgVisitors * mult)
  const predictedRevenue  = Math.round(avgRevenue  * mult)
  let recommendedStaff = predictedVisitors > 500 ? 20 : predictedVisitors > 250 ? 14 : predictedVisitors > 100 ? 9 : 6
  if (rules.length > 0) {
    const sorted = [...rules].sort((a, b) => a.min_visitors - b.min_visitors)
    for (const rule of sorted) {
      const withinMax = rule.max_visitors === undefined || predictedVisitors <= rule.max_visitors
      if (predictedVisitors >= rule.min_visitors && withinMax) { recommendedStaff = rule.recommended_staff; break }
    }
  }
  return { predictedVisitors, predictedRevenue, recommendedStaff }
}

const NL_DAYS = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag']
const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']

function WeatherIcon({ condition, size = 20 }: { condition: string; size?: number }) {
  if (condition === 'Regen') return <CloudRain size={size} color="#60a5fa" />
  if (condition === 'Zonnig') return <Sun size={size} color="#fbbf24" />
  return <Cloud size={size} color="#9ca3af" />
}

export default function DashboardPage() {
  const { selectedLocation } = useApp()
  const navigate = useNavigate()
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [rules, setRules] = useState<StaffingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    Promise.all([
      getObservations(selectedLocation.id),
      getStaffingRules(selectedLocation.id),
    ]).then(([obs, r]) => {
      setObservations(obs.filter(o => !o.deleted_at))
      setRules(r)
      setLoading(false)
    })
  }, [selectedLocation])

  const today = useMemo(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }, [])

  const tomorrow = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }, [])

  const todayWeather  = useMemo(() => getMockWeather(selectedLocation?.id ?? 'x', [today])[0],  [today, selectedLocation])
  const tomorrowWeather = useMemo(() => getMockWeather(selectedLocation?.id ?? 'x', [tomorrow])[0], [tomorrow, selectedLocation])

  const todayEst = useMemo(() => getTodayEstimate(observations, rules), [observations, rules])

  const [tomorrowForecast, setTomorrowForecast] = useState<ForecastDay | null>(null)
  useEffect(() => {
    if (observations.length === 0) { setTomorrowForecast(null); return }
    generateForecast(observations, 1, rules, selectedLocation?.id ?? 'x', selectedLocation?.city ?? 'Genk')
      .then(results => setTomorrowForecast(results[0] ?? null))
      .catch(() => setTomorrowForecast(null))
  }, [observations, rules, selectedLocation])

  const hourlyData = useMemo(() => {
    const peak = Math.max(...HOURLY_PATTERN.map(h => h.pct))
    return HOURLY_PATTERN.map(h => ({
      ...h,
      visitors: Math.round(todayEst.predictedVisitors * (h.pct / TOTAL_PCT)),
      peakVisitors: Math.round(todayEst.predictedVisitors * (peak / TOTAL_PCT)),
      staff: Math.max(1, Math.round((h.pct / TOTAL_PCT) * todayEst.recommendedStaff * 2)),
    }))
  }, [todayEst])

  // Low stock alerts from localStorage
  const lowStockAlerts = useMemo(() => {
    try {
      const raw = localStorage.getItem(`cloudcast_voorraad_${selectedLocation?.id ?? 'default'}`)
      const items: { name: string; current_stock: number; min_stock: number }[] = raw ? JSON.parse(raw) : []
      return items.filter(i => i.current_stock <= i.min_stock)
    } catch { return [] }
  }, [selectedLocation, now])

  const currentHour = now.getHours()
  const dateLabel = `${NL_DAYS[now.getDay()]} ${now.getDate()} ${NL_MONTHS[now.getMonth()]}`

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goedemorgen 👋</h1>
          <p className="text-slate-500 text-sm mt-1">{dateLabel} — {selectedLocation?.name ?? 'jouw locatie'}</p>
        </div>
        {todayWeather && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.4)', borderRadius: '14px', padding: '10px 16px',
          }}>
            <WeatherIcon condition={todayWeather.weather_condition} size={22} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>{todayWeather.weather_condition}</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                <Thermometer size={11} style={{ display: 'inline', marginRight: 2 }} />
                {todayWeather.temperature_max}°C &nbsp;
                <Wind size={11} style={{ display: 'inline', marginRight: 2 }} />
                {todayWeather.wind_speed} km/u
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Data laden...</p>
      ) : (
        <>
          {/* Low stock alert */}
          {lowStockAlerts.length > 0 && (
            <button
              onClick={() => navigate('/voorraad')}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
                background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', cursor: 'pointer',
              }}
            >
              <AlertTriangle size={16} color="#ea580c" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: '#c2410c', flex: 1 }}>
                <strong>{lowStockAlerts.length} product{lowStockAlerts.length > 1 ? 'en' : ''} onder minimumvoorraad:</strong>{' '}
                {lowStockAlerts.map(i => i.name).join(', ')}
              </p>
              <ChevronRight size={14} color="#ea580c" />
            </button>
          )}

          {/* Vandaag — 3 KPI's */}
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Vandaag verwacht
          </p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Bezoekers', value: todayEst.predictedVisitors.toString(), icon: Users, color: '#1a44e8', bg: 'rgba(26,68,232,0.07)' },
              { label: 'Omzet', value: formatEuro(todayEst.predictedRevenue), icon: TrendingUp, color: '#059669', bg: 'rgba(5,150,105,0.07)' },
              { label: 'Personeel', value: `${todayEst.recommendedStaff} FTE`, icon: Users, color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px',
                padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Icon size={18} color={color} />
                </div>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a1f36' }}>{value}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Dagplanning */}
          <div style={{
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px',
            padding: '20px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Dagplanning vandaag</p>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Live — {now.getHours()}:{now.getMinutes().toString().padStart(2,'0')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {hourlyData.map(({ hour, visitors, peakVisitors, zones, staff }) => {
                const busy = busyStyle(visitors, peakVisitors)
                const isPast    = hour < currentHour
                const isCurrent = hour === currentHour
                const pct = Math.round((visitors / peakVisitors) * 100)
                return (
                  <div key={hour} style={{
                    display: 'grid', gridTemplateColumns: '44px 1fr 80px auto',
                    alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '10px',
                    background: isCurrent ? 'rgba(26,68,232,0.05)' : 'transparent',
                    border: isCurrent ? '1px solid rgba(26,68,232,0.12)' : '1px solid transparent',
                    opacity: isPast ? 0.45 : 1,
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#1a44e8' : '#6b7280' }}>
                      {hour}:00{isCurrent ? ' ▶' : ''}
                    </span>
                    {/* Bar */}
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: busy.bar, borderRadius: '99px', transition: 'width 0.3s' }} />
                    </div>
                    {/* Zones */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {zones.map(z => (
                        <span key={z} style={{
                          fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '99px',
                          background: ZONE_STYLE[z]?.bg ?? '#f1f5f9',
                          color: ZONE_STYLE[z]?.color ?? '#6b7280',
                        }}>{z}</span>
                      ))}
                    </div>
                    {/* Staff */}
                    <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {staff} FTE
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Morgen preview */}
          {tomorrowForecast && (
            <div style={{
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.4)', borderRadius: '16px',
              padding: '16px 20px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '16px',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Morgen</p>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#1a1f36' }}>{tomorrowForecast.predicted_visitors}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af' }}>bezoekers</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#1a1f36' }}>{formatEuro(tomorrowForecast.predicted_revenue)}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af' }}>omzet</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#1a1f36' }}>{tomorrowForecast.recommended_staff} FTE</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af' }}>personeel</p>
                  </div>
                </div>
              </div>
              {tomorrowWeather && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WeatherIcon condition={tomorrowWeather.weather_condition} size={18} />
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{tomorrowWeather.temperature_max}°C</span>
                </div>
              )}
              <button onClick={() => navigate('/forecast')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Snelle acties */}
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Snelle acties
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: 'Forecast bekijken', sub: '14-daagse voorspelling', path: '/forecast', color: '#1a44e8', bg: 'rgba(26,68,232,0.07)' },
              { icon: Upload,     label: 'Data uploaden',     sub: 'Historische data importeren', path: '/data/upload', color: '#0891b2', bg: 'rgba(8,145,178,0.07)' },
              { icon: BarChart2,  label: 'Performance',       sub: 'Omzet & bezoekersanalyse', path: '/performance', color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
              { icon: Package,    label: 'Voorraad',           sub: 'Stockbeheer & bestellingen', path: '/voorraad', color: '#059669', bg: 'rgba(5,150,105,0.07)' },
            ].map(({ icon: Icon, label, sub, path, color, bg }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  gap: '12px', padding: '20px', borderRadius: '16px',
                  background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.transform = 'translateY(0)'; b.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)' }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} color={color} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36', marginBottom: '2px' }}>{label}</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>{sub}</p>
                </div>
                <ChevronRight size={16} color="#d1d5db" style={{ alignSelf: 'flex-end' }} />
              </button>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
