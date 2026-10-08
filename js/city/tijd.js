// De echte tijd in Brugge: dag en nacht in de stad volgen de klok van Brussel (Europe/Brussels, ook als de laptop
// in een andere tijdzone staat) en de echte stand van de zon boven Brugge. Zo komt de zon op en gaat ze onder zoals
// buiten het klasraam, in elk seizoen.
//
// Testen of demonstreren: ?uur=22:30 (dat uur vandaag in Brugge) en/of ?datum=2026-12-18 (die dag, standaard 12:00).
// Met ?uur of ?datum staat de klok stil op dat moment.
export const BRUGGE_POS = { lat: 51.2093, lon: 3.2247 };
const TZ = 'Europe/Brussels';
const RAD = Math.PI / 180;

let fmt = null;
/** De kalender- en klokdelen van een moment in Brugge: { y, mo, d, h, mi, s }. */
export function bruggeDelen(date = new Date()) {
  try {
    fmt = fmt || new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const p = Object.fromEntries(fmt.formatToParts(date).filter(x => x.type !== 'literal').map(x => [x.type, +x.value]));
    return { y: p.year, mo: p.month, d: p.day, h: p.hour % 24, mi: p.minute, s: p.second };
  } catch {
    // geen Intl met tijdzones: dan de klok van het toestel
    return { y: date.getFullYear(), mo: date.getMonth() + 1, d: date.getDate(), h: date.getHours(), mi: date.getMinutes(), s: date.getSeconds() };
  }
}
/** Hoeveel minuten loopt Brugge voor op UTC op dat moment (60 in de winter, 120 in de zomer)? */
function verschilMin(date) {
  const p = bruggeDelen(date);
  return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - date.getTime()) / 60000);
}
/** Het moment waarop het in Brugge die datum en dat uur is. */
export function momentInBrugge(y, mo, d, h = 12, mi = 0) {
  const t0 = Date.UTC(y, mo - 1, d, h, mi);
  let t = t0 - verschilMin(new Date(t0)) * 60000;
  t = t0 - verschilMin(new Date(t)) * 60000;          // twee keer: juist rond de overgang naar zomertijd
  return new Date(t);
}

/** ?uur=HH:MM en ?datum=YYYY-MM-DD uit de adresbalk. */
export function tijdOverschrijving(zoek = (typeof location !== 'undefined' ? location.search : '')) {
  const q = new URLSearchParams(zoek || '');
  const uur = /^(\d{1,2})(?::(\d{2}))?$/.exec(q.get('uur') || '');
  const datum = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.get('datum') || '');
  return { uur: uur ? [Math.min(23, +uur[1]), Math.min(59, +(uur[2] || 0))] : null, datum: datum ? [+datum[1], +datum[2], +datum[3]] : null };
}

/** Nu, in Brugge (een gewone Date; met ?uur of ?datum het gevraagde moment). */
export function nuInBrugge(zoek) {
  const ov = tijdOverschrijving(zoek);
  if (!ov.uur && !ov.datum) return new Date();
  const p = bruggeDelen(new Date());
  const [y, mo, d] = ov.datum || [p.y, p.mo, p.d];
  const [h, mi] = ov.uur || (ov.datum ? [12, 0] : [p.h, p.mi]);
  return momentInBrugge(y, mo, d, h, mi);
}

/**
 * De stand van de zon boven Brugge (vereenvoudigde formule, ruim nauwkeurig genoeg voor zonsopgang en -ondergang).
 * uit: { elev (radialen boven de horizon), az (radialen, vanaf het noorden met de klok mee) }
 */
export function zonStand(date = new Date(), { lat, lon } = BRUGGE_POS) {
  const d = date.getTime() / 86400000 - 10957.5;            // dagen sinds 1 januari 2000, 12:00 UTC
  const g = (357.529 + 0.98560028 * d) * RAD;               // gemiddelde anomalie
  const q = 280.459 + 0.98564736 * d;                       // gemiddelde lengte
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const H = (gmst * 15 + lon) * RAD - ra;
  const phi = lat * RAD;
  const elev = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H));
  return { elev, az: (az + 2 * Math.PI) % (2 * Math.PI) };
}

/** De fase van de maan (0 = nieuwe maan, 0.5 = volle maan), vereenvoudigd. */
export function maanFase(date = new Date()) {
  const nieuw = Date.UTC(2000, 0, 6, 18, 14);
  const p = ((date.getTime() - nieuw) / 86400000) / 29.530588853;
  return p - Math.floor(p);
}

/** "19:14" in Brugge. */
export function uurTekst(date = new Date()) { const p = bruggeDelen(date); return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; }
