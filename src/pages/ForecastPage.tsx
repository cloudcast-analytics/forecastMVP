import { useEffect, useState, useMemo } from 'react'
import { Info, Lightbulb, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import ForecastChart from '../components/forecast/ForecastChart'
import ForecastTable from '../components/forecast/ForecastTable'
import { useApp } from '../context/AppContext'
import { getObservations, getStaffingRules } from '../services/supabaseService'
import { generateForecast } from '../services/forecastService'
import type { ForecastDay } from '../types/forecast'
import type { DailyObservation, StaffingRule } from '../types/database'

type Horizon = 7 | 14

const DAY_NL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const DAY_NL_FULL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${DAY_NL_FULL[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('nl-BE', { month: 'long' })}`
}

function generateAdvice(forecast: ForecastDay[]): Array<{ icon: React.ReactNode; color: string; title: string; text: string }> {
  if (!forecast.length) return []
  const sorted = [...forecast].sort((a, b) => b.predicted_visitors - a.predicted_visitors)
  const busiest = sorted[0]
  const quietest = sorted[sorted.length - 1]
  const weekendDays = forecast.filter(d => { const day = new Date(d.forecast_date).getDay(); return day === 0 || day === 6 })
  const weekDays = forecast.filter(d => { const day = new Date(d.forecast_date).getDay(); return day > 0 && day < 6 })
  const avgWeekend = weekendDays.length ? weekendDays.reduce((s, d) => s + d.predicted_visitors, 0) / weekendDays.length : 0
  const avgWeekday = weekDays.length ? weekDays.reduce((s, d) => s + d.predicted_visitors, 0) / weekDays.length : 0
  const highDemandDays = forecast.filter(d => d.demand_level === 'High' || d.demand_level === 'Very High')

  const advice = []

  advice.push({
    icon: <Users size={15} color="#fff" />,
    color: 'rgba(26,68,232,0.85)',
    title: `Drukste dag: ${formatDate(busiest.forecast_date)}`,
    text: `Verwacht ${busiest.predicted_visitors.toLocaleString('nl-BE')} bezoekers. Plan ${busiest.recommended_staff} medewerkers in voor optimale bezetting.`,
  })

  if (highDemandDays.length > 0) {
    advice.push({
      icon: <AlertTriangle size={15} color="#fff" />,
      color: 'rgba(234,88,12,0.85)',
      title: `${highDemandDays.length} dag${highDemandDays.length > 1 ? 'en' : ''} met hoge drukte`,
      text: `${highDemandDays.map(d => DAY_NL[new Date(d.forecast_date).getDay()]).join(', ')} verwacht meer dan normaal. Zorg voor voldoende reservecapaciteit.`,
    })
  }

  if (avgWeekend > avgWeekday * 1.2 && weekendDays.length > 0) {
    advice.push({
      icon: <TrendingUp size={15} color="#fff" />,
      color: 'rgba(22,163,74,0.85)',
      title: 'Weekend fors drukker dan doordeweeks',
      text: `Gemiddeld ${Math.round(avgWeekend)} vs. ${Math.round(avgWeekday)} bezoekers. Overweeg weekend-specifieke roosters.`,
    })
  }

  if (quietest && quietest.predicted_visitors < busiest.predicted_visitors * 0.5) {
    advice.push({
      icon: <Lightbulb size={15} color="#fff" />,
      color: 'rgba(99,60,220,0.8)',
      title: `Rustige dag: ${formatDate(quietest.forecast_date)}`,
      text: `Slechts ${quietest.predicted_visitors.toLocaleString('nl-BE')} bezoekers verwacht. Ideaal voor training, schoonmaak of onderhoud.`,
    })
  }

  return advice.slice(0, 3)
}

export default function ForecastPage() {
  const { selectedLocation } = useApp()
  const [horizon, setHorizon] = useState<Horizon>(7)
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(false)
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [staffingRules, setStaffingRules] = useState<StaffingRule[]>([])
  const [loaded, setLoaded] = useState(false)

  const advice = useMemo(() => generateAdvice(forecast), [forecast])

  useEffect(() => {
    if (!selectedLocation) return
    Promise.all([
      getObservations(selectedLocation.id),
      getStaffingRules(selectedLocation.id),
    ]).then(([obs, rules]) => {
      setObservations(obs.filter(o => !o.deleted_at))
      setStaffingRules(rules)
      setLoaded(true)
    })
  }, [selectedLocation])

  // Auto-generate on first load
  useEffect(() => {
    if (loaded && observations.length > 0) {
      runForecast()
    }
  }, [loaded])

  function runForecast() {
    setLoading(true)
    setTimeout(() => {
      const result = generateForecast(
        observations,
        horizon,
        staffingRules,
        selectedLocation?.id ?? 'demo-location',
      )
      setForecast(result)
      setLoading(false)
    }, 400)
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Forecast</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gebaseerd op {observations.length} historische observaties
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {([7, 14] as Horizon[]).map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={[
                'px-4 py-2 text-sm font-medium transition-colors',
                horizon === h
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {h} dagen
            </button>
          ))}
        </div>
        <Button onClick={runForecast} disabled={loading || observations.length === 0}>
          {loading ? 'Berekenen...' : 'Genereer voorspelling'}
        </Button>
      </div>

      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Voorspelling wordt berekend...
        </div>
      )}

      {!loading && forecast.length > 0 && (
        <>
          {/* Cloudy Advies */}
          {advice.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                ☁️ Cloudy adviseert
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {advice.map((a, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.65)',
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '14px', padding: '14px 16px',
                    display: 'flex', gap: '12px',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      background: a.color, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                    }}>
                      {a.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a1f36', marginBottom: '3px' }}>{a.title}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.45 }}>{a.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <ForecastChart forecast={forecast} />
          </div>
          <div className="mb-6">
            <ForecastTable forecast={forecast} />
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Deze voorspelling is een onderbouwde verwachting op basis van historische patronen, seizoen en weer.
              Het is geen garantie. Houd rekening met lokale omstandigheden die het model niet kent.
            </span>
          </div>
        </>
      )}

      {!loading && forecast.length === 0 && loaded && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Klik op "Genereer voorspelling" om te starten.
        </div>
      )}
    </Layout>
  )
}
