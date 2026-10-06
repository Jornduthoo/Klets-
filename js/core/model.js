// Domeinlogica: missiecatalogus, XP en rangen, doelen per leerling, klasstad, geheime codes.
import { RANGEN, XP, BEHAALD_GRENS, MACHT, GIDSEN } from '../config.js';

// ---------- Rangen ----------
export function rangVoor(xp = 0) {
  let i = 0;
  for (let k = 0; k < RANGEN.length; k++) if (xp >= RANGEN[k].xp) i = k;
  const nu = RANGEN[i], volgende = RANGEN[i + 1] || null;
  const pct = volgende ? (xp - nu.xp) / (volgende.xp - nu.xp) : 1;
  return { ...nu, index: i, volgende, pct };
}

// ---------- Missiecatalogus ----------
function naamUitTekst(webapp, titel) {
  const m = /'([^']{3,40})'/.exec(webapp || '');
  return m ? m[1] : titel;
}

/** Combineer lesdata (handleiding) met de geschreven oefeningen tot missies. */
export function buildCatalog(queste, oefeningen) {
  const missies = [];
  for (const les of queste.lessen) {
    const ex = oefeningen[les.id];
    if (!les.webapp && !ex) continue;
    const kind = ex?.soort || (ex ? 'oefening' : 'klas');
    missies.push({
      id: les.id, les, week: les.week, dag: les.dag, blok: les.blok,
      naam: ex?.naam || naamUitTekst(les.webapp, les.titel),
      intro: ex?.intro || '',
      gids: ex?.gids || les.gids, macht: ex?.macht || les.macht,
      sets: ex?.sets || null, kind,
    });
  }
  return missies;
}

const FALLBACK = { taalsleutels: ['taalsleutels', 'kompas', 'telescoop'], kompas: ['kompas', 'taalsleutels', 'telescoop'], telescoop: ['telescoop', 'kompas', 'taalsleutels'] };

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
export function machtVanCode(code) {
  if (code.startsWith('1.')) return 'Taal';
  if (code.startsWith('2.')) return 'Getal';
  if (code.startsWith('8.') || code.startsWith('6.')) return 'Maker';
  if (code.startsWith('9-2')) return 'Brein';
  if (code.startsWith('9-3') || code.startsWith('11.')) return 'Hart';
  return 'Wereld';
}
export const GEBOUWTYPE = { Taal: 'Bibliotheek', Getal: 'Rekentoren', Wereld: 'Kaartenhuis', Hart: 'Vredestuin', Maker: 'Werkhuis', Brein: 'Uitkijktoren' };

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

// ---------- Geheime codes ----------
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
  'spoor-noten': { naam: 'Muziekspoor', slot: 'spoor' },
  'spoor-letters': { naam: 'Letterspoor', slot: 'spoor' },
  'spoor-licht': { naam: 'Lichtspoor', slot: 'spoor' },
  'kleur-goud': { naam: 'Gouden jas', slot: 'kleur' },
  'kleur-nacht': { naam: 'Nachtblauwe jas', slot: 'kleur' },
};
const VAST = {
  'TD-NACHT': 'pet-oranje', 'NAAM-LICHT': 'veer', 'BIEP-01': 'koptelefoon', 'SCHILD-ROOD': 'sjaal-rood', 'IKBEN-1': 'spoor-sterren',
  'SPRONG-100': 'rugzak', 'HAVIK-7': 'bril', 'UI-LAGEN': 'muts', 'SALAAM-SHALOM': 'lantaarn', 'DELER-24': 'kleur-goud',
  'LEEUW-NIEUW': 'spoor-blaadjes', 'KLUIS-OPEN': 'cape', 'TAART-75': 'bladerkrans', 'NADIA-FIER': 'spoor-letters',
  'TEGENFLUISTER': 'kleur-nacht', 'SOLO-TOET': 'spoor-noten', 'NAAM-VERHAAL': 'sjaal-blauw', 'MIN-TIEN': 'muts',
  'LEESFEEST': 'feesthoed', 'WELKOM-1': 'bladerkrans', 'BRUG-VREDE': 'spoor-licht', 'POSTKAART-1': 'rugzak',
};
const KAARTCODES = /^(MIST-WEG-\d|VERGEETAL|KLETSKAART|LANTAARN)$/;

export function normCode(s) { return String(s || '').toUpperCase().replace(/\s+/g, '').replace(/[‐-―_]/g, '-'); }

/** Alle codes uit de Logboek-teksten, met de les waar ze staan. */
export function codeIndex(queste) {
  const idx = {};
  for (const les of queste.lessen) for (const c of les.codes || []) {
    if (!idx[c]) idx[c] = { code: c, week: les.week, lessen: [] };
    idx[c].lessen.push(les.id);
  }
  return idx;
}
/** Beloning voor een code: altijd extra (kosmetiek, kaartstuk, verhaal), nooit kerninhoud. */
export function beloningVoor(code) {
  if (KAARTCODES.test(code)) {
    const n = /(\d)$/.exec(code)?.[1] || ({ VERGEETAL: 3, KLETSKAART: 4, LANTAARN: 6 }[code] || 1);
    return { soort: 'kaartstuk', id: 'kaartstuk-' + n, naam: `Stuk ${n} van de wereldkaart` };
  }
  let id = VAST[code];
  if (!id) { const keys = Object.keys(KOSMETIEK); let h = 0; for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0; id = keys[h % keys.length]; }
  return { soort: 'kosmetiek', id, naam: KOSMETIEK[id].naam };
}

export function gidsNaam(id) { return GIDSEN[id]?.naam || id; }
export function machtKleur(id) { return MACHT[id]?.kleur || '#888'; }
