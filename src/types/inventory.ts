export type ProductCategory = 'Bier' | 'Wijn' | 'Frisdrank' | 'Cocktail' | 'Overig'

export interface Product {
  id: string
  company_id: string
  location_id: string
  name: string
  category: ProductCategory
  unit: string            // weergave-eenheid, bv. "blik", "fles"
  order_unit: string      // besteleenheid, bv. "krat (24 blikken)"
  order_unit_size: number // aantal units per besteleenheid
  par_level: number       // gewenste voorraad in besteleenheden
  current_stock: number   // huidige voorraad in units
  consume_per_visitor: number  // verwacht verbruik per bezoeker (in units)
  supplier_id?: string
}

export interface SupplierConfig {
  location_id: string
  supplier_name: string
  supplier_email: string
}

export type OrderStatus = 'voorstel' | 'goedgekeurd' | 'geleverd'

export interface OrderLine {
  product_id: string
  product_name: string
  unit: string
  order_unit: string
  order_unit_size: number
  current_stock: number
  par_level: number       // in besteleenheden
  suggested_qty: number   // systeem-suggestie in besteleenheden
  quantity: number        // manager-aangepast, in besteleenheden
  reason: 'par_level' | 'forecast'
}

export interface Order {
  id: string
  location_id: string
  status: OrderStatus
  lines: OrderLine[]
  created_at: string
  approved_at?: string
  delivered_at?: string
}
