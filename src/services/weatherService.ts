import type { WeatherData } from '../types/database'

export function getMockWeather(locationId: string, dates: string[]): WeatherData[] {
  return dates.map(date => {
    const month = new Date(date).getMonth() + 1
    const isSummer = month >= 5 && month <= 9
    const isWinter = month <= 2 || month === 12
    const baseTemp = isSummer ? 24 : isWinter ? 6 : 14
    const rand = Math.random()
    const temp = baseTemp + (rand * 8 - 4)
    const rainy = Math.random() < 0.25
    return {
      id: `mock-${date}`,
      location_id: locationId,
      date,
      temperature_avg: Math.round(temp - 2),
      temperature_max: Math.round(temp),
      rainfall_mm: rainy ? Math.round(Math.random() * 20) : 0,
      wind_speed: Math.round(Math.random() * 20 + 5),
      weather_condition: rainy ? 'Regen' : temp > 22 ? 'Zonnig' : 'Bewolkt',
      source: 'mock',
    }
  })
}
