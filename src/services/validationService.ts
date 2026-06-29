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
  } else {
    // Support DD/MM/YYYY → convert to YYYY-MM-DD before parsing
    const raw = row[dateField].trim()
    const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    const normalized = ddmmyyyy ? `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,'0')}-${ddmmyyyy[1].padStart(2,'0')}` : raw
    if (isNaN(Date.parse(normalized))) {
      errors.push(`Ongeldige datum: ${raw}`)
    } else {
      row[dateField] = normalized
    }
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
