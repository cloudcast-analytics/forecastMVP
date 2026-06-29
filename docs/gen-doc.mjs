import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, LevelFormat, PageNumber,
} from 'docx'
import fs from 'fs'
import path from 'path'

const BLUE   = '1A44E8'
const DKBLUE = '0F2A9E'
const LGRAY  = 'F2F4FF'
const MGRAY  = 'E2E6F0'
const WHITE  = 'FFFFFF'
const TEXT   = '1A1F36'
const MUTED  = '6B7280'

const border = (color = 'D1D5DB') => ({ style: BorderStyle.SINGLE, size: 1, color })
const borders = (color) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) })
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' })
const noBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() })

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 32, bold: true, color: TEXT })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: BLUE })],
  })
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 22, bold: true, color: DKBLUE })],
  })
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: TEXT, ...opts })],
  })
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: TEXT })],
  })
}

function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: TEXT })],
  })
}

function spacer(lines = 1) {
  return Array.from({ length: lines }, () =>
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: '', size: 20 })] })
  )
}

function headerRow(cells, widths) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: borders('C0C8F0'),
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text, font: 'Arial', size: 18, bold: true, color: WHITE })],
      })],
    })),
  })
}

function dataRow(cells, widths, shade = false) {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: borders('D1D5DB'),
      shading: { fill: shade ? LGRAY : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text, font: 'Arial', size: 18, color: TEXT })],
      })],
    })),
  })
}

function priorityRow(cells, widths, shade = false) {
  const prio = cells[2]
  const prioColor = prio === 'Hoog' ? 'D14343' : prio === 'Middel' ? 'B45309' : '4B5563'
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: borders('D1D5DB'),
      shading: { fill: shade ? LGRAY : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({
          text,
          font: 'Arial',
          size: 18,
          color: i === 2 ? prioColor : TEXT,
          bold: i === 2,
        })],
      })],
    })),
  })
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 360 } } } }],
      },
      {
        reference: 'numbers',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 360 } } } }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 20, color: TEXT } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: TEXT },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: DKBLUE },
        paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
          children: [
            new TextRun({ text: 'Gespreksgids — Waterfront Genk', font: 'Arial', size: 18, bold: true, color: BLUE }),
            new TextRun({ text: '\t\tCloudCast Analytics', font: 'Arial', size: 18, color: MUTED }),
          ],
          tabStops: [{ type: 'right', position: 9638 }],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'CloudCast Analytics · schaekers.sven@gmail.com · cloudcast-analytics.vercel.app · Pagina ', font: 'Arial', size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: MUTED }),
          ],
        })],
      }),
    },
    children: [
      // ── TITLE ──
      h1('Gespreksgids — Waterfront Genk'),
      p('Doel: pijnpunten blootleggen, behoefte valideren, gesprek openen voor demo.', { color: MUTED, italics: true }),
      ...spacer(1),

      // ── SECTIE 1: VRAGEN ──
      h2('1. Vragen voor het gesprek'),

      h3('Huidige werkwijze'),
      bullet('Hoe plannen jullie momenteel het personeel? (Excel, app, op gevoel?)'),
      bullet('Wie maakt de planning en hoeveel tijd kost dat per week?'),
      bullet('Hoe ver op voorhand plan je doorgaans?'),
      bullet('Werken jullie met vaste medewerkers, studenten of een mix?'),
      ...spacer(1),

      h3('Weersinvloed & drukte'),
      bullet('Hoe reageer je op een weersverwachting — plan je daar al op vooruit?'),
      bullet('Is het wel eens voorgekomen dat je veel te veel of veel te weinig personeel had op een dag?'),
      bullet('Wat deed je dan? Mensen naar huis sturen, of te weinig service leveren?'),
      bullet('Heb je een idee hoeveel meer bezoekers je krijgt op een zonnige zaterdag vs. een bewolkte?'),
      ...spacer(1),

      h3('Omzet & data'),
      bullet('Houd je bij hoeveel omzet je per dag of per weekend draait?'),
      bullet('Gebruik je historische cijfers om planningen te maken, of ga je meer op gevoel?'),
      bullet('Weet je welke dagen of periodes jullie beste zijn? (schoolvakanties, zomer, evenementen?)'),
      bullet('Zijn er lokale evenementen in Genk die invloed hebben op jullie bezoekers? (C-Mine, Bokrijk, …)'),
      ...spacer(1),

      h3('Voorraad'),
      bullet('Hoe beheer je momenteel de voorraad — drank, voedsel?'),
      bullet('Bestel je op vaste momenten of op gevoel?'),
      bullet('Is het wel eens voorgevallen dat je tekort had op een drukke dag? Of te veel had ingekocht?'),
      bullet('Wat kost je dat — in geld, verspilling, verloren omzet?'),
      ...spacer(1),

      h3('Pijnpunten & frustraties'),
      bullet('Wat is het moeilijkste aan de planning vandaag?'),
      bullet('Heb je het gevoel dat je regelmatig geld laat liggen — door slechte service of onnodige loonkost?'),
      bullet('Als je één ding kon verbeteren aan de manier waarop je nu werkt, wat zou dat zijn?'),
      ...spacer(1),

      // ── SECTIE 2: HUIDIGE MODULES ──
      h2('2. Huidige modules in de app'),
      p('Wat vandaag al beschikbaar is voor Waterfront Genk:', { color: MUTED }),
      ...spacer(1),

      new Table({
        width: { size: 9638, type: WidthType.DXA },
        columnWidths: [2200, 6000, 1438],
        rows: [
          headerRow(['Module', 'Wat het doet', 'Status'], [2200, 6000, 1438]),
          dataRow(['Dashboard', 'Overzicht van de actuele forecast: bezoekers, omzet, personeel, drukteniveau voor de komende 7 dagen', '✅ Live'], [2200, 6000, 1438], false),
          dataRow(['Data Upload', 'CSV-upload van historische omzet- en bezoekersdata', '✅ Live'], [2200, 6000, 1438], true),
          dataRow(['Mijn Data', 'Inzicht in geüploade bestanden en historische data', '✅ Live'], [2200, 6000, 1438], false),
          dataRow(['Forecast', '14-daagse voorspelling van bezoekers, omzet en benodigde FTE op basis van weer + historische data', '✅ Live'], [2200, 6000, 1438], true),
          dataRow(['Personeelsregels', 'Instellen van personeelsnormen per drukteniveau (min/max FTE per omzetrange)', '✅ Live'], [2200, 6000, 1438], false),
          dataRow(['Multi-locatie', 'Meerdere locaties per bedrijf beheren, elk met eigen data en forecast', '✅ Live'], [2200, 6000, 1438], true),
          dataRow(['Bedrijfsbeheer', 'Bedrijven en locaties aanmaken en beheren (enkel admin)', '✅ Live'], [2200, 6000, 1438], false),
        ],
      }),
      ...spacer(1),

      // ── SECTIE 3: GEPLANDE MODULES ──
      h2('3. Geplande modules (in ontwikkeling)'),
      ...spacer(1),
      numbered('Organisatiestructuur — Configureerbare afdelingen en functies per bedrijf en locatie (bv. Bar, Keuken, Terras). Per dag evalueren of een afdeling onderbezet, goed of overbezet was. Die data voedt het forecastingmodel.'),
      numbered('Data Upload Wizard met Cloudy — Stapsgewijze upload-begeleiding door de AI-assistent “Cloudy”. Automatische kolomherkenning, validatie en duidelijke foutmeldingen. Maakt onboarding toegankelijk voor niet-technische gebruikers.'),
      numbered('Forecast Dashboard met Cloudy Advies — Automatische tekstuele adviezen naast de forecast (“Zaterdag +22% verwacht — plan 3 extra medewerkers in voor het terras”). Historische terugblik en Cloudy chatbot.'),
      numbered('Performance Dashboard — KPI-kaarten (omzet, groei, beste/slechtste dag), omzetgrafieken per periode, vergelijkingsmodus (deze week vs. vorige week), weer-correlatie.'),
      numbered('Cloudy — Globale AI-Assistent — Zwevende chatbot beschikbaar op elke pagina. Context-aware: op de forecast-pagina geeft Cloudy personeelsadvies, op performance beantwoordt hij vragen over historische trends.'),
      ...spacer(1),

      // ── SECTIE 4: EXTRA MODULES ──
      h2('4. Extra modules — specifiek voor Waterfront Genk'),
      p('Aanvullende mogelijkheden om te bespreken tijdens het gesprek:', { color: MUTED }),
      ...spacer(1),

      new Table({
        width: { size: 9638, type: WidthType.DXA },
        columnWidths: [2400, 5638, 1600],
        rows: [
          headerRow(['Module', 'Wat het oplost voor Waterfront', 'Prioriteit'], [2400, 5638, 1600]),
          priorityRow(['Voorraadplanning', 'Op basis van de bezoekers-forecast automatisch de benodigde voorraad berekenen (x drank per bezoeker). Zo bestel je precies genoeg voor een zonnig weekend en bouw je af voor een regenachtige week.', 'Hoog'], [2400, 5638, 1600], false),
          priorityRow(['Dagelijkse push-notificatie', 'Elke ochtend automatisch een bericht (mail of WhatsApp) met de verwachting voor die dag en morgen: “Morgen zonnig en 28°C — verwacht 890 bezoekers, plan 22 FTE in.”', 'Hoog'], [2400, 5638, 1600], true),
          priorityRow(['Weerdrempel-alerts', 'Automatische melding als het weerbericht onder een bepaalde drempel zakt (bv. regen + <18°C) zodat je op tijd kunt afschalen — terras dicht, minder personeel, minder bestelling.', 'Hoog'], [2400, 5638, 1600], false),
          priorityRow(['Maandelijks rapport', 'Automatisch gegenereerd PDF-rapport per maand: omzet, bezoekers, weersinvloed, beste en slechtste dag, vergelijking met vorige maand en vorig jaar.', 'Middel'], [2400, 5638, 1600], true),
          priorityRow(['Evenementenkalender', 'Lokale evenementen in Genk en Limburg koppelen aan de forecast (C-Mine Festival, Bokrijk, schoolvakanties, wielerwedstrijden). Automatisch gewicht toekennen aan dagen met impact.', 'Middel'], [2400, 5638, 1600], false),
          priorityRow(['Terras-/weerscore', 'Een dagelijkse “terrasscore” (1-10) op basis van temperatuur, wind, neerslag en zonuren — specifiek afgestemd op buitenterrassen. Sneller te lezen dan een weersrapport.', 'Middel'], [2400, 5638, 1600], true),
          priorityRow(['Kassaintegratie', 'Koppeling met het kassasysteem zodat werkelijke omzetdata automatisch binnenkomt — geen manuele upload meer nodig.', 'Laag'], [2400, 5638, 1600], false),
          priorityRow(['Waterskiclub koppeling', 'Inzicht in geplande waterskiactiviteiten van de club, automatisch meegenomen in de forecast als extra druktefactor.', 'Laag'], [2400, 5638, 1600], true),
        ],
      }),
      ...spacer(1),

      // ── SECTIE 5: NOTITIES ──
      h2('5. Notities'),
      ...spacer(12),
    ],
  }],
})

const outPath = path.join(
  'C:/Users/eddys/OneDrive (1)/Zakelijke documenten/cloudcastmvp/docs',
  'waterfront-genk-gesprek.docx'
)

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf)
  console.log('Aangemaakt:', outPath)
})
