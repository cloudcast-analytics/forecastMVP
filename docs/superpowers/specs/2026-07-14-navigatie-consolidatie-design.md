# Design: Navigatie-consolidatie (sidebar, bedrijf/locaties, data-tabs)

**Datum:** 14-07-2026
**Bron:** Gebruikersfeedback na oplevering Waterfront Fase 1 (zie `docs/superpowers/plans/2026-07-12-waterfront-fase1-dashboard-personeel.md`)
**Doel:** De sidebar-navigatie vereenvoudigen door overlappende/redundante tabs samen te voegen, zonder functionaliteit te verliezen.

---

## Context

Na oplevering van Fase 1 viel op dat de sidebar 11 nav-items telt, waarvan er meerdere overlappen:
- De context-kaart bovenaan de sidebar toont al bedrijf + locatie, terwijl "Bedrijven" en "Locaties" daarnaast nog aparte (adminOnly) beheerpagina's zijn.
- "Upload data", "Mijn data" en "Data beheer" zijn drie losse pagina's die alle drie over dezelfde geïmporteerde data gaan (uploaden, bekijken, bestanden beheren, exporteren).

Dit document beschrijft hoe die twee groepen samengevoegd worden. Het raakt: `Sidebar.tsx`, `AppContext.tsx`, `App.tsx` (routing), en de pagina's `CompaniesPage`, `LocationsPage`, `UploadPage`, `DataPage`, `DataManagementPage`.

**Buiten scope:** de klant-uitnodigingsflow / accounttab (zie roadmap-item 11 in `OVERZICHT_AANPASSINGEN.md`) — apart te brainstormen. Bewerken van bestaande bedrijfs- of locatiegegevens (bestond nu ook niet, blijft view-only/aanmaken zoals vandaag).

---

## 1. Sidebar-navigatie

**Nieuwe volgorde (7 items):** Dashboard, Forecast, Performance, Voorraad, Personeelsregels, Organisatie, **Data beheer** (laatste).

**Verwijderd als aparte nav-items:** Bedrijven, Locaties, Upload data, Mijn data (oude naam), Data beheer (oude, adminOnly variant).

**Data beheer** krijgt het `Settings`-icoon (tandwieltje, hetzelfde icoon dat de oude adminOnly "Data beheer" al had) en is niet langer `adminOnly` — iedereen (ook klant-gebruikers) moet zelf data kunnen uploaden.

**Gevolg:** de `adminOnly`-vlag op nav-items (`allNavItems` in `Sidebar.tsx`) wordt door deze wijziging door niemand meer gebruikt. Het mechanisme blijft in de code staan (kan later nuttig zijn voor een echt admin-only scherm), maar is na deze wijziging inactief.

## 2. Context-kaart wordt klikbaar + demo-rolwisselaar

De bestaande kaart bovenaan de sidebar (bedrijfsnaam, Demo-badge, locatie-dropdown) wordt klikbaar:
- Klik ergens op de kaart, **buiten** de locatie-dropdown → navigeert naar `/company`.
- De dropdown zelf (`<select>`) blijft ongewijzigd werken (locatie wisselen); de klik-handler op de dropdown moet niet doorborrelen naar de navigatie van de kaart (`stopPropagation`).

**Demo-rolwisselaar:** alleen zichtbaar wanneer `isDemo === true`. Een klein schakelaartje "Bekijk als: Admin / Klant" naast de bestaande Demo-badge.

- `AppContext` krijgt een nieuwe state `demoViewRole: 'admin' | 'customer'` (default `'admin'`) en een setter `setDemoViewRole`.
- Zolang `isDemo === true`, wordt de `role`-waarde die de rest van de app leest (sidebar-filtering, `/company`-rendering) afgeleid van `demoViewRole` in plaats van hardcoded `'admin'`.
- Buiten demo-modus verandert er niets: `role` komt zoals nu uit `user_profiles` via Supabase.

Dit bestaat puur om tijdens development/demo's beide varianten van `/company` te kunnen tonen — geen productie-functionaliteit.

## 3. `/company`-pagina (nieuwe route, vervangt `/companies` + `/locations`)

Eén route, één pagina-component (`CompanyPage.tsx`), met een rol-vertakking vanbinnen — zelfde patroon als de bestaande `role === 'admin'`-checks elders in de app.

**Admin-variant** — één doorlopende pagina:
1. Bedrijfsgegevens bovenaan: naam, sector, contactpersoon, e-mail (uit `selectedCompany`) — **view-only**, geen bewerkfunctie (bestond nu ook niet).
2. Direct daaronder: de locatietabel (naam, stad, type, max capaciteit) met een "Nieuwe locatie"-knop — functioneel identiek aan de huidige `LocationsPage`, alleen nu embedded in deze pagina i.p.v. een aparte route.

**Klant-variant** — simpele klikbare lijst:
- Per locatie: naam + stad.
- Klikken op een locatie → `setSelectedLocation(locatie)` + navigeer naar `/dashboard`. Functioneel gelijk aan wat de dropdown al doet, maar dan als lijst-weergave — handig bij meerdere locaties.

## 4. `/data`-pagina (nieuwe indeling, vervangt `/data/upload` + `/data` + `/settings/data-management`)

Eén route `/data`, met interne sub-tabs (component-state, niet in de URL — zelfde patroon als de bestaande Organisatie-pagina's Structuur/Bezetting-tabs):

**Sub-tab volgorde: "Overzicht" eerst, "Uploaden" tweede.**

- **Overzicht** (samenvoeging van huidige "Mijn data" + "Data beheer"):
  - Privacy-notitie bovenaan (uit `DataManagementPage`).
  - Observatietabel met datumfilter (uit `DataPage`).
  - **Eén** exportknop, exporteert volgens het actieve datumfilter (geen filter = export alles) — vervangt de twee losse exportknoppen die er nu zijn.
  - Bestandenlijst met verwijderknop (uit `DataManagementPage`), zichtbaar voor iedereen (niet langer adminOnly).
- **Uploaden**: de bestaande stapsgewijze wizard (bestand → voorbeeld → koppelen → valideren → klaar), functioneel ongewijzigd. Enige aanpassing: de laatste stap ("Klaar") schakelt na een geslaagde import intern over naar de sub-tab "Overzicht" in plaats van een page-reload naar de oude `/data`-route.

**Bestandsstructuur (indicatief voor de implementatieplan-fase):**
- `src/pages/DataPage.tsx` wordt de container (Layout + sub-tab state, default `'overzicht'`)
- Inhoud van huidige `UploadPage.tsx` verhuist naar `src/components/data/UploadTab.tsx`
- Inhoud van huidige `DataPage.tsx` (tabel/filter) + `DataManagementPage.tsx` (privacy/bestanden) worden samengevoegd tot `src/components/data/OverviewTab.tsx`
- `UploadPage.tsx` en `DataManagementPage.tsx` worden verwijderd

## 5. Routing-overzicht

| Route (oud) | Route (nieuw) |
|---|---|
| `/companies`, `/locations` | `/company` |
| `/data`, `/data/upload`, `/settings/data-management` | `/data` (met sub-tabs) |

Alle overige routes (`/dashboard`, `/forecast`, `/performance`, `/voorraad`, `/staffing`, `/organization`) blijven ongewijzigd.

---

## Succescriteria

1. Sidebar toont exact 7 items, in de vastgelegde volgorde, "Data beheer" laatste met tandwiel-icoon.
2. Klikken op de context-kaart (buiten de dropdown) navigeert naar `/company`; de locatie-dropdown blijft onafhankelijk werken.
3. In demo-modus toont de kaart een "Bekijk als: Admin/Klant"-schakelaar; wisselen verandert direct de sidebar-filtering én wat `/company` toont.
4. Admin-variant van `/company` toont bedrijfsgegevens + locatietabel op één pagina; "Nieuwe locatie" werkt zoals nu.
5. Klant-variant van `/company` toont een klikbare locatielijst; klikken wisselt de actieve locatie en navigeert naar `/dashboard`.
6. `/data` toont sub-tabs "Overzicht" (eerst) en "Uploaden" (tweede); Overzicht combineert tabel, datumfilter, één exportknop, privacy-notitie en bestandenlijst, zichtbaar voor elke gebruiker.
7. Een geslaagde import in "Uploaden" schakelt intern naar "Overzicht", zonder page-reload.
8. Geen kapotte links: `/companies`, `/locations`, `/data/upload`, `/settings/data-management` bestaan niet meer als routes of nav-items.
