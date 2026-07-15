import { useEffect, useState } from 'react'
import { Calendar, Plus, Trash2, Users, Info, Link2, Save } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { getDepartments } from '../services/supabaseService'
import { getEvents, upsertEvent, deleteEvent } from '../services/supabaseService'
import { getLocationSettings, saveLocationSettings } from '../services/settingsService'
import type { Department } from '../types/database'
import type { Evenement, EvenementType } from '../types/events'

const TYPES: EvenementType[] = ['Feest', 'Sport', 'Concert', 'Markt', 'Overig']

const TYPE_COLOR: Record<EvenementType, { bg: string; text: string }> = {
  Feest:   { bg: 'rgba(234,88,12,0.08)',   text: '#ea580c' },
  Sport:   { bg: 'rgba(5,150,105,0.08)',   text: '#059669' },
  Concert: { bg: 'rgba(124,58,237,0.08)',  text: '#7c3aed' },
  Markt:   { bg: 'rgba(8,145,178,0.08)',   text: '#0891b2' },
  Overig:  { bg: 'rgba(107,114,128,0.08)', text: '#6b7280' },
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

const NL_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const NL_DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${NL_DAYS[d.getDay()]} ${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000)
}

interface FormState {
  name: string
  date: string
  expected_guests: number
  department_id: string
  type: EvenementType
  note: string
}

const EMPTY_FORM: FormState = {
  name: '',
  date: new Date().toISOString().split('T')[0],
  expected_guests: 100,
  department_id: '',
  type: 'Feest',
  note: '',
}

import React from 'react'

export default function EvenementenPage() {
  const { selectedLocation, selectedCompany } = useApp()
  const locationId = selectedLocation?.id ?? 'default'
  const companyId = selectedCompany?.id ?? 'default'

  const [events, setEvents] = useState<Evenement[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [icsUrl, setIcsUrl] = useState('')
  const [icsSaved, setIcsSaved] = useState(false)

  useEffect(() => {
    if (!selectedLocation) return
    setLoading(true)
    const settings = getLocationSettings(locationId)
    setIcsUrl(settings.ics_feed_url)
    Promise.all([
      getEvents(locationId),
      getDepartments(companyId),
    ]).then(([evts, depts]) => {
      setEvents(evts.sort((a, b) => a.date.localeCompare(b.date)))
      setDepartments(depts)
      setLoading(false)
    })
  }, [selectedLocation, locationId, companyId])

  function handleSaveIcsUrl() {
    const settings = getLocationSettings(locationId)
    saveLocationSettings(locationId, { ...settings, ics_feed_url: icsUrl.trim() })
    setIcsSaved(true)
    setTimeout(() => setIcsSaved(false), 2000)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.date) return
    const event: Evenement = {
      id: crypto.randomUUID(),
      location_id: locationId,
      name: form.name.trim(),
      date: form.date,
      expected_guests: form.expected_guests,
      department_id: form.department_id || undefined,
      type: form.type,
      note: form.note.trim() || undefined,
    }
    await upsertEvent(event)
    setEvents(prev => [...prev, event].sort((a, b) => a.date.localeCompare(b.date)))
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    await deleteEvent(id, locationId)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = events.filter(e => e.date >= today)
  const past = events.filter(e => e.date < today)

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Evenementen</h1>
          <p className="text-slate-500 text-sm mt-1">{selectedLocation?.name ?? '—'}</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          <Plus size={14} /> Evenement toevoegen
        </Button>
      </div>

      {/* Info banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        background: 'rgba(26,68,232,0.05)', border: '1px solid rgba(26,68,232,0.12)',
        borderRadius: '12px', padding: '12px 16px', marginBottom: '24px',
      }}>
        <Info size={15} color="#1a44e8" style={{ flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
          Evenementen beïnvloeden automatisch de <strong>forecast</strong> (extra verwachte bezoekers) en het{' '}
          <strong>bezettingsadvies</strong> per afdeling. Een evenement met 300+ gasten activeert extra personeel voor Bar buiten.
        </p>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...CARD, padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36', marginBottom: '16px' }}>Nieuw evenement</p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Naam *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="bv. Zomerfeest" style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Datum *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as EvenementType }))} style={INPUT}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Verwacht gasten *</label>
              <input
                type="number" min="1" value={form.expected_guests}
                onChange={e => setForm(f => ({ ...f, expected_guests: Number(e.target.value) }))}
                style={INPUT}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Afdeling</label>
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={INPUT}>
                <option value="">— geen voorkeur —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Notitie</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Optioneel" style={INPUT} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Opslaan</Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Annuleren</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Laden...</p>
      ) : (
        <>
          {/* Upcoming events */}
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Aankomend ({upcoming.length})
          </p>

          {upcoming.length === 0 ? (
            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: '10px', marginBottom: '24px' }}>
              <Calendar size={32} color="#d1d5db" />
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>Geen geplande evenementen. Voeg er een toe.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {upcoming.map(event => {
                const days = daysUntil(event.date)
                const col = event.type ? TYPE_COLOR[event.type] : TYPE_COLOR.Overig
                const dept = departments.find(d => d.id === event.department_id)
                return (
                  <div key={event.id} style={{ ...CARD, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Date badge */}
                    <div style={{ textAlign: 'center', minWidth: '52px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1f36', lineHeight: 1 }}>
                        {new Date(event.date).getDate()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>
                        {NL_MONTHS[new Date(event.date).getMonth()]}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>{event.name}</span>
                        {event.type && (
                          <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '99px', background: col.bg, color: col.text }}>
                            {event.type}
                          </span>
                        )}
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          color: days <= 7 ? '#ea580c' : '#6b7280',
                          background: days <= 7 ? 'rgba(234,88,12,0.08)' : '#f1f5f9',
                          padding: '2px 8px', borderRadius: '99px',
                        }}>
                          {days === 0 ? 'vandaag' : days === 1 ? 'morgen' : `over ${days} dagen`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{fmtDate(event.date)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6b7280' }}>
                          <Users size={11} /> {event.expected_guests} gasten
                        </span>
                        {dept && <span style={{ fontSize: '12px', color: '#6b7280' }}>{dept.name}</span>}
                        {event.note && <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>{event.note}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(event.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '4px', flexShrink: 0 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Past events */}
          {past.length > 0 && (
            <>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Afgelopen ({past.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...past].reverse().slice(0, 5).map(event => (
                  <div key={event.id} style={{ ...CARD, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.6 }}>
                    <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '80px' }}>{fmtDate(event.date)}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151', flex: 1 }}>{event.name}</span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{event.expected_guests} gasten</span>
                    <button
                      onClick={() => handleDelete(event.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e5e7eb', padding: '4px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {/* ICS-feed koppeling */}
      <div style={{ marginTop: '40px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Link2 size={15} color="#6b7280" />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1f36' }}>Google Calendar koppelen</p>
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, marginBottom: '14px' }}>
          Plak hier de publieke ICS-feed-URL van je Google Calendar (rechtermuisknop op kalender → "Instellingen en delen" → kopieer de ICS-link).
          De backend importeert geboekte slots automatisch als evenement-concepten.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="url"
            value={icsUrl}
            onChange={e => setIcsUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none', background: 'white',
              fontFamily: 'monospace',
            }}
          />
          <Button onClick={handleSaveIcsUrl} variant={icsSaved ? 'secondary' : 'primary'}>
            <Save size={13} /> {icsSaved ? 'Opgeslagen' : 'Opslaan'}
          </Button>
        </div>
        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
          Opgeslagen per locatie. Gastenaantallen vul je daarna handmatig aan per geïmporteerde slot.
        </p>
      </div>
    </Layout>
  )
}
