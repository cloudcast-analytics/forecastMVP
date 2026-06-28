# Navigatie & Sidebar Redesign — Design Spec

## Doel

Drie problemen oplossen in één samenhangende wijziging:
1. Desktop sidebar inklapbaar maken (icon-only modus)
2. Mobile drawer consistent maken met de desktop sidebar
3. Globale locatieselector toevoegen in het bedrijfsblok van de sidebar

## Scope

Twee bestanden worden gewijzigd: `Sidebar.tsx` en `Layout.tsx`. Geen nieuwe pagina's, geen nieuwe routes, geen wijzigingen aan AppContext.

---

## 1. Collapsible Sidebar (desktop)

### Gedrag

- De sidebar heeft twee standen: **uitgevouwen** (240px) en **ingeklapt** (64px).
- De stand wordt opgeslagen in `localStorage` onder de key `sidebar-collapsed` (waarde `"true"` of `"false"`), zodat de keuze bewaard blijft na een refresh.
- Standaard: uitgevouwen.
- Toggle-knop: onderaan de sidebar, in de footer-zone, een `ChevronLeft`-icoon (uitgevouwen) dat verandert naar `ChevronRight` (ingeklapt).
- De main content area vult de rest automatisch in via `flex: 1` — geen extra logica nodig.

### Ingeklapte staat (64px)

Wat verdwijnt:
- Alle labels van navigatie-items (alleen iconen zichtbaar, gecentreerd)
- Het volledige bedrijfsblok (company/location context)
- De e-mail tekst in de footer

Wat blijft:
- Logo-icoon (geen "CloudCast" tekst)
- Navigatie-iconen (gecentreerd, geen labels)
- Logout-icoon (zonder tekst)
- Toggle-knop (ChevronRight)

### Uitgevouwen staat (240px)

Identiek aan de huidige sidebar — geen visuele wijzigingen.

### Animatie

CSS `transition: width 0.2s ease` op de `<aside>`. Content die verdwijnt bij inklapppen gebruikt `overflow: hidden` om niet buiten de sidebar te lopen.

---

## 2. Mobile Drawer Consistentie

### Huidige situatie

De mobile drawer toont alleen navigatie-items. Het bedrijfsblok en de account/logout footer ontbreken, waardoor informatie "verdwijnt" als de drawer sluit.

### Gewenste situatie

De mobile drawer krijgt dezelfde drie zones als de desktop sidebar:

1. **Bovenaan**: bedrijfsblok met bedrijfsnaam, demo-badge (indien van toepassing), en locatieselector (zie sectie 3)
2. **Midden**: navigatie-items (ongewijzigd)
3. **Onderaan**: account-email + uitlogknop

De hamburger-knop in de mobile topbalk en het X-icoontje om te sluiten blijven ongewijzigd.

---

## 3. Globale Locatieselector in het Bedrijfsblok

### Plaatsing

In `Sidebar.tsx`, in het bestaande bedrijfsblok, direct onder de bedrijfsnaam. Vervangt de huidige plain-text weergave van `selectedLocation.name`.

Datzelfde blok komt ook in de mobile drawer (sectie 2), waardoor de locatieselector automatisch op beide plekken werkt.

### Gedrag per situatie

| Situatie | Weergave |
|----------|----------|
| 0 locaties | Niets tonen (blok blijft zichtbaar voor bedrijfsnaam) |
| 1 locatie | Plain tekst: locatienaam (auto-selected via AppContext) |
| 2+ locaties | `<select>` dropdown met alle locaties voor het geselecteerde bedrijf |

### Data

Alles komt uit `useApp()`:
- `locations` — lijst van locaties voor het geselecteerde bedrijf
- `selectedLocation` — huidige selectie
- `setSelectedLocation` — setter om van locatie te wisselen

Bij 2+ locaties: de dropdown roept `setSelectedLocation` aan bij `onChange` met het bijbehorende `Location` object.

### Stijl

Consistent met de bestaande sidebar-stijl. De dropdown gebruikt dezelfde kleur (`#1a1f36`) en lettertypegrootte (13px) als de huidige locatienaam-tekst. Geen extra border of box — strak geïntegreerd in het bedrijfsblok.

---

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/layout/Sidebar.tsx` | Collapse state + localStorage, ingeklapte UI, locatieselector in bedrijfsblok |
| `src/components/layout/Layout.tsx` | Mobile drawer uitbreiden met bedrijfsblok + account/logout footer |

---

## Niet in scope

- Bedrijven/Locaties navigatiestructuur (drill-down herstructurering) — apart traject
- Tooltips op iconen in ingeklapte modus
- Animaties anders dan de breedte-transitie
