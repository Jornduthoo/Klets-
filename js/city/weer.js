// Het echte weer van Brugge en het echte seizoen. De stad volgt dit: regen, sneeuw, wolken, zon, wind,
// bladkleuren, bloesem en in december de kerstmarkt.
//
// Bron: Open-Meteo (gratis, geen sleutel nodig). We vragen enkel het huidige weer op, verversen hoogstens
// elk kwartier en bewaren het antwoord in localStorage. Lukt de verbinding niet (geen internet op school,
// een firewall), dan valt alles terug op rustig weer dat bij het seizoen past; er komt dan één waarschuwing
// in de console en nergens een foutmelding voor de kinderen. De weerknop zegt dan wel eerlijk "Geen live weer":
// de stad toont rustig seizoensweer, maar doet niet alsof dat het echte weer is. Elk kwartier proberen we opnieuw.
// (Let op: wie de app in een strikt beveiligde iframe zet, moet connect-src https://api.open-meteo.com toelaten.)
//
// Testen of demonstreren: zet in de URL ?weer=regen|sneeuw|zon|mist|storm|bewolkt|fout en/of ?datum=2026-12-18.

import { bruggeDelen } from './tijd.js';

const BRUGGE = { lat: 51.2093, lon: 3.2247, naam: 'Brugge' };
const URL = `https://api.open-meteo.com/v1/forecast?latitude=${BRUGGE.lat}&longitude=${BRUGGE.lon}`
  + '&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,cloud_cover,'
  + 'wind_speed_10m,wind_direction_10m,weather_code,is_day,snow_depth,surface_pressure&timezone=Europe%2FBrussels';
const CACHE_KEY = 'vagant:weer:brugge';
const VERVERS_MS = 15 * 60 * 1000;

// WMO-weercodes van Open-Meteo naar iets waar de stad mee kan tekenen
const CODES = {
  0: ['zon', 'Onbewolkt'], 1: ['zon', 'Vooral zonnig'], 2: ['bewolkt', 'Halfbewolkt'], 3: ['grijs', 'Bewolkt'],
  45: ['mist', 'Mistig'], 48: ['mist', 'Mist met rijm'],
  51: ['motregen', 'Lichte motregen'], 53: ['motregen', 'Motregen'], 55: ['motregen', 'Dichte motregen'],
  56: ['motregen', 'Ijzel'], 57: ['motregen', 'Ijzel'],
  61: ['regen', 'Lichte regen'], 63: ['regen', 'Regen'], 65: ['regen', 'Zware regen'],
  66: ['regen', 'Ijsregen'], 67: ['regen', 'Ijsregen'],
  71: ['sneeuw', 'Lichte sneeuw'], 73: ['sneeuw', 'Sneeuw'], 75: ['sneeuw', 'Zware sneeuw'], 77: ['sneeuw', 'Sneeuwkorrels'],
  80: ['buien', 'Buien'], 81: ['buien', 'Buien'], 82: ['buien', 'Zware buien'],
  85: ['sneeuw', 'Sneeuwbuien'], 86: ['sneeuw', 'Sneeuwbuien'],
  95: ['storm', 'Onweer'], 96: ['storm', 'Onweer met hagel'], 99: ['storm', 'Zwaar onweer met hagel'],
};
export const WINDSTREKEN = ['N', 'NNO', 'NO', 'ONO', 'O', 'OZO', 'ZO', 'ZZO', 'Z', 'ZZW', 'ZW', 'WZW', 'W', 'WNW', 'NW', 'NNW'];
export function windstreek(graden = 0) { return WINDSTREKEN[Math.round(((graden % 360) + 360) % 360 / 22.5) % 16]; }

/** Het seizoen volgens de echte datum (meteorologisch: per drie maanden). */
export function seizoenVoor(d = new Date()) {
  const m = d.getMonth() + 1;
  if (m <= 2 || m === 12) return 'winter';
  if (m <= 5) return 'lente';
  if (m <= 8) return 'zomer';
  return 'herfst';
}
export const SEIZOEN_NAAM = { winter: 'winter', lente: 'lente', zomer: 'zomer', herfst: 'herfst' };
/** Staat de kerstmarkt op de Markt? (heel december) */
export function kerstmarkt(d = new Date()) { return d.getMonth() === 11; }

const VASTE = {
  regen: { soort: 'regen', tekst: 'Regen', temp: 9, wind: 22, richting: 250, wolken: 95, neerslag: 2.4, dag: 1, code: 63 },
  motregen: { soort: 'motregen', tekst: 'Motregen', temp: 11, wind: 14, richting: 240, wolken: 90, neerslag: 0.4, dag: 1, code: 53 },
  sneeuw: { soort: 'sneeuw', tekst: 'Sneeuw', temp: -1, wind: 12, richting: 60, wolken: 100, neerslag: 1.2, sneeuwval: 1.4, dag: 1, code: 73 },
  zon: { soort: 'zon', tekst: 'Onbewolkt', temp: 21, wind: 8, richting: 90, wolken: 2, neerslag: 0, dag: 1, code: 0 },
  mist: { soort: 'mist', tekst: 'Mistig', temp: 4, wind: 3, richting: 180, wolken: 100, neerslag: 0, dag: 1, code: 45 },
  storm: { soort: 'storm', tekst: 'Onweer', temp: 17, wind: 58, richting: 225, wolken: 100, neerslag: 6, dag: 1, code: 95 },
  bewolkt: { soort: 'bewolkt', tekst: 'Halfbewolkt', temp: 14, wind: 16, richting: 270, wolken: 55, neerslag: 0, dag: 1, code: 2 },
  nacht: { soort: 'zon', tekst: 'Heldere nacht', temp: 6, wind: 6, richting: 90, wolken: 10, neerslag: 0, dag: 0, code: 0 },
};

/** Rustig weer dat bij het seizoen past: de terugval als er geen internet is. */
export function terugval(seizoen = seizoenVoor(), d = new Date()) {
  const basis = { winter: { temp: 4, wolken: 70, wind: 16, soort: 'grijs', tekst: 'Bewolkt' },
    lente: { temp: 13, wolken: 45, wind: 14, soort: 'bewolkt', tekst: 'Halfbewolkt' },
    zomer: { temp: 21, wolken: 25, wind: 11, soort: 'zon', tekst: 'Vooral zonnig' },
    herfst: { temp: 12, wolken: 65, wind: 20, soort: 'grijs', tekst: 'Bewolkt' } }[seizoen];
  const u = bruggeDelen(d).h;
  return { ...basis, richting: 240, neerslag: 0, sneeuwval: 0, vocht: 80, dag: u >= 8 && u < 18 ? 1 : 0, code: null, bron: 'terugval', plaats: BRUGGE.naam, tijd: d.toISOString(), seizoen, kerstmarkt: kerstmarkt(d) };
}

function uitAntwoord(json, nu = new Date()) {
  const c = json?.current || {};
  const [soort, tekst] = CODES[c.weather_code] || ['bewolkt', 'Wisselend'];
  return {
    soort, tekst, code: c.weather_code ?? null,
    temp: Math.round((c.temperature_2m ?? 10) * 10) / 10,
    vocht: c.relative_humidity_2m ?? null,
    neerslag: c.precipitation ?? 0, regen: c.rain ?? 0, buien: c.showers ?? 0, sneeuwval: c.snowfall ?? 0,
    wolken: c.cloud_cover ?? 50, wind: Math.round(c.wind_speed_10m ?? 10), richting: c.wind_direction_10m ?? 240,
    sneeuwdek: c.snow_depth ?? 0, druk: c.surface_pressure ?? null,
    dag: c.is_day ?? 1, plaats: BRUGGE.naam, tijd: c.time || nu.toISOString(), bron: 'open-meteo', opgehaald: Date.now(),
    seizoen: seizoenVoor(nu), kerstmarkt: kerstmarkt(nu),
  };
}

function lees() { try { const r = localStorage.getItem(CACHE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function schrijf(v) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch { /* opslag vol of geblokkeerd: dan geen cache */ } }

let gewaarschuwd = false;
let bezig = null;

/** Zoekt de overschrijvingen in de URL (handig om te testen en te demonstreren). */
export function overschrijving(zoek = (typeof location !== 'undefined' ? location.search : '')) {
  const q = new URLSearchParams(zoek);
  const datum = q.get('datum') ? new Date(q.get('datum') + 'T12:00:00') : null;
  return { weer: q.get('weer'), datum: datum && !isNaN(datum) ? datum : null };
}

/**
 * Het huidige weer. Vraagt hoogstens elk kwartier iets op en geeft anders de bewaarde waarde terug.
 * { soort, tekst, temp, wind, richting, wolken, neerslag, sneeuwval, dag, seizoen, kerstmarkt, bron, plaats }
 */
export async function huidigWeer({ forceer = false, zoek } = {}) {
  const ov = overschrijving(zoek);
  const nu = ov.datum || new Date();
  if (ov.weer && ov.weer !== 'fout') {
    const v = VASTE[ov.weer] || VASTE.bewolkt;
    return { ...terugval(seizoenVoor(nu), nu), ...v, bron: 'test', seizoen: seizoenVoor(nu), kerstmarkt: kerstmarkt(nu) };
  }
  const cache = lees();
  if (!forceer && cache && Date.now() - cache.opgehaald < VERVERS_MS) {
    return { ...cache.weer, seizoen: seizoenVoor(nu), kerstmarkt: kerstmarkt(nu), bron: 'cache' };
  }
  if (bezig) return bezig;
  bezig = (async () => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(URL, { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (!res.ok) throw new Error('status ' + res.status);
      const weer = uitAntwoord(await res.json(), nu);
      schrijf({ opgehaald: Date.now(), weer });
      return weer;
    } catch (e) {
      if (!gewaarschuwd) { gewaarschuwd = true; console.warn('Weer van Brugge niet opgehaald, de stad gebruikt rustig seizoensweer.', e?.message || e); }
      if (cache?.weer && Date.now() - cache.opgehaald < 6 * 3600e3) return { ...cache.weer, bron: 'cache-oud', opgehaald: cache.opgehaald, seizoen: seizoenVoor(nu), kerstmarkt: kerstmarkt(nu) };
      return terugval(seizoenVoor(nu), nu);
    } finally { bezig = null; }
  })();
  return bezig;
}

/**
 * Houdt het weer bij: roept cb(weer) meteen en daarna elk kwartier. Geeft een functie om te stoppen.
 */
export function volgWeer(cb, ms = VERVERS_MS) {
  let gestopt = false;
  const tik = async () => { const w = await huidigWeer(); if (!gestopt) cb(w); };
  tik();
  const id = setInterval(tik, ms);
  return () => { gestopt = true; clearInterval(id); };
}

/** Hoe hard regent of sneeuwt het (0..1), hoe hard waait het (0..1), hoe grijs is de lucht (0..1). */
export function sterktes(w = {}) {
  const neerslag = Math.min(1, (w.neerslag || 0) / 4);
  const sneeuw = Math.min(1, (w.sneeuwval || 0) / 2);
  const regen = ['regen', 'motregen', 'buien', 'storm'].includes(w.soort) ? Math.max(0.3, neerslag) : neerslag > 0.05 ? neerslag : 0;
  return {
    regen: w.soort === 'sneeuw' ? 0 : regen,
    sneeuw: w.soort === 'sneeuw' ? Math.max(0.35, sneeuw) : sneeuw,
    mist: w.soort === 'mist' ? 0.9 : (w.vocht > 95 && (w.wind || 0) < 8 ? 0.35 : 0),
    wolken: Math.min(1, (w.wolken ?? 50) / 100),
    wind: Math.min(1, (w.wind || 0) / 60),
    zon: w.dag ? Math.max(0, 1 - (w.wolken ?? 50) / 100) : 0,
    onweer: w.soort === 'storm' ? 1 : 0,
    nacht: w.dag ? 0 : 1,
  };
}

/** Korte tekst voor de balk boven: "9 graden, regen, wind 22 km/u uit het zuidwesten". */
export function weerTekst(w = {}) {
  if (!w.soort) return 'Weer onbekend';
  return `${Math.round(w.temp)} graden, ${(w.tekst || '').toLowerCase()}, wind ${Math.round(w.wind)} km/u uit ${windstreek(w.richting)}`;
}
export const WEER_PLAATS = BRUGGE;
