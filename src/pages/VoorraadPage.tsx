import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, Check, ChevronDown, ChevronUp, Mail, Package,
  Plus, Settings, ShoppingCart, Trash2, TrendingDown, X,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import {
  deleteProduct, getDepartmentStaffingRules, getInventorySupplierConfig,
  getObservations, getOrders, getProducts,
  updateProductStock, upsertInventorySupplierConfig, upsertOrder, upsertProduct,
} from '../services/supabaseService'
import { generateForecast } from '../services/forecastService'
import { getLocationSettings, saveLocationSettings } from '../services/settingsService'
import type { LocationSettings } from '../services/settingsService'
import type { DailyObservation } from '../types/database'
import type { ForecastDay } from '../types/forecast'
import type { Order, OrderLine, Product, ProductCategory, SupplierConfig } from '../types/inventory'

type Tab = 'producten' | 'bestellen'

const CATEGORIES: ProductCategory[] = ['Bier', 'Wijn', 'Frisdrank', 'Cocktail', 'Overig']

const CAT_COLOR: Record<ProductCategory, { bg: string; text: string }> = {
  Bier:      { bg: 'rgba(8,145,178,0.08)',   text: '#0891b2' },
  Wijn:      { bg: 'rgba(124,58,237,0.08)',  text: '#7c3aed' },
  Frisdrank: { bg: 'rgba(5,150,105,0.08)',   text: '#059669' },
  Cocktail:  { bg: 'rgba(234,88,12,0.08)',   text: '#ea580c' },
  Overig:    { bg: 'rgba(107,114,128,0.08)', text: '#6b7280' },
}

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.5)',
  borderRadius: '16px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
}

const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none', background: 'white',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function stockInOrderUnits(p: Product): number {
  return p.current_stock / p.order_unit_size
}

function suggestedQty(p: Product): number {
  const deficit = p.par_level - stockInOrderUnits(p)
  return Math.max(0, Math.ceil(deficit))
}

function isLow(p: Product): boolean {
  return stockInOrderUnits(p) < p.par_level
}

// ─── sub-components ───────────────────────────────────────────────────────────

function LowStockBadge({ product }: { product: Product }) {
  const needed = suggestedQty(product)
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, color: '#c2410c',
      background: 'rgba(234,88,12,0.1)', padding: '2px 8px', borderRadius: '99px',
    }}>
      {needed > 0 ? `bestellen: ${needed} ${product.order_unit}` : 'op minimum'}
    </span>
  )
}

interface AddProductFormProps {
  locationId: string
  companyId: string
  onSaved: (p: Product) => void
  onCancel: () => void
}

function AddProductForm({ locationId, companyId, onSaved, onCancel }: AddProductFormProps) {
  const [form, setForm] = useState({
    name: '', category: 'Bier' as ProductCategory, unit: 'blik',
    order_unit: 'krat (24 blikken)', order_unit_size: 24,
    par_level: 5, current_stock: 0, consume_per_visitor: 0.10,
  })

  function handleSave() {
    if (!form.name.trim()) return
    const product: Product = { ...form, id: crypto.randomUUID(), company_id: companyId, location_id: locationId }
    onSaved(product)
  }

  return (
    <div style={{ ...CARD, padding: '20px', marginBottom: '20px' }}>
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36', marginBottom: '16px' }}>Nieuw product</p>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Naam</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="bv. Jupiler" style={INPUT} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Categorie</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ProductCategory }))} style={INPUT}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Eenheid</label>
          <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="blik / fles" style={INPUT} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Besteleenheid</label>
          <input value={form.order_unit} onChange={e => setForm(f => ({ ...f, order_unit: e.target.value }))} placeholder="krat (24 blikken)" style={INPUT} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Stuks/eenheid</label>
          <input type="number" min="1" value={form.order_unit_size} onChange={e => setForm(f => ({ ...f, order_unit_size: Number(e.target.value) }))} style={INPUT} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Par-level (eenheden)</label>
          <input type="number" min="0" value={form.par_level} onChange={e => setForm(f => ({ ...f, par_level: Number(e.target.value) }))} style={INPUT} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Huidige stock (stuks)</label>
          <input type="number" min="0" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: Number(e.target.value) }))} style={INPUT} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Verbruik/bezoeker</label>
          <input type="number" min="0" step="0.01" value={form.consume_per_visitor} onChange={e => setForm(f => ({ ...f, consume_per_visitor: Number(e.target.value) }))} style={INPUT} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={handleSave}>Opslaan</Button>
        <Button variant="secondary" onClick={onCancel}>Annuleren</Button>
      </div>
    </div>
  )
}

// ─── Producten tab ────────────────────────────────────────────────────────────

interface ProductenTabProps {
  products: Product[]
  onProductsChange: (products: Product[]) => void
  locationId: string
  companyId: string
  settings: LocationSettings
  onSettingsChange: (s: LocationSettings) => void
}

function ProductenTab({ products, onProductsChange, locationId, companyId, settings, onSettingsChange }: ProductenTabProps) {
  const [filter, setFilter] = useState<ProductCategory | 'Alle'>('Alle')
  const [showForm, setShowForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [supplier, setSupplier] = useState<SupplierConfig>({ location_id: locationId, supplier_name: '', supplier_email: '' })
  const [localWaste, setLocalWaste] = useState(settings.waste_percentage)

  useEffect(() => {
    getInventorySupplierConfig(locationId).then(cfg => {
      if (cfg) setSupplier(cfg)
    })
  }, [locationId])

  const filtered = filter === 'Alle' ? products : products.filter(p => p.category === filter)
  const lowItems = products.filter(isLow)

  async function handleSaveProduct(p: Product) {
    await upsertProduct(p)
    const fresh = await getProducts(locationId)
    onProductsChange(fresh)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    await deleteProduct(id, locationId)
    onProductsChange(products.filter(p => p.id !== id))
  }

  async function handleStockChange(product: Product, delta: number) {
    const newStock = Math.max(0, product.current_stock + delta)
    await updateProductStock(product.id, locationId, newStock)
    onProductsChange(products.map(p => p.id === product.id ? { ...p, current_stock: newStock } : p))
  }

  async function handleSupplierSave() {
    await upsertInventorySupplierConfig(supplier)
    const newSettings = { ...settings, waste_percentage: localWaste }
    saveLocationSettings(locationId, newSettings)
    onSettingsChange(newSettings)
    setShowSettings(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['Alle', ...CATEGORIES] as const).map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
              border: '1px solid', cursor: 'pointer',
              borderColor: filter === cat ? '#1a44e8' : '#e5e7eb',
              background: filter === cat ? 'rgba(26,68,232,0.08)' : 'white',
              color: filter === cat ? '#1a44e8' : '#6b7280',
            }}>
              {cat}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowSettings(s => !s)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
            borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white',
            fontSize: '13px', color: '#6b7280', cursor: 'pointer',
          }}>
            <Settings size={13} /> Leverancier {showSettings ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={14} /> Product toevoegen
          </Button>
        </div>
      </div>

      {showSettings && (
        <div style={{ ...CARD, padding: '20px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1f36', marginBottom: '14px' }}>Leverancier & voorraadinstelling</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Naam leverancier</label>
              <input value={supplier.supplier_name} onChange={e => setSupplier(s => ({ ...s, supplier_name: e.target.value }))} placeholder="bv. Alken-Maes" style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>E-mailadres</label>
              <input type="email" value={supplier.supplier_email} onChange={e => setSupplier(s => ({ ...s, supplier_email: e.target.value }))} placeholder="bestellingen@leverancier.be" style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Derving %</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number" min="0" max="30" step="0.5"
                  value={localWaste}
                  onChange={e => setLocalWaste(Number(e.target.value))}
                  style={{ ...INPUT, paddingRight: '28px' }}
                />
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#9ca3af', pointerEvents: 'none' }}>%</span>
              </div>
              <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>rondje v/d zaak, breuk, eigen verbruik</p>
            </div>
          </div>
          <Button onClick={handleSupplierSave}>Opslaan</Button>
        </div>
      )}

      {lowItems.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
        }}>
          <AlertTriangle size={15} color="#ea580c" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#c2410c', flex: 1 }}>
            <strong>{lowItems.length} product{lowItems.length > 1 ? 'en' : ''} onder par-level:</strong>{' '}
            {lowItems.map(p => p.name).join(', ')}
          </p>
        </div>
      )}

      {showForm && (
        <AddProductForm
          locationId={locationId}
          companyId={companyId}
          onSaved={handleSaveProduct}
          onCancel={() => setShowForm(false)}
        />
      )}

      {filtered.length === 0 ? (
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px' }}>
          <Package size={36} color="#d1d5db" />
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Nog geen producten. Voeg je eerste product toe.</p>
        </div>
      ) : (
        <div style={{ ...CARD, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto',
            padding: '10px 20px', borderBottom: '1px solid #f3f4f6',
            fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Product</span><span>Categorie</span><span>Huidige stock</span><span>Par-level</span><span />
          </div>
          {filtered.map((product, idx) => {
            const low = isLow(product)
            const col = CAT_COLOR[product.category]
            const stockUnits = stockInOrderUnits(product)
            return (
              <div key={product.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto',
                alignItems: 'center', padding: '13px 20px',
                borderBottom: idx < filtered.length - 1 ? '1px solid #f9fafb' : 'none',
                background: low ? 'rgba(234,88,12,0.02)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {low && <AlertTriangle size={13} color="#ea580c" style={{ flexShrink: 0 }} />}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1f36' }}>{product.name}</span>
                  {low && <LowStockBadge product={product} />}
                </div>
                <span style={{
                  display: 'inline-flex', fontSize: '12px', fontWeight: 500,
                  padding: '3px 10px', borderRadius: '99px', width: 'fit-content',
                  background: col.bg, color: col.text,
                }}>{product.category}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => handleStockChange(product, -product.order_unit_size)} style={counterBtnStyle}>−</button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: low ? '#ea580c' : '#1a1f36', minWidth: '56px', textAlign: 'center' }}>
                    {stockUnits.toFixed(1)} eenheden
                  </span>
                  <button onClick={() => handleStockChange(product, product.order_unit_size)} style={counterBtnStyle}>+</button>
                </div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{product.par_level} {product.order_unit}</span>
                <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#d1d5db' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Bestellen tab ────────────────────────────────────────────────────────────

interface BestellenTabProps {
  products: Product[]
  onProductsChange: (products: Product[]) => void
  locationId: string
  forecast: ForecastDay[]
  hasEnoughData: boolean
  wastePct: number
}

function BestellenTab({ products, onProductsChange, locationId, forecast, hasEnoughData, wastePct }: BestellenTabProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [supplier, setSupplier] = useState<SupplierConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEmailPreview, setShowEmailPreview] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getOrders(locationId), getInventorySupplierConfig(locationId)]).then(([o, s]) => {
      setOrders(o)
      setSupplier(s)
      setLoading(false)
    })
  }, [locationId])

  const pendingOrder = useMemo(() => orders.find(o => o.status === 'voorstel' || o.status === 'goedgekeurd'), [orders])

  function daysUntilNextOrderMoment(): number {
    const today = new Date()
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      if (d.getDay() === 0 || d.getDay() === 3) return i
    }
    return 4
  }

  function generateProposal() {
    const lowProducts = products.filter(isLow)
    if (lowProducts.length === 0) return

    const coverageDays = daysUntilNextOrderMoment()
    const relevantDays = forecast.slice(0, coverageDays)
    const totalVisitors = relevantDays.reduce((sum, d) => sum + d.predicted_visitors, 0)
    const forecastUsable = hasEnoughData && totalVisitors > 0

    const lines: OrderLine[] = lowProducts.map(p => {
      const parSays = suggestedQty(p)

      let forecastSays: number | undefined
      if (forecastUsable && p.consume_per_visitor > 0) {
        const consumption = totalVisitors * p.consume_per_visitor * (1 + wastePct / 100)
        forecastSays = Math.max(0, Math.ceil((consumption - p.current_stock) / p.order_unit_size))
      }

      const qty = forecastSays !== undefined ? forecastSays : parSays

      return {
        product_id: p.id,
        product_name: p.name,
        unit: p.unit,
        order_unit: p.order_unit,
        order_unit_size: p.order_unit_size,
        current_stock: p.current_stock,
        par_level: p.par_level,
        suggested_qty: qty,
        quantity: qty,
        reason: forecastSays !== undefined ? 'forecast' as const : 'par_level' as const,
        par_says: parSays,
        forecast_says: forecastSays,
      }
    })

    const newOrder: Order = {
      id: crypto.randomUUID(),
      location_id: locationId,
      status: 'voorstel',
      lines,
      created_at: new Date().toISOString(),
    }
    upsertOrder(newOrder)
    setOrders(prev => [...prev.filter(o => o.status === 'geleverd'), newOrder])
  }

  function updateLineQty(orderId: string, productId: string, qty: number) {
    setOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, lines: o.lines.map(l => l.product_id === productId ? { ...l, quantity: Math.max(0, qty) } : l) }
      : o
    ))
  }

  function approveOrder(order: Order) {
    const approved: Order = { ...order, status: 'goedgekeurd', approved_at: new Date().toISOString() }
    upsertOrder(approved)
    setOrders(prev => prev.map(o => o.id === approved.id ? approved : o))
    setShowEmailPreview(true)
  }

  async function confirmDelivery(order: Order) {
    const delivered: Order = { ...order, status: 'geleverd', delivered_at: new Date().toISOString() }
    upsertOrder(delivered)
    setOrders(prev => prev.map(o => o.id === delivered.id ? delivered : o))

    const updatedProducts = [...products]
    for (const line of order.lines) {
      const idx = updatedProducts.findIndex(p => p.id === line.product_id)
      if (idx >= 0) {
        const newStock = updatedProducts[idx].current_stock + line.quantity * line.order_unit_size
        await updateProductStock(line.product_id, locationId, newStock)
        updatedProducts[idx] = { ...updatedProducts[idx], current_stock: newStock }
      }
    }
    onProductsChange(updatedProducts)
  }

  function buildEmailBody(order: Order): string {
    const lines = [
      `Beste ${supplier?.supplier_name ?? 'leverancier'},`,
      '',
      'Graag plaatsen wij de volgende bestelling:',
      '',
      ...order.lines.map(l => `- ${l.product_name}: ${l.quantity} × ${l.order_unit}`),
      '',
      'Gelieve te bevestigen wanneer de levering kan plaatsvinden.',
      '',
      'Met vriendelijke groet,',
      'Waterfront Genk',
    ]
    return lines.join('\n')
  }

  if (loading) return <p className="text-slate-400 text-sm">Laden...</p>

  if (!pendingOrder) {
    const lowCount = products.filter(isLow).length
    return (
      <div>
        <div style={{ ...CARD, padding: '32px', textAlign: 'center', marginBottom: '20px' }}>
          <ShoppingCart size={36} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a1f36', marginBottom: '6px' }}>Geen openstaand bestelvoorstel</p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>
            {lowCount > 0
              ? `${lowCount} product${lowCount > 1 ? 'en' : ''} ${lowCount > 1 ? 'zijn' : 'is'} onder par-level. Genereer een voorstel.`
              : 'Alle producten zijn voldoende op voorraad.'}
          </p>
          {lowCount > 0 && <Button onClick={generateProposal}>Genereer bestelvoorstel</Button>}
        </div>

        {orders.filter(o => o.status === 'geleverd').slice(0, 3).map(o => (
          <div key={o.id} style={{ ...CARD, padding: '16px 20px', marginBottom: '12px', opacity: 0.7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={14} color="#059669" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1f36' }}>
                Geleverd op {new Date(o.delivered_at!).toLocaleDateString('nl-BE')}
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>— {o.lines.length} product{o.lines.length > 1 ? 'en' : ''}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (pendingOrder.status === 'goedgekeurd' && showEmailPreview) {
    const emailBody = buildEmailBody(pendingOrder)
    return (
      <div>
        <div style={{ ...CARD, padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={16} color="#059669" />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Bestelling goedgekeurd</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>E-mail verstuurd naar {supplier?.supplier_email ?? '—'}</p>
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inhoud e-mail</p>
            <pre style={{ fontSize: '12px', color: '#374151', fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: 0 }}>{emailBody}</pre>
          </div>
          <Button onClick={() => confirmDelivery(pendingOrder)}>
            <Check size={14} /> Levering bevestigen
          </Button>
        </div>
      </div>
    )
  }

  if (pendingOrder.status === 'goedgekeurd') {
    return (
      <div>
        <div style={{ ...CARD, padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Mail size={16} color="#059669" />
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Bestelling verstuurd — wachten op levering</p>
          </div>
          <div style={{ marginBottom: '16px' }}>
            {pendingOrder.lines.map(l => (
              <div key={l.product_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#1a1f36' }}>{l.product_name}</span>
                <span style={{ color: '#6b7280' }}>{l.quantity} × {l.order_unit}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => confirmDelivery(pendingOrder)}>
            <Check size={14} /> Levering bevestigen — voorraad bijboeken
          </Button>
        </div>
      </div>
    )
  }

  // status === 'voorstel'
  return (
    <div>
      <div style={{ ...CARD, padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Bestelvoorstel</p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>
              {pendingOrder.lines.some(l => l.reason === 'forecast') ? 'Gebaseerd op forecast' : 'Gebaseerd op par-level'} · {new Date(pendingOrder.created_at).toLocaleDateString('nl-BE')}
            </p>
          </div>
          <button
            onClick={() => { upsertOrder({ ...pendingOrder, status: 'geleverd' }); setOrders(prev => prev.filter(o => o.id !== pendingOrder.id)) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '4px' }}
            title="Voorstel verwijderen"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '8px 12px', borderRadius: '8px', background: '#f8fafc',
            fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px',
          }}>
            <span>Product</span><span>Huidige stock</span><span>Advies</span><span>Bestellen</span>
          </div>
          {pendingOrder.lines.map(line => {
            const hasDual = line.forecast_says !== undefined && line.par_says !== undefined && line.forecast_says !== line.par_says
            const saving = hasDual ? (line.par_says! - line.forecast_says!) : 0
            return (
              <div key={line.product_id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                alignItems: 'center', padding: '10px 12px',
                borderBottom: '1px solid #f1f5f9', fontSize: '13px',
              }}>
                <div>
                  <span style={{ fontWeight: 500, color: '#1a1f36' }}>{line.product_name}</span>
                  {hasDual && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <span style={{ fontSize: '10px', color: '#6b7280', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                        par: {line.par_says}
                      </span>
                      <span style={{ fontSize: '10px', color: '#1d4ed8', background: 'rgba(29,78,216,0.06)', padding: '1px 6px', borderRadius: '4px' }}>
                        forecast: {line.forecast_says}
                      </span>
                      {saving > 0 && (
                        <span style={{ fontSize: '10px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <TrendingDown size={10} /> besparing: {saving}
                        </span>
                      )}
                    </div>
                  )}
                  {!hasDual && line.reason === 'par_level' && (
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>par-level</div>
                  )}
                </div>
                <span style={{ color: '#6b7280' }}>{(line.current_stock / line.order_unit_size).toFixed(1)} eenheden</span>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                  {line.reason === 'forecast' ? `${line.forecast_says} (forecast)` : `${line.par_level} (par)`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => updateLineQty(pendingOrder.id, line.product_id, line.quantity - 1)} style={counterBtnStyle}>−</button>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1f36', minWidth: '28px', textAlign: 'center' }}>{line.quantity}</span>
                  <button onClick={() => updateLineQty(pendingOrder.id, line.product_id, line.quantity + 1)} style={counterBtnStyle}>+</button>
                  <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '2px' }}>{line.order_unit}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button onClick={() => approveOrder(pendingOrder)}>
            <Mail size={14} /> Goedkeuren & bestellen
          </Button>
          <p style={{ fontSize: '12px', color: '#9ca3af' }}>
            Verstuurt bestelmail naar {supplier?.supplier_email ?? '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VoorraadPage() {
  const { selectedLocation, selectedCompany } = useApp()
  const routeLocation = useLocation()
  const locationId = selectedLocation?.id ?? 'default'
  const companyId = selectedCompany?.id ?? 'default'

  const initialTab: Tab = (routeLocation.state as { tab?: Tab } | null)?.tab === 'bestellen' ? 'bestellen' : 'producten'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [products, setProducts] = useState<Product[]>([])
  const [observations, setObservations] = useState<DailyObservation[]>([])
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [settings, setSettings] = useState<LocationSettings>(() => getLocationSettings(locationId))
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!selectedLocation) return
    setLoading(true)
    const [prods, obs, rules] = await Promise.all([
      getProducts(selectedLocation.id),
      getObservations(selectedLocation.id),
      getDepartmentStaffingRules(selectedLocation.id),
    ])
    setProducts(prods)
    setObservations(obs)
    setSettings(getLocationSettings(selectedLocation.id))
    generateForecast(obs, 14, rules, selectedLocation.id).then(setForecast)
    setLoading(false)
  }, [selectedLocation])

  useEffect(() => { loadData() }, [loadData])

  const hasEnoughData = observations.length >= 14
  const lowCount = useMemo(() => products.filter(isLow).length, [products])

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Voorraad</h1>
          <p className="text-slate-500 text-sm mt-1">{selectedLocation?.name ?? '—'}</p>
        </div>
        {lowCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '99px', background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)' }}>
            <AlertTriangle size={13} color="#ea580c" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#c2410c' }}>{lowCount} onder par-level</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {(['producten', 'bestellen'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? '#1a1f36' : '#6b7280',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab === 'producten' ? 'Producten' : 'Bestellen'}
            {tab === 'bestellen' && lowCount > 0 && (
              <span style={{ marginLeft: '6px', background: '#ea580c', color: 'white', borderRadius: '99px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>
                {lowCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Data laden...</p>
      ) : (
        <>
          {activeTab === 'producten' && (
            <ProductenTab
              products={products}
              onProductsChange={setProducts}
              locationId={locationId}
              companyId={companyId}
              settings={settings}
              onSettingsChange={setSettings}
            />
          )}
          {activeTab === 'bestellen' && (
            <BestellenTab
              products={products}
              onProductsChange={setProducts}
              locationId={locationId}
              forecast={forecast}
              hasEnoughData={hasEnoughData}
              wastePct={settings.waste_percentage}
            />
          )}
        </>
      )}
    </Layout>
  )
}

const counterBtnStyle: React.CSSProperties = {
  width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e5e7eb',
  background: 'white', cursor: 'pointer', fontSize: '16px', lineHeight: '1',
  color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
