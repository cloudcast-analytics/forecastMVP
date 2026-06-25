# Organisatiestructuur Module — Design Spec

## Doel

Een configureerbare module waarmee elke onderneming haar eigen organisatiestructuur vastlegt: afdelingen en functies. De structuur wordt per bedrijf als basis-template aangemaakt en kan per locatie worden aangepast. Headcount per functie per locatie wordt bijgehouden. Een dagelijkse bezettingsevaluatie per afdeling levert input voor het forecasting-model.

## Datamodel

### Nieuwe Supabase tabellen

**`departments`**
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid (PK) | |
| company_id | uuid (FK → companies) | Bedrijf waartoe de afdeling behoort |
| name | text | Naam van de afdeling (bv. Keuken, Zaal, Kassa) |
| created_at | timestamptz | |

**`roles`**
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid (PK) | |
| department_id | uuid (FK → departments) | Afdeling waartoe de functie behoort |
| name | text | Naam van de functie (bv. Chef-kok, Kelner) |
| created_at | timestamptz | |

**`location_departments`**
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid (PK) | |
| location_id | uuid (FK → locations) | |
| department_id | uuid (FK → departments) | |
| is_active | boolean | Of deze afdeling actief is voor deze locatie |

**`location_roles`**
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid (PK) | |
| location_id | uuid (FK → locations) | |
| role_id | uuid (FK → roles) | |
| headcount | integer | Aantal medewerkers in deze functie op deze locatie |

**`daily_staffing_evaluations`**
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid (PK) | |
| location_id | uuid (FK → locations) | |
| department_id | uuid (FK → departments) | |
| date | date | Dag van evaluatie |
| rating | text | 'understaffed' / 'adequate' / 'overstaffed' |
| created_at | timestamptz | |

## TypeScript Types

```typescript
interface Department {
  id: string
  company_id: string
  name: string
  created_at: string
}

interface Role {
  id: string
  department_id: string
  name: string
  created_at: string
}

interface LocationDepartment {
  id: string
  location_id: string
  department_id: string
  is_active: boolean
}

interface LocationRole {
  id: string
  location_id: string
  role_id: string
  headcount: number
}

interface DailyStaffingEvaluation {
  id: string
  location_id: string
  department_id: string
  date: string
  rating: 'understaffed' | 'adequate' | 'overstaffed'
  created_at: string
}
```

## UI

### Nieuwe pagina: `/organization`

Route in App.tsx, sidebar-item "Organisatie" met `Building` icoon.

Twee tabs:

**Tab 1: Structuur**
- Lijst van afdelingen met hun functies (accordion-style)
- "Afdeling toevoegen" knop → inline form (alleen naam)
- Per afdeling: "Functie toevoegen" → inline form (alleen naam)
- Per afdeling/functie: verwijder-knop
- Als er een locatie geselecteerd is: toggle per afdeling (actief/inactief voor deze locatie)
- Per functie bij geselecteerde locatie: headcount invoerveld

**Tab 2: Bezetting evaluatie**
- Lijst van actieve afdelingen voor de geselecteerde locatie
- Per afdeling: 3-knops keuze (onderbezet / goed / overbezet)
- Datum-selector (standaard vandaag)
- Opslaan-knop
- Simpel en snel — maximaal 30 seconden werk voor de ondernemer

## Demo mode

In demo-modus werkt alles lokaal in-memory, consistent met het bestaande patroon in `demoSeed.ts` en `supabaseService.ts`.

## Relatie met forecasting

De `daily_staffing_evaluations` data wordt later als feature toegevoegd aan het XGBoost forecasting-model. Dit valt buiten scope van deze module maar de data-opslag is er alvast klaar voor.
