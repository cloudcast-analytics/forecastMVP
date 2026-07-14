import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import OverviewTab from '../components/data/OverviewTab'
import UploadTab from '../components/data/UploadTab'

type Tab = 'overzicht' | 'uploaden'

export default function DataPage() {
  const location = useLocation()
  const initialTab: Tab = (location.state as { tab?: Tab } | null)?.tab === 'uploaden' ? 'uploaden' : 'overzicht'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Data beheer</h1>
        <p className="text-slate-500 text-sm mt-1">Upload, bekijk en beheer je historische data</p>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {(['overzicht', 'uploaden'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {tab === 'overzicht' ? 'Overzicht' : 'Uploaden'}
          </button>
        ))}
      </div>

      {activeTab === 'overzicht' && <OverviewTab />}
      {activeTab === 'uploaden' && <UploadTab onImported={() => setActiveTab('overzicht')} />}
    </Layout>
  )
}
