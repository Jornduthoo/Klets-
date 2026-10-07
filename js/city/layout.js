// De plattegrond van de stad (thema 1: Zwinvliet): vaste, deterministische posities.
// Wereldeenheden: 1 eenheid ~ 1 tegel. x = oost, z = zuid, y = omhoog. Middelpunt = de Markt.
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
export const MIST_MAX = 92;        // de nevel hangt ver buiten de stad, voorbij de haven en de zee
export const POORT = { x: 57.5, z: 0 };     // De Poort: de oostelijke tunnel naar de middelbare school
export const TUNNEL_WEST = { x: -57.5, z: 0 };
export const SPOOR_X = 60;        // het spoor loopt van -60 tot 60 (tussen de tunnels)

/** Wijken: elke macht krijgt een taartpunt van 60 graden. Hoek in graden (0 = oost, 90 = zuid). */
export const WIJKEN = [
  { macht: 'Aardrijkskunde', hoek: 30, naam: 'Kaartenwijk', gebouw: 'Kaartenhuis', gids: 'atlas', hq: 'Kaartenkamer' },
  { macht: 'Geschiedenis', hoek: 150, naam: 'Hanzewijk', gebouw: 'Archiefhuis', gids: 'kroniek', hq: 'Archief' },
  { macht: 'Wetenschap', hoek: 210, naam: 'Proefwijk', gebouw: 'Proefhuis', gids: 'tella', hq: 'Proefkeuken' },
  { macht: 'Techniek', hoek: 330, naam: 'Smedenwijk', gebouw: 'Werkhuis', gids: 'byte', hq: 'Werkplaats' },
  { macht: 'Hart', hoek: 270, hqHoek: 252, hqMaat: { w: 4.4, d: 4.0 }, naam: 'Begijnhofwijk', gebouw: 'Vredestuin', gids: 'bram', hq: 'Kampvuur' },
  { macht: 'Onderzoek', hoek: 90, hqHoek: 72, hqMaat: { w: 4.4, d: 4.0 }, naam: 'Verkennerswijk', gebouw: 'Uitkijktoren', gids: 'woordje', hq: 'Uitkijkpost' },
];
export const WIJK = Object.fromEntries(WIJKEN.map(w => [w.macht, w]));

/** Kleuren in de stijl van een heldere bouwsimulatie. */
export const KLEUR = {
  Aardrijkskunde: '#38b37a', Geschiedenis: '#c4873a', Wetenschap: '#ec5f3b', Techniek: '#3d8fe0', Hart: '#e9578a', Onderzoek: '#9a68e0',
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


// ---------- water: de reien, het Minnewater en de haven ----------
// Het water ligt in vaste stroken en vlekken. Een strook loopt noord-zuid langs x = 0 (de lanen liggen op
// 60, 120, 240 en 300 graden en het spoor op z = 0, dus kruist het water alleen de ringwegen: daar liggen
// bruggen). Elke zone hoort bij een labo: haalt de klas dat labo, dan wordt die zone helder (zie water.js).
export const KADE = 0.35;         // kademuur rond elk water
export const WATERS = [
  { id: 'reie-zuid', naam: 'De Reie aan de Rozenhoedkaai', zone: 'reie-zuid', soort: 'strook', x: 0, halfB: 1.35, z0: PLEIN_R + 0.6, z1: 30.2 },
  { id: 'rozenhoedkaai', naam: 'Rozenhoedkaai', zone: 'reie-zuid', soort: 'vlek', x: 0, z: 19.4, rx: 3.3, rz: 2.6 },
  { id: 'minnewater', naam: 'Het Minnewater', zone: 'minnewater', soort: 'vlek', x: 0, z: 36.4, rx: 7.4, rz: 5.4 },
  { id: 'minne-hals', naam: 'Het Minnewater', zone: 'minnewater', soort: 'strook', x: 0, halfB: 1.35, z0: 30.2, z1: 33.0 },
  { id: 'reie-noord', naam: 'De Reie bij de Scheepswerf', zone: 'reie-noord', soort: 'strook', x: 0, halfB: 1.35, z0: -27.6, z1: -(PLEIN_R + 0.6) },
  { id: 'noordrei', naam: 'De rei naar de haven', zone: 'noordrei', soort: 'strook', x: 0, halfB: 1.6, z0: -46.6, z1: -27.6 },
  { id: 'sluiskolk', naam: 'De sluiskolk van Zeebrugge', zone: 'haven', soort: 'vlek', x: 0, z: -50.2, rx: 2.1, rz: 3.8 },
  { id: 'haven', naam: 'De havenkom van Zeebrugge', zone: 'haven', soort: 'vlek', x: 0, z: -61.5, rx: 11.5, rz: 6.8 },
  { id: 'zee', naam: 'De Noordzee', zone: 'haven', soort: 'vlek', x: 0, z: -84, rx: 46, rz: 20 },
];
/** Hoort dit punt bij het water? (marge = extra kade errond) */
export function inWater(x, z, marge = 0) {
  for (const w of WATERS) {
    if (w.soort === 'strook') { if (Math.abs(x - w.x) <= w.halfB + marge && z >= Math.min(w.z0, w.z1) - marge && z <= Math.max(w.z0, w.z1) + marge) return w; }
    else { const dx = (x - w.x) / (w.rx + marge), dz = (z - w.z) / (w.rz + marge); if (dx * dx + dz * dz <= 1) return w; }
  }
  return null;
}
/** Welke zone hoort bij dit punt (of null)? */
export function waterZone(x, z, marge = 0) { return inWater(x, z, marge)?.zone || null; }
/** Raakt een veelhoek het water (inclusief kade)? */
export function raaktWater(poly, marge = KADE) {
  for (const p of poly) if (inWater(p.x, p.z, marge)) return true;
  // ook de randen testen (een smalle strook kan tussen twee hoekpunten door lopen)
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    for (let t = 0.2; t < 1; t += 0.2) if (inWater(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, marge)) return true;
  }
  return false;
}
/** Elke plaats waar een ringweg het water kruist, krijgt een brug. */
/** Hoe breed is het water op deze z-lijn? (alle wateren liggen op de as x = 0) */
export function waterHalveBreedte(z) {
  let b = 0;
  for (const w of WATERS) {
    if (w.soort === 'strook') { if (z >= Math.min(w.z0, w.z1) && z <= Math.max(w.z0, w.z1)) b = Math.max(b, w.halfB); }
    else { const d = (z - w.z) / w.rz; if (Math.abs(d) < 1) b = Math.max(b, w.rx * Math.sqrt(1 - d * d)); }
  }
  return b;
}
export function bruggen() {
  const uit = [];
  for (const R of RINGEN) for (const teken of [1, -1]) {
    const z = teken * R;
    if (!inWater(0, z, 0.2)) continue;
    uit.push({ id: `brug-${R}-${teken > 0 ? 'z' : 'n'}`, x: 0, z, breedte: waterHalveBreedte(z) * 2 + 2.2, R });
  }
  return uit;
}

// ---------- vaste plekken voor themagebouwen en herkenningspunten ----------
// Een plek is een rechthoek (x, z, rot, w, d). rot = 0 betekent: de voorkant kijkt naar +z (zuid).
export const PLEKKEN = {
  belfort: { x: 0, z: -4.3, rot: 0, w: 4.0, d: 2.6, naam: 'Belfort en Hallen' },
  hallen: { x: 4.2, z: -3.5, rot: 0, w: 2.8, d: 2.2, naam: 'De Hallen (Werkplaats)' },
  scheepswerf: { x: 4.6, z: -19.4, rot: Math.PI / 2, w: 4.0, d: 2.8, naam: 'Scheepswerf aan de Reie' },
  waterlabo: { x: -10.0, z: 34.4, rot: -Math.PI / 2, w: 4.0, d: 3.0, naam: 'Waterlabo bij het Minnewater' },
  sluis: { x: 4.6, z: -52.4, rot: -Math.PI / 2, w: 3.4, d: 2.6, naam: 'Sluis van Zeebrugge' },
  vuurtoren: { x: 13.8, z: -62.0, rot: 0, w: 2.4, d: 2.4, naam: 'Vuurtoren op de havendam' },
  olvkerk: { x: -5.2, z: 19.4, rot: 0, w: 2.6, d: 3.6, naam: 'Onze-Lieve-Vrouwekerk' },
  provinciaalhof: { x: -4.1, z: -3.9, rot: 0, w: 2.2, d: 2.2, naam: 'Het gotische huis op de Markt' },
};
/** Molens op de Kruisvest: op de buitenrand van de stad, buiten de ringwegen. */
export const MOLENS = [-28, -14, 14, 28].map((d, i) => {
  const a = d * Math.PI / 180 + Math.PI;    // aan de oostkant van de stad (richting De Poort is vrij)
  return { id: 'molen' + i, x: Math.cos(a) * 51.4, z: Math.sin(a) * 51.4, rot: a + Math.PI / 2 };
});

// ---------- hoofdkwartieren ----------
/** Het gidsgebouw staat midden in de eerste band van zijn wijk en kijkt naar de binnenste ring. */
export function hqPositie(w) {
  const maat = w.hqMaat || HQ;
  const a = rad(w.hqHoek ?? w.hoek), r = RINGEN[1] + WEG_HALF + VOORTUIN + maat.d / 2;
  return { ...polar(r, a), rot: naarBinnen(a), r, a, w: maat.w, d: maat.d, smal: !!w.hqMaat };
}
/** Waar de gids staat: op het voorpleintje rechts van zijn gebouw. */
export function gidsPlek(w) {
  const p = hqPositie(w);
  return { ...lokaalNaarWereld(p, p.w / 2 - 0.85, p.d / 2 - 1.05), rot: p.rot };
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
          if (raaktWeg(poly, 0.02) || raaktSpoor(poly, 0.3) || raaktWater(poly)) continue;
          if (hqs.some(h => overlapt(h, poly))) continue;
          if (plekPolys().some(h => overlapt(h, poly))) continue;
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
      if (raaktWeg(poly, 0.02) || raaktSpoor(poly, 0.3) || raaktWater(poly)) continue;
      if (plekPolys().some(h => overlapt(h, poly))) continue;
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

let _plekPolys = null;
/** De voetafdruk van elk themagebouw en herkenningspunt (om kavels vrij te houden). */
export function plekPolys() {
  if (!_plekPolys) _plekPolys = Object.values(PLEKKEN).map(p => hoeken({ ...p, w: p.w + 0.6, d: p.d + 0.6 }));
  return _plekPolys;
}

/** Vaste gebouwen op en rond de Markt. */
export const PLEIN = {
  station: PLEKKEN.belfort,
  klasmeter: { x: 0, z: 4.3 },      // de grote fontein op de Markt
  kluis: { x: -4.1, z: 3.9, rot: Math.PI * 0.18 },
  missiebord: { x: 4.1, z: 3.9, rot: -Math.PI * 0.18 },
};

/** Ruimte voor bomen: niet op wegen, plein of spoor. */
export function isVrijVoorBoom(x, z, marge = 0.35) {
  const r = Math.hypot(x, z);
  if (r < PLEIN_R + 0.6) return false;
  if (inWater(x, z, KADE + marge + 0.3)) return false;
  for (const p of Object.values(PLEKKEN)) if (Math.abs(x - p.x) < p.w / 2 + 1 && Math.abs(z - p.z) < p.d / 2 + 1) return false;
  if (Math.abs(z - SPOOR_Z) < SPOOR_HALF + 0.6 && r < BERG_R + 4) return false;
  for (const R of RINGEN) if (Math.abs(r - R) < WEG_HALF + marge) return false;
  const a = Math.atan2(z, x);
  if (r < RINGEN[RINGEN.length - 1] + 1) for (const l of LAAN_HOEKEN) if (Math.abs(hoekVerschil(a, l)) < Math.PI / 2 && Math.abs(Math.sin(hoekVerschil(a, l))) * r < WEG_HALF + marge) return false;
  return true;
}
