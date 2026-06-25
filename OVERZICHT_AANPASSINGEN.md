# Overzicht Aanpassingen — CloudCast MVP

Dit document bevat alle geplande aanpassingen en toevoegingen aan de CloudCast MVP-applicatie. Per punt staat de status, een beschrijving van wat er moet gebeuren, en wie eraan heeft gewerkt.

**Legende status:**
- [ ] Nog niet gestart
- [~] In uitvoering
- [x] Afgerond

---

## 1. Organisatiestructuur Module

**Status:** [ ] Nog niet gestart
**Bewerkt door:** —
**Afgerond door:** —

Configureerbare bedrijfsstructuur met afdelingen en functies. Elke onderneming legt een eigen basis-template vast met afdelingen (bv. Keuken, Zaal, Kassa, Bar) en functies per afdeling (bv. Chef-kok, Kelner, Kassamedewerker). De basis geldt bedrijfsbreed maar is per locatie aanpasbaar — afdelingen kunnen aan/uit gezet worden en functies kunnen per locatie verschillen.

**Concrete onderdelen:**
- Nieuwe pagina "Organisatie" in de sidebar
- CRUD voor afdelingen en functies per bedrijf
- Per locatie: activeren/deactiveren van afdelingen, headcount per functie instellen
- Dagelijkse bezettingsevaluatie per afdeling (onderbezet / goed / overbezet) — snel en minimale belasting voor de ondernemer
- Evaluatiedata wordt opgeslagen als toekomstige input voor het forecasting-model

---

## 2. Data Upload met Cloudy Wizard

**Status:** [ ] Nog niet gestart
**Bewerkt door:** —
**Afgerond door:** —

De huidige upload-flow vervangen door een stapsgewijze wizard begeleid door "Cloudy" (de AI-assistent). Cloudy legt stap voor stap uit welke datastructuur nodig is (kolommen, formaat, minimale hoeveelheid data), valideert het geüploade bestand, en helpt bij het mappen van kolommen naar de juiste velden. De wizard minimaliseert uploadfouten en maakt het proces toegankelijk voor niet-technische gebruikers.

**Concrete onderdelen:**
- Stapsgewijze wizard UI met Cloudy-begeleiding
- Uitleg per stap over verwachte datastructuur
- Automatische kolomherkenning en validatie
- Duidelijke foutmeldingen en suggesties bij problemen
- Integratie met het bestaande parsing/validatie-systeem

---

## 3. Forecast Dashboard + Cloudy Advies

**Status:** [ ] Nog niet gestart
**Bewerkt door:** —
**Afgerond door:** —

Het bestaande forecast dashboard uitbreiden met automatisch gegenereerde adviezen en een Cloudy chatbot-integratie. De forecast toont niet alleen een grafiek en tabel, maar geeft ook concrete, bruikbare adviezen (bv. "Donderdag +18% omzet verwacht t.o.v. vorige week — plan 2 extra medewerkers in voor de zaal"). Via Cloudy kan de gebruiker doorvragen over de forecast. Daarnaast wordt historische terugblik toegevoegd — de gebruiker kan niet alleen de toekomst bekijken maar ook terug navigeren in de tijd.

**Concrete onderdelen:**
- Automatische tekstuele adviezen naast de forecast-grafiek
- Adviezen gekoppeld aan personeelsplanning en omzetverwachting
- Cloudy chatbot-integratie op de forecast-pagina
- Historische navigatie: tijdsperiode-selector om terug te kijken
- Vergelijking huidige forecast met werkelijke resultaten uit het verleden

---

## 4. Performance Dashboard + Historische Omzet

**Status:** [ ] Nog niet gestart
**Bewerkt door:** —
**Afgerond door:** —

Een nieuw performance dashboard met KPI's en historische omzetgegevens. Overzicht van trends over weken en maanden, vergelijkingen (deze week vs. vorige week, dit jaar vs. vorig jaar), gekoppeld aan weer- en bezettingsdata. Inclusief een Cloudy chatbot-paneel om vragen te stellen over prestaties en patronen in de data.

**Concrete onderdelen:**
- KPI-kaarten: omzet, groei, gemiddelde dagomzet, beste/slechtste dag
- Omzetgrafieken met selecteerbare tijdsperiodes
- Vergelijkingsmodus: periode vs. periode
- Weer-correlatie: hoe beïnvloedde het weer de omzet?
- Bezettingsdata: link tussen personeel en prestaties
- Cloudy chatbot-integratie voor vragen over performance

---

## 5. Cloudy — Globale AI-Assistent

**Status:** [ ] Nog niet gestart
**Bewerkt door:** —
**Afgerond door:** —

Een zwevende chatbot-knop (rechtsonder) die op elke pagina beschikbaar is. Cloudy is context-aware: afhankelijk van de pagina waarop de gebruiker zich bevindt, past Cloudy het gesprek en de hulp aan. Op de upload-pagina helpt Cloudy met datastructuur en validatie, op forecast geeft Cloudy advies over personeelsplanning, op performance beantwoordt Cloudy vragen over historische trends en patronen.

**Concrete onderdelen:**
- Zwevende knop component (rechtsonder, altijd zichtbaar)
- Chat-interface met berichtengeschiedenis
- Context-detection per pagina (upload, forecast, performance, organisatie)
- Pagina-specifieke prompts en hulpfuncties
- Persoonlijke, vriendelijke toon ("Cloudy" als karakter)
- Integratie met een LLM-backend voor intelligente antwoorden

---

*Laatst bijgewerkt: 25 juni 2026*
