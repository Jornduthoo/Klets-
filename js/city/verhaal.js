// Het verhaal van de themastad, zichtbaar in de stad. Zwinvliet (thema 1) begint onder water: De Slijkkraak,
// een slijkmonster uit de Noordzee, verstopt de reien. Week per week en labo per labo wordt de stad weer gered,
// zoals de planning in de handleiding het beschrijft (zie WEKEN_WW[].stad in data/waterwereld-inhoud.js).
//
// Pure rekenkunde, geen tekenen: de 3D-stad, de 2D-kaart en het digibord tonen allemaal dezelfde toestand.
// Er is geen eigen opslag: alles volgt uit wat er al is.
//   - de week van de klas (settings.huidigeWeek),
//   - de labo's (water.labos: deel 0..1 en klaar, uit de labotoetsen; plus de werkbanken voor "labo deel 1"),
//   - de Stadsmissie (check) van elke week (missie ww-<week>-check) = de mini-raid van die week,
//   - de geheime codes die reizigers in de Codekluis invulden (pupil.codes),
//   - de overwinning op de eindbaas (water.baasWeg, een gebeurtenis van het digibord).
// Een nieuwe week begint zoals de planning het zegt: wat in een vorige week moest gebeuren, telt als gebeurd
// (de leerkracht zette de klas een week verder). Het water zelf (helder of vuil) blijft strikt de labo's volgen.
import { BEHAALD_GRENS } from '../config.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Welke week hoort bij welke waterzone (dan trekt De Slijkkraak er zijn arm terug). */
export const ZONE_WEEK = { 'reie-zuid': 1, 'reie-noord': 2, minnewater: 3, noordrei: 4, haven: 4, fontein: 5 };

/** Per week: welk labo is "labo 1" en "labo 2", en welke geheime code hoort erbij (thema 1). */
const WEKEN = {
  1: { labo1: ['waterkringloop', 'deel'], labo2: ['waterkringloop', 'klaar'], code: 'REGENBOOG', kop: 'dijver' },
  2: { labo1: ['drijven', 'deel'], labo2: ['drijven', 'klaar'], code: 'ZEILBOOT', kop: 'groenerei' },
  3: { labo1: ['voedselweb', 'deel'], labo2: ['voedselweb', 'klaar'], code: 'KIKKER', kop: 'minnewater' },
  4: { labo1: ['getij', 'klaar'], labo2: ['sluis', 'klaar'], code: 'GETIJDEN', kop: 'haven' },
  5: { labo1: ['waterfilter', 'deel'], labo2: ['waterfilter', 'klaar'], code: 'HELDER', kop: 'rozenhoedkaai' },
};

/** Korte tekst voor de verhaalbalk: eenvoudige zinnen (taal voor nieuwkomers). */
const KORT = {
  1: ['Zwinvliet staat onder water!', 'De Slijkkraak verstopt de reien met slijk. Het water staat tot aan de deuren op de Markt. Help de stad in het Weerstation op het Belfort.'],
  2: ['De bootjes zijn gezonken!', 'De Slijkkraak gooide zand en slib in de reien. De bootjes van de Scheepswerf liggen op de bodem. Zoek uit wat drijft en wat zinkt.'],
  3: ['Het Minnewater is stil.', 'Er ligt een laag slijk op het water. De zwanen en de kikkers zijn weg. Ontdek in het Waterlabo wie er in het water woont.'],
  4: ['De sluis zit vast!', 'De Slijkkraak kitte de sluisdeuren dicht met slijk. Een boot vol fruit ligt scheef op het slib. Leer alles over eb en vloed.'],
  5: ['De Slijkkraak komt terug!', 'Hij kroop met slib en afval naar de reien rond de Markt. Bouw in de Werkplaats iets dat het water proper houdt. Vrijdag verslaan we hem samen.'],
};

/** Alle stappen van het verhaal, voor het voorbeeld (?verhaal=...) en het dashboard. */
export const VERHAAL_STAPPEN = [
  ['w1start', 'Week 1: de stad loopt onder'], ['w1labo1', 'Week 1: na labo 1'], ['w1labo2', 'Week 1: na labo 2'], ['w1raid', 'Week 1: na de mini-raid en REGENBOOG'],
  ['w2start', 'Week 2: de bootjes zijn gezonken'], ['w2labo1', 'Week 2: na labo 1'], ['w2labo2', 'Week 2: na labo 2'], ['w2raid', 'Week 2: na de mini-raid en ZEILBOOT'],
  ['w3start', 'Week 3: het Minnewater is stil'], ['w3labo1', 'Week 3: na labo 1'], ['w3labo2', 'Week 3: na labo 2'], ['w3raid', 'Week 3: na de mini-raid en KIKKER'],
  ['w4start', 'Week 4: de sluis zit vast'], ['w4labo1', 'Week 4: na de rivierreis'], ['w4labo2', 'Week 4: na de sluiswachter'], ['w4raid', 'Week 4: na de mini-raid en GETIJDEN'],
  ['w5start', 'Week 5: De Slijkkraak komt terug'], ['w5labo1', 'Week 5: de bouwplaatsen'], ['w5labo2', 'Week 5: het waterfilter werkt'],
  ['eindbaas', 'Week 5: de eindbaas (raid)'], ['gewonnen', 'De Slijkkraak is verslagen'],
];
const ALIAS = { start: 'w1start', week1: 'w1start', week2: 'w2start', week3: 'w3start', week4: 'w4start', week5: 'w5start', raid: 'eindbaas', einde: 'gewonnen', klaar: 'gewonnen' };

/** Is dit thema een thema met een verhaalstad? (voorlopig enkel thema 1, Zwinvliet) */
export const heeftVerhaal = (thema) => thema?.id === 'waterwereld';

/**
 * Lees de invoer van het verhaal uit de klasgegevens.
 * uit: { week, labos: { id: { deel, klaar } }, werkbank: { id: aantal }, checks: { week: aantal }, drempel, codes: Set, baasWeg, actief: { week: bool } }
 */
export function verhaalInvoer({ thema, attempts = [], pupils = [], settings = {}, water = null } = {}) {
  const echt = attempts.filter(a => a.bron !== 'voorbeeld');
  const checkWeek = {};
  for (const m of thema?.missies || []) if (m.check) checkWeek[m.id] = m.week;
  const checks = {}, werkbank = {}, actief = {};
  const telIn = (obj, k, pid) => (obj[k] = obj[k] || new Set()).add(pid);
  for (const a of echt) {
    if (a.week) actief[a.week] = true;
    const w = checkWeek[a.missie];
    if (w && a.totaal && a.goed / a.totaal + 1e-9 >= BEHAALD_GRENS) telIn(checks, w, a.pid);
    const m = /^labo:([a-z0-9-]+):([a-z]+)$/.exec(a.missie || '');
    if (m && m[2] !== 'test') telIn(werkbank, m[1], a.pid);
  }
  const codes = new Set();
  for (const p of pupils) if (!p.leerkracht) for (const c of p.codes || []) codes.add(String(c).toUpperCase());
  const labos = {};
  for (const [id, l] of Object.entries(water?.labos || {})) labos[id] = { deel: l.deel || 0, klaar: !!l.klaar };
  return {
    week: Math.max(1, Math.min(5, Number(settings.huidigeWeek) || 1)),
    labos, drempel: water?.drempel || 1, baasWeg: !!water?.baasWeg, codes, actief,
    checks: Object.fromEntries(Object.entries(checks).map(([w, s]) => [w, s.size])),
    werkbank: Object.fromEntries(Object.entries(werkbank).map(([id, s]) => [id, s.size])),
  };
}

/** Het voorbeeld van een stap (?verhaal=w3start): alsof de klas zo ver staat. Geeft null als de code onbekend is. */
export function previewInvoer(code, thema) {
  if (code == null || code === '') return null;
  let k = String(code).toLowerCase().trim();
  k = ALIAS[k] || k;
  let i = VERHAAL_STAPPEN.findIndex(s => s[0] === k);
  if (i < 0 && /^0?(\.\d+)?$|^1(\.0+)?$/.test(k)) i = Math.round(parseFloat(k) * (VERHAAL_STAPPEN.length - 1));   // ?verhaal=0.5
  if (i < 0) return null;
  const stap = VERHAAL_STAPPEN[i][0];
  const week = stap.startsWith('w') ? +stap[1] : 5;
  const sub = stap.startsWith('w') ? ['start', 'labo1', 'labo2', 'raid'].indexOf(stap.slice(2)) : stap === 'eindbaas' ? 3 : 4;
  const labos = {}, checks = {}, codes = new Set();
  for (const id of Object.keys(thema?.labos || {})) labos[id] = { deel: 0, klaar: false };
  const zet = (id, hoe) => { if (!labos[id]) return; labos[id] = hoe === 'klaar' ? { deel: 1, klaar: true } : { deel: Math.max(labos[id].deel, 0.5), klaar: labos[id].klaar }; };
  for (let w = 1; w <= week; w++) {
    const W = WEKEN[w], hier = w === week ? sub : 9;
    if (hier >= 1) zet(W.labo1[0], W.labo1[1]);
    if (hier >= 2) zet(W.labo2[0], W.labo2[1]);
    if (hier >= 3 && w < 5) { checks[w] = 99; codes.add(W.code); }
  }
  const baasWeg = stap === 'gewonnen';
  if (baasWeg) codes.add('HELDER');
  return { week, labos, drempel: 1, baasWeg, codes, checks, werkbank: {}, actief: { [week]: sub > 0 }, preview: stap, raid: stap === 'eindbaas' };
}

/** Een waterstand die bij een voorbeeld hoort (zelfde vorm als water.waterStand). */
export function previewWater(invoer, thema) {
  const zones = {};
  for (const [zone, naam] of Object.entries(thema?.zones || {})) zones[zone] = { zone, naam, helder: 0, aantal: 0, drempel: 1, labo: null, tekst: '' };
  const labos = {};
  for (const [id, lab] of Object.entries(thema?.labos || {})) {
    const l = invoer.labos[id] || { deel: 0, klaar: false };
    labos[id] = { id, naam: lab.naam, aantal: l.klaar ? 1 : 0, drempel: 1, klaar: l.klaar, deel: l.deel, zone: lab.herstel?.zone || null, tekst: lab.herstel?.tekst || '' };
    const z = zones[lab.herstel?.zone];
    if (z) { z.labo = id; z.helder = Math.max(z.helder, l.deel); z.tekst = lab.herstel?.tekst || ''; z.aantal = labos[id].aantal; }
  }
  if (invoer.baasWeg) for (const z of Object.values(zones)) z.helder = 1;
  const lijst = Object.values(zones);
  return { zones, labos, helder: lijst.length ? lijst.reduce((s, z) => s + z.helder, 0) / lijst.length : 0, baasWeg: invoer.baasWeg, drempel: 1, voorbeeld: true };
}

/**
 * De toestand van het verhaal in de stad.
 * in: invoer (verhaalInvoer of previewInvoer) en de waterstand (zones.helder)
 */
export function verhaalStand(inv, water, thema) {
  if (!heeftVerhaal(thema) || !inv) return { actief: false, armen: {}, w: {}, kop: { zicht: false }, vloed: 0, plassen: 0 };
  const week = inv.week, baas = inv.baasWeg;
  const lab = (id) => inv.labos[id] || { deel: 0, klaar: false };
  // labo deel 1: de helft van de nodige reizigers haalde de toets, of genoeg reizigers deden de werkbanken
  const deel1 = (id) => lab(id).deel >= 0.5 || lab(id).klaar || (inv.werkbank[id] || 0) >= inv.drempel;
  const stapGedaan = ([id, hoe]) => (hoe === 'klaar' ? lab(id).klaar : deel1(id));
  // wat in een vorige week moest gebeuren, telt als gebeurd
  const voorbij = (w) => week > w || baas;
  const labo1 = (w) => voorbij(w) || stapGedaan(WEKEN[w].labo1);
  const labo2 = (w) => voorbij(w) || stapGedaan(WEKEN[w].labo2);
  const raid = (w) => voorbij(w) || (inv.checks[w] || 0) >= inv.drempel;
  const code = (c) => inv.codes.has(c);
  const helder = (z) => water?.zones?.[z]?.helder ?? 0;

  // de stap van deze week (voor de verhaalbalk en het voorbeeld)
  const sub = baas ? 4 : raid(week) && week < 5 ? 3 : labo2(week) ? 2 : labo1(week) ? 1 : 0;
  const stap = baas ? 'gewonnen' : `w${week}${['start', 'labo1', 'labo2', 'raid'][Math.min(3, sub)]}`;

  // hoogwater: week 1 staat de stad onder water; elk labo laat het zakken, na de mini-raid is het uit de straten
  let vloed = 1;
  if (labo1(1)) vloed = 0.72;
  if (labo2(1)) vloed = 0.45;
  if (raid(1)) vloed = 0;
  // plassen en natte kasseien blijven nog even liggen
  const plassen = baas ? 0 : week === 1 ? (raid(1) ? 0.75 : 1) : week === 2 ? 0.45 : 0;

  // de armen van De Slijkkraak: elke zone heeft er een; hij trekt hem terug als het water helder wordt
  // en laat hem los (hij verdampt) na de mini-raid van die week
  const armen = {};
  for (const [zone, w] of Object.entries(ZONE_WEEK)) {
    if (baas) { armen[zone] = 0; continue; }
    if (w < 5 && raid(w)) { armen[zone] = 0; continue; }
    armen[zone] = clamp01(1 - 0.6 * helder(zone));
  }
  // de fontein spuit weer (labo van week 5 gehaald of code HELDER): dan zit er geen arm meer in de schaal
  if (helder('fontein') >= 1 || inv.codes?.has?.('HELDER')) armen.fontein = 0;
  // week 5: grijze slijkarmen met plastic in de reien rond de Markt
  armen.markt = !baas && week >= 5 ? clamp01(1 - 0.55 * lab('waterfilter').deel) : 0;

  // de kop: elke week duikt hij ergens anders op; na de mini-raid van de week loert hij enkel nog met zijn ogen
  const schaal = [1.0, 0.92, 0.88, 1.2, 1.1][week - 1] * (1 - 0.08 * Math.min(2, sub));
  const kop = { zicht: !baas, plek: WEKEN[week].kop, schaal, diep: week < 5 && raid(week) ? 0.72 : 0 };

  const w = {
    weerstationLicht: labo1(1),
    windvaanKapot: !labo2(1),
    weerscherm: labo2(1),
    regenboogCode: code('REGENBOOG'),
    masten: week >= 2 && !labo1(2),
    slijkbank: week >= 2 && !raid(2),
    zeilboot: code('ZEILBOOT'),
    waterlaboLicht: week > 3 || baas || (week === 3 && (labo1(3) || !!inv.actief[3])),
    rietGroen: labo2(3),
    lelies: labo2(3),
    vlonder: code('KIKKER'),
    sluisVast: !labo2(4),
    fruitboot: week < 4 && !baas ? null : labo2(4) ? 'binnen' : 'scheef',
    zeehondenBank: raid(4),
    getijmeter: code('GETIJDEN'),
    bouwplaatsen: baas ? 3 : week < 5 ? 0 : lab('waterfilter').klaar ? 3 : labo1(5) ? 2 : 1,
    fonteinAan: code('HELDER') || baas,
    lampjes: code('HELDER') || baas,
    feest: baas,
    garnaal: baas,
  };
  const nArmen = Object.values(armen).filter(a => a > 0.05).length;
  const [titel, zin] = baas ? ['De Slijkkraak is verslagen!', 'Het water is helder. De fontein spuit, de lampjes branden en de zwanen zijn terug. Proficiat, reizigers!'] : KORT[week];
  const extra = baas ? '' : vloed > 0 ? 'Elk labo laat het water een beetje zakken.' : nArmen ? `Nog ${nArmen} slijkarm${nArmen === 1 ? '' : 'en'} in de stad.` : '';
  const stapNaam = (VERHAAL_STAPPEN.find(x => x[0] === (inv.preview || stap)) || [])[1] || stap;
  return { actief: true, week, stap, stapNaam, sub, vloed, plassen, armen, kop, w, baasWeg: baas, preview: inv.preview || null, raidVoorbeeld: !!inv.raid,
    tekst: { titel, zin, extra } };
}

/** Waar de kop opduikt (midden van de kop, in het water). */
export const KOP_PLEKKEN = {
  dijver: { x: 0.45, z: 19.8 },
  groenerei: { x: 0, z: -29.4 },
  minnewater: { x: 2.4, z: 28.7 },
  haven: { x: -4.2, z: -65.0 },
  rozenhoedkaai: { x: 0, z: 12.4 },
};

/** De armen: per zone een of meer, van een punt in het water (b) over een brug, kaai of sluis naar een punt (t). */
export const ARMEN = [
  // de reien aan de Rozenhoedkaai (week 1)
  { zone: 'reie-zuid', b: [0.9, 18.0], t: [-0.7, 13.5], h: 2.3, r: 0.4 },          // over de brug over de Dijver
  { zone: 'reie-zuid', b: [19.6, 0.7], t: [20.8, -3.3], h: 1.7, r: 0.32 },          // op de kaai van de Spiegelrei
  { zone: 'reie-zuid', b: [28.6, -9.6], t: [32.6, -11.2], h: 1.6, r: 0.32 },        // over de Oostvest naar de wal
  // de reien bij de Scheepswerf (week 2)
  { zone: 'reie-noord', b: [0.7, -21.6], t: [0.3, -26.0], h: 2.1, r: 0.36 },         // over de brug over de Groenerei
  { zone: 'reie-noord', b: [-19.6, -0.7], t: [-20.8, 3.3], h: 1.7, r: 0.32 },        // op de kaai van de Langerei
  { zone: 'reie-noord', b: [-28.8, 7.0], t: [-32.8, 8.2], h: 1.6, r: 0.32 },         // over de Westvest
  // het Minnewater (week 3)
  { zone: 'minnewater', b: [-4.2, 28.0], t: [-5.6, 25.0], h: 1.9, r: 0.36 },
  { zone: 'minnewater', b: [6.4, 29.4], t: [9.6, 31.4], h: 1.6, r: 0.3 },
  // de rei naar de haven (week 4)
  { zone: 'noordrei', b: [0.4, -40.0], t: [2.9, -41.4], h: 1.5, r: 0.3 },
  { zone: 'noordrei', b: [-0.4, -46.5], t: [-2.9, -48.2], h: 1.4, r: 0.28 },
  // de haven en de sluis: een arm houdt de sluisdeuren dicht (week 4)
  { zone: 'haven', b: [-0.8, -52.4], t: [1.0, -56.7], h: 2.5, r: 0.38 },
  { zone: 'haven', b: [7.5, -63.5], t: [11.0, -59.4], h: 2.2, r: 0.42 },
  // de fontein op de Markt: een armpje steekt uit de schaal en stopt de fontein (week 5)
  { zone: 'fontein', b: [0.25, 0.7], t: [1.75, 1.6], h: 1.4, r: 0.2, fontein: true },
  // week 5: grijze slijkarmen met plastic in de reien rond de Markt
  { zone: 'markt', b: [0.7, -11.6], t: [-2.8, -9.8], h: 2.0, r: 0.36, grijs: true },
  { zone: 'markt', b: [11.6, 0.7], t: [9.8, 3.4], h: 2.0, r: 0.36, grijs: true },
  { zone: 'markt', b: [-11.6, -0.7], t: [-9.8, -3.4], h: 2.0, r: 0.36, grijs: true },
];
