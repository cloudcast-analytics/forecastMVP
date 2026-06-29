import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Send, Sparkles } from 'lucide-react'

interface Message {
  role: 'cloudy' | 'user'
  text: string
}

const PAGE_CONTEXT: Record<string, { greeting: string; suggestions: string[] }> = {
  '/dashboard': {
    greeting: 'Hallo! Ik ben Cloudy ☁️ Je AI-assistent voor CloudCast. Op het dashboard zie je een overzicht van je locatie. Wat wil je weten?',
    suggestions: ['Hoe interpreteer ik het dashboard?', 'Wat doet CloudCast precies?', 'Hoe upload ik data?'],
  },
  '/forecast': {
    greeting: 'Op de forecastpagina kun je zien hoe druk het de komende dagen wordt. Ik kan je helpen de voorspellingen te interpreteren.',
    suggestions: ['Hoe werkt de forecast?', 'Hoe plan ik personeel op basis hiervan?', 'Wat is de drukste dag?'],
  },
  '/performance': {
    greeting: 'Welkom bij Performance! Hier zie je hoe je locatie het historisch heeft gedaan. Ik help je de data te interpreteren.',
    suggestions: ['Hoe vergelijk ik periodes?', 'Wat is een goede omzet per dag?', 'Wat doet de dagtype-grafiek?'],
  },
  '/data/upload': {
    greeting: 'Klaar om data te uploaden? Ik begeleid je door het proces. Zorg dat je bestand een datumkolom heeft.',
    suggestions: ['Welk bestandsformaat werkt?', 'Wat zijn verplichte kolommen?', 'Wat als mijn data fouten heeft?'],
  },
  '/data': {
    greeting: 'Dit zijn alle geüploade observaties voor je locatie. Ik help je de data te begrijpen of beheren.',
    suggestions: ['Hoe verwijder ik data?', 'Waarom mis ik sommige dagen?', 'Hoe exporteer ik data?'],
  },
  '/organization': {
    greeting: 'In de organisatiemodule stel je afdelingen en functies in. Die gebruik ik later voor personeelsprognoses.',
    suggestions: ['Hoe voeg ik een afdeling toe?', 'Wat is de bezettingsevaluatie?', 'Hoe werken functies per locatie?'],
  },
  '/staffing': {
    greeting: 'Personeelsregels bepalen hoeveel mensen je nodig hebt bij een bepaald bezoekersaantal. Stel ze zorgvuldig in.',
    suggestions: ['Hoe maak ik een personeelsregel?', 'Wat is de logica achter de regels?', 'Kan ik per dag regels instellen?'],
  },
}

const RESPONSES: Record<string, string> = {
  'hoe werkt de forecast': 'De forecast combineert je historische omzet en bezoekers met weekpatronen, seizoenen en feestdagen. Hoe meer data je hebt, hoe nauwkeuriger de voorspelling.',
  'hoe plan ik personeel': 'Kijk naar de verwachte bezoekers per dag en vergelijk die met je personeelsregels onder "Personeelsregels". CloudCast toont de aanbevolen bezetting automatisch.',
  'welk bestandsformaat werkt': 'We ondersteunen CSV en Excel (.xlsx). Zorg dat rij 1 kolomnamen zijn en je een datumkolom hebt in formaat DD/MM/YYYY of YYYY-MM-DD.',
  'wat zijn verplichte kolommen': 'Alleen een datum is verplicht. Omzet, bezoekers, transacties en personeel zijn optioneel maar ze verbeteren de forecast aanzienlijk.',
  'wat als mijn data fouten heeft': 'In stap 4 (Validatie) zie je hoeveel rijen geldig zijn en welke fouten er zijn. Ongeldige rijen worden overgeslagen — geldige rijen worden wel geïmporteerd.',
  'hoe vergelijk ik periodes': 'Zet de schakelaar "Vergelijk met vorige periode" aan. De grafiek toont dan de huidige en vorige periode als twee lijnen naast elkaar.',
  'hoe voeg ik een afdeling toe': 'Ga naar Organisatie → tab Structuur → klik "+ Afdeling". Voeg daarna functies toe per afdeling.',
  'wat is de bezettingsevaluatie': 'Bij de tab Bezetting evalueer je dagelijks per afdeling of je onderbezet, voldoende of overbezet was. Die data helpt toekomstige roosters verbeteren.',
  'hoe upload ik data': 'Ga naar "Upload data" in de navigatie. Je doorloopt 5 stappen: bestand → voorbeeld → koppelen → validatie → klaar.',
  'wat doet cloudcast precies': 'CloudCast analyseert je historische verkoop- en bezoekersdata en genereert dagprognoses. Zo weet je elke ochtend hoe druk het wordt en hoeveel personeel je nodig hebt.',
}

function findResponse(input: string): string {
  const lower = input.toLowerCase()
  for (const [key, val] of Object.entries(RESPONSES)) {
    if (lower.includes(key) || key.split(' ').filter(w => w.length > 4).every(w => lower.includes(w))) {
      return val
    }
  }
  return 'Goede vraag! Voor een uitgebreid antwoord kun je contact opnemen via schaekers.sven@gmail.com. In een volgende update koppelen we Cloudy aan een live AI-backend voor nog slimmere antwoorden. ☁️'
}

export default function Cloudy() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const location = useLocation()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ctx = PAGE_CONTEXT[location.pathname] ?? PAGE_CONTEXT['/dashboard']

  useEffect(() => {
    setMessages([{ role: 'cloudy', text: ctx.greeting }])
  }, [location.pathname])

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, messages])

  function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')
    const userMsg: Message = { role: 'user', text: msg }
    setMessages(prev => [...prev, userMsg])
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'cloudy', text: findResponse(msg) }])
    }, 500)
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '88px', right: '24px', zIndex: 1000,
          width: '340px', maxHeight: '480px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(26,68,232,0.15)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            background: 'linear-gradient(135deg, rgba(26,68,232,0.08), rgba(99,60,220,0.05))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a44e8, #6b3cdc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a1f36', lineHeight: 1 }}>Cloudy</p>
                <p style={{ fontSize: '11px', color: '#6b7280' }}>AI-assistent</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 12px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  fontSize: '13px', lineHeight: '1.45',
                  background: m.role === 'user' ? '#1a44e8' : 'rgba(0,0,0,0.05)',
                  color: m.role === 'user' ? '#fff' : '#1a1f36',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {/* Suggestions after first message */}
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {ctx.suggestions.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{
                    textAlign: 'left', padding: '7px 11px',
                    borderRadius: '10px', border: '1px solid rgba(26,68,232,0.2)',
                    background: 'transparent', cursor: 'pointer',
                    fontSize: '12px', color: '#1a44e8', fontFamily: 'inherit',
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Stel een vraag..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.1)', outline: 'none',
                fontSize: '13px', fontFamily: 'inherit', background: 'rgba(255,255,255,0.8)',
              }}
            />
            <button onClick={() => send()} style={{
              width: '34px', height: '34px', borderRadius: '10px',
              background: '#1a44e8', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Send size={14} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1001,
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a44e8, #6b3cdc)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(26,68,232,0.35)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        title="Cloudy — AI-assistent"
      >
        <Sparkles size={20} color="#fff" />
      </button>
    </>
  )
}
