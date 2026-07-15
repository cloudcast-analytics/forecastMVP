export type EvenementType = 'Feest' | 'Sport' | 'Markt' | 'Concert' | 'Overig'

export interface Evenement {
  id: string
  location_id: string
  date: string              // YYYY-MM-DD
  name: string
  expected_guests: number
  department_id?: string    // welke afdeling krijgt extra personeel
  type?: EvenementType
  note?: string
}

export interface HourlySale {
  id: string
  location_id: string
  date: string
  hour: number              // 0–23
  category: string          // Bier | Wijn | Frisdrank | Cocktail | Overig
  quantity: number
  revenue: number
}
