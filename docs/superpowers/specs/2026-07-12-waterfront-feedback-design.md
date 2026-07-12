# Design: Verwerking klantgesprek Waterfront

**Datum:** 12-07-2026
**Bron:** `Gesprek Waterfront.docx` + mondelinge toelichting van het gesprek
**Doel:** De tool gebruiksklaar maken voor een vervolggesprek met Waterfront Genk, volgens het advies van de manager: één sterke generieke basis + kleine bijschakelbare modules per klant.

---

## Context uit het gesprek

- **Demo-kritiek:** het dashboard zag er bruikbaar uit maar wás het niet. Demodata was inconsistent (200 bezoekers → 14 man personeel; twee rijen met gelijke bezoekers maar verschillend drukte-label en gelijke bezetting). Te veel meta-informatie (aantal datapunten, datakwaliteit) die een uitbater niets zegt.
- **Wat de uitbater wél wil zien:** verwachte omzet, wie waar inplannen, wat dat bespaart, welke voorraad te bestellen, en productverkoop per uur (cocktails 's middags bij mooi weer, bier/wijn 's avonds → voorbereiding).
- **Werkwijze vandaag:** personeelsplanning op gevoel per afdeling; voorraad met par-levels ("vijf kratten hoog") op vaste bestelmomenten (zondag- en woensdagavond) bij de brouwerij; kassasysteem zonder API (manager bouwt na dit jaar zijn eigen kassasysteem); pas 3 maanden actief dus beperkte historiek.
- **Afdelingen:** Bar buiten (2 personen normaal, 3 bij groot feestje — bepaald door verwacht aantal gasten van geboekte evenementen), Bar binnen (2 personen, waarvan keuken 1).

## Bouwvolgorde (aanpak "Basis-eerst")

1. **Fase 1 — Kern:** actiegericht dashboard + personeelslogica per afdeling + realistische demodata.
2. **Fase 2 — Voorraad & bestelflow** (brouwerij, human-in-the-loop).
3. **Fase 3 — Modules:** evenementen, uur-import (CSV), uur-trends productmix.
4. **Doorlopend:** cold-start-blend in de FastAPI-backend.

Na fase 2 is een overtuigend vervolggesprek met Waterfront mogelijk.

---

## Sectie 1 — Actiegericht dashboard + personeelslogica per afdeling

Het dashboard wordt herbouwd rond de vier vragen van de uitbater:

1. **"Wat is m'n verwachte omzet?"** — Grote KPI vandaag + 7-daagse mini-forecast, met weer.
2. **"Wie moet ik waar inplannen?"** — Per afdeling (Bar buiten / Bar binnen / Keuken) het geadviseerde aantal, met delta t.o.v. standaard ("+1 buiten wegens evenement").
3. **"Wat bespaar ik?"** — Verschil tussen geadviseerde bezetting en een vaste 'veilige' planning, in euro's (instelbaar gemiddeld uurloon × shifturen).
4. **"Wat moet ik bestellen?"** — Kaart met het volgende bestelmoment (zo/wo) en de status van het bestelvoorstel.

**Verwijderen van het dashboard:** aantal datapunten, datakwaliteit-scores, confidence-uitleg. Deze verhuizen naar "Mijn Data".

**Personeelslogica wordt afdeling-gebaseerd:**
- De platte regel (bezoekersrange → totaal FTE, incl. de hardcoded fallback in `DashboardPage.tsx` en `forecastService.ts` met 14/20 man) vervalt.
- Elke afdeling uit de bestaande Organisatie-module krijgt eigen regels: basisbezetting + opschaalregels (drukteniveau of evenement-gastendrempel → extra persoon).
- Totaal personeel = som van de afdelingen.
- Drukte-label en bezetting komen uit dezelfde berekening — nooit meer inconsistente rijen.

**Demodata wordt horeca-realistisch:** Waterfront-profiel (3 zomermaanden, terraszaak, 100–400 bezoekers, bezetting 3–7 personen), intern consistent.

## Sectie 2 — Voorraad & brouwerij-bestelflow

**Productcatalogus per locatie.** Producten met: naam, categorie (bier/fris/wijn/cocktail-ingrediënt), bestel-eenheid (krat, vat, fles), par-level, leverancier (met e-mailadres).

**Voorraadstand = berekend, altijd corrigeerbaar.** Stand = laatste telling + geleverde bestellingen − verkoop − derving. Verkoop komt uit kassadata zodra beschikbaar; zonder kassadata rekent het systeem met verwacht verbruik per bezoeker. Handmatige telling overschrijft de berekende stand (anker tegen drift).

**Derving / "rondje van de zaak":** één instelbaar percentage per locatie (bv. 3%) bovenop het verbruik. Dekt gratis rondjes, breuk en eigen verbruik. Verfijning per product is bewust uitgesteld (YAGNI).

**Bestelflow (human-in-the-loop):**
1. Op zondag- en woensdagavond (tijdstippen instelbaar per locatie) genereert het systeem een bestelvoorstel: per product → verwacht verbruik tot het volgende bestelmoment (forecast × verbruik per bezoeker, + derving) − huidige voorraad, afgerond naar boven op hele bestel-eenheden.
2. Bij te weinig verkoopdata valt het voorstel terug op het par-level ("aanvullen tot 5 kratten"). Zodra de forecast beter weet, toont het voorstel beide: "par-level zegt 5, forecast zegt 3" — zichtbare besparing.
3. Het voorstel verschijnt als kaart op het dashboard (+ notificatie). De manager past aantallen aan en keurt goed.
4. Pas na goedkeuring wordt de bestelmail automatisch naar de brouwerij verstuurd. Geen goedkeuring = geen mail.
5. Bij levering bevestigt de manager ("geleverd") en wordt de voorraad bijgeboekt.

**Opslag:** demo-modus in-memory (zoals bestaande demo stores) met gevuld Waterfront-assortiment; echte versie via Supabase-tabellen `products`, `suppliers`, `stock_mutations`, `orders`.

## Sectie 3 — Modules: evenementen, kassa-koppelvlak, uur-trends

**Evenementenmodule.** Invoer: datum, afdeling, verwacht aantal gasten, optioneel type/notitie. Effect:
1. Bezettingsregels — boven een instelbare gastendrempel adviseert het systeem 3 i.p.v. 2 personen buiten.
2. Forecast — een evenementdag krijgt extra verwachte bezoekers/omzet bovenop de baseline.

Geen externe kalenderkoppeling in deze fase; de manager voert eigen boekingen in.

**Kassa-koppelvlak, twee stappen:**
- *Nu:* CSV/Excel-import op uurniveau via de bestaande upload-wizard — tweede formaat naast dagtotalen: datum, uur, product(categorie), aantal, omzet.
- *Straks:* generiek push-API-contract: `POST /sales` met simpel JSON-formaat + API-key per locatie, gedocumenteerd op één pagina. Kassasystemen (incl. het eigen systeem dat de Waterfront-manager bouwt) pushen naar ons; wij bouwen geen integraties per kassamerk.

**Uur-trends productmix.** Kaart/tab op het Performance-dashboard: per uur van de dag de verkochte productcategorieën, filterbaar op weertype. Vereist uurdata uit de kassa-import; in demo-modus gevuld met een realistisch uurpatroon (kiem: `HOURLY_PATTERN` in `DashboardPage.tsx`).

## Sectie 4 — Cold-start forecast (baseline + blend)

**Probleem:** XGBoost is onbetrouwbaar met weinig historiek (Waterfront: ~3 maanden). Het huidige client-side fallback-model gebruikt verzonnen multipliers (weekend ×1,1; zomer ×1,1; regen ×0,85; warm ×1,08) en mock-weer.

**Baseline-model (uitlegbaar, werkt vanaf dag één):**
- Skelet: weekdag-gemiddelde uit eigen data × weerfactor × seizoens-/vakantiefactor.
- **Factoren worden geschat uit de eigen data van de klant, niet verzonnen:** koppel historische dagen aan het echte weer van die dag (Open-Meteo historisch, backend haalt dit al op), deel in klassen (zon/bewolkt/regen × temperatuur) en bereken per klasse de omzetratio t.o.v. het weekdag-gemiddelde. Zelfde methode voor weekend/vakantie.
- **Fallback per klasse:** te weinig dagen in een weerklasse → sectorstandaard (mettertijd gekalibreerd over klanten heen).

**Blend:** `forecast = w × XGBoost + (1 − w) × baseline`, waarbij `w` glijdend groeit met de hoeveelheid historiek (indicatief: <8 weken → 0%, 3 maanden → ~25%, 6 maanden → ~60%, 1+ jaar → ~90–100%). Geen harde knip, dus geen plotse sprongen in voorspellingen.

**Integratie:**
- De blend leeft in de FastAPI-backend (`/forecast/json`): backend berekent baseline én XGBoost, blendt, en retourneert één forecast met redenen ("zonnige zaterdag in schoolvakantie").
- De `observations.length >= 60`-gate in `forecastService.ts` vervalt; de backend kan met elke hoeveelheid data uit de voeten.
- Het client-side model blijft als noodfallback wanneer de backend onbereikbaar is.
- Op het dashboard geen datakwaliteit-badges; in "Mijn Data" blijft zichtbaar hoeveel historiek er is.

## Sectie 5 — Module-architectuur

- **Basis (elke klant):** dashboard, forecast, personeelslogica per afdeling, upload, organisatie.
- **Modules (per locatie aan/uit):** Voorraad & bestellen, Evenementen, Uur-trends. Een `modules`-config per locatie bepaalt sidebar-items en dashboard-kaarten.

## Buiten scope (bewust)

- Integraties per kassamerk (het push-API-contract vervangt dit).
- Externe evenementenkalenders (C-Mine, Bokrijk) — later te overwegen.
- Derving per product — één percentage per locatie volstaat nu.
- WhatsApp-notificaties — mail eerst.

## Succescriteria

1. Elke rij in demo én forecast is intern consistent (bezoekers ↔ drukte ↔ bezetting) en horeca-realistisch.
2. Een uitbater ziet op het dashboard binnen 5 seconden: omzet, bezetting per afdeling, besparing, bestelactie — en geen meta-informatie.
3. De bestelflow doorloopt voorstel → aanpassen → goedkeuren → mail → geleverd, volledig demonstreerbaar in demo-modus.
4. De forecast geeft ook met 3 maanden data een geloofwaardig advies met uitlegbare redenen.
