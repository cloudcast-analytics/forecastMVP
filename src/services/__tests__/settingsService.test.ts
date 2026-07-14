import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocationSettings, saveLocationSettings } from '../settingsService'

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    clear: () => {
      storage.clear()
    },
  })
})

describe('locationSettings', () => {
  it('geeft defaults zonder opgeslagen instellingen', () => {
    expect(getLocationSettings('loc-x')).toEqual({ hourly_wage: 14, shift_hours: 8 })
  })

  it('bewaart en leest instellingen per locatie', () => {
    saveLocationSettings('loc-x', { hourly_wage: 16.5, shift_hours: 9 })
    expect(getLocationSettings('loc-x').hourly_wage).toBe(16.5)
    expect(getLocationSettings('loc-y').hourly_wage).toBe(14)
  })
})

