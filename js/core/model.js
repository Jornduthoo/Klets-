// Domeinlogica: missiecatalogus, XP en rangen, doelen per leerling, klasstad, geheime codes.
import { RANGEN, XP, BEHAALD_GRENS, MACHT, GIDSEN } from '../config.js';
import { themaVoor } from '../../data/themas.js';

// ---------- Rangen ----------
export function rangVoor(xp = 0) {
  let i = 0;
  for (let k = 0; k < RANGEN.length; k++) if (xp >= RANGEN[k].xp) i = k;
  const nu = RANGEN[i], volgende = RANGEN[i + 1] || null;
  const pct = volgende ? (xp - nu.xp) / (volgende.xp - nu.xp) : 1;
  return { ...nu, index: i, volgende, pct };
}

// ---------- Missiecatalogus uit een thema ----------
/** Alles wat een reiziger in de stad kan doen deze thema-periode: missies, labo's en de eindbaas. */
export function themaCatalog(thema) {
  const missies = [];
  for (const m of thema.missies || []) {
    missies.push({ ...m, kind: m.check ? 'check' : 'oefening', macht: m.domein, thema: thema.id });
  }
  for (const [id, lab] of Object.entries(thema.labos || {})) {
    missies.push({
      id: 'labo:' + id, labo: id, kind: 'labo', week: lab.week, dag: lab.dag, naam: lab.naam, intro: lab.uitleg,
      gids: lab.gids, macht: lab.domein, gebouw: lab.gebouw, stations: lab.stations, sets: lab.test, thema: thema.id,
    });
  }
  const eb = thema.eindbaas;
  if (eb) missies.push({ id: 'eindbaas:' + eb.id, kind: 'eindbaas', week: eb.week, dag: eb.dag, naam: eb.naam,
    intro: eb.verhaal, gids: eb.gids, macht: 'Onderzoek', sets: eb.test, thema: thema.id });
  return missies;
}
/** Het labo achter een missie-id ('labo:<id>'). */
export function laboVan(thema, missieId) { return thema.labos?.[String(missieId).replace(/^labo:/, '')] || null; }

const FALLBACK = { kompas: ['kompas', 'telescoop'], telescoop: ['telescoop', 'kompas'], taalsleutels: ['kompas', 'telescoop'] };

/** Welke route en welke itemset krijgt deze leerling voor deze missie? */
export function kiesSet(missie, routeWens) {
  if (!missie.sets) return { route: routeWens, items: [] };
  for (const r of FALLBACK[routeWens] || FALLBACK.kompas) {
    if (missie.sets[r]?.length) return { route: r, items: missie.sets[r], gevraagd: routeWens };
  }
  const alle = missie.sets.alle || [];
  return { route: routeWens, items: alle, gevraagd: routeWens };
}
export function routeVoor(pupil, macht) { return pupil?.routes?.[macht] || 'kompas'; }

export function isOpen(missie, settings, pupil) {
  return !!(settings.allesOpen || pupil?.leerkracht || missie.week <= settings.huidigeWeek);
}

// ---------- Doelen per leerling ----------
/** stats[pid][code] = {goed, totaal, best, pogingen, laatste, route} */
export function doelStats(attempts) {
  const stats = {};
  for (const a of attempts) {
    if (a.bron === 'voorbeeld') continue;
    const perDoel = {};
    for (const it of a.items || []) {
      for (const g of it.goals || []) {
        perDoel[g] = perDoel[g] || { goed: 0, totaal: 0 };
        perDoel[g].goed += it.goed; perDoel[g].totaal += it.totaal;
      }
    }
    const s = (stats[a.pid] = stats[a.pid] || {});
    for (const [g, v] of Object.entries(perDoel)) {
      if (!v.totaal) continue;
      const cur = (s[g] = s[g] || { goed: 0, totaal: 0, best: 0, pogingen: 0, laatste: 0, route: a.route });
      cur.goed += v.goed; cur.totaal += v.totaal; cur.pogingen++;
      cur.best = Math.max(cur.best, v.goed / v.totaal);
      if (a.ts >= cur.laatste) { cur.laatste = a.ts; cur.route = a.route; }
    }
  }
  return stats;
}
export function doelStatus(st) {
  if (!st || !st.totaal) return 'open';
  return st.best >= BEHAALD_GRENS ? 'behaald' : 'oefenen';
}

// ---------- XP ----------
/** XP voor een nieuwe poging: eerste keer alles + bonus, daarna enkel verbetering. */
export function xpVoorPoging(vorige, goed) {
  const best = vorige.reduce((m, a) => Math.max(m, a.goed || 0), 0);
  const basis = Math.max(0, Math.round(goed) - Math.round(best)) * XP.perJuist;
  return basis + (vorige.length === 0 && goed > 0 ? XP.eersteKeerBonus : 0);
}
export function klasXP(pupils) { return pupils.filter(p => !p.leerkracht).reduce((s, p) => s + (p.xp || 0), 0); }
/** 1 = dikke mist, 0 = helemaal weg. */
export function mistDichtheid(settings, pupils) {
  const n = Math.max(1, pupils.filter(p => !p.leerkracht).length);
  const doel = n * (settings.mistDoel || 1200);
  return Math.max(0, 1 - klasXP(pupils) / doel);
}

// ---------- Klasstad ----------
export function machtVanCode(code, thema = themaVoor()) {
  const d = thema?.doelen?.[code];
  if (d?.domein) return d.domein;
  if (code.startsWith('9-3') || code.startsWith('11.')) return 'Hart';
  if (code.startsWith('3.7')) return 'Onderzoek';
  if (code.startsWith('3.6') || code.startsWith('8.') || code.startsWith('6.')) return 'Techniek';
  if (code.startsWith('3.')) return 'Wetenschap';
  if (code.startsWith('5.')) return 'Geschiedenis';
  return 'Aardrijkskunde';
}
export const GEBOUWTYPE = { Aardrijkskunde: 'Kaartenhuis', Geschiedenis: 'Archiefhuis', Wetenschap: 'Proefhuis', Techniek: 'Werkhuis', Hart: 'Vredestuin', Onderzoek: 'Uitkijktoren' };

/** Elk doel dat minstens één leerling behaalde = één gebouw; hoe meer leerlingen, hoe hoger. */
export function klasstadGebouwen(stats, doelen) {
  const per = {};
  for (const s of Object.values(stats)) {
    for (const [code, st] of Object.entries(s)) {
      if (doelStatus(st) !== 'behaald') continue;
      per[code] = (per[code] || 0) + 1;
    }
  }
  return Object.entries(per).map(([code, aantal]) => {
    const macht = machtVanCode(code);
    return { code, aantal, macht, type: GEBOUWTYPE[macht], doel: doelen?.[code]?.doel || '' };
  }).sort((a, b) => a.code.localeCompare(b.code, 'nl', { numeric: true }));
}

// ---------- Geheime codes en uitrusting ----------
export const KOSMETIEK = {
  'pet-oranje': { naam: 'Tella-pet', slot: 'hoofd' },
  'veer': { naam: 'Woordje-veer', slot: 'hoofd' },
  'muts': { naam: 'Warme muts', slot: 'hoofd' },
  'feesthoed': { naam: 'Feesthoed', slot: 'hoofd' },
  'bladerkrans': { naam: 'Bladerkrans', slot: 'hoofd' },
  'koptelefoon': { naam: 'Byte-koptelefoon', slot: 'hoofd' },
  'sjaal-rood': { naam: 'Rode sjaal', slot: 'nek' },
  'sjaal-blauw': { naam: 'Blauwe sjaal', slot: 'nek' },
  'bril': { naam: 'Ronde bril', slot: 'gezicht' },
  'rugzak': { naam: 'Reizigersrugzak', slot: 'rug' },
  'cape': { naam: 'Sterrencape', slot: 'rug' },
  'lantaarn': { naam: 'Lantaarn (licht in de nacht)', slot: 'hand' },
  'spoor-sterren': { naam: 'Sterrenspoor', slot: 'spoor' },
  'spoor-blaadjes': { naam: 'Blaadjesspoor', slot: 'spoor' },
  'spoor-licht': { naam: 'Lichtspoor', slot: 'spoor' },
  'kleur-goud': { naam: 'Gouden jas', slot: 'kleur' },
  'kleur-nacht': { naam: 'Nachtblauwe jas', slot: 'kleur' },
};
/** Kosmetiek plus de themakledij van alle thema's met inhoud. */
export function uitrustingLijst(thema = themaVoor()) {
  const uit = {};
  for (const [id, v] of Object.entries(thema?.uitrusting || {})) uit[id] = { ...v, thema: thema.id };
  return { ...KOSMETIEK, ...uit };
}

export function normCode(s) { return String(s || '').toUpperCase().replace(/\s+/g, '').replace(/[‐-―_]/g, '-'); }

/** Alle geheime codes van het thema (uit het Expeditieboek), met de week waar ze staan. */
export function codeIndex(thema = themaVoor()) {
  const idx = {};
  for (const [code, v] of Object.entries(thema?.codes || {})) idx[code] = { code, week: v.week, geeft: v.geeft, waar: v.waar, beloning: v.beloning };
  return idx;
}
/** Beloning voor een code: altijd extra (kledij of decor), nooit kerninhoud. */
export function beloningVoor(code, thema = themaVoor()) {
  const c = thema?.codes?.[normCode(code)];
  const alle = uitrustingLijst(thema);
  let id = c?.beloning;
  if (!id || !alle[id]) { const keys = Object.keys(alle); let h = 0; for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0; id = keys[h % keys.length]; }
  return { soort: 'kosmetiek', id, naam: alle[id].naam, geeft: c?.geeft || '' };
}

export function gidsNaam(id) { return GIDSEN[id]?.naam || id; }
export function machtKleur(id) { return MACHT[id]?.kleur || '#888'; }
