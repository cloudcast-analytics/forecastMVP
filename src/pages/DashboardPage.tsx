import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Upload, BarChart2, Package, ChevronRight,
  Users, AlertTriangle, Sun, Cloud, CloudRain, Thermometer, Wind, PiggyBank, ShoppingCart,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import { useApp } from '../context/AppContext'
import { getDepartmentStaffingRules, getObservations } from '../services/supabaseService'
import { generateForecast } from '../services/forecastService'
import { computeStaffing, getDemandLevel, maxStaffing } from '../services/staffingService'
import { getLocationSettings } from '../services/settingsService'
import { getMockWeather } from '../services/weatherService'
import type { DailyObservation } from '../types/database'
import type { DepartmentStaffingRule } from '../types/staffing'
import type { ForecastDay } from '../types/forecast'
import { formatEuro } from '../lib/utils'

const HOURLY_PATTERN = [
  { hour: 10, pct: 0.04 }, { hour: 11, pct: 0.07 }, { hour: 12, pct: 0.13 },
  { hour: 13, pct: 0.15 }, { hour: 14, pct: 0.10 }, { hour: 15, pct: 0.09 },
  { hour: 16, pct: 0.11 }, { hour: 17, pct: 0.10 }, { hour: 18, pct: 0.09 },
  { hour: 19, pct: 0.07 }, { hour: 20, pct: 0.04 }, { hour: 21, pct: 0.02 },
]
const TOTAL_PCT = HOURLY_PATTERN.reduce((sum, slot) => sum + slot.pct, 0)

const NL_DAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const NL_DAYS_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const NL_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']

const CARD_STYLE: CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.5)',
  borderRadius: '16px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
}

function busyStyle(visitors: number, peak: number) {
  const ratio = visitors / peak
  if (ratio < 0.4) return { label: 'Rustig', bar: '#86efac' }
  if (ratio < 0.7) return { label: 'Normaal', bar: '#fcd34d' }
  return { label: 'Druk', bar: '#f87171' }
}

function nextOrderMoment(from: Date): { date: Date; label: string } {
  for (let i = 0; i <= 7; i++) {
    const date = new Date(from)
    date.setDate(date.getDate() + i)
    if (date.getDay() === 0 || date.getDay() === 3) {
      if (i === 0 && from.getHours() >= 20) continue
      return {
        date,
        label: i === 0 ? 'vanavond' : `${NL_DAYS[date.getDay()].toLowerCase()} ${date.getDate()} ${NL_MONTHS[date.getMonth()]}`,
      }
    }
  }
  return { date: from, label: 'vandaag' }
}

function getTodayEstimate(observations: DailyObservation[], rules: DepartmentStaffingRule[]) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const month = today.getMonth() + 1
  const sameDay = observations.filter(o => o.day_of_week === dayOfWeek)
  const avgRevenue = sameDay.length > 0 ? sameDay.reduce((sum, obs) => sum + (obs.revenue ?? 0), 0) / sameDay.length : 1500
  const avgVisitors = sameDay.length > 0 ? sameDay.reduce((sum, obs) => sum + (obs.visitors ?? 0), 0) / sameDay.length : 120
  const multiplier = (month >= 6 && month <= 8 ? 1.1 : 1.0) * ((dayOfWeek === 0 || dayOfWeek === 6) ? 1.1 : 1.0)
  const predictedRevenue = Math.round(avgRevenue * multiplier)
  const predictedVisitors = Math.round(avgVisitors * multiplier)
  const overallAvg = observations.reduce((sum, obs) => sum + (obs.revenue ?? 0), 0) / Math.max(observations.length, 1)
  const demand = getDemandLevel(predictedRevenue, overallAvg)
  const advice = computeStaffing(rules, demand)
  return { predictedRevenue, predictedVisitors, demand, advice }
}

function WeatherIcon({ condition, size = 20 }: { condition: string; size?: number }) {
  if (condition === 'Regen') return <CloudRain size={size} color="#60a5fa" />
  if (condition === 'Zonnig') return <Sun size={size} color="#fbbf24" />
  return <Cloud size={size} color="#9ca3af" />
}

export default function DashboardPage() {
  const { selectedLocation } = useApp()
  const navigate = useNavigate()
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [rules, setRules] = useState<DepartmentStaffingRule[]>([])
  const [weekForecast, setWeekForecast] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    Promise.all([
      getObservations(selectedLocation.id),
      getDepartmentStaffingRules(selectedLocation.id),
    ]).then(([obs, deptRules]) => {
      setObservations(obs.filter(o => !o.deleted_at))
      setRules(deptRules)
      setLoading(false)
    })
  }, [selectedLocation])

  useEffect(() => {
    if (observations.length === 0) {
      setWeekForecast([])
      return
    }
    generateForecast(observations, 7, rules, selectedLocation?.id ?? 'x', selectedLocation?.city ?? 'Genk')
      .then(setWeekForecast)
      .catch(() => setWeekForecast([]))
  }, [observations, rules, selectedLocation])

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const todayWeather = useMemo(() => getMockWeather(selectedLocation?.id ?? 'x', [today])[0], [selectedLocation, today])
  const todayEst = useMemo(() => getTodayEstimate(observations, rules), [observations, rules])
  const settings = useMemo(() => getLocationSettings(selectedLocation?.id ?? 'default'), [selectedLocation])

  const savedStaff = Math.max(0, maxStaffing(rules) - todayEst.advice.total)
  const savedEuro = Math.round(savedStaff * settings.hourly_wage * settings.shift_hours)
  const order = nextOrderMoment(now)

  const hourlyData = useMemo(() => {
    const peak = Math.max(...HOURLY_PATTERN.map(slot => slot.pct))
    return HOURLY_PATTERN.map(slot => ({
      ...slot,
      visitors: Math.round(todayEst.predictedVisitors * (slot.pct / TOTAL_PCT)),
      peakVisitors: Math.round(todayEst.predictedVisitors * (peak / TOTAL_PCT)),
      staff: Math.max(1, Math.round((slot.pct / peak) * todayEst.advice.total)),
    }))
  }, [todayEst])

  const lowStockAlerts = useMemo(() => {
    try {
      const raw = localStorage.getItem(`cloudcast_voorraad_${selectedLocation?.id ?? 'default'}`)
      const items: { name: string; current_stock: number; min_stock: number }[] = raw ? JSON.parse(raw) : []
      return items.filter(item => item.current_stock <= item.min_stock)
    } catch {
      return []
    }
  }, [selectedLocation])

  const currentHour = now.getHours()
  const dateLabel = `${NL_DAYS[now.getDay()]} ${now.getDate()} ${NL_MONTHS[now.getMonth()]}`

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goedemorgen</h1>
          <p className="text-slate-500 text-sm mt-1">{dateLabel} — {selectedLocation?.name ?? 'jouw locatie'}</p>
        </div>
        {todayWeather && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '14px',
            padding: '10px 16px',
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
          {lowStockAlerts.length > 0 && (
            <button onClick={() => navigate('/voorraad')} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              textAlign: 'left',
              background: 'rgba(234,88,12,0.06)',
              border: '1px solid rgba(234,88,12,0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              cursor: 'pointer',
            }}>
              <AlertTriangle size={16} color="#ea580c" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: '#c2410c', flex: 1 }}>
                <strong>{lowStockAlerts.length} product{lowStockAlerts.length > 1 ? 'en' : ''} onder minimumvoorraad:</strong>{' '}
                {lowStockAlerts.map(item => item.name).join(', ')}
              </p>
              <ChevronRight size={14} color="#ea580c" />
            </button>
          )}

          <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Vandaag verwacht
          </p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Verwachte omzet', value: formatEuro(todayEst.predictedRevenue), icon: TrendingUp, color: '#059669', bg: 'rgba(5,150,105,0.07)' },
              { label: 'Bezoekers', value: todayEst.predictedVisitors.toString(), icon: Users, color: '#1a44e8', bg: 'rgba(26,68,232,0.07)' },
              { label: 'Besparing t.o.v. vaste planning', value: savedStaff > 0 ? formatEuro(savedEuro) : '—', icon: PiggyBank, color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} style={{ ...CARD_STYLE, padding: '18px 20px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Icon size={18} color={color} />
                </div>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a1f36' }}>{value}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ ...CARD_STYLE, padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Inplannen vandaag</p>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>totaal <strong style={{ color: '#1a1f36' }}>{todayEst.advice.total}</strong> personen</span>
            </div>
            {rules.length === 0 ? (
              <button onClick={() => navigate('/staffing')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1a44e8', padding: 0 }}>
                Stel eerst personeelsregels per afdeling in ?
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {todayEst.advice.per_department.map(dep => {
                  const base = rules.find(rule => rule.department_id === dep.department_id)?.base_staff ?? dep.staff
                  const delta = dep.staff - base
                  return (
                    <div key={dep.department_id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{dep.department_name}</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: '#1a1f36' }}>
                        {dep.staff} <span style={{ fontSize: '12px', fontWeight: 500, color: '#9ca3af' }}>pers.</span>
                      </p>
                      {delta > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c', background: 'rgba(234,88,12,0.08)', padding: '2px 8px', borderRadius: '99px' }}>
                          +{delta} wegens {dep.reason === 'evenement' ? 'evenement' : 'drukte'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ ...CARD_STYLE, padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5,150,105,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingCart size={18} color="#059669" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Volgend bestelmoment: {order.label}</p>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>Bekijk je voorraad en bereid de brouwerijbestelling voor.</p>
            </div>
            <button onClick={() => navigate('/voorraad')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {weekForecast.length > 0 && (
            <div style={{ ...CARD_STYLE, padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Komende 7 dagen</p>
                <button onClick={() => navigate('/forecast')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#1a44e8' }}>
                  Volledige forecast ?
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekForecast.length}, 1fr)`, gap: '8px' }}>
                {weekForecast.map(day => {
                  const date = new Date(day.forecast_date)
                  return (
                    <div key={day.forecast_date} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: '10px', background: '#f8fafc' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{NL_DAYS_SHORT[date.getDay()]} {date.getDate()}</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#1a1f36', margin: '6px 0 2px' }}>{formatEuro(day.predicted_revenue)}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af' }}>{day.recommended_staff} pers.</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ ...CARD_STYLE, padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Dagplanning vandaag</p>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Live — {now.getHours()}:{now.getMinutes().toString().padStart(2, '0')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {hourlyData.map(({ hour, visitors, peakVisitors, staff }) => {
                const busy = busyStyle(visitors, peakVisitors)
                const isPast = hour < currentHour
                const isCurrent = hour === currentHour
                const pct = Math.round((visitors / peakVisitors) * 100)
                return (
                  <div key={hour} style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr 70px auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: isCurrent ? 'rgba(26,68,232,0.05)' : 'transparent',
                    border: isCurrent ? '1px solid rgba(26,68,232,0.12)' : '1px solid transparent',
                    opacity: isPast ? 0.45 : 1,
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#1a44e8' : '#6b7280' }}>
                      {hour}:00{isCurrent ? ' ?' : ''}
                    </span>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: busy.bar, borderRadius: '99px', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{busy.label}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right', whiteSpace: 'nowrap' }}>{staff} pers.</span>
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Snelle acties
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: 'Forecast bekijken', sub: '14-daagse voorspelling', path: '/forecast', color: '#1a44e8', bg: 'rgba(26,68,232,0.07)' },
              { icon: Upload, label: 'Data uploaden', sub: 'Historische data importeren', path: '/data/upload', color: '#0891b2', bg: 'rgba(8,145,178,0.07)' },
              { icon: BarChart2, label: 'Performance', sub: 'Omzet & bezoekersanalyse', path: '/performance', color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
              { icon: Package, label: 'Voorraad', sub: 'Stockbeheer & bestellingen', path: '/voorraad', color: '#059669', bg: 'rgba(5,150,105,0.07)' },
            ].map(({ icon: Icon, label, sub, path, color, bg }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '20px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  const button = e.currentTarget
                  button.style.transform = 'translateY(-2px)'
                  button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'
                }}
                onMouseLeave={e => {
                  const button = e.currentTarget
                  button.style.transform = 'translateY(0)'
                  button.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'
                }}
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


