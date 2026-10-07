// Het wegennet van Klets als graaf: kruispunten (knopen) en wegvakken (takken), plus de overwegen met het spoor.
// Gedeeld door de 3D-stad, de 2D-terugvalkaart, het verkeer en de lay-outcontrole (valideerStad).
//
// - Ringen liggen er enkel tot de straal waarop de stad gegroeid is (stadR); lanen lopen van ring 0 tot die ring.
//   Zo groeit elke nieuwe weg altijd vanuit een bestaande weg en eindigt hij op een kruispunt (geen doodlopende stukken).
// - Een laan die een ring kruist, maakt een X-kruispunt; op ring 0 en op de buitenste ring is het een T-kruispunt.
// - Waar een ring het spoor kruist, ligt een overweg met slagbomen.
import {
  RINGEN, LAAN_HOEKEN, WEG_HALF, RIJBAAN, RIJSTROOK, SPOOR_Z, SPOOR_HALF, SPOOR_X, polar, hoeken, straalBereik,
  afstandSegmentPoly, raaktSpoor, kavels, huisKavels, hqPositie, WIJKEN, KAVEL, HUIS, veelhoekenOverlappen, PLEIN_R,
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
    // overweg: waar de ring z = 0 kruist (hoek 0 of PI)
    for (const ak of [0, Math.PI, TAU]) if (ak > a && ak < a1) overwegen.push({ x: Math.cos(ak) * R, z: SPOOR_Z, R, tak: t.id, s: R * (ak - a) });
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
    const ringSpoor = n.takken.filter(t => t.soort === 'ring').reduce((s, t) => s + [0, Math.PI, TAU].filter(a => a > t.a0 && a < t.a1).length, 0);
    if (ringSpoor !== n.overwegen.length) fouten.push('niet elke kruising met het spoor heeft een overweg');
    for (const t of n.takken) if (t.soort === 'laan' && Math.abs(Math.sin(t.hoek)) * t.r0 < SPOOR_HALF + WEG_HALF) fouten.push(`laan ${t.id} ligt op het spoor`);
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
  return { ok: fouten.length === 0, fouten, aantal: { kavels: alle.length, takken: net.takken.length, overwegen: net.overwegen.length } };
}

/** Lengte van het spoor tussen de tunnels (voor het tekenen). */
export const SPOOR_LENGTE = SPOOR_X * 2;
export { RIJBAAN };
