import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, TrendingUp, Users, CheckCircle, Upload, BarChart2 } from 'lucide-react'
import Layout from '../components/layout/Layout'
import KpiCard from '../components/dashboard/KpiCard'
import RevenueChart from '../components/dashboard/RevenueChart'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { getObservations, getStaffingRules } from '../services/supabaseService'
import { generateForecast } from '../services/forecastService'
import type { DailyObservation } from '../types/database'
import { formatEuro } from '../lib/utils'

function getDataQuality(count: number): { label: string; color: string } {
  if (count < 90) return { label: 'Onvoldoende', color: 'text-red-600' }
  if (count < 180) return { label: 'Acceptabel', color: 'text-amber-600' }
  if (count < 365) return { label: 'Goed', color: 'text-blue-600' }
  return { label: 'Sterk', color: 'text-green-600' }
}

export default function DashboardPage() {
  const { selectedLocation } = useApp()
  const navigate = useNavigate()
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    Promise.all([
      getObservations(selectedLocation.id),
      getStaffingRules(selectedLocation.id),
    ]).then(([obs]) => {
      setObservations(obs)
      setLoading(false)
    })
  }, [selectedLocation])

  const activeObs = observations.filter(o => !o.deleted_at)
  const quality = getDataQuality(activeObs.length)

  // Next 7-day revenue from forecast
  const [forecastRevenue, setForecastRevenue] = useState<number>(0)
  const [avgStaff, setAvgStaff] = useState<number>(0)

  useEffect(() => {
    if (activeObs.length === 0) return
    getStaffingRules(selectedLocation?.id ?? 'demo-location').then(rules => {
      const forecast = generateForecast(activeObs, 7, rules, selectedLocation?.id ?? 'demo-location')
      const total = forecast.reduce((s, f) => s + f.predicted_revenue, 0)
      const staff = forecast.reduce((s, f) => s + f.recommended_staff, 0) / Math.max(forecast.length, 1)
      setForecastRevenue(total)
      setAvgStaff(Math.round(staff))
    })
  }, [activeObs.length])

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overzicht voor {selectedLocation?.name ?? 'jouw locatie'}</p>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Data laden...</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              icon={<Database size={18} />}
              value={activeObs.length.toString()}
              label="Datapunten"
              sublabel="historische records"
            />
            <KpiCard
              icon={<CheckCircle size={18} />}
              value={quality.label}
              label="Datakwaliteit"
              sublabel={`${activeObs.length} records`}
              color={quality.color}
            />
            <KpiCard
              icon={<TrendingUp size={18} />}
              value={formatEuro(forecastRevenue)}
              label="Verwachte omzet"
              sublabel="komende 7 dagen"
              color="text-green-600"
            />
            <KpiCard
              icon={<Users size={18} />}
              value={`${avgStaff}`}
              label="Gem. personeel"
              sublabel="komende 7 dagen"
            />
          </div>

          {/* Revenue chart */}
          <div className="mb-6">
            <RevenueChart observations={activeObs} />
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Snelle acties</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => navigate('/data/upload')}>
                <Upload size={15} />
                Data uploaden
              </Button>
              <Button variant="secondary" onClick={() => navigate('/forecast')}>
                <BarChart2 size={15} />
                Forecast bekijken
              </Button>
              <Button variant="secondary" onClick={() => navigate('/data')}>
                <Database size={15} />
                Mijn data
              </Button>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
