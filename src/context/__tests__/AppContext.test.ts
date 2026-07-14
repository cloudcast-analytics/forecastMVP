import { describe, it, expect } from 'vitest'
import { resolveRole } from '../AppContext'

describe('resolveRole', () => {
  it('gebruikt demoViewRole wanneer isDemo true is', () => {
    expect(resolveRole(true, 'customer', 'admin')).toBe('customer')
    expect(resolveRole(true, 'admin', null)).toBe('admin')
  })

  it('gebruikt de echte rol wanneer isDemo false is', () => {
    expect(resolveRole(false, 'customer', 'admin')).toBe('admin')
    expect(resolveRole(false, 'admin', null)).toBe(null)
  })
})
