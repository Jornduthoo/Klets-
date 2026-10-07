// Hoe proper is het water van de stad? Elk labo dat de klas haalt, maakt één zone helder (en zet een
// machine in werking: de sluis, de fontein, de waterval). Na de eindbaas is alles helder en leeft de stad.
//
// Dit is pure rekenkunde op de pogingen, zodat de leerlingenapp, het digibord en de 2D-kaart hetzelfde tonen.
import { BEHAALD_GRENS } from '../config.js';

/** Hoeveel reizigers moeten een labo halen voor de zone helemaal helder is? (de helft van de klas) */
export function drempel(klasGrootte = 1) { return Math.max(1, Math.ceil(Math.max(1, klasGrootte) / 2)); }

/**
 * Waterstand van het thema.
 * in:  { thema, attempts, pupils, events }
 * uit: { zones: { <zone>: { helder (0..1), aantal, drempel, labo, tekst, naam } }, helder (0..1), labos: {...}, baasWeg }
 */
export function waterStand({ thema, attempts = [], pupils = [], events = [] } = {}) {
  const leerlingen = pupils.filter(p => !p.leerkracht);
  const nodig = drempel(leerlingen.length);
  const echt = attempts.filter(a => a.bron !== 'voorbeeld');

  // per labo: wie haalde de test?
  const gehaald = {};
  for (const a of echt) {
    const m = /^labo:([a-z0-9-]+)$/.exec(a.missie || '');
    if (!m || !a.totaal) continue;
    if (a.goed / a.totaal + 1e-9 < BEHAALD_GRENS) continue;
    (gehaald[m[1]] = gehaald[m[1]] || new Set()).add(a.pid);
  }
  const baasWeg = events.some(e => e.soort === 'eindbaas' && e.thema === thema?.id && e.gewonnen)
    || echt.some(a => a.missie === 'eindbaas:' + thema?.eindbaas?.id && a.totaal && a.goed / a.totaal >= BEHAALD_GRENS && a.klas);

  const zones = {};
  for (const [zone, naam] of Object.entries(thema?.zones || {})) zones[zone] = { zone, naam, helder: 0, aantal: 0, drempel: nodig, labo: null, tekst: '' };
  const labos = {};
  for (const [id, lab] of Object.entries(thema?.labos || {})) {
    const aantal = gehaald[id]?.size || 0;
    const deel = Math.min(1, aantal / nodig);
    labos[id] = { id, naam: lab.naam, aantal, drempel: nodig, klaar: deel >= 1, deel, zone: lab.herstel?.zone || null, tekst: lab.herstel?.tekst || '' };
    const z = lab.herstel?.zone && zones[lab.herstel.zone];
    if (z) { z.labo = id; z.aantal = aantal; z.helder = Math.max(z.helder, deel); z.tekst = lab.herstel?.tekst || ''; }
  }
  if (baasWeg) for (const z of Object.values(zones)) z.helder = 1;
  const lijst = Object.values(zones);
  const helder = lijst.length ? lijst.reduce((s, z) => s + z.helder, 0) / lijst.length : 0;
  return { zones, labos, helder, baasWeg, drempel: nodig };
}

/** Helderheid van één zone (0 = dik slijk, 1 = helder water). */
export function zoneHelder(stand, zone) { return stand?.zones?.[zone]?.helder ?? 0; }

/** Korte tekst voor het digibord: "Proper water: 48 %". */
export function waterTekst(stand) { return `Proper water: ${Math.round((stand?.helder || 0) * 100)} %`; }

/** Welke dieren zijn al terug? (voor de stad en voor het digibord) */
export const DIEREN_PER_ZONE = {
  'reie-zuid': ['zwaan', 'eend'],
  'reie-noord': ['vis', 'meerkoet'],
  minnewater: ['zwaan', 'kikker', 'vis'],
  noordrei: ['reiger', 'vis'],
  haven: ['meeuw', 'zeehond'],
  fontein: ['duif'],
};
