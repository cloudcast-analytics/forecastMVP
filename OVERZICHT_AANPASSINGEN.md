# Overzicht Aanpassingen — CloudCast MVP

> **Voor alle medewerkers die aan dit project werken:**
> Elke aanpassing aan de code — groot of klein — moet hier worden gedocumenteerd.
> Voeg een nieuwe regel toe onder de juiste datum met een korte beschrijving van wat er gewijzigd is en je naam.
> Gebruik het formaat hieronder als richtlijn.

---

## Changelog

### 08-07-2026 — Vini G
- **Per-locatie data in demo-modus** — Elke locatie heeft nu zijn eigen personeelsregels, afdelingen en rollen. Wisselen van locatie geeft écht andere configuratie; mutaties worden per locatie bijgehouden in geheugen.
- **XGBoost backend koppeling** — `forecastService.ts` is nu async en roept eerst het `POST /forecast/json` endpoint aan op de FastAPI backend. Valt automatisch terug op het statistisch model als de backend niet bereikbaar is. Stel `VITE_FORECAST_API_URL` in als omgevingsvariabele om de koppeling te activeren.
- **FastAPI: CORS + nieuw forecast endpoint** — `app/routes/forecast.py` toegevoegd met `POST /forecast/json` endpoint. CORS middleware ingesteld zodat de React frontend requests mag doen.

### 30-06-2026 — Vini G
- **Manager dashboard** — Dagplanning, bezettingsstatus per uur en voorraadbestellingsmail toegevoegd.
- **Gespreksgids Waterfront Genk** — Verkoopdocument toegevoegd als referentie.

### 29-06-2026 — Vini G
- **Cloudy AI-assistent** — Zwevende chatbot beschikbaar op alle pagina's, context-aware per pagina.
- **Performance dashboard** — KPI's, omzetgrafieken en historische vergelijking toegevoegd.
- **Upload wizard** — Stapsgewijze begeleidde uploadflow met kolomherkenning en validatie.
- **Forecast advies** — Automatische tekstadviezen naast de forecast-grafiek ("Cloudy adviseert").
- **Bugfixes** — Duplicate observaties per datum gefixed (upsert on conflict), TS build errors opgelost, forecast confidence band zichtbaar gemaakt.

### 28-06-2026 — Vini G
- **Hamburger naar sidebar** — Toggle-knop verplaatst van rechtsboven (mobile topbar) naar bovenaan de sidebar. Mobile topbar volledig verwijderd; sidebar altijd zichtbaar op alle schermformaten.
- **Collapsible sidebar** — Desktop sidebar inklapbaar (240px ↔ 64px icon-only), keuze bewaard in localStorage.
- **Locatieselector in sidebar** — Globale dropdown in het bedrijfsblok; plain tekst bij 1 locatie, dropdown bij 2+.
- **Mobile drawer** — Consistent gemaakt met bedrijfsblok, navigatie en account/uitloggen zones.
- **Nav labels** — Labels gelijkgetrokken tussen desktop sidebar en mobile drawer.
- **Demo tweede locatie** — "Waterfront Hasselt" toegevoegd zodat de locatieselector zichtbaar is in de demo.
- **Demo upload fix** — CSV-uploads in demo-modus worden opgeslagen in geheugen; forecast gebruikt die data.

### 27-06-2026 — Vini G
- **Organisatiestructuur module** — Volledige nieuwe pagina "Organisatie" met twee tabs:
  - *Structuur*: afdelingen en functies per bedrijf aanmaken/verwijderen, per locatie activeren/deactiveren, headcount per functie instellen.
  - *Bezetting*: dagelijkse evaluatie per afdeling (onderbezet/goed/overbezet), opgeslagen als forecastinput.
- **SQL migratie** — Nieuwe Supabase tabellen: `departments`, `roles`, `location_departments`, `location_roles`, `daily_staffing_evaluations`.
- **Bugfix headcount** — Input-veld remount bij locatiewissel zodat `defaultValue` niet verouderd raakt.

### 24-06-2026 — Vini G
- **Initial commit** — CloudCast MVP opgeleverd: authenticatie, upload, forecast, personeelsregels, locatie/bedrijfsbeheer, dashboard.

---

## Geplande Features (Roadmap)

### 1. Organisatiestructuur Module
**Status:** [x] Afgerond (27-06-2026)

### 2. Data Upload met Cloudy Wizard
**Status:** [x] Afgerond (29-06-2026)

### 3. Forecast Dashboard + Cloudy Advies
**Status:** [x] Afgerond (29-06-2026)

### 4. Performance Dashboard + Historische Omzet
**Status:** [x] Afgerond (29-06-2026)

### 5. Cloudy — Globale AI-Assistent
**Status:** [x] Afgerond (29-06-2026)

### 6. XGBoost Backend Koppeling
**Status:** [~] In uitvoering — code klaar, backend deployment nodig
- React roept `VITE_FORECAST_API_URL/forecast/json` aan
- FastAPI backend (`cloudcastgit/`) bevat het XGBoost model en het endpoint
- Nog te doen: backend deployen op Railway en `VITE_FORECAST_API_URL` instellen

---

*Laatst bijgewerkt: 11-07-2026*
