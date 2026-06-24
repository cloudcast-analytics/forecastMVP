export interface ValidationResult {
  valid: boolean
  errors: string[]
  row: Record<string, string>
  rowIndex: number
}

export function validateRow(
  row: Record<string, string>,
  mapping: Record<string, string>,
  rowIndex: number,
): ValidationResult {
  const errors: string[] = []
  const dateField = Object.entries(mapping).find(([, v]) => v === 'date')?.[0]
  const revenueField = Object.entries(mapping).find(([, v]) => v === 'revenue')?.[0]
  const visitorsField = Object.entries(mapping).find(([, v]) => v === 'visitors')?.[0]

  if (!dateField || !row[dateField]) {
    errors.push('Datum ontbreekt')
  } else if (isNaN(Date.parse(row[dateField]))) {
    errors.push(`Ongeldige datum: ${row[dateField]}`)
  }

  if (!revenueField && !visitorsField) {
    errors.push('Minimaal omzet of bezoekers is vereist')
  }
  if (revenueField && row[revenueField] && isNaN(Number(row[revenueField]))) {
    errors.push('Omzet moet numeriek zijn')
  }
  if (visitorsField && row[visitorsField] && isNaN(Number(row[visitorsField]))) {
    errors.push('Bezoekers moet numeriek zijn')
  }

  return { valid: errors.length === 0, errors, row, rowIndex }
}
