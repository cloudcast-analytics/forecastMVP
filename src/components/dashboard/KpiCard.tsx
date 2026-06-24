import React from 'react'

interface KpiCardProps {
  icon: React.ReactNode
  value: string
  label: string
  sublabel?: string
  color?: string
}

export default function KpiCard({ icon, value, label, sublabel, color = 'text-blue-600' }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  )
}
