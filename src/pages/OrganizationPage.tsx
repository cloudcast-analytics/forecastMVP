import { useState } from 'react'
import Layout from '../components/layout/Layout'

type Tab = 'structuur' | 'bezetting'

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('structuur')

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organisatie</h1>
          <p className="text-slate-500 text-sm mt-1">Afdelingen, functies en bezettingsevaluatie</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {(['structuur', 'bezetting'] as Tab[]).map(tab => (
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
            {tab === 'structuur' ? 'Structuur' : 'Bezetting evaluatie'}
          </button>
        ))}
      </div>

      {activeTab === 'structuur' && (
        <p className="text-slate-400 text-sm">Structuur komt hier.</p>
      )}
      {activeTab === 'bezetting' && (
        <p className="text-slate-400 text-sm">Bezetting evaluatie komt hier.</p>
      )}
    </Layout>
  )
}
