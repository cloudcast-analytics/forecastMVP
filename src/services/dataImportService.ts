export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length < 2) return []

  // Detect separator: count commas vs semicolons in the first line
  const firstLine = lines[0]
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const sep = semicolonCount > commaCount ? ';' : ','

  const headers = firstLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ''))

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], sep)
    if (cells.length === 0) continue
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = (cells[idx] ?? '').trim().replace(/^"|"$/g, '')
    })
    rows.push(row)
  }
  return rows
}

function splitLine(line: string, sep: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === sep && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}
