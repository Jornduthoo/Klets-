// Varen in Zwinvliet: de vaarroutes, hoe groot elke boot is, en hoe hoog de bruggen boven het water liggen.
// Zuivere logica (geen three.js): water3d.js en verhaal3d.js varen ermee, tools/valideer-stad.mjs controleert
// dat geen enkele boot door een brug of een kaaimuur steekt.
//
// Regels (zoals in Brugge):
// - de bruggen over de reien zijn lage stenen bogen met een vlakke kruin; de rondvaartboten, aken en slijkschuiten
//   zijn laag (passagiers en schippers zitten) en passen eronder;
// - boten met een mast (kogge, zeilboten, het zeilbootje van Byte) varen enkel waar geen lage brug ligt:
//   in de haven, op zee en op het stuk van de Oostvest tussen twee bruggen.
import { WATER_Y, VEST_R, WEG_HALF, inWater } from './layout.js';
import { bruggen } from './wegen.js';

const TAU = Math.PI * 2;
export const gr = (d) => d * Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- bruggen
/** De bovenkant van het gewelf (onder het wegdek). */
export const BRUG_KROON = -0.06;
/** Halve breedte van een brug dwars op de weg (gewelf + borstwering). */
export const BRUG_HALF_BREED = WEG_HALF + 0.24;
/** Vorm van de boog: 1 in het midden, 0 aan de landhoofden (een korfboog: lang vlak, op het einde steil). */
export function boogVorm(t) { const a = Math.min(1, Math.abs(t)); return Math.sqrt(Math.max(0, 1 - a * a * a * a)); }
/** In hoeveel blokjes het gewelf gebouwd wordt (water3d.js); elk blokje is vlak. */
export const BRUG_SEG = 18;
/** De onderkant van het gewelf op plaats u (langs de weg, 0 = midden van de rei) van een brug: precies zoals gebouwd. */
export function brugOnderkant(br, u) {
  const S = br.lengte + 0.04, half = S / 2;
  const i = clamp(Math.floor((u + half) / S * BRUG_SEG), 0, BRUG_SEG - 1), uc = -half + (i + 0.5) * S / BRUG_SEG;
  return WATER_Y + (BRUG_KROON - WATER_Y) * boogVorm(uc / half) - 0.02;
}
/** Ligt (x, z) onder een brug? Geeft { br, u, v, onder } of null. */
export function onderBrug(x, z, lijst = bruggen()) {
  for (const br of lijst) {
    const px = x - br.x, pz = z - br.z, u = px * br.dx + pz * br.dz, v = -px * br.dz + pz * br.dx;
    if (Math.abs(v) < BRUG_HALF_BREED + 0.05 && Math.abs(u) < br.lengte / 2 + 0.7) return { br, u, v, onder: Math.abs(u) <= (br.lengte + 0.04) / 2 ? brugOnderkant(br, u) : -Infinity };
  }
  return null;
}

// ---------------------------------------------------------------- boten
/** Afmetingen (breedte, lengte, hoogste punt boven de waterlijn). Zie bootGeo in brugge.js. */
export const BOOT_MATEN = {
  reie: { breed: 0.84, lang: 2.78, hoog: 0.3 },
  aak: { breed: 0.92, lang: 3.02, hoog: 0.3 },
  bagger: { breed: 0.94, lang: 2.5, hoog: 0.3 },
  roei: { breed: 0.44, lang: 1.12, hoog: 0.08 },
  kogge: { breed: 1.9, lang: 4.6, hoog: 3.6, mast: true },
  zeil: { breed: 0.7, lang: 2.0, hoog: 2.1, mast: true },
  'byte-zeil': { breed: 0.5, lang: 1.45, hoog: 1.5, mast: true },
};
/** Hoeveel ruimte boven een boot onder een brug (deining en schommelen). */
export const VAAR_MARGE = 0.05;

/** Een vaarweg als polylijn met booglengte; lus = rondgaand, anders heen en terug. */
export class Pad {
  constructor(pts, lus = false) {
    this.pts = lus ? [...pts, pts[0]] : pts; this.lus = lus;
    this.s = [0];
    for (let i = 1; i < this.pts.length; i++) this.s.push(this.s[i - 1] + Math.hypot(this.pts[i].x - this.pts[i - 1].x, this.pts[i].z - this.pts[i - 1].z));
    this.L = this.s[this.s.length - 1];
  }
  punt(s) {
    s = this.lus ? ((s % this.L) + this.L) % this.L : clamp(s, 0, this.L);
    let i = 1; while (i < this.s.length - 1 && this.s[i] < s) i++;
    const a = this.pts[i - 1], b = this.pts[i], l = Math.max(1e-6, this.s[i] - this.s[i - 1]), u = (s - this.s[i - 1]) / l;
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l };
  }
}
export const boog = (r, a0, a1, stap = 1.2) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * r / stap)), uit = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; uit.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); } return uit; };
const P = (x, z) => ({ x, z });

/**
 * De vaste vaarroutes. zone = thuiszone (daar moet het water een beetje proper zijn), soort = boot,
 * lus = rondgaand, v = snelheid, altijd = ook bij vuil water en hoogwater (enkel op open water), vuil = enkel bij vuil water.
 * De reien hebben vier bruggen op elke rei; boten varen in het midden, waar de boog het hoogst is.
 */
export function vaarroutes() {
  return [
    { zone: 'reie-zuid', soort: 'reie', pts: [P(-0.8, 12.1), P(0, 13.8), P(0, 15.5), P(0, 26.0), P(2.6, 28.4), P(6.0, 29.0)], v: 0.55 },
    { zone: 'reie-noord', soort: 'reie', pts: [P(0, -12.1), P(0, -29.0), ...boog(VEST_R, gr(266), gr(184)), P(-28.0, 0), P(-12.1, 0)], v: 0.6 },
    { zone: 'reie-zuid', soort: 'reie', pts: [P(12.1, 0), P(29.2, 0), ...boog(VEST_R, gr(3), gr(72))], v: 0.5 },
    { zone: 'noordrei', soort: 'aak', pts: [P(0, -52.4), P(0, -31.2), ...boog(VEST_R, gr(272), gr(312))], v: 0.4 },
    { zone: 'minnewater', soort: 'roei', pts: boog(1, 0, TAU * 0.98, 0.05).map(p => P(p.x * 4.6, 28.6 + p.z * 1.25)), lus: true, v: 0.32 },
    { zone: 'minnewater', soort: 'reie', pts: [...boog(VEST_R, gr(48), gr(132))], v: 0.45 },
    { zone: 'haven', soort: 'kogge', pts: [P(0, -61.5), P(-2, -72), P(-8, -88)], v: 0.5, groot: true, altijd: true },
    { zone: 'haven', soort: 'zeil', pts: boog(1, 0, TAU * 0.98, 0.04).map(p => P(14 + p.x * 9, -82 + p.z * 5)), lus: true, v: 0.7, altijd: true },
    // slijkschuiten: enkel waar het water nog vuil is (ze verdwijnen als de zone helder wordt)
    { zone: 'reie-zuid', soort: 'bagger', pts: [P(-0.5, 15.0), P(-0.5, 25.5)], v: 0.18, vuil: true },
    { zone: 'reie-zuid', soort: 'bagger', pts: [P(13.0, -0.4), P(26.5, -0.4)], v: 0.16, vuil: true },
    { zone: 'reie-noord', soort: 'bagger', pts: [P(0.4, -13.0), P(0.4, -26.5)], v: 0.17, vuil: true },
    { zone: 'reie-noord', soort: 'bagger', pts: [P(-13.0, 0.4), P(-26.5, 0.4)], v: 0.15, vuil: true },
    { zone: 'reie-noord', soort: 'bagger', pts: boog(VEST_R + 0.6, gr(150), gr(210)), v: 0.2, vuil: true },
    { zone: 'reie-zuid', soort: 'bagger', pts: boog(VEST_R - 0.6, gr(-30), gr(30)), v: 0.2, vuil: true },
    { zone: 'noordrei', soort: 'bagger', pts: [P(-0.4, -34), P(-0.4, -50)], v: 0.16, vuil: true },
    { zone: 'minnewater', soort: 'bagger', pts: boog(1, 0, TAU * 0.98, 0.05).map(p => P(p.x * 3.2, 28.6 + p.z * 0.9)), lus: true, v: 0.15, vuil: true },
    { zone: 'noordrei', soort: 'bagger', pts: boog(VEST_R, gr(246), gr(294)), v: 0.18, vuil: true },
  ];
}
/** Het zeilbootje van Byte (code ZEILBOOT): heen en terug op de Oostvest, tussen de bruggen van -60 en 60 graden. */
export const BYTE_ROUTE = { soort: 'byte-zeil', pts: boog(VEST_R - 0.5, gr(-46), gr(46), 0.8), v: 0.55 };

// ---------------------------------------------------------------- controle
/**
 * Elke route bemonsteren: steekt de boot ergens door een brug (top boven de onderkant van de boog), botst hij
 * op een landhoofd, of ligt een stuk van de romp buiten het water (in een kaaimuur)?
 * Geeft een lijst fouten (tekst) en wat statistiek.
 */
export function controleerVaart({ routes = [...vaarroutes(), BYTE_ROUTE], stap = 0.1 } = {}) {
  const fouten = [], lijst = bruggen();
  let monsters = 0, onder = 0, minVrij = Infinity;
  routes.forEach((rt, ri) => {
    const m = BOOT_MATEN[rt.soort]; if (!m) { fouten.push(`route ${ri}: onbekende boot ${rt.soort}`); return; }
    const pad = new Pad(rt.pts, !!rt.lus);
    const naam = `route ${ri} (${rt.soort}, ${rt.zone || ''})`;
    let gemeld = 0;
    const meld = (t) => { if (gemeld++ < 3) fouten.push(`${naam}: ${t}`); };
    for (let s = 0; s <= pad.L; s += stap) {
      const p = pad.punt(s); monsters++;
      const tx = p.dx, tz = p.dz, nx = -tz, nz = tx;
      // de romp: een raster over breedte en lengte
      for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) for (const b of [-1, -0.5, 0, 0.5, 1]) {
        const x = p.x + nx * a * m.breed + tx * b * m.lang / 2, z = p.z + nz * a * m.breed + tz * b * m.lang / 2;
        // in het water, niet in de kaaimuur (de kaai begint precies aan de rand van het water)
        if (Math.abs(a) === 0.5 || Math.abs(b) === 1) {
          const ex = Math.sign(a) * 0.04, el = Math.sign(b) * 0.04;      // 4 cm speling tot de kaaimuur
          if (!inWater(x + nx * ex + tx * el, z + nz * ex + tz * el)) meld(`romp in de kaai bij (${x.toFixed(1)}, ${z.toFixed(1)})`);
        }
        const ob = onderBrug(x, z, lijst);
        if (!ob) continue;
        onder++;
        const top = WATER_Y + m.hoog + VAAR_MARGE, vrij = ob.onder - top;
        minVrij = Math.min(minVrij, vrij);
        if (m.mast) meld(`boot met mast onder ${ob.br.id} bij (${x.toFixed(1)}, ${z.toFixed(1)})`);
        else if (vrij < 0) meld(`steekt door ${ob.br.id} bij (${x.toFixed(1)}, ${z.toFixed(1)}): top ${top.toFixed(2)}, boog ${ob.onder === -Infinity ? 'landhoofd' : ob.onder.toFixed(2)}`);
      }
    }
  });
  return { ok: !fouten.length, fouten, monsters, onder, minVrij };
}
