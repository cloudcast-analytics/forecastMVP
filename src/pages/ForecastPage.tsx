import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
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

export default function ForecastPage() {
  const { selectedLocation } = useApp()
  const [horizon, setHorizon] = useState<Horizon>(7)
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(false)
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [staffingRules, setStaffingRules] = useState<StaffingRule[]>([])
  const [loaded, setLoaded] = useState(false)

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
