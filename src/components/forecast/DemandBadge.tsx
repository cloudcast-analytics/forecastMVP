import type { DemandLevel } from '../../types/forecast'

export default function DemandBadge({ level }: { level: DemandLevel }) {
  const map: Record<DemandLevel, { label: string; className: string }> = {
    Low: { label: 'Rustig', className: 'bg-green-100 text-green-800' },
    Normal: { label: 'Normaal', className: 'bg-blue-100 text-blue-800' },
    High: { label: 'Druk', className: 'bg-amber-100 text-amber-800' },
    'Very High': { label: 'Zeer druk', className: 'bg-red-100 text-red-800' },
  }
  const { label, className } = map[level]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
