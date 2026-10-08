// Brugse modellen voor de stad Zwinvliet: het Belfort met de Hallen, trapgevels, de Onze-Lieve-Vrouwekerk,
// molens op de vest, bruggen en kaaimuren, de scheepswerf, het waterlabo, de sluis en de vuurtoren,
// plus wat er leeft en vaart: rondvaartboten, zwanen, eenden, reigers, vissen, koetsen, fietsers en een tram.
// Alles low-poly en in code, met dezelfde Bouwer als de rest van de stad.
import { Bouwer, KLEUREN as C, tint } from './modellen.js';

const BAKSTEEN = ['#c9704f', '#bb6448', '#d4805c', '#a95c44'];
const GEVEL = ['#efe3cd', '#e7d7bd', '#f3ead6', '#e0cdb0'];
const DAK = ['#8a4a3c', '#7d4136', '#9b5544', '#6f4a44'];

/** Trapgevel: een gevel met trapjes naar boven (het Brugse straatbeeld). */
function trapgevel(b, w, h, z, kleur, treden = 4) {
  const stap = w / (treden * 2 + 1);
  for (let i = 0; i < treden; i++) {
    const bw = w - i * 2 * stap;
    b.box(bw, 0.26, 0.26, 0, h + i * 0.26, z, i % 2 ? tint(kleur, 1.04) : kleur);
  }
  b.box(stap * 1.2, 0.2, 0.3, 0, h + treden * 0.26, z, tint(kleur, 1.1));
}

/** Een Brugs huis met trapgevel. Kavel 2 x 2, voorkant = +z. */
export function trapgevelHuis(seed = 'g', variant = 0) {
  const b = new Bouwer('trap' + seed + variant);
  const r = b.r;
  const kl = variant % 2 ? GEVEL[Math.floor(r() * GEVEL.length)] : BAKSTEEN[Math.floor(r() * BAKSTEEN.length)];
  const dk = DAK[Math.floor(r() * DAK.length)];
  const w = 1.5 + r() * 0.35, d = 1.5 + r() * 0.3, h = 1.5 + r() * 0.9;
  b.kavel(2.0, 2.0, '#e8e2d6');
  b.box(w, h, d, 0, 0.04, 0, kl);
  b.dak(w + 0.08, 0.5, d + 0.08, 0, h + 0.04, 0, dk, Math.PI / 2);
  trapgevel(b, w, h + 0.04, d / 2 - 0.08, kl, 3 + Math.floor(r() * 2));
  trapgevel(b, w, h + 0.04, -d / 2 + 0.08, kl, 3 + Math.floor(r() * 2));
  b.box(0.34, 0.5, 0.06, 0, 0.04, d / 2, '#6b4330');       // deur
  b.ramenRond(w, d, 0, 0, 0.5, Math.max(1, Math.round(h / 0.62)), 0.62, 2, 0.2, 0.3, [0, 1, 3]);
  if (r() < 0.5) b.box(0.42, 0.1, 0.16, 0, 0.72, d / 2 + 0.06, '#8d5a3b').bloemen(0, d / 2 + 0.06, 0.4, 0.14, r() < 0.5 ? '#ff6f91' : '#ffd166');
  if (r() < 0.4) b.cil(0.07, 0.08, 0.3, w / 2 - 0.2, h + 0.3, 0, '#8a4a3c', 6);
  return b.bouw();
}

/** Het Belfort met de Hallen: de toren is in dit thema het weerstation. */
export function belfortGebouw() {
  const b = new Bouwer('belfort');
  const steen = '#d9c9a8', steen2 = '#cdbb98';
  // Hallen: een laag vierkant blok met binnenkoer
  b.box(4.0, 1.5, 2.4, 0, 0, 0, steen);
  b.dak(4.1, 0.45, 2.5, 0, 1.5, 0, '#6f4a44', Math.PI / 2);
  b.ramenRond(4.0, 2.4, 0, 0, 0.45, 2, 0.55, 5, 0.18, 0.34);
  b.box(0.6, 0.9, 0.1, 0, 0, 1.22, '#5d4232');
  // toren: vier geledingen, naar boven smaller
  const toren = (y, s, h, kl) => { b.box(s, h, s, 0, y, -0.1, kl); return y + h; };
  let y = 0;
  y = toren(y, 1.25, 2.6, steen);
  y = toren(y, 1.15, 2.2, steen2);
  y = toren(y, 1.05, 1.9, steen);
  // achthoekige bekroning met balustrade
  b.cil(0.56, 0.62, 0.7, 0, y, -0.1, steen2, 8);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.box(0.12, 0.26, 0.12, Math.cos(a) * 0.6, y + 0.7, -0.1 + Math.sin(a) * 0.6, steen); }
  b.cil(0.3, 0.52, 0.5, 0, y + 0.7, -0.1, steen, 8);
  // galmgaten en uurwerk
  for (const z of [-0.1 - 0.63, -0.1 + 0.63]) b.box(0.3, 0.8, 0.04, 0, y - 1.5, z, '#4a4036');
  b.cil(0.26, 0.26, 0.04, 0, y - 2.3, 0.56, '#f4efe2', 12, [Math.PI / 2, 0, 0]);
  b.box(0.03, 0.18, 0.02, 0, y - 2.22, 0.59, '#2d3240');
  b.ramenRond(1.25, 1.25, 0, -0.1, 1.0, 5, 1.1, 1, 0.16, 0.4);
  return b.bouw();
}
/** De windvaan en de weerinstrumenten boven op het Belfort (draait mee met de echte wind). */
export function windvaanGeo() {
  const b = new Bouwer('windvaan'); b.ao = false;
  b.cil(0.03, 0.03, 0.8, 0, 0, 0, '#5c6372', 6);
  b.box(0.5, 0.26, 0.03, 0.12, 0.6, 0, '#f2c94c');
  b.kegel(0.1, 0.22, -0.2, 0.6, 0, '#e2643e', 6);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.box(0.16, 0.02, 0.1, Math.cos(a) * 0.2, 0.34, Math.sin(a) * 0.2, '#cfd5e0'); }
  return b.bouw().body;
}
/** Het weerscherm op de gevel: een bord waarop de stad het echte weer schrijft. */
export function weerbordGeo() {
  const b = new Bouwer('weerbord'); b.ao = false;
  b.box(1.5, 0.9, 0.08, 0, 0, 0, '#2b3347').box(1.36, 0.76, 0.02, 0, 0.07, 0.05, '#17202f');
  return b.bouw().body;
}

/** Het gotische huis op de Markt (zoals het Provinciaal Hof): een hoge sierlijke gevel. */
export function provinciaalhofGebouw() {
  const b = new Bouwer('phof');
  const kl = '#e7dcc4';
  b.kavel(2.2, 2.2, '#e8e2d6');
  b.box(1.9, 2.6, 1.8, 0, 0.04, 0, kl);
  b.dak(1.95, 0.6, 1.85, 0, 2.64, 0, '#5f4a52', Math.PI / 2);
  // spitsbogen en torentjes
  for (const dx of [-0.6, 0, 0.6]) { b.box(0.3, 1.0, 0.05, dx, 0.5, 0.92, '#bda98c'); b.kegel(0.17, 0.3, dx, 1.5, 0.92, '#bda98c', 6); }
  for (const dx of [-0.95, 0.95]) { b.cil(0.16, 0.18, 2.9, dx, 0.04, 0.6, kl, 8); b.kegel(0.2, 0.7, dx, 2.94, 0.6, '#4f6475', 8); }
  b.box(1.4, 0.3, 0.06, 0, 2.3, 0.9, '#c9a24b');
  b.ramenRond(1.9, 1.8, 0, 0, 0.6, 3, 0.7, 3, 0.2, 0.42, [0, 1, 3]);
  return b.bouw();
}

/** De Onze-Lieve-Vrouwekerk met haar hoge bakstenen spits. */
export function olvkerkGebouw() {
  const b = new Bouwer('olv');
  const kl = '#b9674c';
  b.kavel(2.4, 3.4, '#e8e2d6');
  b.box(1.7, 1.9, 3.0, 0, 0.04, 0, kl);
  b.dak(1.75, 0.7, 3.05, 0, 1.94, 0, '#6a5a52', Math.PI / 2);
  for (const dz of [-1.0, 0, 1.0]) b.box(0.2, 1.1, 0.1, 0, 0.5, dz + 1.5, '#9a5540');
  // toren met spits
  b.box(1.1, 4.4, 1.1, 0, 0.04, -1.1, kl);
  b.box(1.0, 0.3, 1.0, 0, 4.4, -1.1, '#9a5540');
  b.kegel(0.72, 3.6, 0, 4.7, -1.1, '#8c5a4a', 8);
  b.kegel(0.1, 0.5, 0, 8.3, -1.1, '#c9a24b', 6);
  b.ramenRond(1.7, 3.0, 0, 0, 0.6, 2, 0.8, 3, 0.18, 0.5);
  b.ramenRond(1.1, 1.1, 0, -1.1, 1.4, 3, 1.0, 1, 0.16, 0.44);
  return b.bouw();
}

/** Een molen op de Kruisvest. De wieken draaien apart (zie wiekenGeo). */
export function molenGebouw() {
  const b = new Bouwer('molen');
  b.box(2.2, 0.3, 2.2, 0, 0, 0, '#8aa865');          // molenberg
  b.cil(0.5, 0.72, 2.2, 0, 0.3, 0, '#7a4a34', 10);   // romp
  b.cil(0.56, 0.56, 0.18, 0, 2.5, 0, '#5d3a2a', 10);
  b.koepel(0.52, 0, 2.66, 0, '#4d3022', 10, 0.8);
  b.box(0.34, 0.6, 0.05, 0, 0.3, 0.72, '#5d4232');
  b.box(0.1, 1.2, 0.1, 0, 0.3, -0.85, '#5d3a2a');    // staart
  return b.bouw();
}
export function wiekenGeo() {
  const b = new Bouwer('wieken'); b.ao = false;
  b.cil(0.11, 0.13, 0.3, 0, 0, -0.1, '#4d3022', 8, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    b.cil(0.05, 0.05, 1.95, 0, 0, 0, '#e8dcc4', 4, [0, 0, a]);          // roede
    b.cil(0.015, 0.015, 1.7, 0, 0, 0.1, '#d8c9a8', 4, [0, 0, a]);       // zeillat
  }
  return b.bouw().body;
}

/** De scheepswerf aan de Reie: een open loods met een helling naar het water en een kraan. */
export function scheepswerfGebouw() {
  const b = new Bouwer('werf');
  b.kavel(4.0, 2.8, '#d9cfbc');
  b.box(3.4, 1.5, 2.2, 0, 0.04, -0.2, '#9c6a44');
  b.dak(3.5, 0.6, 2.3, 0, 1.54, -0.2, '#6f5a4a', Math.PI / 2);
  b.box(1.6, 1.2, 0.08, 0, 0.04, 0.92, '#6b4a33');     // open poort naar het water
  for (const dx of [-1.3, 1.3]) b.box(0.14, 1.5, 0.14, dx, 0.04, 0.85, '#7a5436');
  // scheepshelling
  b.box(1.4, 0.1, 1.2, 0, 0.04, 1.5, '#b9a98c');
  for (const dx of [-0.4, 0.4]) b.box(0.08, 0.12, 1.2, dx, 0.12, 1.5, '#8a6a44');
  // kraantje
  b.cil(0.12, 0.16, 1.9, 1.5, 0.04, 0.6, '#d87a3c', 8);
  b.box(0.1, 0.1, 1.4, 1.5, 1.86, 1.1, '#d87a3c');
  b.box(0.04, 0.5, 0.04, 1.5, 1.4, 1.75, '#4a5162');
  b.box(0.7, 0.18, 0.5, -1.2, 0.14, 1.3, '#8fa8c0');   // bootje in bouw
  b.ramenRond(3.4, 2.2, 0, -0.2, 0.5, 2, 0.5, 3, 0.22, 0.3, [1, 2, 3]);
  return b.bouw();
}

/** Het waterlabo: een glazen paviljoen op palen aan de rand van het Minnewater. */
export function waterlaboGebouw() {
  const b = new Bouwer('waterlabo');
  b.kavel(3.8, 2.8, '#cfd8c6');
  for (const [x, z] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 0.9], [1.3, 0.9]]) b.cil(0.1, 0.12, 0.7, x, 0, z, '#8a6a44', 6);
  b.box(3.0, 0.12, 2.2, 0, 0.7, 0, '#a8845a');
  b.box(2.6, 1.3, 1.8, 0, 0.82, 0, '#dbe8ef');
  b.glasband(2.62, 1.82, 0, 0, 1.4, 0.8, 0.9);
  b.dak(2.8, 0.4, 2.0, 0, 2.12, 0, '#4f7f8c', Math.PI / 2);
  b.box(0.06, 0.5, 0.06, 0.9, 2.5, 0, '#8a9099').box(0.5, 0.1, 0.3, 0.9, 2.9, 0, '#d4e6ef');  // meetpaal
  // vlonder met schepnetten
  b.box(1.2, 0.1, 1.0, 0, 0.66, 1.5, '#a8845a');
  b.cil(0.03, 0.03, 0.7, -0.4, 0.76, 1.5, '#b9a98c', 5).torus(0.14, 0.03, -0.4, 1.46, 1.5, '#dfe3ea', [Math.PI / 2, 0, 0], 10);
  return b.bouw();
}

/** De sluis van Zeebrugge: een betonnen sluishuis met bedieningskamer. */
export function sluisGebouw() {
  const b = new Bouwer('sluis');
  b.kavel(3.2, 2.4, '#c9ccd2');
  b.box(2.4, 1.1, 1.6, 0, 0.04, 0, '#cfd2d8');
  b.box(1.6, 1.0, 1.2, 0, 1.14, 0, '#e5e8ee');
  b.glasband(1.62, 1.22, 0, 0, 1.7, 0.6, 0.95);
  b.dak(1.8, 0.3, 1.4, 0, 2.14, 0, '#5e6675', Math.PI / 2);
  b.cil(0.06, 0.06, 0.9, 0.7, 2.44, 0, '#8a9099', 5).bol(0.1, 0.7, 3.34, 0, '#e2643e', 8);
  b.box(0.5, 0.2, 0.2, -1.0, 0.6, 0.8, '#f2c94c');     // bedieningshefboom
  return b.bouw();
}
/** Eén sluisdeur (draait open en dicht). */
export function sluisdeurGeo(breedte = 2.2) {
  const b = new Bouwer('sluisdeur'); b.ao = false;
  b.box(breedte, 1.1, 0.18, breedte / 2, -0.5, 0, '#7b8794');
  for (let i = 0; i < 3; i++) b.box(0.12, 1.2, 0.26, breedte * (i + 0.5) / 3, -0.5, 0, '#5e6675');
  return b.bouw().body;
}

/** De vuurtoren op de havendam. */
export function vuurtorenGebouw() {
  const b = new Bouwer('vuurtoren');
  b.box(2.2, 0.3, 2.2, 0, 0, 0, '#cfc6b4');
  b.cil(0.42, 0.62, 3.6, 0, 0.3, 0, '#f4f2ec', 12);
  for (let i = 0; i < 3; i++) b.cil(0.5 - i * 0.03, 0.54 - i * 0.03, 0.4, 0, 0.8 + i * 1.05, 0, '#e2643e', 12);
  b.cil(0.5, 0.5, 0.12, 0, 3.9, 0, '#8a9099', 12);
  b.cil(0.38, 0.38, 0.5, 0, 4.02, 0, '#fff3c4', 10);
  b.koepel(0.44, 0, 4.52, 0, '#4a5162', 10, 0.7);
  b.box(0.4, 0.6, 0.05, 0, 0.3, 0.6, '#4a5162');
  return b.bouw();
}

/** De grote fontein op de Markt (de oude klasmeter): drie schalen met stralen. */
export function fonteinGebouw() {
  const b = new Bouwer('fontein');
  b.cil(2.0, 2.2, 0.26, 0, 0, 0, '#d5cdbb', 20);
  b.cil(1.82, 1.9, 0.12, 0, 0.26, 0, '#9fd0e8', 20);
  b.cil(0.4, 0.5, 0.5, 0, 0.26, 0, '#cfc6b4', 12);
  b.cil(1.0, 0.7, 0.14, 0, 0.76, 0, '#d5cdbb', 16);
  b.cil(0.22, 0.3, 0.7, 0, 0.9, 0, '#cfc6b4', 10);
  b.cil(0.56, 0.4, 0.12, 0, 1.6, 0, '#d5cdbb', 14);
  b.cil(0.12, 0.16, 0.5, 0, 1.72, 0, '#cfc6b4', 8);
  b.bol(0.16, 0, 2.3, 0, '#c9a24b', 10);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; b.bol(0.14, Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5, '#b9c4d2', 8); }
  return b.bouw();
}

/** Kaaimuur: een stuk bakstenen wal (lengte 1, wordt geschaald) met een stenen rand. Lokaal: z = 0 is de waterkant, +z is het land. */
export function kaaiGeo() {
  const b = new Bouwer('kaai'); b.ao = false;
  b.box(1, 1.31, 0.35, 0, -1.28, 0.175, '#a65a40');                // baksteen
  b.box(1, 0.06, 0.012, 0, -0.98, -0.004, '#8f4c36').box(1, 0.06, 0.012, 0, -0.72, -0.004, '#8f4c36');   // voegen
  b.box(1, 0.1, 0.46, 0, -0.05, 0.16, '#d6ccb6');                  // blauwe hardsteen als dekrand
  b.box(1, 0.09, 0.02, 0, -0.56, -0.008, '#4c5034');               // groene waterlijn
  return b.bouw().body;
}
/** Een kaaitrap: treden langs de muur naar het water. Lokaal zoals kaaiGeo (de trap ligt aan de waterkant, z < 0). */
export function kaaitrapGeo() {
  const b = new Bouwer('kaaitrap'); b.ao = false;
  const n = 5;
  for (let i = 0; i < n; i++) b.box(0.26, 0.62 - i * 0.11, 0.34, -0.55 + i * 0.26, -0.62, -0.17, i % 2 ? '#cfc4ad' : '#c4b89f');
  b.box(0.5, 0.1, 0.36, 0.86, -0.56, -0.18, '#b9ad94');           // bordes aan het water
  b.cil(0.025, 0.025, 0.55, -0.68, 0.0, -0.02, '#3a3f4b', 5).cil(0.025, 0.025, 0.55, 0.62, -0.4, -0.02, '#3a3f4b', 5);   // leuning
  return b.bouw().body;
}

/** Een smal Brugs huis aan het water: de gevel (+z) rijst recht uit het water, met een trapgevel voor en achter. */
export function waterhuisGeo(variant = 0, { basis = -0.78, hoog = 2.0, breed = 0.96, diep = 1.35 } = {}) {
  const b = new Bouwer('waterhuis' + variant + basis);
  const muren = ['#b4553c', '#efe6d2', '#c46a48', '#d9b26f', '#9c4a36', '#e7dcc4'];
  const daken = ['#5f3a33', '#6f4a44', '#4f3c3a', '#7d4136', '#584845', '#6a3e34'];
  const kl = muren[variant % muren.length], dk = daken[(variant * 5) % daken.length];
  const w = breed, d = diep, h = hoog;
  b.box(w, h - basis, d, 0, basis, 0, kl);
  if (basis < 0) b.box(w + 0.02, 0.22 - basis * 0.2, d + 0.02, 0, basis, 0, '#7b7d70');      // natte stenen voet
  b.dak(w + 0.06, 0.6, d + 0.06, 0, h, 0, dk, Math.PI / 2);
  const treden = 3 + (variant % 2);
  for (const z of [d / 2 - 0.06, -d / 2 + 0.06]) trapgevel(b, w, h, z, variant === 1 || variant === 5 ? '#c9b48e' : kl, treden);
  // ramen in de gevel naar het water en naar achter, met hier en daar een bloembak
  const verd = Math.max(2, Math.round(h / 0.62));
  b.ramenRond(w, d, 0, 0, 0.22, verd, h / (verd + 0.4), 2, 0.2, 0.3, [0, 2]);
  b.raam(0.14, 0.2, 0.03, 0, h + 0.28, d / 2 + 0.01, 0, 0.4);
  if (basis < 0) b.box(0.36, 0.3, 0.03, (variant % 3 - 1) * 0.22, basis + 0.28, d / 2 + 0.005, '#2a2f38');   // poortje naar het water
  else b.box(0.3, 0.52, 0.04, 0, 0, d / 2 + 0.01, '#5d3a2a');                                                      // voordeur
  if (variant % 2 === 0) b.box(0.42, 0.07, 0.12, 0, 0.62, d / 2 + 0.05, '#7a4a34').bol(0.06, -0.12, 0.72, d / 2 + 0.07, '#ff6f91', 6).bol(0.06, 0.1, 0.72, d / 2 + 0.07, '#ffd166', 6);
  if (variant === 3) b.box(w * 0.7, 0.05, 0.22, 0, 1.05, d / 2 + 0.1, '#3a3f4b');        // smal balkon
  return b.bouw();
}

/** Een terrasje op de Markt: tafeltje, twee stoelen en een parasol. */
export function terrasGeo(parasol = '#c8403c') {
  const b = new Bouwer('terras' + parasol); b.ao = false;
  b.cil(0.24, 0.24, 0.04, 0, 0.4, 0, '#f4efe2', 10).cil(0.03, 0.05, 0.4, 0, 0, 0, '#3a3f4b', 6);
  for (const dx of [-0.42, 0.42]) b.box(0.22, 0.04, 0.22, dx, 0.24, 0, '#3a3f4b').box(0.04, 0.26, 0.22, dx + Math.sign(dx) * 0.1, 0.24, 0, '#3a3f4b');
  b.cil(0.015, 0.015, 0.9, 0, 0.42, 0, '#e8e2d6', 5);
  b.kegel(0.62, 0.26, 0, 1.18, 0, parasol, 8);
  b.cil(0.62, 0.6, 0.05, 0, 1.13, 0, '#f4efe2', 8);
  return b.bouw().body;
}

/** Een havenkraan op de kaai. */
export function havenkraanGeo() {
  const b = new Bouwer('havenkraan'); b.ao = false;
  const g = '#e2a33c', d = '#4a5162';
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) b.box(0.14, 2.2, 0.14, x, 0, z, g);
  b.box(1.5, 0.2, 1.5, 0, 2.2, 0, g).box(0.9, 0.7, 1.0, 0, 2.4, 0.1, '#efe6d2').box(0.92, 0.25, 0.4, 0, 2.7, 0.62, '#8fbbe0');
  b.box(0.22, 0.22, 4.6, 0, 3.0, -1.6, g).box(0.1, 1.4, 0.1, 0, 3.1, 0.7, d).box(0.04, 1.6, 0.04, 0, 1.45, -3.6, d).box(0.4, 0.2, 0.3, 0, 1.3, -3.6, '#3d8fe0');
  return b.bouw().body;
}

/** Rondvaartboot (open bootje met bankjes) en een vrachtschip voor de haven. */
export function bootGeo(soort = 'rondvaart') {
  const b = new Bouwer('boot-' + soort); b.ao = false;
  if (soort === 'reie') {
    // een laag Brugs rondvaartbootje: het moet onder de bruggen door
    b.box(0.82, 0.26, 2.5, 0, -0.16, 0, '#2f4f6a').box(0.84, 0.04, 2.52, 0, 0.08, 0, '#efe6d2');
    b.box(0.6, 0.12, 0.5, 0, -0.04, 1.1, '#2f4f6a');
    for (const z of [-0.75, -0.3, 0.15, 0.6]) b.box(0.66, 0.05, 0.16, 0, 0.06, z, '#a8743f');
    const kl = ['#e2643e', '#3d8fe0', '#f2c94c', '#38b37a', '#e9578a', '#ffffff', '#9a68e0', '#f0a531'];
    let k = 0;
    for (const z of [-0.75, -0.3, 0.15, 0.6]) for (const dx of [-0.18, 0.18]) { b.box(0.13, 0.12, 0.12, dx, 0.1, z - 0.02, kl[k++ % kl.length]).bol(0.055, dx, 0.27, z - 0.02, '#f0c89a', 6); }
    b.box(0.16, 0.14, 0.16, 0, 0.08, -1.15, '#e8e4da').bol(0.06, 0, 0.3, -1.15, '#d8a77a', 6);   // de schipper
    b.box(0.18, 0.14, 0.14, 0, -0.04, -1.32, '#2d3240');
    return b.bouw();
  }
  if (soort === 'aak') {
    b.box(0.9, 0.3, 3.0, 0, -0.2, 0, '#2f4f3a').box(0.92, 0.04, 3.02, 0, 0.1, 0, '#c9a24b');
    b.box(0.7, 0.1, 1.7, 0, 0.1, 0.35, '#8a6a44');
    for (const z of [-0.1, 0.5]) b.box(0.3, 0.12, 0.3, 0, 0.2, z, z > 0 ? '#e2643e' : '#3d8fe0');
    b.box(0.5, 0.2, 0.45, 0, 0.1, -1.1, '#efe6d2').box(0.52, 0.03, 0.47, 0, 0.3, -1.1, '#3a3f4b');
    return b.bouw();
  }
  if (soort === 'roei') {
    b.box(0.42, 0.14, 1.1, 0, -0.1, 0, '#8a5a33').box(0.44, 0.03, 1.12, 0, 0.04, 0, '#c9a77a').box(0.38, 0.03, 0.12, 0, 0.0, 0.1, '#c9a77a');
    return b.bouw();
  }
  if (soort === 'vracht') {
    b.box(1.5, 0.5, 4.6, 0, -0.18, 0, '#3f6b8c').box(1.3, 0.2, 4.2, 0, 0.32, 0, '#2f5570');
    b.box(1.0, 0.7, 1.0, 0, 0.32, -1.6, '#e8e4da').glasband(1.02, 1.02, 0, -1.6, 0.8, 0.3, 1);
    const kl = ['#e2643e', '#38b37a', '#f2c94c', '#3d8fe0'];
    let k = 0;
    for (const z of [0.4, 1.2]) for (const dx of [-0.3, 0.3]) b.box(0.5, 0.5, 0.6, dx, 0.52, z, kl[k++ % kl.length]);
    return b.bouw();
  }
  if (soort === 'zeil') {
    b.box(0.7, 0.34, 2.0, 0, -0.1, 0, '#f4efe2').box(0.5, 0.1, 1.7, 0, 0.24, 0, '#a8845a');
    b.cil(0.04, 0.05, 1.8, 0, 0.3, 0.1, '#b9a98c', 6);
    b.dak(0.06, 1.3, 1.1, 0.0, 0.5, -0.3, '#ffffff', 0);
    return b.bouw();
  }
  b.box(0.8, 0.3, 2.6, 0, -0.08, 0, '#7a4a34').box(0.64, 0.1, 2.3, 0, 0.22, 0, '#a8845a');
  for (const z of [-0.7, 0, 0.7]) b.box(0.66, 0.08, 0.26, 0, 0.32, z, '#5d3a2a');
  b.box(0.7, 0.1, 0.5, 0, 0.3, -1.1, '#5d3a2a');
  b.box(0.34, 0.34, 0.34, 0, 0.32, -1.15, '#2d3240');   // motorkap
  return b.bouw();
}

/** Dieren in en rond het water: ze komen terug als het water helder wordt. */
export function dierGeo(soort) {
  const b = new Bouwer('dier-' + soort); b.ao = false;
  if (soort === 'zwaan') {
    b.ellips(0.17, 0.12, 0.3, 0, 0.1, 0, '#fdfdfb', 10);
    b.cil(0.04, 0.05, 0.3, 0, 0.14, -0.12, '#fdfdfb', 6);
    b.bol(0.07, 0, 0.44, -0.14, '#fdfdfb', 8);
    b.kegel(0.04, 0.12, 0, 0.44, -0.22, '#e8a33c', 6);
    b.box(0.02, 0.03, 0.03, 0, 0.47, -0.19, '#2d3240');
  } else if (soort === 'eend') {
    b.ellips(0.12, 0.09, 0.2, 0, 0.07, 0, '#6b5a44', 8);
    b.bol(0.07, 0, 0.16, -0.12, '#2f5a3a', 8);
    b.box(0.05, 0.03, 0.08, 0, 0.15, -0.2, '#e8a33c');
  } else if (soort === 'meerkoet') {
    b.ellips(0.1, 0.08, 0.17, 0, 0.06, 0, '#2d3240', 8);
    b.bol(0.06, 0, 0.14, -0.1, '#2d3240', 8);
    b.box(0.04, 0.04, 0.05, 0, 0.16, -0.16, '#ffffff');
  } else if (soort === 'reiger') {
    b.cil(0.02, 0.025, 0.5, 0, 0, 0.02, '#e8c35a', 5).cil(0.02, 0.025, 0.5, 0.05, 0, -0.03, '#e8c35a', 5);
    b.ellips(0.1, 0.12, 0.2, 0.02, 0.58, 0, '#c8cfd8', 8);
    b.cil(0.03, 0.035, 0.34, 0.02, 0.66, -0.04, '#c8cfd8', 6);
    b.bol(0.055, 0.02, 1.0, -0.06, '#e8eef4', 8);
    b.kegel(0.03, 0.22, 0.02, 1.0, -0.2, '#e8c35a', 6);
  } else if (soort === 'vis') {
    b.ellips(0.07, 0.1, 0.18, 0, 0, 0, '#7fa8c0', 8);
    b.dak(0.02, 0.14, 0.18, 0, 0.0, -0.22, '#6b94ad', 0);
  } else if (soort === 'kikker') {
    b.ellips(0.1, 0.07, 0.12, 0, 0.05, 0, '#5fa83c', 8);
    for (const dx of [-0.07, 0.07]) b.bol(0.03, dx, 0.11, -0.05, '#f4e06a', 6);
  } else if (soort === 'meeuw') {
    b.ellips(0.09, 0.07, 0.16, 0, 0.05, 0, '#fdfdfb', 8);
    b.bol(0.05, 0, 0.12, -0.1, '#fdfdfb', 8);
    b.box(0.03, 0.02, 0.06, 0, 0.12, -0.16, '#e8a33c');
  } else { // zeehond
    b.ellips(0.16, 0.13, 0.36, 0, 0.1, 0, '#9aa0aa', 10);
    b.bol(0.11, 0, 0.16, -0.3, '#a8aeb8', 8);
  }
  return b.bouw().body;
}

/** Zwaan, boot of dier dat op het water drijft: een klein golfje eronder. */
export function golfGeo() {
  const b = new Bouwer('golf'); b.ao = false;
  b.torus(0.3, 0.03, 0, 0, 0, '#ffffff', [Math.PI / 2, 0, 0], 14);
  return b.bouw().body;
}

/** Verkeer met een Brugs gezicht: een koets met paard, een fietser en een tram. */
export function koetsGeo() {
  const b = new Bouwer('koets'); b.ao = false;
  // paard
  b.box(0.18, 0.26, 0.5, 0, 0.3, 0.55, '#7a5436');
  b.box(0.14, 0.2, 0.16, 0, 0.44, 0.86, '#6b4830');
  b.box(0.1, 0.16, 0.1, 0, 0.56, 0.95, '#6b4830');
  for (const [dx, dz] of [[-0.06, 0.38], [0.06, 0.38], [-0.06, 0.72], [0.06, 0.72]]) b.box(0.05, 0.3, 0.05, dx, 0, dz, '#5d3a2a');
  // rijtuig
  b.box(0.42, 0.34, 0.8, 0, 0.26, -0.15, '#2d3240');
  b.box(0.38, 0.12, 0.7, 0, 0.6, -0.15, '#6b4830');
  b.box(0.4, 0.1, 0.3, 0, 0.5, 0.2, '#4a5162');
  for (const [dx, dz, r] of [[-0.23, -0.42, 0.17], [0.23, -0.42, 0.17], [-0.21, 0.1, 0.11], [0.21, 0.1, 0.11]]) b.cil(r, r, 0.04, dx, r, dz, '#3a3f4b', 10, [0, 0, Math.PI / 2]);
  return b.bouw();
}
export function fietsGeo() {
  const b = new Bouwer('fiets'); b.ao = false;
  for (const dz of [-0.2, 0.2]) b.cil(0.14, 0.14, 0.03, 0, 0.14, dz, '#2d3240', 12, [0, 0, Math.PI / 2]);
  b.box(0.04, 0.04, 0.42, 0, 0.26, 0, '#3d8fe0');
  b.box(0.04, 0.16, 0.04, 0, 0.26, 0.2, '#3d8fe0');
  b.box(0.2, 0.03, 0.03, 0, 0.42, 0.2, '#4a5162');
  b.box(0.16, 0.06, 0.2, 0, 0.36, -0.1, '#e8e4da');     // fietser (romp)
  b.cil(0.07, 0.08, 0.3, 0, 0.42, -0.08, '#e2643e', 6);
  b.bol(0.09, 0, 0.78, -0.06, '#f0c89a', 8);
  return b.bouw();
}
export function tramGeo() {
  const b = new Bouwer('tram');
  const kl = '#e8e4da';
  b.box(1.0, 1.0, 4.4, 0, 0.18, 0, kl);
  b.box(1.02, 0.18, 4.42, 0, 0.9, 0, '#2f6f9f');
  b.dak(1.04, 0.2, 4.44, 0, 1.18, 0, '#cfd5e0', Math.PI / 2);
  for (const dz of [-1.6, 1.6]) b.box(0.6, 0.2, 0.6, 0, 0, dz, '#3a3f4b');
  b.box(0.1, 0.5, 0.1, 0, 1.36, 0.6, '#8a9099');
  b.ramenRond(1.0, 4.4, 0, 0, 0.55, 1, 0.5, 4, 0.5, 0.42);
  return b.bouw();
}

/** Straatmeubilair: bankje, bloembak, plantenbak met boompje, vlag, kraampje voor de kerstmarkt. */
export function bankGeo() {
  const b = new Bouwer('bank'); b.ao = false;
  b.box(0.9, 0.06, 0.3, 0, 0.3, 0, '#a8743f').box(0.9, 0.28, 0.06, 0, 0.36, -0.12, '#a8743f');
  for (const dx of [-0.38, 0.38]) b.box(0.06, 0.3, 0.28, dx, 0, 0, '#4a5162');
  return b.bouw().body;
}
export function bloembakGeo() {
  const b = new Bouwer('bloembak'); b.ao = false;
  b.box(0.7, 0.26, 0.34, 0, 0, 0, '#9a6a44').box(0.62, 0.08, 0.26, 0, 0.26, 0, '#5a4432');
  for (let i = 0; i < 5; i++) b.bol(0.07, -0.24 + i * 0.12, 0.36, (b.r() - 0.5) * 0.14, i % 2 ? '#ff6f91' : '#ffd166', 6);
  return b.bouw().body;
}
export function vlagGeo() {
  const b = new Bouwer('vlag'); b.ao = false;
  b.cil(0.03, 0.035, 1.6, 0, 0, 0, '#8a9099', 6);
  b.box(0.5, 0.3, 0.02, 0.26, 1.24, 0, '#e2643e').box(0.5, 0.1, 0.03, 0.26, 1.14, 0, '#f2c94c');
  return b.bouw().body;
}
export function kraamGeo(seed = 0) {
  const b = new Bouwer('kraam' + seed); b.ao = false;
  b.box(1.4, 0.8, 1.0, 0, 0, 0, '#a8743f');
  b.box(1.5, 0.1, 1.1, 0, 0.8, 0, '#8a5a3b');
  b.dak(1.6, 0.4, 1.2, 0, 0.9, 0, seed % 2 ? '#c8403c' : '#2f6f9f', Math.PI / 2);
  for (let i = 0; i < 4; i++) b.box(0.2, 0.14, 0.2, -0.5 + i * 0.34, 0.9, 0.2, ['#f2c94c', '#e2643e', '#ffffff', '#38b37a'][i]);
  return b.bouw().body;
}
export function kerstboomGeo() {
  const b = new Bouwer('kerstboom'); b.ao = false;
  b.cil(0.1, 0.14, 0.4, 0, 0, 0, '#5d3a2a', 6);
  b.kegel(1.0, 1.4, 0, 0.4, 0, '#2f6f4a', 10).kegel(0.7, 1.1, 0, 1.3, 0, '#357f54', 10).kegel(0.4, 0.8, 0, 2.1, 0, '#3b8f5c', 10);
  for (let i = 0; i < 14; i++) { const a = b.r() * Math.PI * 2, r = 0.3 + b.r() * 0.6, y = 0.6 + b.r() * 1.8; b.bol(0.07, Math.cos(a) * r, y, Math.sin(a) * r, ['#f2c94c', '#e2643e', '#ffffff'][i % 3], 6); }
  b.bol(0.1, 0, 2.95, 0, '#f2c94c', 8);
  return b.bouw().body;
}

/** De Slijkkraak: een berg slijk met tentakels en twee ogen. Groeit en krimpt met zijn levenspunten. */
export function slijkkraakGeo() {
  const b = new Bouwer('slijkkraak'); b.ao = false;
  b.ico(2.3, 0, 1.4, 0, '#6b7a4a', 2, 0.85);
  b.ico(1.5, -1.4, 0.9, 0.8, '#5d6b42', 1, 0.8);
  b.ico(1.3, 1.5, 0.8, -0.7, '#78874f', 1, 0.8);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    for (let k = 0; k < 4; k++) {
      const r = 2.0 + k * 0.7, y = 1.6 - k * 0.3;
      b.ico(0.5 - k * 0.09, Math.cos(a) * r, Math.max(0.1, y), Math.sin(a) * r, k % 2 ? '#5d6b42' : '#6b7a4a', 1, 0.9);
    }
  }
  return b.bouw().body;
}
export function slijkOogGeo() {
  const b = new Bouwer('slijkoog'); b.ao = false;
  b.bol(0.5, 0, 0, 0, '#f4f0d8', 10).bol(0.22, 0, 0, 0.36, '#2d3240', 8);
  return b.bouw().body;
}
/** Een straal proper water (de klas spuit de Slijkkraak schoon). */
export function waterstraalGeo() {
  const b = new Bouwer('straal'); b.ao = false;
  b.cil(0.1, 0.22, 1, 0, 0, 0, '#8fd8f6', 8);
  return b.bouw().body;
}
/** Slijk dat op het water drijft (verdwijnt als de zone helder wordt). */
export function slijkvlekGeo(seed = 0) {
  const b = new Bouwer('slijkvlek' + seed); b.ao = false;
  for (let i = 0; i < 4; i++) b.ico(0.22 + b.r() * 0.22, (b.r() - 0.5) * 0.9, 0, (b.r() - 0.5) * 0.9, i % 2 ? '#a69a62' : '#8e9a58', 1, 0.08);
  if (seed % 2) b.box(0.18, 0.1, 0.1, 0.3, 0.06, 0.2, '#d8e4ea');   // een plastic flesje
  return b.bouw().body;
}

export { C as BRUGGE_KLEUREN };
