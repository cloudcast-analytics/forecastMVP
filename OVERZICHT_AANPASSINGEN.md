# Overzicht Aanpassingen — CloudCast MVP

> **Voor alle medewerkers die aan dit project werken:**
> Elke aanpassing aan de code — groot of klein — moet hier worden gedocumenteerd.
> Voeg een nieuwe regel toe onder de juiste datum met een korte beschrijving van wat er gewijzigd is en je naam.
> Gebruik het formaat hieronder als richtlijn.

---

## Changelog

### 14-07-2026 — Vini G
- **Navigatie-consolidatie** — Sidebar teruggebracht van 11 naar 7 items. "Bedrijven"/"Locaties" vervangen door een klikbare bedrijf/locatie-kaart die naar één `/company`-pagina navigeert (admin: beheer, klant: locatielijst). "Upload data"/"Mijn data"/"Data beheer" samengevoegd tot één "Data beheer"-tab met sub-tabs Overzicht/Uploaden.
- **Demo-rolwisselaar** — In demo-modus kan je via de sidebar-kaart wisselen tussen "Admin" en "Klant" om beide weergaves te bekijken.

### 12-07-2026 — Vini G
- **Personeelsengine per afdeling** — Bezetting per afdeling (basis / drukte / evenement-drempel) vervangt de platte bezoekersregels. Drukteniveau en bezetting komen uit dezelfde berekening.
- **Dashboard herbouwd** — Gericht op de vier uitbatersvragen: verwachte omzet, wie waar inplannen (per afdeling, met delta), besparing t.o.v. vaste planning, volgend bestelmoment. Meta-informatie verwijderd.
- **Realistische demodata** — Waterfront-profiel: seizoenszaak vanaf 1 april, €10,50–13,50 per bezoeker, bezetting 5–7, evenementen met gastenaantallen.
- **Personeelsregels-pagina** — Per afdeling instelbaar + loonkosteninstellingen (uurloon, shifturen) voor de besparingsindicator.
- **Vitest** — Testsuite toegevoegd voor engine, demodata-consistentie, settings en forecast.

### 08-07-2026 — Vini G
- **Per-locatie data in demo-modus** — Elke locatie heeft nu zijn eigen personeelsregels, afdelingen en rollen. Wisselen van locatie geeft écht andere configuratie; mutaties worden per locatie bijgehouden in geheugen.
- **XGBoost backend koppeling** — `forecastService.ts` is nu async en roept eerst het `POST /forecast/json` endpoint aan op de FastAPI backend. Valt automatisch terug op het statistisch model als de backend niet bereikbaar is. Stel `VITE_FORECAST_API_URL` in als omgevingsvariabele om de koppeling te activeren.
- **FastAPI: CORS + nieuw forecast endpoint** — `app/routes/forecast.py` toegevoegd met `POST /forecast/json` endpoint. CORS middleware ingesteld zodat de React frontend requests mag doen.

### 30-06-2026 — Sven Schakers
- **Manager dashboard** — Dagplanning, bezettingsstatus per uur en voorraadbestellingsmail toegevoegd.
- **Gespreksgids Waterfront Genk** — Verkoopdocument toegevoegd als referentie.

### 29-06-2026 — Sven Schakers
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

### 7. Waterfront Fase 1 — Dashboard + personeelslogica
**Status:** [x] Afgerond (12-07-2026)

### 8. Waterfront Fase 2 — Voorraad & brouwerij-bestelflow
**Status:** [ ] Gepland — zie docs/superpowers/specs/2026-07-12-waterfront-feedback-design.md

### 9. Waterfront Fase 3 — Evenementen (incl. Google Calendar ICS-import van waterfront-genk.be), uur-import, uur-trends
**Status:** [ ] Gepland

### 10. Cold-start blend (baseline + XGBoost) in FastAPI-backend
**Status:** [ ] Gepland

### 11. Klant-onboarding: uitnodiging + accounttab
**Status:** [ ] Gepland — scope nog niet vastgelegd
- Idee: admin (CloudCast) richt bedrijf/locatie(s)/personeelsregels in; de klant geeft zijn e-mailadres door en ontvangt een uitnodigingsmail (link om zelf in te loggen/wachtwoord in te stellen).
- Nieuw "account"-tabje nodig in de sidebar, ter hoogte van het huidige e-mailadres boven de uitlogknop.
- Nog te bepalen: welke informatie/acties in dat accounttabje komen, hoe de uitnodigingsmail precies werkt.

### 12. Navigatie-consolidatie (sidebar, bedrijf/locaties, data-tabs)
**Status:** [x] Afgerond (14-07-2026)

---

*Laatst bijgewerkt: 14-07-2026*
