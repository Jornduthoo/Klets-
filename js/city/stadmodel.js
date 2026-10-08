// Van klasgegevens naar een stad: welke gebouwen staan er, hoe groot, waar, en hoe ver is de mist weg.
// Puur rekenwerk, geen tekenen. Wordt gedeeld door de leerlingenapp, het digibord en de 2D-terugvalkaart.
import { doelStats, doelStatus, machtVanCode, klasXP } from '../core/model.js';
import { waterStand } from './water.js';
import { verhaalInvoer, verhaalStand, previewInvoer, previewWater } from './verhaal.js';
import { themaVoor } from '../../data/themas.js';
import { WIJKEN, WIJK, kavels, huisKavels, hqPositie, stadStraal, MIST_MIN, MIST_MAX } from './layout.js';

/** Niveau 0..3 van een gebouw: hoe meer reizigers het doel haalden, hoe groter. */
export function niveauVoor(aantal, klasGrootte) {
  if (aantal <= 0) return -1;
  const pct = aantal / Math.max(1, klasGrootte);
  const opPct = pct >= 0.75 ? 3 : pct >= 0.5 ? 2 : pct >= 0.25 ? 1 : 0;
  return Math.min(opPct, aantal - 1, 3);
}
export const NIVEAU_NAAM = ['Klein', 'Groeiend', 'Groot', 'Blikvanger'];

/** Zelfde huisdecoraties als de kosmetiek uit de codekluis. */
export const HUISDECOR = {
  'pet-oranje': 'Oranje luifel',
  'veer': 'Vogelhuisje',
  'muts': 'Rode schoorsteen',
  'feesthoed': 'Feestslinger',
  'bladerkrans': 'Bloementuin',
  'koptelefoon': 'Zonnepanelen',
  'sjaal-rood': 'Rode voordeur',
  'sjaal-blauw': 'Blauwe voordeur',
  'bril': 'Sterrenkijker op het dak',
  'rugzak': 'Fietsenrek',
  'cape': 'Sterrendak',
  'lantaarn': 'Tuinlantaarn',
  'spoor-sterren': 'Sterrenpad',
  'spoor-blaadjes': 'Blaadjespad',
  'spoor-noten': 'Muziekpad',
  'spoor-letters': 'Letterpad',
  'spoor-licht': 'Lichtpad',
  'kleur-goud': 'Gouden dak',
  'kleur-nacht': 'Nachtblauw dak',
};

/**
 * Bouw het stadsmodel.
 * in: { pupils, attempts, settings, doelen, meId, catalog }
 */
export function stadModel({ pupils = [], attempts = [], settings = {}, doelen = {}, meId = null, goalMissies = {}, events = [], thema = null }) {
  const th = thema || themaVoor(settings);
  const leerlingen = pupils.filter(p => !p.leerkracht);
  const n = Math.max(1, leerlingen.length);
  const echte = attempts.filter(a => a.bron !== 'voorbeeld');
  const stats = doelStats(echte);

  // per doel: wie behaalde, wie oefende, wanneer voor het eerst geoefend
  const per = {};
  for (const [pid, s] of Object.entries(stats)) {
    for (const [code, st] of Object.entries(s)) {
      const d = (per[code] = per[code] || { code, behaald: 0, oefenen: 0, ik: false, eerste: Infinity });
      if (doelStatus(st) === 'behaald') { d.behaald++; if (pid === meId) d.ik = true; } else d.oefenen++;
    }
  }
  for (const a of echte.slice().sort((x, y) => x.ts - y.ts)) {
    for (const it of a.items || []) for (const g of it.goals || []) if (per[g] && per[g].eerste === Infinity && it.totaal) per[g].eerste = a.ts;
  }

  const K = kavels();
  const gebouwen = [];
  const wijken = WIJKEN.map(w => ({ ...w, gebouwd: 0, bouwplaatsen: 0, sterkte: null, hq: hqPositie(w) }));
  const wijkIdx = Object.fromEntries(wijken.map((w, i) => [w.macht, i]));
  const perMacht = {};
  for (const d of Object.values(per)) (perMacht[machtVanCode(d.code)] = perMacht[machtVanCode(d.code)] || []).push(d);
  for (const [macht, lijst] of Object.entries(perMacht)) {
    lijst.sort((a, b) => a.eerste - b.eerste || a.code.localeCompare(b.code, 'nl', { numeric: true }));
    const slots = K[macht] || [];
    const w = wijken[wijkIdx[macht]];
    let somSterkte = 0;
    lijst.forEach((d, i) => {
      const slot = slots[i % Math.max(1, slots.length)];
      const geoefend = d.behaald + d.oefenen;
      const sterkte = geoefend ? d.behaald / geoefend : 0;
      somSterkte += sterkte;
      const niveau = niveauVoor(d.behaald, n);
      const g = {
        id: 'doel:' + d.code, code: d.code, macht, type: WIJK[macht].gebouw, doel: doelen[d.code]?.doel || '',
        aantal: d.behaald, oefenen: d.oefenen, geoefend, sterkte, niveau, gebouwd: d.behaald > 0, ik: d.ik,
        slot, extraVerdieping: Math.floor(i / Math.max(1, slots.length)), missies: goalMissies[d.code] || [],
      };
      if (g.gebouwd) w.gebouwd++; else w.bouwplaatsen++;
      gebouwen.push(g);
    });
    w.sterkte = lijst.length ? somSterkte / lijst.length : null;
  }

  // huizen
  const H = huisKavels();
  const volgorde = leerlingen.slice().sort((a, b) => (a.gemaakt || 0) - (b.gemaakt || 0) || a.id.localeCompare(b.id));
  const huizen = volgorde.slice(0, H.length).map((p, i) => ({
    id: 'huis:' + p.id, pid: p.id, naam: p.naam, look: p.look || {}, huis: p.huis || {}, ik: p.id === meId, slot: H[i],
    xp: p.xp || 0,
  }));

  const xp = klasXP(leerlingen);
  // de Grijze Mist is weg: aan de rand van het dal blijft enkel nevel staan
  const mistRadius = MIST_MAX;
  // de waterstand van het thema: elk gehaald labo maakt een zone helder
  let water = waterStand({ thema: th, attempts: echte, pupils, events });
  // het verhaal in de stad (hoogwater, De Slijkkraak, wat er per week en per labo verandert); ?verhaal=w3start toont een voorbeeld
  const pv = previewInvoer(verhaalVoorbeeld(), th);
  if (pv) water = previewWater(pv, th);
  const verhaal = verhaalStand(pv || verhaalInvoer({ thema: th, attempts: echte, pupils, settings, water }), water, th);
  const gebouwenThema = Object.entries(th?.gebouwen || {}).map(([id, g]) => ({
    id: 'plek:' + g.plek, gebouwId: id, naam: g.naam, kort: g.kort, plek: g.plek, gids: g.gids, week: g.week,
    labos: g.labos || [], interieur: g.interieur, uitleg: g.uitleg,
    klaar: (g.labos || []).every(l => water.labos[l]?.klaar),
  }));
  return {
    gebouwen, wijken, huizen, xp, mist: 1 - water.helder, mistRadius, stadR: stadStraal(gebouwen),
    doelXp: n * (settings.mistDoel || 1200), bevolking: leerlingen.length,
    aantalGebouwd: gebouwen.filter(g => g.gebouwd).length,
    water, themaGebouwen: gebouwenThema, thema: { id: th?.id, naam: th?.naam, stad: th?.stad, kleur: th?.kleur },
    week: pv ? pv.week : settings.huidigeWeek || 1, verhaal,
  };
}

/** De waarde van ?verhaal= (of ?voortgang=0..1) in de adresbalk, of null. */
export function verhaalVoorbeeld() {
  try { const q = new URLSearchParams(globalThis.location?.search || ''); return q.get('verhaal') ?? q.get('voortgang'); } catch { return null; }
}

/** Index doelcode -> missies die dat doel oefenen (alle routes). */
export function goalMissieIndex(catalog) {
  const idx = {};
  for (const m of catalog) {
    if (!m.sets) continue;
    const codes = new Set();
    for (const items of Object.values(m.sets)) for (const it of items || []) for (const g of it.goals || []) codes.add(g);
    for (const c of codes) (idx[c] = idx[c] || []).push(m.id);
  }
  return idx;
}
