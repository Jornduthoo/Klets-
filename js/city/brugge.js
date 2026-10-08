// Brugse modellen voor de stad Zwinvliet: het Belfort met de Hallen, trapgevels, de Onze-Lieve-Vrouwekerk,
// molens op de vest, bruggen en kaaimuren, de scheepswerf, het waterlabo, de sluis en de vuurtoren,
// plus wat er leeft en vaart: boten, zwanen, eenden, reigers, vissen, karren, koetsen, ruiters en wandelaars.
// Alles low-poly en in code, met dezelfde Bouwer als de rest van de stad.
import { Bouwer, KLEUREN as C, tint } from './modellen.js';

const BAKSTEEN = ['#c9704f', '#bb6448', '#d4805c', '#a95c44'];
const GEVEL = ['#efe3cd', '#e7d7bd', '#f3ead6', '#e0cdb0'];
const DAK = ['#8a4a3c', '#7d4136', '#9b5544', '#6f4a44'];

/** Een Brugs huis met trapgevel, puntgevel of vakwerk. Kavel 2 x 2, voorkant = +z. */
export function trapgevelHuis(seed = 'g', variant = 0) {
  const b = new Bouwer('trap' + seed + variant);
  const r = b.r;
  const soorten = [
    { muur: BAKSTEEN[0], gevel: 'trap', dak: '#8a8494', luik: '#3f6b4a' },
    { muur: GEVEL[0], gevel: 'vakwerk', dak: '#a2503a', luik: '#8a3a2e' },
    { muur: BAKSTEEN[3], gevel: 'trap', dak: '#8a5444', luik: '#2f5a7a' },
    { muur: GEVEL[2], gevel: 'trap', dak: '#7d7788', luik: '#3f6b4a' },
    { muur: GEVEL[1], gevel: 'vakwerk', dak: '#8a8494', luik: '#9a6a2a' },
    { muur: BAKSTEEN[1], gevel: 'punt', dak: '#a2503a', luik: '#5a3a26' },
  ];
  const k = soorten[variant % soorten.length];
  const w = 1.25 + r() * 0.35, d = 1.5 + r() * 0.3, h = 1.3 + r() * 0.8;
  b.kavel(2.0, 2.0, '#cfc4ae');
  b.middeleeuwsHuis({ z: -0.05, w, d, h, muur: k.muur, dak: k.dak, gevel: k.gevel, luik: k.luik, treden: 3 + Math.floor(r() * 2), schouw: r() < 0.75 });
  if (r() < 0.5) b.box(0.42, 0.1, 0.16, 0, 0.62, d / 2 + 0.02, '#8d5a3b').bloemen(0, d / 2 + 0.02, 0.4, 0.14, r() < 0.5 ? '#ff6f91' : '#ffd166');
  return b.bouw();
}

/** Het Belfort met de Hallen: de toren is in dit thema het weerstation. Hoog en goed zichtbaar boven de stad. */
export function belfortGebouw() {
  const b = new Bouwer('belfort');
  const bk = '#b8704e', bk2 = '#a8603f', steen = '#d9c9a8', steen2 = '#cdbb98', lei = '#7d7788';
  // de Hallen: een lang bakstenen gebouw met een leien dak en trapgevels
  b.box(4.0, 1.6, 2.4, 0, 0, 0, bk);
  b.dak(4.1, 1.0, 2.5, 0, 1.6, 0, lei);
  for (const x of [-1.95, 1.95]) b.blok(2.4, 0.9, 0.18, x, 1.6, 0, bk, [0, Math.PI / 2, 0]);
  b.ramenRond(4.0, 2.4, 0, 0, 0.4, 2, 0.6, 6, 0.18, 0.34);
  b.box(0.7, 1.0, 0.1, 0, 0, 1.22, '#5d4232').box(0.8, 0.12, 0.12, 0, 1.0, 1.23, steen);
  // de toren: twee vierkante bakstenen geledingen met hoektorentjes, dan de achthoekige stenen lantaarn
  const toren = (y, s, h, kl) => { b.box(s, h, s, 0, y, -0.1, kl); return y + h; };
  let y = 0;
  y = toren(y, 1.4, 3.4, bk);
  b.box(1.5, 0.12, 1.5, 0, y, -0.1, steen);
  y = toren(y + 0.12, 1.25, 2.6, bk2);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cil(0.13, 0.13, 0.5, dx * 0.6, y, -0.1 + dz * 0.6, steen2, 6).kegel(0.16, 0.5, dx * 0.6, y + 0.5, -0.1 + dz * 0.6, lei, 6);
  b.box(1.35, 0.12, 1.35, 0, y, -0.1, steen);
  y += 0.12;
  b.cil(0.6, 0.66, 2.2, 0, y, -0.1, steen, 8);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; b.box(0.08, 1.4, 0.08, Math.cos(a) * 0.64, y + 0.4, -0.1 + Math.sin(a) * 0.64, steen2); }
  y += 2.2;
  b.cil(0.72, 0.72, 0.14, 0, y, -0.1, steen2, 8);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.box(0.12, 0.28, 0.12, Math.cos(a) * 0.66, y + 0.14, -0.1 + Math.sin(a) * 0.66, steen); }
  b.cil(0.3, 0.5, 0.6, 0, y + 0.14, -0.1, steen2, 8);
  // galmgaten en uurwerk
  for (const z of [-0.1 - 0.63, -0.1 + 0.63]) b.box(0.3, 0.9, 0.04, 0, 4.5, z, '#4a4036');
  b.cil(0.32, 0.32, 0.04, 0, 5.1, 0.6, '#f4efe2', 14, [Math.PI / 2, 0, 0]).cil(0.34, 0.34, 0.03, 0, 5.1, 0.59, '#d9b14a', 14, [Math.PI / 2, 0, 0]);
  b.box(0.03, 0.22, 0.02, 0, 5.04, 0.63, '#2d3240');
  b.ramenRond(1.4, 1.4, 0, -0.1, 1.6, 2, 0.9, 1, 0.16, 0.42);
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

/** De Onze-Lieve-Vrouwekerk met haar hoge bakstenen toren en spits. */
export function olvkerkGebouw() {
  const b = new Bouwer('olv');
  const kl = '#b8674c', kl2 = '#9a5540', lei = '#7d7788';
  b.kavel(2.4, 3.4, '#cfc4ae');
  b.box(1.5, 2.2, 2.8, 0, 0.04, 0.2, kl).dak(1.56, 1.2, 2.86, 0, 2.24, 0.2, lei, Math.PI / 2);
  for (const sx of [-1, 1]) b.box(0.42, 1.2, 2.6, sx * 0.94, 0.04, 0.25, kl2).dak(0.46, 0.4, 2.62, sx * 0.94, 1.24, 0.25, lei, Math.PI / 2);
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) b.box(0.12, 1.6, 0.12, sx * 0.8, 0.04, -0.6 + i * 0.85, kl2);
  b.raam(0.3, 0.7, 0.03, 0, 1.0, 1.61, 0, 0.6).cil(0.2, 0.2, 0.03, 0, 2.0, 1.61, '#c9b48e', 12, [Math.PI / 2, 0, 0]);
  // toren met spits
  b.box(1.15, 5.8, 1.15, 0, 0.04, -1.15, kl);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.16, 5.6, 0.16, dx * 0.56, 0.04, -1.15 + dz * 0.56, kl2);
  b.box(1.25, 0.25, 1.25, 0, 5.84, -1.15, '#c9b48e');
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.kegel(0.14, 0.6, dx * 0.55, 6.09, -1.15 + dz * 0.55, lei, 6);
  b.kegel(0.62, 4.0, 0, 6.09, -1.15, lei, 8);
  b.cil(0.025, 0.025, 0.6, 0, 10.0, -1.15, '#d9b14a', 4).box(0.3, 0.04, 0.04, 0, 10.4, -1.15, '#d9b14a');
  b.ramenRond(1.5, 2.8, 0, 0.2, 0.7, 2, 0.75, 3, 0.18, 0.5, [1, 3]);
  b.ramenRond(1.15, 1.15, 0, -1.15, 1.8, 3, 1.2, 1, 0.16, 0.5);
  return b.bouw();
}

/** Een standerdmolen op de wal (zoals de Sint-Janshuismolen): een houten kast op een bok, met een trap en een staart. De wieken draaien apart (wiekenGeo). Voorkant (wieken) = +z. */
export function molenGebouw() {
  const b = new Bouwer('molen');
  b.cil(0.55, 0.8, 0.35, 0, 0, 0, '#7f9a4e', 10);                     // molenberg
  b.box(0.7, 0.12, 0.12, 0, 0.35, 0, '#6b5a48').box(0.12, 0.12, 0.7, 0, 0.35, 0, '#6b5a48');   // kruisplaat
  b.cil(0.09, 0.11, 0.95, 0, 0.35, 0, '#5a4636', 6);                    // standerd
  for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) b.cil(0.03, 0.03, 0.7, dx * 0.9, 0.38, dz * 0.9, '#5a4636', 4, [dz * 1.6, 0, -dx * 1.6]);
  b.box(0.82, 1.05, 0.95, 0, 1.15, 0, '#8a6a4a');                       // de kast
  for (let i = 0; i < 4; i++) b.box(0.84, 0.03, 0.97, 0, 1.25 + i * 0.25, 0, '#6e5238');
  b.dak(0.9, 0.42, 1.02, 0, 2.2, 0, '#8a8494');
  b.box(0.18, 0.24, 0.03, 0.18, 1.5, 0.49, '#3b2a20');                  // deurtje
  b.box(0.26, 0.05, 1.1, 0, 0.35, -0.95, '#6e5238', ).cil(0.03, 0.03, 1.25, 0, 0.36, -0.42, '#5a4636', 4, [-1.05, 0, 0]);   // trap en staart
  for (let i = 0; i < 5; i++) b.box(0.26, 0.03, 0.08, 0, 0.42 + i * 0.16, -1.25 + i * 0.16, '#7a5c40');
  return b.bouw();
}
export function wiekenGeo() {
  const b = new Bouwer('wieken'); b.ao = false;
  b.cil(0.08, 0.1, 0.3, 0, 0, -0.1, '#4d3022', 8, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    b.cil(0.035, 0.035, 1.7, 0, 0, 0.05, '#5a4636', 4, [0, 0, a]);         // roede
    // zeil: een lichte strook naast de roede
    b.blok(0.24, 1.3, 0.02, -s * 0.38 + c * 0.13, c * 0.38 + s * 0.13, 0.06, '#efe6d2', [0, 0, a]);
  }
  return b.bouw().body;
}

/** Een stuk stadsmuur met kantelen (lengte 1 langs x, wordt geschaald). De wal ligt eronder. */
export function muurGeo() {
  const b = new Bouwer('muur'); b.ao = true;
  b.box(1.02, 0.72, 0.34, 0, -0.1, 0, '#a85a40');
  b.box(1.04, 0.06, 0.4, 0, 0.62, 0, '#c9b48e');
  for (const x of [-0.25, 0.25]) b.box(0.26, 0.2, 0.34, x, 0.68, 0, '#a85a40');
  return b.bouw().body;
}
/** Een ronde muurtoren met een spits dak. */
export function muurtorenGeo() {
  const b = new Bouwer('muurtoren');
  b.cil(0.46, 0.5, 1.45, 0, -0.1, 0, '#a85a40', 10).cil(0.5, 0.5, 0.08, 0, 1.35, 0, '#c9b48e', 10);
  b.kegel(0.56, 0.95, 0, 1.43, 0, '#8a8494', 10);
  b.raam(0.1, 0.18, 0.03, 0, 0.8, 0.48, 0, 0.5);
  return b.bouw();
}
/** Een stadspoort (zoals de Gentpoort): een poortgebouw over de straat met twee ronde torens. De straat loopt langs z. */
export function stadspoortGeo(halfWeg = 0.85) {
  const b = new Bouwer('stadspoort');
  const st = '#c9b48e', bk = '#b05e42', dk = '#7d7788';
  const tx = halfWeg + 0.55;
  for (const sx of [-1, 1]) {
    b.cil(0.55, 0.6, 2.6, sx * tx, 0, 0.35, bk, 12).cil(0.6, 0.6, 0.1, sx * tx, 2.6, 0.35, st, 12);
    b.kegel(0.66, 1.5, sx * tx, 2.7, 0.35, dk, 12).bol(0.05, sx * tx, 4.22, 0.35, '#d9b14a', 6);
    b.raam(0.1, 0.22, 0.03, sx * tx, 1.6, 0.94, 0, 0.6);
    b.box(0.5, 2.0, 1.5, sx * (halfWeg + 0.2), 0, -0.2, st);           // de zijmuren van de doorgang
  }
  // het poortgebouw boven de straat
  b.box(tx * 2, 1.05, 1.5, 0, 1.55, -0.2, st).box(tx * 2 + 0.06, 0.08, 1.56, 0, 2.6, -0.2, '#b9a27c');
  for (let i = 0; i < 5; i++) for (const z of [0.5, -0.9]) b.box(0.22, 0.24, 0.16, -tx + 0.3 + i * (tx * 2 - 0.6) / 4, 2.68, z, st);
  b.dak(tx * 2 - 0.4, 1.0, 1.1, 0, 2.68, -0.2, dk);
  b.box(halfWeg * 2 + 0.06, 0.18, 1.52, 0, 1.4, -0.2, '#a9926c');       // de boog
  for (const z of [0.56, -0.96]) b.box(halfWeg * 2 - 0.1, 0.42, 0.04, 0, 1.0, z, '#3a2e26');   // valhek
  b.raam(0.22, 0.3, 0.03, 0, 1.85, 0.56, 0, 0.6).raam(0.22, 0.3, 0.03, 0, 1.85, -0.96, 0, 0.6);
  b.box(0.5, 0.36, 0.03, 0, 2.2, 0.56, '#2f5a7a').box(0.3, 0.2, 0.035, 0, 2.28, 0.565, '#d9b14a');   // wapenschild
  // fakkels aan de poort
  for (const sx of [-1, 1]) b.cil(0.025, 0.03, 0.3, sx * (halfWeg + 0.05), 0.9, 0.6, '#3b2a20', 4).kegel(0.06, 0.16, sx * (halfWeg + 0.05), 1.2, 0.6, '#ffb347', 6);
  return b.bouw();
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
  b.cil(0.12, 0.16, 1.9, 1.5, 0.04, 0.6, '#7a5c40', 8);
  b.box(0.1, 0.1, 1.4, 1.5, 1.86, 1.1, '#7a5c40');
  b.box(0.04, 0.5, 0.04, 1.5, 1.4, 1.75, '#4a5162');
  b.box(0.7, 0.18, 0.5, -1.2, 0.14, 1.3, '#9c7a52');   // bootje in bouw
  b.ramenRond(3.4, 2.2, 0, -0.2, 0.5, 2, 0.5, 3, 0.22, 0.3, [1, 2, 3]);
  return b.bouw();
}

/** Het waterlabo: een glazen paviljoen op palen aan de rand van het Minnewater. */
export function waterlaboGebouw() {
  const b = new Bouwer('waterlabo');
  b.kavel(3.8, 2.8, '#cfd8c6');
  for (const [x, z] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 0.9], [1.3, 0.9]]) b.cil(0.1, 0.12, 0.7, x, 0, z, '#8a6a44', 6);
  b.box(3.0, 0.12, 2.2, 0, 0.7, 0, '#a8845a');
  b.box(2.6, 1.3, 1.8, 0, 0.82, 0, '#c9a77a');
  for (const x of [-1.27, 0, 1.27]) b.box(0.08, 1.3, 1.84, x, 0.82, 0, '#6e5238');
  b.ramenRond(2.6, 1.8, 0, 0, 0.9, 1, 1.0, 3, 0.3, 0.45);
  b.dak(2.8, 1.0, 2.0, 0, 2.12, 0, '#a2503a', Math.PI / 2);
  b.box(0.06, 0.6, 0.06, 0.9, 2.7, 0, '#5a4636').box(0.5, 0.1, 0.3, 0.9, 3.25, 0, '#d9b14a');  // windwijzer
  // vlonder met schepnetten
  b.box(1.2, 0.1, 1.0, 0, 0.66, 1.5, '#a8845a');
  b.cil(0.03, 0.03, 0.7, -0.4, 0.76, 1.5, '#b9a98c', 5).torus(0.14, 0.03, -0.4, 1.46, 1.5, '#dfe3ea', [Math.PI / 2, 0, 0], 10);
  return b.bouw();
}

/** De sluis van Zeebrugge: een stenen sluiswachtershuis met een torentje en een windas voor de sluisdeuren. */
export function sluisGebouw() {
  const b = new Bouwer('sluis');
  b.kavel(3.2, 2.4, '#b9ad94');
  b.middeleeuwsHuis({ x: -0.2, z: 0, w: 1.6, d: 1.6, h: 1.4, y: 0.04, muur: '#cdbb98', dak: '#7d7788', gevel: 'trap', luik: '#2f5a7a', treden: 4 });
  b.cil(0.38, 0.4, 2.6, 0.95, 0.04, -0.3, '#c4b08c', 10).kegel(0.46, 0.9, 0.95, 2.64, -0.3, '#7d7788', 10).bol(0.06, 0.95, 3.56, -0.3, '#d9b14a', 6);
  b.cil(0.18, 0.18, 0.5, -1.2, 0.6, 0.8, '#7a5c40', 8, [0, 0, Math.PI / 2]).box(0.06, 0.6, 0.06, -1.2, 0.04, 0.8, '#5a3e2a');
  return b.bouw();
}
/** Eén sluisdeur (draait open en dicht). */
export function sluisdeurGeo(breedte = 2.2) {
  const b = new Bouwer('sluisdeur'); b.ao = false;
  b.box(breedte, 1.1, 0.18, breedte / 2, -0.5, 0, '#7b8794');
  for (let i = 0; i < 3; i++) b.box(0.12, 1.2, 0.26, breedte * (i + 0.5) / 3, -0.5, 0, '#5e6675');
  return b.bouw().body;
}

/** De vuurtoren op de havendam: een stenen lichttoren met een vuurkorf bovenaan. */
export function vuurtorenGebouw() {
  const b = new Bouwer('vuurtoren');
  b.box(2.2, 0.3, 2.2, 0, 0, 0, '#b9ad94');
  b.cil(0.55, 0.72, 3.6, 0, 0.3, 0, '#d9c9a8', 8);
  for (let i = 0; i < 3; i++) b.cil(0.6 - i * 0.04, 0.62 - i * 0.04, 0.08, 0, 1.2 + i * 1.0, 0, '#bda98c', 8);
  b.cil(0.66, 0.66, 0.14, 0, 3.9, 0, '#bda98c', 8);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.box(0.12, 0.25, 0.12, Math.cos(a) * 0.58, 4.04, Math.sin(a) * 0.58, '#d9c9a8'); }
  b.cil(0.3, 0.22, 0.35, 0, 4.04, 0, '#2d2a28', 8);
  b.ico(0.26, 0, 4.5, 0, '#ffb347', 0, 1.3);
  b.box(0.36, 0.6, 0.05, 0, 0.3, 0.7, '#5a3a26');
  for (let f = 0; f < 3; f++) b.raam(0.12, 0.22, 0.03, 0, 1.0 + f * 1.0, 0.64, 0, 0.6);
  return b.bouw();
}

/** Kaaimuur: een stuk bakstenen wal (lengte 1, wordt geschaald) met een stenen rand. Lokaal: z = 0 is de waterkant, +z is het land. */
export function kaaiGeo() {
  const b = new Bouwer('kaai'); b.ao = false;
  b.box(1, 1.31, 0.35, 0, -1.28, 0.175, '#a65a40');                // baksteen
  b.box(1, 0.06, 0.012, 0, -0.98, -0.004, '#8f4c36').box(1, 0.06, 0.012, 0, -0.72, -0.004, '#8f4c36');   // voegen
  b.box(1, 0.12, 0.5, 0, -0.06, 0.14, '#efe7d4');                  // lichte hardsteen als dekrand (een heldere lijn langs het water)
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
  const daken = ['#8a8494', '#a2503a', '#7d7788', '#7a3e30', '#8a5444', '#807a86'];
  const kl = muren[variant % muren.length], dk = daken[(variant * 5) % daken.length];
  const w = breed, d = diep, h = hoog;
  b.box(w, h - basis, d, 0, basis, 0, kl);
  if (basis < 0) b.box(w + 0.02, 0.22 - basis * 0.2, d + 0.02, 0, basis, 0, '#7b7d70');      // natte stenen voet
  const treden = 3 + (variant % 2), H = w * 0.85;
  b.dak(w + 0.06, H, d + 0.06, 0, h, 0, dk, Math.PI / 2);
  for (const z of [d / 2 - 0.06, -d / 2 + 0.06]) b.trapgevel(w, h, H, z, variant === 1 || variant === 5 ? '#c9b48e' : kl, treden, 0.16);
  if (variant % 3 !== 1) b.box(0.13, H * 0.6, 0.13, w * 0.25, h + H * 0.3, -d * 0.2, tint(kl, 0.8));
  // ramen in de gevel naar het water en naar achter, met hier en daar een bloembak
  const verd = Math.max(2, Math.round(h / 0.62));
  b.ramenRond(w, d, 0, 0, 0.22, verd, h / (verd + 0.4), 2, 0.2, 0.3, [0, 2]);
  b.raam(0.14, 0.2, 0.03, 0, h + 0.28, d / 2 + 0.01, 0, 0.4);
  for (const sx of [-1, 1]) for (let f = 0; f < verd; f++) b.box(0.07, 0.3, 0.02, sx * (w * 0.215 + 0.135), 0.22 + f * h / (verd + 0.4) + h / (verd + 0.4) * 0.3, d / 2 + 0.03, variant % 2 ? '#3f6b4a' : '#7a2e26');
  if (basis < 0) b.box(0.36, 0.3, 0.03, (variant % 3 - 1) * 0.22, basis + 0.28, d / 2 + 0.005, '#2a2f38');   // poortje naar het water
  else b.box(0.3, 0.52, 0.04, 0, 0, d / 2 + 0.01, '#5d3a2a');                                                      // voordeur
  if (variant % 2 === 0) b.box(0.42, 0.07, 0.12, 0, 0.62, d / 2 + 0.05, '#7a4a34').bol(0.06, -0.12, 0.72, d / 2 + 0.07, '#ff6f91', 6).bol(0.06, 0.1, 0.72, d / 2 + 0.07, '#ffd166', 6);
  if (variant === 3) b.box(w * 0.7, 0.05, 0.22, 0, 1.05, d / 2 + 0.1, '#3a3f4b');        // smal balkon
  return b.bouw();
}

/** Een marktkraam op de Markt: een tafel met waren onder een gestreepte luifel. */
export function terrasGeo(luifel = '#c8403c') {
  const b = new Bouwer('kraam-' + luifel); b.ao = false;
  b.box(0.7, 0.36, 0.4, 0, 0, 0, '#8a6440').box(0.74, 0.04, 0.44, 0, 0.36, 0, '#a8845a');
  for (let i = 0; i < 4; i++) b.bol(0.06, -0.24 + i * 0.16, 0.44, 0.02, ['#e2643e', '#f2c94c', '#6fae4a', '#a8743f'][(i + luifel.length) % 4], 6);
  for (const dx of [-0.34, 0.34]) for (const dz of [-0.18, 0.18]) b.box(0.03, 0.8, 0.03, dx, 0, dz, '#5a3e2a');
  for (let i = 0; i < 4; i++) b.box(0.2, 0.04, 0.56, -0.3 + i * 0.2, 0.8 + (i % 2) * 0.005, 0.02, i % 2 ? '#f4efe2' : luifel, 0);
  b.box(0.8, 0.12, 0.02, 0, 0.7, 0.3, luifel);
  return b.bouw().body;
}

/** Een houten kraan met tredmolen op de kaai (zoals de oude kraan van Brugge). */
export function havenkraanGeo() {
  const b = new Bouwer('havenkraan'); b.ao = false;
  const h = '#7a5c40', h2 = '#5a4636';
  b.box(1.6, 0.25, 1.6, 0, 0, 0, '#9c8f7c');
  b.box(1.4, 1.8, 1.3, 0, 0.25, 0, h).dak(1.5, 0.9, 1.4, 0, 2.05, 0, '#7d7788', Math.PI / 2);
  for (const sx of [-1, 1]) b.cil(0.75, 0.75, 0.12, sx * 0.76, 1.0, 0, h2, 14, [0, 0, Math.PI / 2]);
  b.blok(0.18, 3.2, 0.18, 0, 2.0, 0.4, h2, [-1.1, 0, 0]).box(0.04, 2.0, 0.04, 0, 1.4, -2.45, '#3b2a20').box(0.3, 0.25, 0.3, 0, 1.15, -2.45, '#a8743f');
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
    // de passagiers en de schipper zitten: de boot blijft lager dan 0,30 (zie vaart.js, BOOT_MATEN)
    for (const z of [-0.75, -0.3, 0.15, 0.6]) for (const dx of [-0.18, 0.18]) { b.box(0.13, 0.09, 0.12, dx, 0.07, z - 0.02, kl[k++ % kl.length]).bol(0.055, dx, 0.205, z - 0.02, '#f0c89a', 6); }
    b.box(0.16, 0.1, 0.16, 0, 0.07, -1.15, '#e8e4da').bol(0.058, 0, 0.23, -1.15, '#d8a77a', 6);   // de schipper
    b.box(0.18, 0.14, 0.14, 0, -0.04, -1.32, '#2d3240');
    return b.bouw();
  }
  if (soort === 'bagger') {
    // een slijkschuit: een platte houten schuit vol slijk, met een slijkvisser die met een lange schep werkt
    b.box(0.9, 0.24, 2.3, 0, -0.16, 0, '#5a3e2a').box(0.94, 0.05, 2.34, 0, 0.06, 0, '#8a6440');
    b.box(0.76, 0.06, 0.4, 0, -0.06, 1.05, '#5a3e2a');
    b.ico(0.32, 0, 0.06, -0.25, '#4a4a26', 0, 0.55).ico(0.26, 0.12, 0.08, 0.3, '#5d5a2c', 0, 0.5);    // de berg slijk
    b.cil(0.1, 0.09, 0.16, -0.28, 0.06, 0.75, '#7a5232', 8);                                            // emmer
    // de slijkvisser zit geknield met zijn schep plat over de boeg (zo vaart de schuit onder de bruggen)
    b.box(0.2, 0.06, 0.16, 0.21, 0.06, 0.72, '#3d3a36');
    b.box(0.17, 0.12, 0.12, 0.21, 0.1, 0.72, '#8a3a2e').bol(0.055, 0.21, 0.235, 0.72, '#f0c89a', 6).cil(0.075, 0.075, 0.015, 0.21, 0.25, 0.72, '#c9a24b', 8);
    b.blok(0.025, 1.0, 0.025, 0.3, 0.16, 0.2, '#7a5c40', [Math.PI / 2 - 0.08, 0, 0]).blok(0.14, 0.03, 0.16, 0.3, 0.1, 1.12, '#5a4636');
    return b.bouw();
  }
  if (soort === 'kogge') {
    // een middeleeuwse kogge: buikige romp, achterkasteel, één mast met een vierkant zeil
    b.box(1.5, 0.55, 4.2, 0, -0.3, 0, '#6b4a30').box(1.3, 0.25, 4.6, 0, 0.0, 0, '#7a5636').box(1.52, 0.06, 4.3, 0, 0.25, 0, '#a8845a');
    b.box(1.3, 0.55, 1.0, 0, 0.25, -1.6, '#7a5636').box(1.36, 0.08, 1.06, 0, 0.8, -1.6, '#a8845a');
    b.box(1.1, 0.35, 0.7, 0, 0.25, 1.9, '#7a5636');
    b.cil(0.06, 0.08, 3.2, 0, 0.25, 0.2, '#5a3e2a', 6).box(1.9, 0.06, 0.06, 0, 3.0, 0.2, '#5a3e2a');
    b.box(1.7, 1.7, 0.04, 0, 1.25, 0.22, '#efe6d2').box(1.72, 0.3, 0.05, 0, 2.0, 0.22, '#b8352e').box(0.35, 1.3, 0.05, 0, 1.4, 0.23, '#b8352e');
    b.box(0.03, 0.28, 0.4, 0, 3.3, 0.2, '#2f5a7a');
    for (const [z, k] of [[-0.6, '#a8743f'], [0.9, '#8a5a33']]) b.cil(0.18, 0.18, 0.32, 0.35, 0.25, z, k, 8);
    return b.bouw();
  }
  if (soort === 'aak') {
    b.box(0.9, 0.3, 3.0, 0, -0.2, 0, '#2f4f3a').box(0.92, 0.04, 3.02, 0, 0.1, 0, '#c9a24b');
    b.box(0.7, 0.1, 1.7, 0, 0.1, 0.35, '#8a6a44');
    for (const z of [-0.1, 0.5]) b.box(0.3, 0.09, 0.3, 0, 0.19, z, z > 0 ? '#e2643e' : '#3d8fe0');
    b.box(0.5, 0.17, 0.45, 0, 0.1, -1.1, '#efe6d2').box(0.52, 0.03, 0.47, 0, 0.27, -1.1, '#3a3f4b');   // laag stuurhuisje: past onder de bruggen
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

// ---------- middeleeuws verkeer (voorkant = +z) ----------
function paard(b, z = 0.55, kl = '#7a5436', manen = '#3a2a20') {
  b.box(0.18, 0.24, 0.5, 0, 0.3, z, kl);                       // romp
  b.box(0.13, 0.2, 0.14, 0, 0.45, z + 0.3, kl);                  // hals
  b.box(0.1, 0.11, 0.2, 0, 0.58, z + 0.38, kl);                  // hoofd
  b.box(0.04, 0.12, 0.2, 0, 0.5, z + 0.22, manen);               // manen
  b.box(0.05, 0.22, 0.05, 0, 0.27, z - 0.27, manen);             // staart
  for (const [dx, dz] of [[-0.06, -0.18], [0.06, -0.18], [-0.06, 0.18], [0.06, 0.18]]) b.box(0.05, 0.3, 0.05, dx, 0, z + dz, '#4e3424');
}
function mens(b, x, z, { rok = '#8a5a3b', mantel = null, kap = null, hoed = null, h = 1, y = 0 } = {}) {
  b.box(0.05 * h, 0.2 * h, 0.05 * h, x - 0.035, y, z, '#3d3a36').box(0.05 * h, 0.2 * h, 0.05 * h, x + 0.035, y, z, '#3d3a36');   // benen
  b.box(0.16 * h, 0.24 * h, 0.11 * h, x, y + 0.18 * h, z, rok);                                                                       // tuniek
  if (mantel) b.box(0.18 * h, 0.2 * h, 0.05 * h, x, y + 0.22 * h, z - 0.06, mantel);
  b.bol(0.055 * h, x, y + 0.48 * h, z, '#f0c89a', 6);
  if (kap) b.box(0.12 * h, 0.08 * h, 0.12 * h, x, y + 0.5 * h, z - 0.01, kap);
  if (hoed) b.cil(0.09 * h, 0.09 * h, 0.02, x, y + 0.52 * h, z, hoed, 8).cil(0.045 * h, 0.05 * h, 0.07 * h, x, y + 0.53 * h, z, hoed, 8);
}
/** Een boerenkar met een paard, vol hooi, met de boer op de bok. */
export function karGeo() {
  const b = new Bouwer('kar'); b.ao = false;
  paard(b, 0.62, '#8a5c38');
  b.box(0.02, 0.02, 0.45, -0.1, 0.33, 0.25, '#5a3e2a').box(0.02, 0.02, 0.45, 0.1, 0.33, 0.25, '#5a3e2a');   // disselbomen
  b.box(0.42, 0.06, 0.62, 0, 0.2, -0.2, '#8a6440');                                                         // laadbak
  b.box(0.04, 0.14, 0.62, -0.2, 0.26, -0.2, '#7a5636').box(0.04, 0.14, 0.62, 0.2, 0.26, -0.2, '#7a5636');
  b.ico(0.24, 0, 0.42, -0.26, '#e2c35c', 0, 0.7).ico(0.2, 0.04, 0.5, -0.1, '#d6b24a', 0, 0.6);              // hooi
  for (const dx of [-0.24, 0.24]) b.cil(0.17, 0.17, 0.04, dx, 0.17, -0.2, '#5a3e2a', 10, [0, 0, Math.PI / 2]);
  mens(b, 0, 0.1, { rok: '#6d7a4a', hoed: '#5a4632', h: 0.8, y: 0.12 });
  return b.bouw();
}
/** Een koets met paard (houten rijtuig). */
export function koetsGeo() {
  const b = new Bouwer('koets'); b.ao = false;
  paard(b, 0.58, '#3a2c24', '#1e1814');
  b.box(0.42, 0.32, 0.72, 0, 0.24, -0.15, '#6e2f2a');
  b.box(0.44, 0.04, 0.74, 0, 0.56, -0.15, '#d9b26f');
  b.dak(0.44, 0.12, 0.74, 0, 0.6, -0.15, '#3a2c24', Math.PI / 2);
  b.box(0.3, 0.14, 0.03, 0, 0.36, 0.215, '#f3d58a').box(0.03, 0.14, 0.3, 0.215, 0.36, -0.15, '#f3d58a').box(0.03, 0.14, 0.3, -0.215, 0.36, -0.15, '#f3d58a');
  b.box(0.36, 0.06, 0.18, 0, 0.42, 0.28, '#4a3226');
  mens(b, 0, 0.28, { rok: '#2f4f6a', hoed: '#2d2a28', h: 0.75, y: 0.3 });
  for (const [dx, dz, r] of [[-0.24, -0.4, 0.17], [0.24, -0.4, 0.17], [-0.22, 0.1, 0.12], [0.22, 0.1, 0.12]]) b.cil(r, r, 0.04, dx, r, dz, '#3a2c24', 10, [0, 0, Math.PI / 2]);
  return b.bouw();
}
/** Een ruiter te paard met een wapperende mantel. */
export function ruiterGeo() {
  const b = new Bouwer('ruiter'); b.ao = false;
  paard(b, 0.1, '#d9cbb4', '#8a7a64');
  b.box(0.22, 0.04, 0.24, 0, 0.54, 0.08, '#8a2f2a');                       // zadeldek
  b.box(0.15, 0.24, 0.11, 0, 0.56, 0.06, '#2f4f6a');                      // ruiter
  b.box(0.17, 0.26, 0.04, 0, 0.5, -0.02, '#b8352e');                      // mantel
  b.bol(0.055, 0, 0.86, 0.07, '#f0c89a', 6).cil(0.06, 0.07, 0.07, 0, 0.88, 0.07, '#3a3f4b', 8);
  return b.bouw();
}
/** Een handkar met vaten en zakken, geduwd door een marskramer. */
export function handkarGeo() {
  const b = new Bouwer('handkar'); b.ao = false;
  b.box(0.32, 0.05, 0.42, 0, 0.16, 0.12, '#8a6440');
  b.cil(0.08, 0.08, 0.18, -0.07, 0.21, 0.04, '#7a5232', 8).cil(0.08, 0.08, 0.18, 0.08, 0.21, 0.2, '#7a5232', 8);
  b.ico(0.09, 0.08, 0.27, 0.02, '#d9cba8', 0, 0.9).ico(0.08, -0.07, 0.29, 0.22, '#c9b98e', 0, 0.9);
  for (const dx of [-0.19, 0.19]) b.cil(0.13, 0.13, 0.03, dx, 0.13, 0.12, '#5a3e2a', 10, [0, 0, Math.PI / 2]);
  b.box(0.02, 0.02, 0.32, -0.12, 0.25, -0.2, '#5a3e2a').box(0.02, 0.02, 0.32, 0.12, 0.25, -0.2, '#5a3e2a');
  mens(b, 0, -0.38, { rok: '#9c4a36', kap: '#5d4a33', h: 0.95 });
  return b.bouw();
}
/** Wandelaars: 0 = een koppel (man en vrouw), 1 = een monnik en een kind met een mand. */
export function wandelaarGeo(variant = 0) {
  const b = new Bouwer('wandelaar' + variant); b.ao = false;
  if (variant === 0) {
    mens(b, -0.1, 0, { rok: '#3d6a8c', mantel: '#6b3f2a', hoed: '#3a2c24' });
    mens(b, 0.1, 0.02, { rok: '#a03a3a', kap: '#f1ece0' });
    b.box(0.09, 0.07, 0.07, 0.18, 0.2, 0.02, '#a8743f');   // mandje
  } else {
    mens(b, -0.08, 0, { rok: '#5d4a33', mantel: '#5d4a33', kap: '#4a3a28' });
    mens(b, 0.1, 0.04, { rok: '#4f7a3a', h: 0.7 });
    b.box(0.1, 0.06, 0.08, 0.17, 0.12, 0.04, '#a8743f');
  }
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
  b.cil(0.03, 0.035, 1.6, 0, 0, 0, '#5a3e2a', 6);
  b.box(0.5, 0.3, 0.02, 0.26, 1.24, 0, '#b8352e').box(0.5, 0.1, 0.03, 0.26, 1.14, 0, '#f2c94c');
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
  // een drijvend eiland van kroos en bruin schuim, met wat rommel erin
  for (let i = 0; i < 5; i++) b.ico(0.2 + b.r() * 0.22, (b.r() - 0.5) * 1.0, 0, (b.r() - 0.5) * 1.0, ['#7d9a3a', '#93a845', '#6f7a34', '#a3a050', '#8a8a48'][i], 1, 0.07);
  for (let i = 0; i < 4; i++) b.ico(0.07 + b.r() * 0.06, (b.r() - 0.5) * 0.9, 0.02, (b.r() - 0.5) * 0.9, '#e2dbb4', 0, 0.35);
  if (seed % 2) b.cil(0.07, 0.07, 0.2, 0.3, 0.03, 0.2, '#8a5a33', 8, [Math.PI / 2, 0, 0.4]);          // een drijvend vat
  else b.blok(0.5, 0.03, 0.1, -0.2, 0.03, -0.25, '#9c7a52', [0, 0.7, 0]);                               // een plank
  return b.bouw().body;
}

export { C as BRUGGE_KLEUREN };
