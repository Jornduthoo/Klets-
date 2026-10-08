// Het wegennet van de stad als graaf: kruispunten (knopen) en wegvakken (takken), plus de overwegen met het spoor.
// Gedeeld door de 3D-stad, de 2D-terugvalkaart, het verkeer en de lay-outcontrole (valideerStad).
//
// - Ringen liggen er enkel tot de straal waarop de stad gegroeid is (stadR); lanen lopen van ring 0 tot die ring.
//   Zo groeit elke nieuwe weg altijd vanuit een bestaande weg en eindigt hij op een kruispunt (geen doodlopende stukken).
// - Een laan die een ring kruist, maakt een X-kruispunt; op ring 0 en op de buitenste ring is het een T-kruispunt.
// - Waar een weg het spoor kruist, ligt een overweg met slagbomen (het spoor ligt nu aan de rand: er zijn er geen).
// - Waar een weg het water kruist, ligt een stenen boogbrug (bruggen()).
import {
  RINGEN, LAAN_HOEKEN, WEG_HALF, RIJBAAN, RIJSTROOK, SPOOR_Z, SPOOR_HALF, SPOOR_X, polar, hoeken, straalBereik,
  afstandSegmentPoly, raaktSpoor, kavels, huisKavels, hqPositie, WIJKEN, KAVEL, HUIS, veelhoekenOverlappen, PLEIN_R,
  WATERS, inWater, raaktWater, PLEKKEN, KADE, waterhuizen, MARKT_HUIZEN, MOLENS, STATION, BERG_R,
} from './layout.js';

const TAU = Math.PI * 2;
/** Halve grootte van een kruispuntvlak: de wegvakken beginnen pas daarbuiten. */
export const KRUIS = WEG_HALF;

const cache = new Map();
/**
 * Het wegennet voor een stad met straal stadR.
 * knopen: { id, x, z, ring, hoek, soort: 'X'|'T', takken: [tak-id] }
 * takken: { id, soort: 'ring'|'laan', a, b (knoop-id's), R, a0, a1 (ring, a1 > a0) of hoek, r0, r1 (laan), lengte }
 * overwegen: { x, z, R, tak, s (afstand vanaf knoop a langs de tak) }
 */
export function wegennet(stadR = RINGEN[RINGEN.length - 1]) {
  const key = stadR.toFixed(2);
  if (cache.has(key)) return cache.get(key);
  const ringen = RINGEN.filter(R => R <= stadR + 1e-6);
  const hoekenL = LAAN_HOEKEN.slice().sort((a, b) => a - b);
  const knopen = [], takken = [], overwegen = [];
  const kid = (ri, li) => ri * hoekenL.length + li;
  ringen.forEach((R, ri) => hoekenL.forEach((a, li) => {
    const p = polar(R, a);
    knopen.push({ id: kid(ri, li), x: p.x, z: p.z, ring: ri, R, hoek: a, soort: ri === 0 || ri === ringen.length - 1 ? 'T' : 'X', takken: [], buiten: ri === ringen.length - 1 });
  }));
  // ringvakken tussen twee lanen
  ringen.forEach((R, ri) => hoekenL.forEach((a, li) => {
    const lj = (li + 1) % hoekenL.length;
    let a1 = hoekenL[lj]; if (a1 <= a) a1 += TAU;
    const t = { id: takken.length, soort: 'ring', a: kid(ri, li), b: kid(ri, lj), R, a0: a, a1, lengte: R * (a1 - a) };
    takken.push(t);
    // overweg: waar de ring het spoor (z = SPOOR_Z, tussen de tunnels) kruist
    for (const ak of spoorHoeken(R)) for (const k of [ak, ak + TAU]) if (k > a && k < a1) overwegen.push({ x: Math.cos(k) * R, z: SPOOR_Z, R, tak: t.id, s: R * (k - a) });
  }));
  // laanvakken tussen twee ringen
  hoekenL.forEach((a, li) => { for (let ri = 0; ri < ringen.length - 1; ri++) {
    takken.push({ id: takken.length, soort: 'laan', a: kid(ri, li), b: kid(ri + 1, li), hoek: a, r0: ringen[ri], r1: ringen[ri + 1], lengte: ringen[ri + 1] - ringen[ri] });
  } });
  for (const t of takken) { knopen[t.a].takken.push(t.id); knopen[t.b].takken.push(t.id); }
  const net = { stadR, ringen, knopen, takken, overwegen };
  cache.set(key, net);
  return net;
}

/** Hoeken waarop een ring met straal R het spoor kruist (leeg als de ring binnen het spoor blijft). */
export function spoorHoeken(R) {
  if (R < Math.abs(SPOOR_Z)) return [];
  const a = Math.asin(SPOOR_Z / R);
  return [a, Math.PI - a].map(x => (x + TAU) % TAU).filter(x => Math.abs(Math.cos(x) * R) <= SPOOR_X);
}

/** Punt en richting op een tak, op afstand s vanaf knoop a (u = s / lengte). */
export function takPunt(t, s) {
  if (t.soort === 'ring') {
    const a = t.a0 + s / t.R;
    const c = Math.cos(a), sn = Math.sin(a);
    return { x: c * t.R, z: sn * t.R, dx: -sn, dz: c };
  }
  const r = t.r0 + s, c = Math.cos(t.hoek), sn = Math.sin(t.hoek);
  return { x: c * r, z: sn * r, dx: c, dz: sn };
}
/** Positie op een rijstrook: rechts rijden. dir = 1 van a naar b, -1 van b naar a. */
export function rijPunt(t, s, dir, strook = RIJSTROOK) {
  const p = takPunt(t, s);
  const dx = p.dx * dir, dz = p.dz * dir;
  // rechts van de rijrichting (y omhoog, x oost, z zuid): (-dz, dx)
  return { x: p.x - dz * strook, z: p.z + dx * strook, dx, dz };
}

/** De middellijn van een tak als polylijn (voor tekenen en controle). */
export function takLijn(t, stap = 0.5, trimA = 0, trimB = 0) {
  const L = t.lengte, van = trimA, tot = L - trimB, n = Math.max(1, Math.ceil((tot - van) / stap));
  const pts = [];
  for (let i = 0; i <= n; i++) { const p = takPunt(t, van + (tot - van) * i / n); pts.push(p); }
  return pts;
}

/**
 * Controle van de lay-out. Geeft { ok, fouten: [tekst] }.
 * opts: { stadR, maat: { doel: [w, d], huis: [w, d], hq: { gids: [w, d] } } } met de echte voetafdruk van de modellen
 * (breedte x diepte, rond het middelpunt van de kavel). Zonder maat worden de kavelmaten gebruikt.
 */
export function valideerStad(opts = {}) {
  const stadR = opts.stadR ?? RINGEN[RINGEN.length - 1];
  const maat = opts.maat || {};
  const net = wegennet(RINGEN[RINGEN.length - 1]);   // altijd tegen het volgroeide net controleren
  const fouten = [];
  // 1. het wegennet is samenhangend en heeft geen doodlopende stukken
  for (const R of RINGEN.filter(R => R >= RINGEN[2] && R <= stadR + 1e-6)) {
    const n = wegennet(R);
    const gezien = new Set([0]), rij = [0];
    while (rij.length) { const k = n.knopen[rij.pop()]; for (const tid of k.takken) { const t = n.takken[tid]; for (const o of [t.a, t.b]) if (!gezien.has(o)) { gezien.add(o); rij.push(o); } } }
    if (gezien.size !== n.knopen.length) fouten.push(`wegennet tot ring ${R}: ${n.knopen.length - gezien.size} kruispunten niet verbonden`);
    for (const k of n.knopen) if (k.takken.length < 2) fouten.push(`doodlopende weg bij kruispunt ${k.id} (ring ${k.R})`);
    for (const k of n.knopen) {
      const verwacht = k.soort === 'X' ? 4 : 3;
      if (k.takken.length !== verwacht) fouten.push(`kruispunt ${k.id}: ${k.takken.length} wegen, verwacht ${verwacht} (${k.soort})`);
    }
    for (const t of n.takken) for (const e of [t.a, t.b]) if (!n.knopen[e]) fouten.push(`tak ${t.id} eindigt nergens`);
    // elke kruising van een weg met het spoor is een overweg
    const ringSpoor = n.takken.filter(t => t.soort === 'ring').reduce((som, t) => som + spoorHoeken(t.R).flatMap(x => [x, x + TAU]).filter(x => x > t.a0 && x < t.a1).length, 0);
    if (ringSpoor !== n.overwegen.length) fouten.push('niet elke kruising met het spoor heeft een overweg');
    for (const t of n.takken) if (t.soort === 'laan') {
      const a = polar(t.r0, t.hoek), b = polar(t.r1, t.hoek);
      if (afstandSegmentPoly(a, b, spoorPoly()) < WEG_HALF) fouten.push(`laan ${t.id} kruist het spoor zonder overweg`);
    }
  }
  // 2. wegvakken als veelhoeken (middellijn +- halve breedte), uit de polylijnen van de graaf
  const wegStukken = [];
  for (const t of net.takken) { const pts = takLijn(t, 0.6); for (let i = 1; i < pts.length; i++) wegStukken.push([pts[i - 1], pts[i]]); }
  const raaktWegNet = (poly) => {
    const [rmin, rmax] = straalBereik(poly);
    for (const [a, b] of wegStukken) {
      const ra = Math.hypot(a.x, a.z); if (ra < rmin - 3 || ra > rmax + 3) continue;
      if (afstandSegmentPoly(a, b, poly) < WEG_HALF - 0.01) return true;
    }
    return false;
  };
  const vak = (s, [w, d]) => hoeken({ x: s.x, z: s.z, rot: s.rot, w, d });
  // 3. kavels: elke voetafdruk vrij van weg, stoep en spoor, niet overlappend, en naast een weg die hij aankijkt
  const alle = [];
  for (const w of WIJKEN) {
    const hp = hqPositie(w);
    const m = maat.hq?.[w.gids] || [hp.w, hp.d];
    alle.push({ naam: 'gidsgebouw ' + w.gids, poly: vak(hp, m), s: hp, d: m[1] });
    for (const s of kavels()[w.macht]) alle.push({ naam: `kavel ${w.macht} r=${s.r.toFixed(1)}`, poly: vak(s, maat.doel || [KAVEL, KAVEL]), s, d: (maat.doel || [KAVEL, KAVEL])[1] });
  }
  for (const s of huisKavels()) alle.push({ naam: `huis r=${s.r.toFixed(1)}`, poly: vak(s, maat.huis || [HUIS, HUIS]), s, d: (maat.huis || [HUIS, HUIS])[1] });
  for (const k of alle) {
    if (raaktWegNet(k.poly)) fouten.push(`${k.naam} ligt op een weg`);
    if (raaktSpoor(k.poly, 0.05)) fouten.push(`${k.naam} ligt op het spoor`);
    if (Math.hypot(k.s.x, k.s.z) < PLEIN_R + WEG_HALF) fouten.push(`${k.naam} ligt op het plein`);
    // voorkant: punt net voor de gevel moet binnen 1 eenheid van een weg (stoeprand) liggen
    const c = Math.cos(k.s.rot), sn = Math.sin(k.s.rot);
    const voor = { x: k.s.x + sn * (k.d / 2 + 0.55), z: k.s.z + c * (k.d / 2 + 0.55) };
    const rv = Math.hypot(voor.x, voor.z);
    const ringOk = RINGEN.some(R => Math.abs(rv - R) < WEG_HALF + 0.05);
    if (!ringOk) fouten.push(`${k.naam} kijkt niet naar een weg`);
  }
  for (let i = 0; i < alle.length; i++) for (let j = i + 1; j < alle.length; j++) {
    const a = alle[i], b = alle[j];
    if (Math.abs(Math.hypot(a.s.x, a.s.z) - Math.hypot(b.s.x, b.s.z)) > 6) continue;
    if (veelhoekenOverlappen(a.poly, b.poly)) fouten.push(`${a.naam} overlapt ${b.naam}`);
  }
  // 4. water: elke plaats waar een weg (ook de stoep) het water kruist, ligt op een brug; geen kavel ligt in het water
  const brug = bruggen();
  for (const t of net.takken) {
    const L = t.lengte, n = Math.ceil(L / 0.25);
    for (let i = 0; i <= n; i++) {
      const s = L * i / n, p = takPunt(t, s);
      for (const d of [0, -WEG_HALF, WEG_HALF]) {
        const x = p.x - p.dz * d, z = p.z + p.dx * d;
        if (!inWater(x, z)) continue;
        if (!brug.some(b => b.tak === t.id && s >= b.s0 - WEG_HALF - 0.6 && s <= b.s1 + WEG_HALF + 0.6)) { fouten.push(`weg ${t.id} kruist het water zonder brug bij (${x.toFixed(1)}, ${z.toFixed(1)})`); break; }
      }
    }
  }
  for (const b of brug) if (b.s0 < KRUIS + 0.3 || b.s1 > net.takken[b.tak].lengte - KRUIS - 0.3) fouten.push(`brug ${b.id} ligt op een kruispunt`);
  for (const k of alle) if (raaktWater(k.poly, KADE)) fouten.push(`${k.naam} ligt in het water`);
  // 5. themagebouwen, huizen aan het water en de gevels op de Markt: op het droge (de kade mag) en niet op een weg
  const vast = [
    ...Object.entries(PLEKKEN).map(([id, p]) => ({ naam: 'plek ' + id, poly: hoeken(p), spoor: p.spoor })),
    ...waterhuizen().map(h => ({ naam: h.id + ' aan de ' + h.rei, poly: h.poly })),
    ...MARKT_HUIZEN.map((h, i) => ({ naam: 'gevel ' + i + ' op de Markt', poly: hoeken(h), markt: true })),
    ...MOLENS.map(m => ({ naam: m.id, poly: hoeken({ x: m.x, z: m.z, rot: m.rot, w: 2.2, d: 2.2 }) })),
  ];
  for (const v of vast) {
    if (raaktWater(v.poly, 0)) fouten.push(`${v.naam} staat in het water`);
    if (raaktWegNet(v.poly)) fouten.push(`${v.naam} staat op een weg`);
    if (!v.spoor && raaktSpoor(v.poly, 0.05)) fouten.push(`${v.naam} staat op het spoor`);
    if (v.markt) { const [, rmax] = straalBereik(v.poly); if (rmax > PLEIN_R) fouten.push(`${v.naam} steekt buiten de Markt`); }
  }
  for (let i = 0; i < vast.length; i++) for (let j = i + 1; j < vast.length; j++) if (veelhoekenOverlappen(vast[i].poly, vast[j].poly)) fouten.push(`${vast[i].naam} overlapt ${vast[j].naam}`);
  for (const v of vast) for (const k of alle) if (veelhoekenOverlappen(v.poly, k.poly)) fouten.push(`${v.naam} overlapt ${k.naam}`);
  for (const w of WATERS) if (!w.zone) fouten.push(`water ${w.id} hoort bij geen zone`);
  // 6. het spoor: aan de rand van de stad, nooit over de Markt, het Minnewater of een rei (behalve over een spoorbrug)
  const spoor = spoorPoly();
  const [smin] = straalBereik(spoor);
  if (smin < PLEIN_R + 1) fouten.push('het spoor kruist de Markt');
  if (smin < RINGEN[RINGEN.length - 1] + WEG_HALF) fouten.push('het spoor ligt niet aan de rand van de stad');
  for (let x = -SPOOR_X; x <= SPOOR_X; x += 0.25) for (const dz of [-SPOOR_HALF, 0, SPOOR_HALF]) {
    const w = inWater(x, SPOOR_Z + dz, 0.1);
    if (!w || SPOORBRUGGEN.some(b => x >= b.x0 && x <= b.x1)) continue;
    fouten.push(w.zone === 'minnewater' ? 'het spoor kruist het Minnewater' : `het spoor kruist ${w.naam} zonder spoorbrug`); x = Infinity; break;
  }
  if (Math.hypot(SPOOR_X, SPOOR_Z) < BERG_R - 1.5) fouten.push('de tunnels van het spoor liggen niet in de bergen');
  const st = hoeken(PLEKKEN.station);
  if (raaktSpoor(st, 0)) fouten.push('het stationsgebouw staat op de sporen');
  if (!raaktSpoor(st, 1.2)) fouten.push('het stationsgebouw staat niet aan het spoor');
  if (Math.abs(STATION.x) > SPOOR_X - 6) fouten.push('het station ligt te dicht bij een tunnel');

  return { ok: fouten.length === 0, fouten, aantal: { kavels: alle.length, takken: net.takken.length, overwegen: net.overwegen.length, bruggen: brug.length, waters: WATERS.length, waterhuizen: waterhuizen().length, huiskavels: huisKavels().length } };
}

/** Spoorbruggen (x-bereik) waar het spoor over water mag. Het spoor ligt aan de rand en kruist geen water. */
export const SPOORBRUGGEN = [];
/** De spoorstrook als veelhoek (tussen de twee tunnels). */
export function spoorPoly() {
  return [{ x: -SPOOR_X, z: SPOOR_Z - SPOOR_HALF }, { x: SPOOR_X, z: SPOOR_Z - SPOOR_HALF }, { x: SPOOR_X, z: SPOOR_Z + SPOOR_HALF }, { x: -SPOOR_X, z: SPOOR_Z + SPOOR_HALF }];
}

let _bruggen = null;
/**
 * Alle bruggen: waar een wegvak van het volgroeide net over het water loopt. Elke brug weet op welke tak ze ligt
 * (s0..s1 langs die tak), haar richting (dx, dz), hoe lang de overspanning is en vanaf welke ring ze er ligt (R).
 */
export function bruggen() {
  if (_bruggen) return _bruggen;
  const net = wegennet(RINGEN[RINGEN.length - 1]);
  const uit = [];
  for (const t of net.takken) {
    const L = t.lengte, n = Math.ceil(L / 0.05);
    let s0 = null, w0 = null;
    for (let i = 0; i <= n + 1; i++) {
      const s = Math.min(L, L * i / n), p = takPunt(t, s);
      const w = i <= n ? inWater(p.x, p.z) : null;
      if (w && s0 == null) { s0 = s; w0 = w; }
      if (!w && s0 != null) {
        const s1 = s, m = takPunt(t, (s0 + s1) / 2);
        uit.push({ id: `brug-${t.id}-${uit.length}`, tak: t.id, s0, s1, x: m.x, z: m.z, dx: m.dx, dz: m.dz, lengte: s1 - s0,
          R: t.soort === 'ring' ? t.R : t.r1, water: w0.id, zone: w0.zone });
        s0 = null;
      }
    }
  }
  _bruggen = uit;
  return uit;
}

/** Lengte van het spoor tussen de tunnels (voor het tekenen). */
export const SPOOR_LENGTE = SPOOR_X * 2;
export { RIJBAAN };
