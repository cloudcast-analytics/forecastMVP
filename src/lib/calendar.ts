// Belgische feestdagen en schoolvakanties — één bron voor forecast én demodata
export const BELGIAN_PUBLIC_HOLIDAYS: Set<string> = new Set([
  '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-14',
  '2026-05-25', '2026-07-21', '2026-08-15', '2026-11-01',
  '2026-11-11', '2026-12-25',
])

export const SCHOOL_HOLIDAY_RANGES: [string, string][] = [
  ['2025-10-27', '2025-11-02'],
  ['2025-12-22', '2026-01-04'],
  ['2026-02-16', '2026-02-22'],
  ['2026-04-06', '2026-04-19'],
  ['2026-07-01', '2026-08-31'],
]

export function isPublicHoliday(dateStr: string): boolean {
  return BELGIAN_PUBLIC_HOLIDAYS.has(dateStr)
}

export function isSchoolHoliday(dateStr: string): boolean {
  return SCHOOL_HOLIDAY_RANGES.some(([s, e]) => dateStr >= s && dateStr <= e)
}
