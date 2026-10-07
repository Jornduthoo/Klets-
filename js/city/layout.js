// De plattegrond van de stad Klets: vaste, deterministische posities.
// Wereldeenheden: 1 eenheid ~ 1 tegel. x = oost, z = zuid, y = omhoog. Middelpunt = Station Klets.
// Gebruikt door de 3D-stad en door de 2D-terugvalkaart, zodat beide precies hetzelfde tonen.
//
// Opbouw: een stationsplein met een ringweg errond, daarbuiten ringwegen met tussen elke twee ringen
// twee rijen kavels (de binnenste rij kijkt naar de binnenste ring, de buitenste naar de buitenste ring).
// Vier lanen (radiale wegen) verbinden de ringen; het spoor loopt oost-west en kruist de ringen met overwegen.
// Elke kavel ligt naast een weg, kijkt ernaar en raakt nooit asfalt, stoep of spoor (zie wegen.js: valideerStad).

/** Ringwegen. De eerste ring omsluit het stationsplein, tussen ring 1 en 2 ligt de Reizigerswijk (huizen). */
export const RINGEN = [8.6, 15.8, 23.8, 31.8, 39.8, 47.8];
export const PLEIN_R = 7.2;
export const DAL_R = 54;          // rand van de vlakke vallei
export const BERG_R = 56;         // daar beginnen de bergen
export const SPOOR_Z = 0;         // het spoor loopt oost-west door het station
export const SPOOR_HALF = 1.9;    // halve breedte van de spoorstrook (ballast en sporen)
export const SPOOR_SPOREN = [-0.55, 0.55];
export const LAAN_HOEKEN = [60, 120, 240, 300].map(d => d * Math.PI / 180); // radiale lanen
export const RIJBAAN = 1.5;       // asfalt (twee rijstroken)
export const STOEP = 0.4;         // stoep aan elke kant
export const WEG_HALF = RIJBAAN / 2 + STOEP;   // 1.15: halve breedte van weg + stoepen
export const WEG_BREED = RIJBAAN;
export const RIJSTROOK = 0.37;    // afstand van de middellijn tot het midden van een rijstrook
export const VOORTUIN = 0.3;      // oprit tussen stoep en kavel
export const KAVEL = 2.5;         // vierkante kavel voor een doelgebouw
export const HUIS = 2.0;          // kavel voor een huis
export const HQ = { w: 6.4, d: 4.8 }; // kavel van een gidsgebouw (gebouw + voorpleintje voor de gids)
export const MIST_MIN = 25;       // straal die altijd vrij is (gidsen, huizen, eerste wijk)
export const MIST_MAX = 54;
export const POORT = { x: 57.5, z: 0 };     // De Poort: de oostelijke tunnel naar de middelbare school
export const TUNNEL_WEST = { x: -57.5, z: 0 };
export const SPOOR_X = 60;        // het spoor loopt van -60 tot 60 (tussen de tunnels)

/** Wijken: elke macht krijgt een taartpunt van 60 graden. Hoek in graden (0 = oost, 90 = zuid). */
export const WIJKEN = [
  { macht: 'Wereld', hoek: 30, naam: 'Kaartenwijk', gebouw: 'Kaartenhuis', gids: 'atlas', hq: 'Kaartenkamer' },
  { macht: 'Taal', hoek: 90, naam: 'Woordenwijk', gebouw: 'Bibliotheek', gids: 'woordje', hq: 'Wachtzaal' },
  { macht: 'Getal', hoek: 150, naam: 'Getallenwijk', gebouw: 'Rekentoren', gids: 'tella', hq: 'Rekenkiosk' },
  { macht: 'Maker', hoek: 210, naam: 'Makerswijk', gebouw: 'Werkhuis', gids: 'byte', hq: 'Werkplaats' },
  { macht: 'Hart', hoek: 270, naam: 'Hartenwijk', gebouw: 'Vredestuin', gids: 'bram', hq: 'Kampvuur' },
  { macht: 'Brein', hoek: 330, naam: 'Breinwijk', gebouw: 'Uitkijktoren', gids: 'kroniek', hq: 'Seinhuis' },
];
export const WIJK = Object.fromEntries(WIJKEN.map(w => [w.macht, w]));

/** Kleuren in de stijl van een heldere bouwsimulatie. */
export const KLEUR = {
  Taal: '#f0a531', Getal: '#ec5f3b', Wereld: '#38b37a', Hart: '#e9578a', Maker: '#3d8fe0', Brein: '#9a68e0',
};

const rad = d => d * Math.PI / 180;
export const polar = (r, a) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });

/** Draaiing (rond y) zodat de voorkant (+z lokaal) naar het midden of naar buiten kijkt. */
export const naarBinnen = (a) => Math.atan2(-Math.cos(a), -Math.sin(a));
export const naarBuiten = (a) => Math.atan2(Math.cos(a), Math.sin(a));

/** Hoekafstand (radialen, -PI..PI). */
export function hoekVerschil(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

// ---------- meetkunde ----------
/** Lokaal punt (lx, lz) van een gedraaide rechthoek naar de wereld (zelfde draaiing als three.js rotation.y). */
export function lokaalNaarWereld(rect, lx, lz) {
  const c = Math.cos(rect.rot || 0), s = Math.sin(rect.rot || 0);
  return { x: rect.x + c * lx + s * lz, z: rect.z - s * lx + c * lz };
}
/** De vier hoeken van een rechthoek { x, z, rot, w, d }. */
export function hoeken(rect) {
  const w = rect.w / 2, d = rect.d / 2;
  return [[-w, -d], [w, -d], [w, d], [-w, d]].map(([lx, lz]) => lokaalNaarWereld(rect, lx, lz));
}
function puntSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
function binnenPoly(px, pz, poly) {
  let teken = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const k = (b.x - a.x) * (pz - a.z) - (b.z - a.z) * (px - a.x);
    if (k !== 0) { if (teken === 0) teken = Math.sign(k); else if (Math.sign(k) !== teken) return false; }
  }
  return true;
}
function snijden(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}
/** Kortste afstand tussen een lijnstuk en een convexe veelhoek (0 bij overlap). */
export function afstandSegmentPoly(a, b, poly) {
  if (binnenPoly(a.x, a.z, poly) || binnenPoly(b.x, b.z, poly)) return 0;
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    if (snijden(a, b, p, q)) return 0;
    m = Math.min(m, puntSegment(p.x, p.z, a.x, a.z, b.x, b.z), puntSegment(a.x, a.z, p.x, p.z, q.x, q.z), puntSegment(b.x, b.z, p.x, p.z, q.x, q.z));
  }
  return m;
}
/** Kleinste en grootste afstand van het middelpunt tot een convexe veelhoek. */
export function straalBereik(poly) {
  let min = binnenPoly(0, 0, poly) ? 0 : Infinity, max = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    min = Math.min(min, puntSegment(0, 0, p.x, p.z, q.x, q.z));
    max = Math.max(max, Math.hypot(p.x, p.z));
  }
  return [min, max];
}
/** Raakt de veelhoek de spoorstrook (tussen de tunnels)? */
export function raaktSpoor(poly, marge = 0) {
  let zmin = Infinity, zmax = -Infinity;
  for (const p of poly) { zmin = Math.min(zmin, p.z - SPOOR_Z); zmax = Math.max(zmax, p.z - SPOOR_Z); }
  const dz = zmin > 0 ? zmin : zmax < 0 ? -zmax : 0;
  return dz < SPOOR_HALF + marge;
}
/** Botst een rechthoek met een (volgroeide) weg: ringen of lanen? */
export function raaktWeg(poly, marge = 0) {
  const [rmin, rmax] = straalBereik(poly);
  for (const R of RINGEN) if (rmax > R - WEG_HALF - marge && rmin < R + WEG_HALF + marge) return true;
  for (const a of LAAN_HOEKEN) {
    const p0 = polar(RINGEN[0], a), p1 = polar(RINGEN[RINGEN.length - 1], a);
    if (afstandSegmentPoly(p0, p1, poly) < WEG_HALF + marge) return true;
  }
  return false;
}
function overlapt(p, q) {
  // twee convexe veelhoeken: scheidende as
  for (const poly of [p, q]) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], nx = -(b.z - a.z), nz = b.x - a.x;
    let pmin = Infinity, pmax = -Infinity, qmin = Infinity, qmax = -Infinity;
    for (const v of p) { const d = v.x * nx + v.z * nz; pmin = Math.min(pmin, d); pmax = Math.max(pmax, d); }
    for (const v of q) { const d = v.x * nx + v.z * nz; qmin = Math.min(qmin, d); qmax = Math.max(qmax, d); }
    if (pmax <= qmin || qmax <= pmin) return false;
  }
  return true;
}
export { overlapt as veelhoekenOverlappen };

// ---------- hoofdkwartieren ----------
/** Het gidsgebouw staat midden in de eerste band van zijn wijk en kijkt naar de binnenste ring. */
export function hqPositie(w) {
  const a = rad(w.hoek), r = RINGEN[1] + WEG_HALF + VOORTUIN + HQ.d / 2;
  return { ...polar(r, a), rot: naarBinnen(a), r, a, w: HQ.w, d: HQ.d };
}
/** Waar de gids staat: op het voorpleintje rechts van zijn gebouw. */
export function gidsPlek(w) {
  const p = hqPositie(w);
  return { ...lokaalNaarWereld(p, 2.35, 1.35), rot: p.rot };
}

// ---------- kavels per wijk ----------
const KAVEL_PITCH = KAVEL + 0.3;
let _kavels = null;
/** Alle kavels per macht, gesorteerd van binnen naar buiten en vanuit het midden van de wijk. */
export function kavels() {
  if (_kavels) return _kavels;
  _kavels = {};
  const hqs = WIJKEN.map(w => hoeken(hqPositie(w)));
  for (const w of WIJKEN) {
    const mid = rad(w.hoek), lijst = [];
    for (let b = 1; b < RINGEN.length - 1; b++) {
      const rijen = [[RINGEN[b] + WEG_HALF + VOORTUIN + KAVEL / 2, true], [RINGEN[b + 1] - WEG_HALF - VOORTUIN - KAVEL / 2, false]];
      for (const [rho, binnen] of rijen) {
        const nMax = Math.ceil((rho * Math.PI / 6) / KAVEL_PITCH) + 1;
        for (let k = -nMax; k <= nMax; k++) {
          const boog = k * KAVEL_PITCH, a = mid + boog / rho;
          if (Math.abs(hoekVerschil(a, mid)) > Math.PI / 6) continue;
          const p = polar(rho, a);
          const rect = { x: p.x, z: p.z, rot: binnen ? naarBinnen(a) : naarBuiten(a), w: KAVEL, d: KAVEL };
          const poly = hoeken(rect);
          if (raaktWeg(poly, 0.02) || raaktSpoor(poly, 0.3)) continue;
          if (hqs.some(h => overlapt(h, poly))) continue;
          lijst.push({ ...rect, r: rho, a, binnen, band: b, boog: Math.abs(boog) });
        }
      }
    }
    lijst.sort((p, q) => p.band - q.band || (p.binnen === q.binnen ? 0 : p.binnen ? -1 : 1) || p.boog - q.boog || p.a - q.a);
    _kavels[w.macht] = lijst;
  }
  return _kavels;
}

let _huizen = null;
/** Kavels voor de huizen van de leerlingen: de Reizigerswijk tussen ring 0 en ring 1. */
export function huisKavels() {
  if (_huizen) return _huizen;
  const lijst = [];
  for (const [rho, binnen] of [[RINGEN[0] + WEG_HALF + VOORTUIN + HUIS / 2, true], [RINGEN[1] - WEG_HALF - VOORTUIN - HUIS / 2, false]]) {
    const n = Math.floor((2 * Math.PI * rho) / (HUIS + 0.32));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2; // begin vooraan (zuid)
      const p = polar(rho, a);
      const rect = { x: p.x, z: p.z, rot: binnen ? naarBinnen(a) : naarBuiten(a), w: HUIS, d: HUIS };
      const poly = hoeken(rect);
      if (raaktWeg(poly, 0.02) || raaktSpoor(poly, 0.3)) continue;
      lijst.push({ ...rect, r: rho, a, binnen, voorkant: Math.abs(hoekVerschil(a, Math.PI / 2)) });
    }
  }
  lijst.sort((p, q) => p.voorkant - q.voorkant || p.r - q.r || p.a - q.a);
  _huizen = lijst;
  return lijst;
}

/** Hoe ver de stad (wegen, lantaarns, verkeer) al gegroeid is: de kleinste ring buiten het verste gebouw. */
export function stadStraal(gebouwen = []) {
  let verst = 0;
  for (const g of gebouwen) if (g.slot) verst = Math.max(verst, g.slot.r + KAVEL / 2 + VOORTUIN);
  return RINGEN.find(R => R >= verst + WEG_HALF - 0.01 && R >= RINGEN[2]) ?? RINGEN[RINGEN.length - 1];
}

/** Vaste gebouwen op en rond het stationsplein. */
export const PLEIN = {
  station: { x: 0, z: -4.2, rot: 0 },
  klasmeter: { x: 0, z: 4.3 },
  kluis: { x: -4.1, z: 3.9, rot: Math.PI * 0.18 },
  missiebord: { x: 4.1, z: 3.9, rot: -Math.PI * 0.18 },
};

/** Ruimte voor bomen: niet op wegen, plein of spoor. */
export function isVrijVoorBoom(x, z, marge = 0.35) {
  const r = Math.hypot(x, z);
  if (r < PLEIN_R + 0.6) return false;
  if (Math.abs(z - SPOOR_Z) < SPOOR_HALF + 0.6 && r < BERG_R + 4) return false;
  for (const R of RINGEN) if (Math.abs(r - R) < WEG_HALF + marge) return false;
  const a = Math.atan2(z, x);
  if (r < RINGEN[RINGEN.length - 1] + 1) for (const l of LAAN_HOEKEN) if (Math.abs(hoekVerschil(a, l)) < Math.PI / 2 && Math.abs(Math.sin(hoekVerschil(a, l))) * r < WEG_HALF + marge) return false;
  return true;
}
