export interface LocationSettings {
  hourly_wage: number
  shift_hours: number
  waste_percentage: number
}

const DEFAULTS: LocationSettings = {
  hourly_wage: 14,
  shift_hours: 8,
  waste_percentage: 3,
}

export function getLocationSettings(locationId: string): LocationSettings {
  try {
    const raw = localStorage.getItem(`cloudcast_settings_${locationId}`)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveLocationSettings(locationId: string, settings: LocationSettings): void {
  localStorage.setItem(`cloudcast_settings_${locationId}`, JSON.stringify(settings))
}

