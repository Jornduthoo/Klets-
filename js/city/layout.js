// De plattegrond van de stad (thema 1: Zwinvliet): vaste, deterministische posities.
// Wereldeenheden: 1 eenheid ~ 1 tegel. x = oost, z = zuid, y = omhoog. Middelpunt = de Markt.
// Gebruikt door de 3D-stad en door de 2D-terugvalkaart, zodat beide precies hetzelfde tonen.
//
// Opbouw: de Markt (een open plein met Belfort, fontein, terrassen en trapgevels) met een ringweg errond,
// daarbuiten ringwegen met tussen elke twee ringen twee rijen kavels. Vier lanen (radiale wegen) verbinden de ringen.
// Water: een ringvaart (de vesten) met vier binnenreien naar de Markt, het Minnewater in het zuiden en in het noorden
// de rei naar de sluis, de haven en de zee. Waar een weg over het water gaat, ligt een stenen boogbrug (wegen.js: bruggen).
// Het spoor en het station liggen aan de zuidrand, buiten de buitenste ring, tussen twee tunnels in de bergen.
// Elke kavel ligt naast een weg, kijkt ernaar en raakt nooit asfalt, stoep, spoor of water (zie wegen.js: valideerStad).

/** Ringwegen. De eerste ring omsluit de Markt, tussen ring 0 en 1 ligt de Reizigerswijk (huizen).
 *  Tussen ring 2 en ring 3 ligt de ringvaart (de vesten): die band is breder, met huizen die met hun rug naar het water staan. */
export const RINGEN = [8.6, 15.8, 23.8, 35.8, 43.8, 51.8];
export const PLEIN_R = 7.2;
export const DAL_R = 63;          // rand van de vlakke vallei
export const BERG_R = 65;         // daar beginnen de bergen
// Het spoor ligt aan de zuidrand van de stad, buiten de buitenste ringweg: het raakt de Markt, de reien en het Minnewater niet.
export const SPOOR_Z = 56.4;      // het spoor loopt oost-west langs de zuidrand
export const SPOOR_HALF = 1.9;    // halve breedte van de spoorstrook (ballast en sporen)
export const SPOOR_SPOREN = [-0.55, 0.55];   // de twee sporen, ten opzichte van SPOOR_Z
export const SPOOR_X = 32.2;      // het spoor loopt van -SPOOR_X tot SPOOR_X (tussen de twee tunnelmonden in de bergen)
export const LAAN_HOEKEN = [60, 120, 240, 300].map(d => d * Math.PI / 180); // radiale lanen
export const RIJBAAN = 1.2;       // kasseien (smalle middeleeuwse straat)
export const STOEP = 0.25;        // een rand van grotere stenen aan elke kant
export const WEG_HALF = RIJBAAN / 2 + STOEP;   // 0.85: halve breedte van straat + randen
export const WEG_BREED = RIJBAAN;
export const RIJSTROOK = 0.3;     // afstand van de middellijn tot het midden van een rijstrook
export const VOORTUIN = 0.3;      // oprit tussen stoep en kavel
export const KAVEL = 2.5;         // vierkante kavel voor een doelgebouw
export const HUIS = 2.0;          // kavel voor een huis
export const HQ = { w: 6.4, d: 4.8 }; // kavel van een gidsgebouw (gebouw + voorpleintje voor de gids)
export const MIST_MIN = 25;       // straal die altijd vrij is (gidsen, huizen, eerste wijk)
export const MIST_MAX = 96;        // de nevel hangt ver buiten de stad, voorbij de haven en de zee
export const POORT = { x: SPOOR_X + 1.0, z: SPOOR_Z };     // De Poort: de oostelijke tunnel naar de middelbare school
export const TUNNEL_WEST = { x: -SPOOR_X - 1.0, z: SPOOR_Z };
/** Het station aan de rand van de stad: het gebouw staat aan de stadskant van het spoor. */
export const STATION = { x: -17, z: SPOOR_Z };

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
  let zmin = Infinity, zmax = -Infinity, xmin = Infinity, xmax = -Infinity;
  for (const p of poly) { zmin = Math.min(zmin, p.z - SPOOR_Z); zmax = Math.max(zmax, p.z - SPOOR_Z); xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x); }
  if (xmax < -SPOOR_X - 3 || xmin > SPOOR_X + 3) return false;
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


// ---------- water: de vesten, de reien, het Minnewater, de sluis en de haven ----------
// Zwinvliet is een Venetie van het Noorden: een ringvaart (de vesten) rond het centrum, vier reien die van
// de vesten naar het centrum lopen (de Dijver met de Rozenhoedkaai, de Groenerei, de Spiegelrei en de Langerei),
// het Minnewater aan de zuidkant van de vesten, en in het noorden de rei naar de sluis, de haven en de zee.
// Alles hangt aan elkaar. Waar een weg het water kruist, ligt een stenen boogbrug (zie wegen.js: bruggen()).
// Elk stuk water hoort bij een zone; haalt de klas het labo van die zone, dan wordt dat water helder (water.js).
export const KADE = 0.35;         // kademuur rond elk water
export const WATER_Y = -0.5;      // het wateroppervlak ligt een halve eenheid onder de kade
export const VEST_R = 30.0, VEST_HALF = 2.1;
/** De stadswal (de vesten van Brugge): een aarden wal met een kantelenmuur tussen de vest en ring 3. Daar staan de molens en de stadspoorten. */
export const WAL_R0 = VEST_R + VEST_HALF + KADE, WAL_R1 = 35.8 - WEG_HALF - 0.05;
export const MUUR_R = WAL_R0 + 0.45;
const graden = (d) => d * Math.PI / 180;
export const WATERS = [
  { id: 'vest-oost', naam: 'De Oostvest', zone: 'reie-zuid', soort: 'boog', r: VEST_R, halfB: VEST_HALF, a0: graden(-45), a1: graden(45) },
  { id: 'vest-zuid', naam: 'De Zuidvest aan het Minnewater', zone: 'minnewater', soort: 'boog', r: VEST_R, halfB: VEST_HALF, a0: graden(45), a1: graden(135) },
  { id: 'vest-west', naam: 'De Westvest', zone: 'reie-noord', soort: 'boog', r: VEST_R, halfB: VEST_HALF, a0: graden(135), a1: graden(225) },
  { id: 'vest-noord', naam: 'De Noordvest', zone: 'noordrei', soort: 'boog', r: VEST_R, halfB: VEST_HALF, a0: graden(225), a1: graden(315) },
  { id: 'minnewater', naam: 'Het Minnewater', zone: 'minnewater', soort: 'vlek', x: 0, z: 28.6, rx: 7.5, rz: 2.6 },
  { id: 'rozenhoedkaai', naam: 'De Rozenhoedkaai', zone: 'reie-zuid', soort: 'strook', x0: 0, z0: 10.6, x1: 0, z1: 14.0, halfB: 2.4 },
  { id: 'dijver', naam: 'De Dijver', zone: 'reie-zuid', soort: 'strook', x0: 0, z0: 13.6, x1: 0, z1: 27.0, halfB: 1.8 },
  { id: 'groenerei', naam: 'De Groenerei bij de Scheepswerf', zone: 'reie-noord', soort: 'strook', x0: 0, z0: -10.6, x1: 0, z1: -28.6, halfB: 1.8 },
  { id: 'spiegelrei', naam: 'De Spiegelrei', zone: 'reie-zuid', soort: 'strook', x0: 10.6, z0: 0, x1: 28.6, z1: 0, halfB: 1.8 },
  { id: 'langerei', naam: 'De Langerei', zone: 'reie-noord', soort: 'strook', x0: -10.6, z0: 0, x1: -28.6, z1: 0, halfB: 1.8 },
  { id: 'noordrei', naam: 'De rei naar de haven', zone: 'noordrei', soort: 'strook', x0: 0, z0: -31.0, x1: 0, z1: -53.8, halfB: 1.4 },
  { id: 'sluiskolk', naam: 'De sluiskolk van Zeebrugge', zone: 'haven', soort: 'strook', x0: 0, z0: -53.6, x1: 0, z1: -58.2, halfB: 1.7 },
  { id: 'haven', naam: 'De havenkom van Zeebrugge', zone: 'haven', soort: 'vlek', x: 0, z: -63, rx: 12, rz: 5.5 },
  { id: 'zee', naam: 'De Noordzee', zone: 'haven', soort: 'vlek', x: 0, z: -110, rx: 78, rz: 47 },
];
for (const w of WATERS) if (w.soort === 'strook') {
  const dx = w.x1 - w.x0, dz = w.z1 - w.z0, L = Math.hypot(dx, dz);
  Object.assign(w, { L, dx: dx / L, dz: dz / L, nx: -dz / L, nz: dx / L });
}
/** De sluisdeuren: aan beide kanten van de sluiskolk. */
export const SLUISDEUREN = [{ x: 0, z: -53.95 }, { x: 0, z: -57.85 }];

/** Ligt (x, z) in dit stuk water (met een extra rand marge)? */
export function inStuk(w, x, z, marge = 0) {
  if (w.soort === 'strook') {
    const px = x - w.x0, pz = z - w.z0, s = px * w.dx + pz * w.dz, d = px * w.nx + pz * w.nz;
    return Math.abs(d) <= w.halfB + marge && s >= -marge && s <= w.L + marge;
  }
  if (w.soort === 'boog') {
    const r = Math.hypot(x, z);
    if (Math.abs(r - w.r) > w.halfB + marge) return false;
    let a = Math.atan2(z, x); const ext = marge / Math.max(1, w.r);
    while (a < w.a0 - ext) a += Math.PI * 2;
    return a <= w.a1 + ext;
  }
  const dx = (x - w.x) / (w.rx + marge), dz = (z - w.z) / (w.rz + marge);
  return dx * dx + dz * dz <= 1;
}
/** Hoort dit punt bij het water? (marge = extra kade errond) Geeft het stuk water terug. */
export function inWater(x, z, marge = 0) {
  for (const w of WATERS) if (inStuk(w, x, z, marge)) return w;
  return null;
}
/** Welke zone hoort bij dit punt (of null)? */
export function waterZone(x, z, marge = 0) { return inWater(x, z, marge)?.zone || null; }
/** Raakt een veelhoek het water (inclusief kade)? */
export function raaktWater(poly, marge = KADE) {
  for (const p of poly) if (inWater(p.x, p.z, marge)) return true;
  // ook de randen en het binnenste testen (een smalle rei kan tussen twee hoekpunten door lopen)
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25));
    for (let k = 1; k < n; k++) { const t = k / n; if (inWater(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, marge)) return true; }
  }
  let cx = 0, cz = 0; for (const p of poly) { cx += p.x; cz += p.z; }
  return !!inWater(cx / poly.length, cz / poly.length, marge);
}
/** Het midden van een stuk water (om ernaartoe te vliegen). */
export function waterMidden(w) {
  if (w.soort === 'strook') return { x: (w.x0 + w.x1) / 2, z: (w.z0 + w.z1) / 2 };
  if (w.soort === 'boog') { const a = (w.a0 + w.a1) / 2; return { x: Math.cos(a) * w.r, z: Math.sin(a) * w.r }; }
  return { x: w.x, z: w.z };
}
/**
 * De omtrek van een stuk water als veelhoek(en), met een extra rand marge. Voor het tekenen (2D-kaart,
 * het grondmasker en de zonekaart). Een boog geeft één gesloten veelhoek (buitenboog heen, binnenboog terug).
 */
export function waterVeelhoek(w, marge = 0, stap = 0.6) {
  const pts = [];
  if (w.soort === 'strook') {
    const h = w.halfB + marge, s0 = -marge, s1 = w.L + marge;
    for (const [s, d] of [[s0, -h], [s1, -h], [s1, h], [s0, h]]) pts.push({ x: w.x0 + w.dx * s + w.nx * d, z: w.z0 + w.dz * s + w.nz * d });
  } else if (w.soort === 'boog') {
    const ext = marge / w.r, a0 = w.a0 - ext, a1 = w.a1 + ext, ro = w.r + w.halfB + marge, ri = w.r - w.halfB - marge;
    const n = Math.max(8, Math.ceil((a1 - a0) * ro / stap));
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push({ x: Math.cos(a) * ro, z: Math.sin(a) * ro }); }
    for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; pts.push({ x: Math.cos(a) * ri, z: Math.sin(a) * ri }); }
  } else {
    const rx = w.rx + marge, rz = w.rz + marge, n = Math.max(24, Math.ceil(Math.PI * (rx + rz) / stap));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push({ x: w.x + Math.cos(a) * rx, z: w.z + Math.sin(a) * rz }); }
  }
  return pts;
}
/**
 * Punten op de oever van een stuk water, met de richting naar het land (nx, nz) en de richting langs de oever.
 * Punten die in een ander stuk water liggen (waar twee reien samenkomen) vallen weg: daar loopt het water door.
 */
export function oeverPunten(w, stap = 0.7) {
  const uit = [];
  const zet = (x, z, nx, nz) => { if (!inWater(x + nx * 0.06, z + nz * 0.06)) uit.push({ x, z, nx, nz, tx: -nz, tz: nx, w }); };
  if (w.soort === 'strook') {
    const n = Math.max(1, Math.round(w.L / stap));
    for (let i = 0; i <= n; i++) { const s = w.L * i / n; for (const k of [-1, 1]) zet(w.x0 + w.dx * s + w.nx * w.halfB * k, w.z0 + w.dz * s + w.nz * w.halfB * k, w.nx * k, w.nz * k); }
    const m = Math.max(1, Math.round(w.halfB * 2 / stap));
    for (let i = 0; i <= m; i++) { const d = -w.halfB + 2 * w.halfB * i / m;
      zet(w.x0 + w.nx * d, w.z0 + w.nz * d, -w.dx, -w.dz);
      zet(w.x1 + w.nx * d, w.z1 + w.nz * d, w.dx, w.dz); }
  } else if (w.soort === 'boog') {
    for (const [r, k] of [[w.r + w.halfB, 1], [w.r - w.halfB, -1]]) {
      const n = Math.max(4, Math.round((w.a1 - w.a0) * r / stap));
      for (let i = 0; i <= n; i++) { const a = w.a0 + (w.a1 - w.a0) * i / n, c = Math.cos(a), s = Math.sin(a); zet(c * r, s * r, c * k, s * k); }
    }
  } else {
    const n = Math.max(24, Math.round(Math.PI * (w.rx + w.rz) / stap));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), nx = c / w.rx, nz = s / w.rz, l = Math.hypot(nx, nz); zet(w.x + c * w.rx, w.z + s * w.rz, nx / l, nz / l); }
  }
  return uit;
}

// ---------- vaste plekken voor themagebouwen en herkenningspunten ----------
// Een plek is een rechthoek (x, z, rot, w, d). rot = 0 betekent: de voorkant kijkt naar +z (zuid).
// labelY: hoe hoog het naamkaartje boven de plek hangt (zodat kaartjes op de Markt niet overlappen).
const naarMidden = (x, z) => Math.atan2(-x, -z);
const _wl = polar(33.65, graden(104));
export const PLEKKEN = {
  belfort: { x: 0, z: -4.4, rot: 0, w: 4.0, d: 2.6, naam: 'Belfort en Hallen', labelY: 11.4 },
  hallen: { x: 4.7, z: -2.7, rot: naarMidden(4.7, -2.7), w: 2.6, d: 2.2, naam: 'De Hallen (Werkplaats)', labelY: 3.9 },
  provinciaalhof: { x: -4.7, z: -2.7, rot: naarMidden(-4.7, -2.7), w: 2.2, d: 2.2, naam: 'Het gotische huis op de Markt', labelY: 4.2 },
  scheepswerf: { x: 3.4, z: -19.7, rot: -Math.PI / 2, w: 4.0, d: 2.8, naam: 'Scheepswerf aan de Groenerei', labelY: 3.2 },
  waterlabo: { x: _wl.x, z: _wl.z, rot: naarMidden(_wl.x, _wl.z), w: 3.4, d: 2.2, schaal: 0.9, naam: 'Waterlabo aan het Minnewater', labelY: 3.4 },
  waterval: { x: 5.4, z: 33.3, rot: 0, w: 3.6, d: 1.6, naam: 'De waterval van het Minnewater', labelY: 3.4 },
  sluis: { x: 4.1, z: -55.4, rot: -Math.PI / 2, w: 3.4, d: 2.6, naam: 'Sluis van Zeebrugge', labelY: 3.6 },
  vuurtoren: { x: 14.5, z: -61.0, rot: 0, w: 2.4, d: 2.4, naam: 'Vuurtoren aan de havenmond', labelY: 5.6 },
  olvkerk: { x: -5.0, z: 19.8, rot: 0, w: 2.6, d: 3.6, naam: 'Onze-Lieve-Vrouwekerk', labelY: 11 },
  station: { x: STATION.x, z: SPOOR_Z - 2.72, rot: 0, w: 9.2, d: 1.6, naam: 'Station Zwinvliet', labelY: 4.6, spoor: true },
};
/** Raakt een veelhoek de stadswal (de band tussen de vest en ring 3)? Daar komen geen kavels. */
export function raaktWal(poly, marge = 0) {
  const [rmin, rmax] = straalBereik(poly);
  return rmax > WAL_R0 - marge && rmin < WAL_R1 + marge;
}
/** De stadspoorten: waar een laan over de vest de stad verlaat, staat een poort op de wal (zoals in Brugge). */
export const POORTEN = [
  { id: 'gentpoort', naam: 'De Gentpoort', hoek: 60 },
  { id: 'smedenpoort', naam: 'De Smedenpoort', hoek: 120 },
  { id: 'ezelpoort', naam: 'De Ezelpoort', hoek: 240 },
  { id: 'kruispoort', naam: 'De Kruispoort', hoek: 300 },
].map(p => { const a = p.hoek * Math.PI / 180, r = (WAL_R0 + WAL_R1) / 2; return { ...p, a, r, x: Math.cos(a) * r, z: Math.sin(a) * r, rot: naarBuiten(a) }; });
/** Molens op de stadswal, zoals de Sint-Janshuismolen op de Kruisvest. */
export const MOLENS = [-52, -18, 28, 154, 200, 214].map((d, i) => {
  const a = d * Math.PI / 180, r = (WAL_R0 + WAL_R1) / 2;
  return { id: 'molen' + i, x: Math.cos(a) * r, z: Math.sin(a) * r, rot: naarBuiten(a), a };
});

// ---------- huizen aan het water ----------
// Smalle trapgevelhuizen die met hun gevel recht uit het water rijzen, zoals aan de Rozenhoedkaai in Brugge.
// Ze staan op vaste plaatsen langs de reien (niet op kavels) en houden kavels, bomen en wegen vrij.
let _waterhuizen = null;
export function waterhuizen() {
  if (_waterhuizen) return _waterhuizen;
  const lijst = [];
  const rijen = [
    ['rozenhoedkaai', 0.15, 3.3, [-1, 1]],
    // aan de reien staan de huizen aan één kant (de noord- of westkant); aan de overkant ligt een open kaai met bomen,
    // zodat je het water van bovenaf goed ziet
    ['dijver', 3.65, 8.85, [1]],
    ['dijver', 11.0, 13.4, [1]],
    ['groenerei', 0.15, 3.85, [-1]],
    ['groenerei', 6.6, 11.85, [-1]],
    ['groenerei', 14.1, 16.9, [-1]],
    ['spiegelrei', 0.15, 4.0, [-1]],
    ['spiegelrei', 6.6, 11.85, [-1]],
    ['spiegelrei', 14.1, 16.9, [-1]],
    ['langerei', 0.15, 4.0, [1]],
    ['langerei', 6.6, 11.85, [1]],
    ['langerei', 14.1, 16.9, [1]],
  ];
  let n = 0;
  for (const [id, s0, s1, kanten] of rijen) {
    const w = WATERS.find(x => x.id === id);
    for (const k of kanten) {
      let s = s0;
      while (s < s1 - 0.9) {
        const breed = Math.min(s1 - s, 0.98 + ((n * 37) % 5) * 0.08);
        const diep = 1.35, af = w.halfB + 0.03 + diep / 2, mid = s + breed / 2;
        const x = w.x0 + w.dx * mid + w.nx * af * k, z = w.z0 + w.dz * mid + w.nz * af * k;
        // de gevel kijkt naar het water
        const rot = Math.atan2(-w.nx * k, -w.nz * k);
        const huis = { id: 'waterhuis' + n, x, z, rot, w: breed - 0.04, d: diep, h: 1.4 + ((n * 53) % 7) * 0.12, variant: n % 6, rei: id };
        huis.poly = hoeken(huis);
        if (!plekPolys().some(p => overlapt(p, huis.poly)) && !raaktWater(huis.poly, 0) && !raaktWeg(huis.poly, 0.05)) lijst.push(huis);
        s += breed; n++;
      }
    }
  }
  _waterhuizen = lijst;
  return lijst;
}

// ---------- de Markt ----------
/** Trapgevels rond de Markt (de gildehuizen), met hun gevel naar het plein. */
export const MARKT_HUIZEN = (() => {
  const uit = [];
  const boog = (a0, a1, r) => {
    const n = Math.round(Math.abs(a1 - a0) * Math.PI / 180 * r / 1.16);
    for (let i = 0; i < n; i++) {
      const a = graden(a0 + (a1 - a0) * (i + 0.5) / n), p = polar(r, a);
      uit.push({ x: p.x, z: p.z, rot: naarMidden(p.x, p.z), w: 1.08, d: 1.3, h: 2.0 + ((uit.length * 41) % 6) * 0.22, variant: uit.length % 6 });
    }
  };
  boog(-12, 44, 6.25); boog(136, 192, 6.25);
  return uit;
})();
/** Terrasjes voor de gildehuizen (tafel met parasol). */
export const TERRASSEN = (() => {
  const uit = [];
  for (const [a0, a1] of [[-8, 40], [140, 188]]) for (let a = a0; a <= a1; a += 12) for (const r of [4.55]) { const p = polar(r, graden(a)); uit.push({ x: p.x, z: p.z, rot: graden(a) }); }
  return uit;
})();

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
  const genomen = [];     // kavels op de grens van twee wijken: de eerste wijk krijgt ze
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
          if (raaktWeg(poly, 0.02) || raaktSpoor(poly, 0.3) || raaktWater(poly) || raaktWal(poly)) continue;
          if (hqs.some(h => overlapt(h, poly))) continue;
          if (plekPolys().some(h => overlapt(h, poly))) continue;
          if (waterhuizen().some(h => overlapt(h.poly, poly))) continue;
          if (genomen.some(q => Math.abs(q.r - rho) < 0.1 && overlapt(q.poly, poly))) continue;
          genomen.push({ r: rho, poly });
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
      if (waterhuizen().some(h => overlapt(h.poly, poly))) continue;
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

/** Vaste gebouwen op en rond de Markt: de fontein in het midden, de codekluis en het missiebord aan de open zuidkant. */
export const PLEIN = {
  station: PLEKKEN.belfort,
  klasmeter: { x: 0, z: 0.7 },      // de grote fontein op de Markt
  kluis: { x: -2.5, z: 4.75, rot: Math.PI * 0.16 },
  missiebord: { x: 2.5, z: 4.75, rot: -Math.PI * 0.16 },
};
/** Waar de vaste naamkaartjes in de stad hangen (de app zet er knoppen op). */
export const LABELS = {
  station: { x: 0, y: 13.4, z: -4.5 },          // de naam van de stad, boven de toren van het Belfort
  poort: { x: POORT.x, y: 8.5, z: POORT.z },
  kluis: { x: PLEIN.kluis.x, y: 2.6, z: PLEIN.kluis.z },
  missiebord: { x: PLEIN.missiebord.x, y: 2.8, z: PLEIN.missiebord.z },
};

/** Ruimte voor bomen: niet op wegen, plein, spoor, water of tegen een gebouw. */
export function isVrijVoorBoom(x, z, marge = 0.35) {
  const r = Math.hypot(x, z);
  if (r < PLEIN_R + 0.6) return false;
  if (inWater(x, z, KADE + marge + 0.3)) return false;
  for (const p of Object.values(PLEKKEN)) if (Math.abs(x - p.x) < Math.max(p.w, p.d) / 2 + 1 && Math.abs(z - p.z) < Math.max(p.w, p.d) / 2 + 1) return false;
  for (const h of waterhuizen()) if (Math.abs(x - h.x) < 1.3 && Math.abs(z - h.z) < 1.3) return false;
  for (const m of MOLENS) if (Math.hypot(x - m.x, z - m.z) < 1.7) return false;
  for (const p of POORTEN) if (Math.hypot(x - p.x, z - p.z) < 2.8) return false;
  if (Math.abs(r - MUUR_R) < 0.75) return false;
  if (Math.abs(z - SPOOR_Z) < SPOOR_HALF + 0.8 && Math.abs(x) < SPOOR_X + 6) return false;
  if (Math.abs(x - STATION.x) < 8 && z > SPOOR_Z - 5 && z < SPOOR_Z + 3) return false;
  for (const R of RINGEN) if (Math.abs(r - R) < WEG_HALF + marge) return false;
  const a = Math.atan2(z, x);
  if (r < RINGEN[RINGEN.length - 1] + 1) for (const l of LAAN_HOEKEN) if (Math.abs(hoekVerschil(a, l)) < Math.PI / 2 && Math.abs(Math.sin(hoekVerschil(a, l))) * r < WEG_HALF + marge) return false;
  return true;
}
