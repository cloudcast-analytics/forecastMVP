import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertTriangle, Package, Mail, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'

type Category = 'Dranken' | 'Voeding' | 'Overig'

interface VoorraadItem {
  id: string
  name: string
  category: Category
  unit: string
  current_stock: number
  min_stock: number
}

interface LeverancierConfig {
  email: string
  naam: string
}

const STORAGE_KEY = 'cloudcast_voorraad'
const SUPPLIER_KEY = 'cloudcast_leverancier'
const CATEGORIES: Category[] = ['Dranken', 'Voeding', 'Overig']

const CATEGORY_COLOR: Record<Category, { bg: string; text: string }> = {
  Dranken: { bg: 'rgba(8,145,178,0.08)',   text: '#0891b2' },
  Voeding: { bg: 'rgba(5,150,105,0.08)',   text: '#059669' },
  Overig:  { bg: 'rgba(124,58,237,0.08)', text: '#7c3aed' },
}

function loadItems(locationId: string): VoorraadItem[] {
  try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}_${locationId}`) ?? '[]') } catch { return [] }
}
function saveItems(locationId: string, items: VoorraadItem[]) {
  localStorage.setItem(`${STORAGE_KEY}_${locationId}`, JSON.stringify(items))
}
function loadSupplier(locationId: string): LeverancierConfig {
  try { return JSON.parse(localStorage.getItem(`${SUPPLIER_KEY}_${locationId}`) ?? '{}') } catch { return { email: '', naam: '' } }
}
function saveSupplier(locationId: string, cfg: LeverancierConfig) {
  localStorage.setItem(`${SUPPLIER_KEY}_${locationId}`, JSON.stringify(cfg))
}

const EMPTY_FORM = { name: '', category: 'Dranken' as Category, unit: 'stuks', current_stock: 0, min_stock: 0 }

export default function VoorraadPage() {
  const { selectedLocation } = useApp()
  const locationId = selectedLocation?.id ?? 'default'

  const [items, setItems] = useState<VoorraadItem[]>([])
  const [filter, setFilter] = useState<Category | 'Alle'>('Alle')
  const [showForm, setShowForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [supplier, setSupplier] = useState<LeverancierConfig>({ email: '', naam: '' })

  useEffect(() => {
    setItems(loadItems(locationId))
    setSupplier(loadSupplier(locationId))
  }, [locationId])

  function persist(next: VoorraadItem[]) {
    setItems(next)
    saveItems(locationId, next)
  }

  function handleAdd() {
    if (!form.name.trim()) return
    persist([...items, { ...form, id: crypto.randomUUID() }])
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  function handleDelete(id: string) { persist(items.filter(i => i.id !== id)) }

  function handleStockChange(id: string, delta: number) {
    persist(items.map(i => i.id === id ? { ...i, current_stock: Math.max(0, i.current_stock + delta) } : i))
  }

  function handleSupplierSave() {
    saveSupplier(locationId, supplier)
    setShowSettings(false)
  }

  function handleOrderEmail() {
    const low = items.filter(i => i.current_stock <= i.min_stock)
    if (low.length === 0) return
    const to = supplier.email || ''
    const subject = encodeURIComponent(`Bestelling – ${selectedLocation?.name ?? 'CloudCast'} – ${new Date().toLocaleDateString('nl-BE')}`)
    const lines = [
      `Beste ${supplier.naam || 'leverancier'},`,
      '',
      'Graag plaatsen wij de volgende bestelling:',
      '',
      ...low.map(i => `- ${i.name}: ${i.min_stock * 2 - i.current_stock} ${i.unit} (huidige stock: ${i.current_stock} ${i.unit}, minimum: ${i.min_stock} ${i.unit})`),
      '',
      'Gelieve te bevestigen wanneer de levering kan plaatsvinden.',
      '',
      `Met vriendelijke groet,`,
      selectedLocation?.name ?? 'CloudCast',
    ]
    const body = encodeURIComponent(lines.join('\n'))
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  const filtered = filter === 'Alle' ? items : items.filter(i => i.category === filter)
  const lowStock = items.filter(i => i.current_stock <= i.min_stock)

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Voorraad</h1>
          <p className="text-slate-500 text-sm mt-1">{selectedLocation?.name ?? '—'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white',
              fontSize: '13px', color: '#6b7280', cursor: 'pointer',
            }}
          >
            <Settings size={14} /> Leverancier {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={15} /> Item toevoegen
          </Button>
        </div>
      </div>

      {/* Leverancier instellingen */}
      {showSettings && (
        <div style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px',
          padding: '20px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36', marginBottom: '14px' }}>Leverancier configuratie</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Naam leverancier</label>
              <input
                value={supplier.naam}
                onChange={e => setSupplier(s => ({ ...s, naam: e.target.value }))}
                placeholder="bv. Brouwerij Alken-Maes"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>E-mailadres leverancier</label>
              <input
                type="email"
                value={supplier.email}
                onChange={e => setSupplier(s => ({ ...s, email: e.target.value }))}
                placeholder="bestelling@leverancier.be"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <Button onClick={handleSupplierSave}>Opslaan</Button>
          </div>
        </div>
      )}

      {/* Low stock warning + bestelknop */}
      {lowStock.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)',
          borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
        }}>
          <AlertTriangle size={16} color="#ea580c" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#c2410c' }}>
              {lowStock.length} {lowStock.length === 1 ? 'product' : 'producten'} onder minimumvoorraad
            </p>
            <p style={{ fontSize: '12px', color: '#9a3412', marginTop: '2px' }}>
              {lowStock.map(i => i.name).join(', ')}
            </p>
          </div>
          <button
            onClick={handleOrderEmail}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              background: '#ea580c', border: 'none', color: 'white',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Mail size={14} /> Bestelling plaatsen
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px',
          padding: '20px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36', marginBottom: '14px' }}>Nieuw item</p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
            {[
              { label: 'Naam', el: <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="bv. Cola blik" style={inputStyle} /> },
              { label: 'Categorie', el: <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} style={inputStyle}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select> },
              { label: 'Eenheid', el: <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="stuks / liter / kg" style={inputStyle} /> },
              { label: 'Huidige stock', el: <input type="number" min="0" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: Number(e.target.value) }))} style={inputStyle} /> },
              { label: 'Minimum', el: <input type="number" min="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))} style={inputStyle} /> },
            ].map(({ label, el }) => (
              <div key={label}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>{label}</label>
                {el}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <Button onClick={handleAdd}>Opslaan</Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Annuleren</Button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['Alle', ...CATEGORIES] as const).map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            padding: '6px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
            border: '1px solid', cursor: 'pointer',
            borderColor: filter === cat ? '#1a44e8' : '#e5e7eb',
            background: filter === cat ? 'rgba(26,68,232,0.08)' : 'white',
            color: filter === cat ? '#1a44e8' : '#6b7280',
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', gap: '12px',
          background: 'rgba(255,255,255,0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)',
        }}>
          <Package size={36} color="#d1d5db" />
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Nog geen items. Voeg je eerste product toe.</p>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
            padding: '10px 20px', borderBottom: '1px solid #f3f4f6',
            fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Product</span><span>Categorie</span><span>Stock</span><span>Minimum</span><span />
          </div>

          {filtered.map((item, idx) => {
            const isLow = item.current_stock <= item.min_stock
            const cat = CATEGORY_COLOR[item.category]
            return (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                alignItems: 'center', padding: '14px 20px',
                borderBottom: idx < filtered.length - 1 ? '1px solid #f9fafb' : 'none',
                background: isLow ? 'rgba(234,88,12,0.03)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isLow && <AlertTriangle size={14} color="#ea580c" />}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1f36' }}>{item.name}</span>
                </div>
                <span style={{
                  display: 'inline-flex', fontSize: '12px', fontWeight: 500,
                  padding: '3px 10px', borderRadius: '99px', width: 'fit-content',
                  background: cat.bg, color: cat.text,
                }}>{item.category}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => handleStockChange(item.id, -1)} style={counterBtn}>−</button>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: isLow ? '#ea580c' : '#1a1f36', minWidth: '48px', textAlign: 'center' }}>
                    {item.current_stock} {item.unit}
                  </span>
                  <button onClick={() => handleStockChange(item.id, 1)} style={counterBtn}>+</button>
                </div>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{item.min_stock} {item.unit}</span>
                <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#d1d5db' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none', background: 'white',
}

const counterBtn: React.CSSProperties = {
  width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #e5e7eb',
  background: 'white', cursor: 'pointer', fontSize: '16px', lineHeight: '1', color: '#6b7280',
}
