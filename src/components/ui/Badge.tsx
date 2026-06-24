import React from 'react'
import type { DemandLevel } from '../../types/forecast'

type BadgeVariant = 'green' | 'blue' | 'amber' | 'red' | 'gray'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-slate-100 text-slate-700',
}

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}

export function DemandBadge({ level }: { level: DemandLevel }) {
  const map: Record<DemandLevel, { label: string; variant: BadgeVariant }> = {
    Low: { label: 'Rustig', variant: 'green' },
    Normal: { label: 'Normaal', variant: 'blue' },
    High: { label: 'Druk', variant: 'amber' },
    'Very High': { label: 'Zeer druk', variant: 'red' },
  }
  const { label, variant } = map[level]
  return <Badge variant={variant}>{label}</Badge>
}
