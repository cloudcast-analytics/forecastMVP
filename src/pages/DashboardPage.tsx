import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, TrendingUp, Users, CheckCircle, Upload, BarChart2, Package, ChevronRight } from 'lucide-react'
import Layout from '../components/layout/Layout'
import KpiCard from '../components/dashboard/KpiCard'
import RevenueChart from '../components/dashboard/RevenueChart'
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
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Snelle acties</h3>
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
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    gap: '12px', padding: '20px', borderRadius: '16px',
                    background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)' }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36', marginBottom: '2px' }}>{label}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>{sub}</p>
                  </div>
                  <ChevronRight size={16} color="#d1d5db" style={{ alignSelf: 'flex-end' }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
