// Low-poly 3D-figuren in de stijl van de stad: de reizigers (avatars) en de zes gidsen.
// Ronde, stevige verhoudingen (groot hoofd, kort lijf), zachte kleuren, één samengevoegde geometrie per figuur.
// Benen, armen en hoofd krijgen een label (aDeel) zodat de shader ze kan laten stappen, zwaaien en knikken.
// Figuur staat op de oorsprong, kijkt naar +z, is ongeveer 1 eenheid hoog.
import * as THREE from '../../vendor/three.module.min.js';
import { Bouwer, tint } from '../city/modellen.js';
import { kleurenVan, STOFHAAR } from './uiterlijk.js';

export const HEUP = 0.3, SCHOUDER = 0.5, NEK = 0.58;
const ZWART = '#2a2230', WIT = '#ffffff';
const mix = (a, b, t) => { const c = new THREE.Color(a).lerp(new THREE.Color(b), t); return '#' + c.getHexString(); };

// ---------- gedeelde onderdelen ----------
function benen(b, broek, schoen, dik = 0.062, uit = 0.075) {
  for (const k of [-1, 1]) {
    b.zetDeel(1, HEUP, k).cil(dik, dik * 0.92, HEUP - 0.04, k * uit, 0.05, 0, broek, 9)
      .ellips(dik + 0.012, 0.048, dik + 0.045, k * uit, 0.048, 0.025, schoen, 10);
  }
  b.zetDeel(0);
}
function armen(b, mouw, hand, { dik = 0.05, uit = 0.172, lang = 0.2, extra } = {}) {
  for (const k of [-1, 1]) {
    b.zetDeel(2, SCHOUDER, k).cil(dik * 0.95, dik, lang, k * uit, SCHOUDER - lang + 0.01, 0, mouw, 9, [0, 0, k * 0.1])
      .bol(dik + 0.006, k * (uit + 0.02), SCHOUDER - lang - 0.005, 0.005, hand, 10);
    if (extra) extra(b, k);
  }
  b.zetDeel(0);
}
function romp(b, jas, { breed = 0.165, top = 0.135 } = {}) {
  b.cil(top, breed, 0.25, 0, 0.27, 0, jas, 16).ellips(breed, 0.07, breed, 0, 0.27, 0, jas, 14).ellips(top + 0.004, 0.065, top + 0.004, 0, 0.52, 0, jas, 14);
}
function ogen(b, y, z, uit = 0.085, groot = 1, kleur = ZWART) {
  for (const k of [-1, 1]) {
    b.ellips(0.03 * groot, 0.043 * groot, 0.022, k * uit, y, z, kleur, 10);
    b.bol(0.011 * groot, k * uit + 0.01, y + 0.016 * groot, z + 0.016, WIT, 6);
  }
}

// ---------- reizigers ----------
/** Geometrie van een reiziger met dit uiterlijk (inclusief uitrusting uit de labo's en de codekluis). */
export function avatarGeo(look) {
  const K = kleurenVan(look), uit = K.uit || {};
  const b = new Bouwer('avatar'); b.ao = false;
  const huid = K.huid, haar = STOFHAAR.has(K.stijl) ? K.haar : mix(K.haar, '#8a7a90', 0.12);
  let schoen = K.schoen || '#3a3446';
  if (uit.voeten === 'rubberlaarzen') schoen = '#f2c216';

  // ----- benen en schoenen -----
  const kort = K.onder === 'korte broek', rok = K.onder === 'rok' || K.boven === 'jurk';
  const beenKleur = rok ? huid : K.broek;
  for (const k of [-1, 1]) {
    b.zetDeel(1, HEUP, k);
    if (kort) b.cil(0.064, 0.058, 0.13, k * 0.075, 0.17, 0, K.broek, 9).cil(0.055, 0.05, 0.14, k * 0.075, 0.05, 0, huid, 9);
    else b.cil(0.062, 0.057, HEUP - 0.04, k * 0.075, 0.05, 0, beenKleur, 9);
    if (K.schoenen === 'laarzen' || uit.voeten === 'rubberlaarzen') b.cil(0.062, 0.07, 0.14, k * 0.075, 0.02, 0, schoen, 9).ellips(0.072, 0.045, 0.11, k * 0.075, 0.045, 0.03, schoen, 10);
    else if (K.schoenen === 'sandalen') b.box(0.12, 0.03, 0.17, k * 0.075, 0.015, 0.02, schoen).box(0.1, 0.02, 0.03, k * 0.075, 0.05, 0.0, schoen);
    else b.ellips(0.074, 0.048, 0.107, k * 0.075, 0.048, 0.025, schoen, 10);
  }
  b.zetDeel(0);
  if (rok) {
    const rokKleur = K.boven === 'jurk' ? K.jas : K.broek;
    b.cil(0.17, 0.3, 0.17, 0, HEUP - 0.04, 0, rokKleur, 16);
  }

  // ----- rug: cape, rugzak of schoudertas -----
  if (uit.rug === 'cape') {
    b.box(0.36, 0.38, 0.035, 0, 0.16, -0.17, '#2b3a78').box(0.3, 0.06, 0.06, 0, 0.5, -0.12, '#2b3a78');
    for (const [x, y] of [[-0.1, 0.25], [0.08, 0.36], [0.02, 0.22], [-0.05, 0.42]]) b.bol(0.018, x, y, -0.19, '#f2e27a', 6);
  }
  const rugzak = uit.rug === 'rugzak' || K.tas === 'rugzak';
  if (rugzak) b.box(0.24, 0.24, 0.12, 0, 0.27, -0.19, '#a8742e').box(0.25, 0.07, 0.13, 0, 0.47, -0.19, '#8a5a2b').box(0.12, 0.08, 0.02, 0, 0.32, -0.255, '#e9a23b');
  if (K.tas === 'schoudertas') { b.box(0.03, 0.02, 0.3, 0.06, 0.45, 0, '#6b4830', 0).box(0.16, 0.14, 0.07, -0.17, 0.24, 0.02, '#8a5a3b').box(0.16, 0.04, 0.08, -0.17, 0.36, 0.02, '#6b4830'); }

  // ----- romp en bovenkleren -----
  romp(b, K.jas, { breed: K.boven === 'hoodie' ? 0.175 : 0.165, top: 0.135 });
  if (K.boven === 'jas' || uit.jas) b.box(0.022, 0.2, 0.02, 0, 0.3, 0.158, tint(K.jas, 0.82));
  if (K.boven === 'hoodie') { b.koepel(0.16, 0, 0.5, -0.07, tint(K.jas, 0.9), 12, 0.6); b.cil(0.04, 0.04, 0.1, -0.05, 0.42, 0.13, '#f4f1ea', 6, [0.2, 0, 0]); }
  if (K.boven === 'tshirt') b.ellips(0.14, 0.09, 0.14, 0, 0.47, 0, huid, 12);
  if (K.boven === 'trui') for (const y of [0.33, 0.41]) b.box(0.26, 0.012, 0.012, 0, y, 0.16, tint(K.jas, 1.14));
  if (uit.jas === 'zwemvest') { b.box(0.14, 0.2, 0.06, -0.1, 0.3, 0.1, '#f2762b').box(0.14, 0.2, 0.06, 0.1, 0.3, 0.1, '#f2762b').box(0.3, 0.03, 0.04, 0, 0.36, 0.12, '#f4f1ea'); }
  if (uit.nek === 'verrekijker' || uit.nek === 'maankompas') {
    b.box(0.02, 0.22, 0.02, 0, 0.42, 0.11, '#4a3a2e');
    if (uit.nek === 'verrekijker') for (const k of [-1, 1]) b.cil(0.035, 0.035, 0.1, k * 0.04, 0.36, 0.12, '#2d3240', 8, [Math.PI / 2, 0, 0]);
    else b.cil(0.05, 0.05, 0.03, 0, 0.36, 0.13, '#c9a24b', 10, [Math.PI / 2, 0, 0]);
  }
  if (uit.nek && uit.nek.startsWith('sjaal')) { const c = uit.nek === 'sjaal-blauw' ? '#3a6fd6' : '#d23f3f'; b.torus(0.125, 0.045, 0, 0.56, 0, c, [Math.PI / 2, 0, 0], 14).ellips(0.05, 0.1, 0.03, 0.06, 0.47, 0.15, c, 8); }

  // ----- armen en wat ze vasthouden -----
  const mouw = K.boven === 'tshirt' ? huid : K.jas;
  armen(b, mouw, huid, {
    extra: (bb, k) => {
      if (K.boven === 'tshirt') bb.cil(0.052, 0.054, 0.07, k * 0.172, SCHOUDER - 0.07, 0, K.jas, 9);
      if (uit.hand === 'lantaarn' && k === -1) bb.cil(0.008, 0.008, 0.08, -0.192, 0.22, 0.01, '#4a5162', 4).box(0.08, 0.1, 0.08, -0.192, 0.1, 0.01, '#4a5162').box(0.06, 0.07, 0.06, -0.192, 0.115, 0.01, '#ffd36b');
      if ((uit.hand === 'veldfles') && k === 1) bb.cil(0.035, 0.035, 0.1, 0.2, 0.2, 0.01, '#4f7f8c', 8).cil(0.015, 0.015, 0.03, 0.2, 0.3, 0.01, '#2d3240', 6);
      if ((uit.hand === 'schepnet' || uit.hand === 'goudnet') && k === 1) {
        const kl = uit.hand === 'goudnet' ? '#e8c040' : '#b9a98c';
        bb.cil(0.012, 0.012, 0.42, 0.2, 0.18, 0.02, kl, 5).torus(0.07, 0.012, 0.2, 0.6, 0.02, kl, [Math.PI / 2, 0, 0], 12);
      }
    },
  });
  b.cil(0.06, 0.07, 0.07, 0, 0.53, 0, huid, 10);

  // ----- hoofd -----
  b.zetDeel(3, NEK, 0);
  const vorm = { rond: [0.255, 0.24, 0.24], ovaal: [0.235, 0.265, 0.235], hart: [0.26, 0.235, 0.235], hoekig: [0.25, 0.25, 0.245] }[K.gezicht] || [0.255, 0.24, 0.24];
  b.ellips(vorm[0], vorm[1], vorm[2], 0, 0.78, 0, huid, K.gezicht === 'hoekig' ? 10 : 18);
  if (K.gezicht === 'hart') b.ellips(0.2, 0.1, 0.2, 0, 0.66, 0.02, huid, 12);
  for (const k of [-1, 1]) {
    b.ellips(0.045, 0.06, 0.035, k * (vorm[0] - 0.003), 0.77, 0, tint(huid, 0.95), 8);
    if (K.oorbellen === 'knopjes') b.bol(0.018, k * (vorm[0] + 0.01), 0.745, 0.01, '#f2c94c', 6);
    if (K.oorbellen === 'ringetjes') b.torus(0.028, 0.008, k * (vorm[0] + 0.008), 0.72, 0.01, '#f2c94c', [0, Math.PI / 2, 0], 10);
  }
  // ogen
  const oogZ = vorm[2] - 0.018;
  if (K.ogen === 'amandel') { for (const k of [-1, 1]) { b.ellips(0.034, 0.026, 0.02, k * 0.085, 0.79, oogZ, ZWART, 10); b.bol(0.01, k * 0.085 + 0.012, 0.8, oogZ + 0.012, WIT, 6); } }
  else if (K.ogen === 'lach') { for (const k of [-1, 1]) b.torus(0.032, 0.009, k * 0.085, 0.785, oogZ, ZWART, [0, 0, 0], 12, Math.PI); }
  else if (K.ogen === 'groot') ogen(b, 0.79, oogZ, 0.09, 1.35);
  else if (K.ogen === 'wimpers') { ogen(b, 0.79, oogZ, 0.085, 1.05); for (const k of [-1, 1]) for (let i = -1; i <= 1; i++) b.box(0.012, 0.03, 0.01, k * 0.085 + i * 0.022, 0.825, oogZ, ZWART, 0); }
  else ogen(b, 0.79, oogZ, 0.085, 1);
  // wenkbrauwen
  const wb = mix(haar, '#3a2c22', 0.3);
  for (const k of [-1, 1]) {
    if (K.wenkbrauwen === 'recht') b.box(0.075, 0.016, 0.014, k * 0.085, 0.845, oogZ, wb);
    else if (K.wenkbrauwen === 'dik') b.box(0.085, 0.028, 0.016, k * 0.085, 0.845, oogZ, wb, k * 0.08);
    else if (K.wenkbrauwen === 'boog') b.torus(0.04, 0.009, k * 0.085, 0.835, oogZ, wb, [0, 0, 0], 10, Math.PI);
    else b.box(0.07, 0.014, 0.012, k * 0.085, 0.84, oogZ, wb, k * 0.14);
  }
  for (const k of [-1, 1]) b.ellips(0.038, 0.022, 0.012, k * 0.14, 0.725, oogZ - 0.02, mix(huid, '#ff7d8a', 0.45), 8);
  b.ellips(0.024, 0.018, 0.016, 0, 0.75, vorm[2] + 0.005, tint(huid, 0.93), 8);
  // mond
  if (K.mond === 'brede lach') b.torus(0.045, 0.011, 0, 0.705, oogZ + 0.004, '#7a3b3b', [0.3, 0, Math.PI], 12, Math.PI);
  else if (K.mond === 'rustig') b.box(0.05, 0.012, 0.012, 0, 0.7, oogZ + 0.004, '#7a3b3b');
  else if (K.mond === 'tanden') { b.torus(0.04, 0.013, 0, 0.705, oogZ + 0.004, '#7a3b3b', [0.3, 0, Math.PI], 12, Math.PI); b.box(0.05, 0.016, 0.01, 0, 0.714, oogZ + 0.012, WIT); }
  else b.torus(0.03, 0.009, 0, 0.705, oogZ + 0.004, '#7a3b3b', [0.3, 0, Math.PI], 10, Math.PI);

  // ----- haar, hoofddoeken en petten -----
  const stijl = K.stijl;
  const pet = (kleur, klep) => { b.koepel(0.274, 0, 0.86, -0.01, kleur, 16, 0.68).ellips(0.17, 0.02, 0.15, 0, 0.875, 0.215, klep || tint(kleur, 0.85), 12, [-0.18, 0, 0]); };
  const bedekt = stijl === 'pet' || ['pet-oranje', 'muts', 'matrozenpet', 'zuidwester', 'kapiteinspet'].includes(uit.hoofd) || K.hoed !== 'geen';
  const kortHaar = () => { b.ellips(0.25, 0.17, 0.2, 0, 0.74, -0.075, haar, 12); if (!bedekt) b.koepel(0.268, 0, 0.8, -0.012, haar, 16, 0.86).ellips(0.17, 0.06, 0.07, 0.04, 0.86, 0.2, haar, 10); else for (const k of [-1, 1]) b.ellips(0.06, 0.09, 0.08, k * 0.235, 0.82, -0.02, haar, 8); };
  const bolHaar = (r, sy, n, rr) => { b.koepel(r, 0, 0.8, -0.01, haar, 14, sy); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; b.ico(0.085, Math.cos(a) * rr, 0.9 + Math.sin(a * 2) * 0.02 + (Math.sin(a) < 0 ? 0.05 : 0), Math.sin(a) * rr * 0.9 - 0.02, tint(haar, i % 2 ? 1.08 : 1), 1); } b.ico(0.1, 0, 1.0, -0.02, haar, 1); b.ellips(0.25, 0.17, 0.2, 0, 0.74, -0.075, haar, 12); };
  if (stijl === 'kort') kortHaar();
  if (stijl === 'krul') bolHaar(0.262, 0.8, 11, 0.2);
  if (stijl === 'afro') { bolHaar(0.3, 0.95, 16, 0.265); b.koepel(0.31, 0, 0.82, -0.01, haar, 14, 0.95); }
  if (stijl === 'lang') { kortHaar(); b.ellips(0.24, 0.3, 0.13, 0, 0.6, -0.12, haar, 12); for (const k of [-1, 1]) b.ellips(0.075, 0.24, 0.1, k * 0.215, 0.66, -0.01, haar, 10); }
  if (stijl === 'bob') { kortHaar(); b.ellips(0.26, 0.17, 0.23, 0, 0.72, -0.03, haar, 14); for (const k of [-1, 1]) b.ellips(0.07, 0.14, 0.09, k * 0.23, 0.68, 0.02, haar, 10); }
  if (stijl === 'zijscheiding') { kortHaar(); b.ellips(0.2, 0.08, 0.16, -0.06, 0.885, 0.06, haar, 12, [0, 0, -0.25]); }
  if (stijl === 'stekels') { b.ellips(0.25, 0.15, 0.2, 0, 0.75, -0.06, haar, 12); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; b.kegel(0.05, 0.16, Math.cos(a) * 0.14, 0.9, Math.sin(a) * 0.13 - 0.02, haar, 5); } b.kegel(0.055, 0.19, 0, 0.94, -0.02, haar, 5); }
  if (stijl === 'staart') { kortHaar(); b.bol(0.085, 0, 0.92, -0.255, haar, 10).ellips(0.075, 0.17, 0.075, 0, 0.75, -0.31, haar, 10).torus(0.05, 0.016, 0, 0.9, -0.27, '#e9578a', [Math.PI / 2, 0, 0], 10); }
  if (stijl === 'staartjes') { kortHaar(); for (const k of [-1, 1]) { b.bol(0.07, k * 0.2, 0.86, -0.17, haar, 10).ellips(0.06, 0.13, 0.06, k * 0.235, 0.74, -0.2, haar, 10).torus(0.04, 0.014, k * 0.2, 0.84, -0.18, '#f2c94c', [Math.PI / 2, 0, 0], 10); } }
  if (stijl === 'knot') { kortHaar(); b.bol(0.11, 0, 1.0, -0.1, haar, 12).torus(0.085, 0.018, 0, 0.98, -0.1, tint(haar, 1.2), [0.4, 0, 0], 12); }
  if (stijl === 'vlechten') { kortHaar(); for (const k of [-1, 1]) for (let i = 0; i < 4; i++) b.bol(0.045, k * (0.2 - i * 0.012), 0.82 - i * 0.1, -0.16 - i * 0.015, tint(haar, i % 2 ? 1.1 : 1), 8); }
  if (stijl === 'hoofddoek' || stijl === 'hoofddoek-sport') {
    const hd = haar;
    b._add(b.delen, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.79, 0.02], [-Math.PI / 2, 0, 0], [0.285, 0.285, 0.275], hd);
    b.torus(0.225, 0.055, 0, 0.78, 0.085, hd, [0, 0, 0], 18);
    if (stijl === 'hoofddoek') b.zetDeel(0).cil(0.17, 0.25, 0.14, 0, 0.47, 0, hd, 16).zetDeel(3, NEK, 0);
    else b.ellips(0.2, 0.1, 0.12, 0, 0.62, -0.12, tint(hd, 0.9), 12);
  }
  if (stijl === 'tulband') {
    for (let i = 0; i < 4; i++) b.torus(0.24 - i * 0.03, 0.055, 0, 0.84 + i * 0.065, -0.005, tint(haar, 1 + i * 0.04), [Math.PI / 2 + i * 0.12, 0, 0], 16);
    b.koepel(0.2, 0, 0.84, -0.005, haar, 14, 0.7);
  }
  if (stijl === 'kufi') { b.cil(0.25, 0.26, 0.13, 0, 0.84, -0.005, haar, 16).koepel(0.248, 0, 0.96, -0.005, tint(haar, 1.06), 14, 0.35); }
  if (stijl === 'pet') { kortHaar(); pet(haar); }

  // ----- hoed of pet uit de kleerkast -----
  if (K.hoed === 'pet') pet('#2f3e5a');
  if (K.hoed === 'muts') b.koepel(0.282, 0, 0.83, -0.005, '#d23f3f', 16, 0.95).torus(0.27, 0.04, 0, 0.84, -0.005, '#f4f1ea', [Math.PI / 2, 0, 0], 18).bol(0.065, 0, 1.12, -0.01, '#f4f1ea', 8);
  if (K.hoed === 'zonnehoed') b.koepel(0.25, 0, 0.86, -0.005, '#e9d7a7', 16, 0.6).ellips(0.42, 0.025, 0.42, 0, 0.87, -0.005, '#dcc690', 20).torus(0.24, 0.022, 0, 0.885, -0.005, '#8a5a2b', [Math.PI / 2, 0, 0], 18);
  if (K.hoed === 'bandana') { b.cil(0.265, 0.272, 0.09, 0, 0.84, -0.005, '#c8403c', 16); b.bol(0.05, -0.2, 0.86, -0.19, '#c8403c', 8); }

  // ----- uitrusting op het hoofd en het gezicht -----
  const h = uit.hoofd;
  if (h === 'pet-oranje') pet('#e2783e', '#b5532a');
  if (h === 'matrozenpet' || h === 'kapiteinspet') { b.cil(0.26, 0.27, 0.1, 0, 0.84, -0.005, '#f4f1ea', 16).koepel(0.255, 0, 0.93, -0.005, '#f4f1ea', 14, 0.3); b.torus(0.262, 0.02, 0, 0.845, -0.005, '#2f3e5a', [Math.PI / 2, 0, 0], 18); if (h === 'kapiteinspet') b.ellips(0.15, 0.02, 0.13, 0, 0.86, 0.21, '#2f3e5a', 12, [-0.2, 0, 0]); }
  if (h === 'zuidwester') { b.koepel(0.272, 0, 0.84, -0.005, '#f2c216', 16, 0.75).ellips(0.33, 0.025, 0.4, 0, 0.845, -0.06, '#f2c216', 18); b.box(0.05, 0.1, 0.02, 0.2, 0.74, 0.1, '#d9a712'); }
  if (h === 'muts') b.koepel(0.282, 0, 0.83, -0.005, '#d23f3f', 16, 0.95).torus(0.27, 0.04, 0, 0.84, -0.005, '#f4f1ea', [Math.PI / 2, 0, 0], 18).bol(0.065, 0, 1.12, -0.01, '#f4f1ea', 8);
  if (h === 'feesthoed') b.kegel(0.12, 0.3, 0.04, 0.99, -0.02, '#9a6ad6', 12).torus(0.11, 0.018, 0.04, 1.01, -0.02, '#e9a23b', [Math.PI / 2, 0, 0], 12).bol(0.04, 0.04, 1.3, -0.02, '#f2e27a', 8);
  if (h === 'bladerkrans') for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.ico(0.055, Math.cos(a) * 0.235, 0.92, Math.sin(a) * 0.225, i % 4 === 0 ? '#ff8fb1' : i % 2 ? '#3f8a46' : '#6bc35a', 0); }
  if (h === 'veer') b.ellips(0.03, 0.14, 0.014, 0.12, 1.08, -0.06, '#3fb34f', 8, [0, 0, -0.35]).ellips(0.026, 0.05, 0.012, 0.165, 1.2, -0.06, '#e04a3a', 8, [0, 0, -0.35]);
  if (h === 'koptelefoon') { b.torus(0.272, 0.024, 0, 0.8, 0, '#3a3a48', [0, 0, 0], 16, Math.PI); for (const k of [-1, 1]) b.cil(0.075, 0.075, 0.07, k * 0.25, 0.78, 0, '#3ad1e6', 12, [0, 0, Math.PI / 2]); }
  // bril en duikbril
  const bril = (kleur, glas, r = 0.05) => { for (const k of [-1, 1]) b.torus(r, 0.011, k * 0.085, 0.79, oogZ + 0.03, kleur, [0, 0, 0], 14); b.box(0.06, 0.012, 0.012, 0, 0.8, oogZ + 0.03, kleur); if (glas) for (const k of [-1, 1]) b.ellips(r, r, 0.006, k * 0.085, 0.79, oogZ + 0.032, glas, 12); };
  if (K.bril === 'rond' || uit.gezicht === 'bril') bril('#22222c');
  if (K.bril === 'vierkant') { for (const k of [-1, 1]) b.box(0.09, 0.07, 0.012, k * 0.085, 0.79, oogZ + 0.03, '#22222c'); b.box(0.06, 0.012, 0.012, 0, 0.79, oogZ + 0.03, '#22222c'); }
  if (K.bril === 'zonnebril') bril('#22222c', '#2b3a4a', 0.055);
  if (uit.gezicht === 'duikbril') {
    b.box(0.26, 0.11, 0.05, 0, 0.8, oogZ, '#2f6f9f'); b.box(0.22, 0.08, 0.02, 0, 0.8, oogZ + 0.03, '#bfe4f7');
    b.torus(0.26, 0.018, 0, 0.8, -0.02, '#2f6f9f', [0, 0, 0], 16);
    b.cil(0.02, 0.02, 0.16, 0.2, 0.8, 0.02, '#f2c216', 6, [0.3, 0, 0.2]);
  }
  b.zetDeel(0);
  return b.bouw().body;
}

// ---------- de zes gidsen ----------
const GIDS_BOUW = {
  /** Atlas de schildpad: kaartenmaker met tropenhelm en een opgerolde kaart. */
  atlas(b) {
    const g = '#7cc56a', gd = '#5ea44e', schild = '#b07a3e', buik = '#f0dca0';
    benen(b, gd, gd, 0.075, 0.085);
    b.ellips(0.27, 0.32, 0.17, 0, 0.42, -0.1, schild, 16);
    for (const [x, y] of [[0, 0.5], [-0.12, 0.38], [0.12, 0.38], [0, 0.27], [-0.13, 0.55], [0.13, 0.55]]) b.ellips(0.07, 0.06, 0.03, x, y, -0.255, '#d19a55', 8);
    romp(b, g, { breed: 0.18, top: 0.145 });
    b.ellips(0.15, 0.2, 0.06, 0, 0.38, 0.12, buik, 12);
    for (const y of [0.3, 0.38, 0.46]) b.box(0.2, 0.008, 0.01, 0, y, 0.18, '#d8bf86');
    armen(b, g, g, { dik: 0.06, extra: (bb, k) => { if (k === 1) bb.cil(0.035, 0.035, 0.32, 0.2, 0.24, 0.05, '#f6eedd', 10, [Math.PI / 2, 0, 0]).torus(0.036, 0.008, 0.2, 0.24, 0.07, '#e2643e', [0, 0, 0], 10); } });
    b.cil(0.07, 0.08, 0.07, 0, 0.53, 0, g, 10);
    b.zetDeel(3, NEK, 0);
    b.ellips(0.25, 0.22, 0.25, 0, 0.77, 0.02, g, 18);
    ogen(b, 0.8, 0.245, 0.09, 1.1);
    for (const k of [-1, 1]) b.ellips(0.035, 0.02, 0.012, k * 0.15, 0.73, 0.22, '#f39c8f', 8);
    b.torus(0.04, 0.01, 0, 0.71, 0.245, '#3d6b33', [0.2, 0, Math.PI], 10, Math.PI);
    // duikbril op het voorhoofd en een snorkel: Atlas is in dit thema duiker en ontdekkingsreiziger
    b.box(0.3, 0.12, 0.05, 0, 0.93, 0.19, '#2f6f9f').box(0.26, 0.09, 0.02, 0, 0.93, 0.225, '#bfe4f7');
    b.torus(0.27, 0.02, 0, 0.93, 0.0, '#2f6f9f', [0, 0, 0], 16);
    b.cil(0.022, 0.022, 0.26, 0.24, 0.84, 0.06, '#f2c216', 6, [0.25, 0, 0.25]);
    b.zetDeel(0);
  },
  /** Woordje de papegaai: rood, met blauwe en groene vleugels. */
  woordje(b) {
    const rood = '#e2453a', geel = '#f6c445', blauw = '#3d8fe0', groen = '#3fb34f';
    benen(b, '#9aa0aa', '#7d838e', 0.035, 0.07);
    for (let i = 0; i < 3; i++) b.ellips(0.05, 0.03, 0.22, (i - 1) * 0.06, 0.2 - i * 0.02, -0.24, [blauw, rood, groen][i], 8, [0.5, 0, 0]);
    romp(b, rood, { breed: 0.17, top: 0.14 });
    b.ellips(0.13, 0.17, 0.06, 0, 0.36, 0.12, geel, 12);
    armen(b, blauw, blauw, { dik: 0.06, extra: (bb, k) => { bb.ellips(0.05, 0.16, 0.09, k * 0.2, 0.36, -0.02, groen, 10, [0, 0, k * 0.15]).ellips(0.045, 0.1, 0.07, k * 0.205, 0.25, -0.02, blauw, 8); } });
    b.zetDeel(3, NEK, 0);
    b.ellips(0.24, 0.24, 0.23, 0, 0.78, 0, rood, 18);
    for (const k of [-1, 1]) b.ellips(0.08, 0.075, 0.03, k * 0.1, 0.8, 0.2, '#fdf4ea', 10);
    ogen(b, 0.8, 0.226, 0.1, 0.95);
    b._add(b.delen, new THREE.ConeGeometry(0.07, 0.17, 10).translate(0, 0.085, 0), [0, 0.73, 0.21], [Math.PI / 2 + 0.55, 0, 0], [1, 1, 1], '#3a3446');
    b._add(b.delen, new THREE.ConeGeometry(0.075, 0.12, 10).translate(0, 0.06, 0), [0, 0.75, 0.22], [Math.PI / 2 - 0.1, 0, 0], [1, 1, 1], geel);
    for (let i = 0; i < 3; i++) b.ellips(0.03, 0.09, 0.03, (i - 1) * 0.05, 1.04, -0.02 - i * 0.02, i === 1 ? geel : rood, 8, [-0.3, 0, (i - 1) * 0.35]);
    b.zetDeel(0);
    // verkennerstouw over de schouder en een klimhaak
    b.torus(0.13, 0.022, -0.02, 0.4, 0.02, '#d8c9a8', [0.5, 0.4, 0], 14);
    b.torus(0.12, 0.02, 0.0, 0.34, 0.0, '#c9b89a', [0.5, 0.4, 0], 14);
    b.box(0.05, 0.05, 0.02, -0.19, 0.3, 0.06, '#9aa0aa').box(0.02, 0.09, 0.02, -0.19, 0.26, 0.06, '#9aa0aa');
  },
  /** Tella de vos: oranje, witte snuit, pluimstaart, rekent graag. */
  tella(b) {
    const or = '#ec7f35', wit = '#fbf3e6', donker = '#5a3a2a';
    benen(b, or, donker, 0.06, 0.08);
    b.ellips(0.11, 0.3, 0.11, 0.06, 0.3, -0.27, or, 12, [0.8, 0, 0.25]).ellips(0.08, 0.1, 0.08, 0.13, 0.12, -0.42, wit, 10, [0.8, 0, 0.25]);
    romp(b, or, { breed: 0.165, top: 0.135 });
    b.ellips(0.12, 0.17, 0.06, 0, 0.35, 0.12, wit, 12);
    // labojas met zakken
    b.cil(0.15, 0.185, 0.3, 0, 0.22, 0, '#f4f1ea', 16);
    b.box(0.022, 0.26, 0.02, 0, 0.22, 0.17, '#dfe3ea');
    for (const k of [-1, 1]) b.box(0.07, 0.06, 0.02, k * 0.09, 0.26, 0.16, '#e8e4da');
    b.box(0.08, 0.03, 0.03, 0, 0.5, 0.15, '#3d8fe0').bol(0.02, 0, 0.5, 0.17, '#2f6fb5', 6);   // strikje
    armen(b, or, donker, { dik: 0.05 });
    b.zetDeel(3, NEK, 0);
    b.ellips(0.25, 0.22, 0.23, 0, 0.78, 0, or, 18);
    b.ellips(0.15, 0.1, 0.12, 0, 0.71, 0.14, wit, 12).ellips(0.14, 0.08, 0.1, 0, 0.7, 0.2, wit, 10).bol(0.035, 0, 0.73, 0.3, '#2a2230', 8);
    ogen(b, 0.81, 0.21, 0.095, 1);
    for (const k of [-1, 1]) {
      b._add(b.delen, new THREE.ConeGeometry(0.09, 0.2, 4).translate(0, 0.1, 0), [k * 0.15, 0.93, -0.03], [0, 0, -k * 0.35], [1, 1, 0.6], or);
      b._add(b.delen, new THREE.ConeGeometry(0.045, 0.08, 4).translate(0, 0.04, 0), [k * 0.2, 1.06, -0.03], [0, 0, -k * 0.35], [1, 1, 0.6], donker);
    }
    // veiligheidsbril op de snuit en een pipet achter het oor
    for (const k of [-1, 1]) b.ellips(0.075, 0.06, 0.02, k * 0.095, 0.81, 0.215, '#cfe8f6', 10);
    b.box(0.26, 0.02, 0.02, 0, 0.82, 0.21, '#8fb8d0');
    b.cil(0.014, 0.014, 0.2, 0.24, 0.78, 0.0, '#cfe8f6', 6, [0.3, 0, -0.9]).kegel(0.014, 0.03, 0.4, 0.86, 0.06, '#7cc7ea', 6);
    b.zetDeel(0);
  },
  /** Kroniek de uil: rond, grote ogen, oorpluimen, een boek onder de vleugel. */
  kroniek(b) {
    const br = '#8a5a3c', lic = '#e8cfa6', donk = '#6b4430';
    benen(b, '#e2a03a', '#e2a03a', 0.035, 0.07);
    b.ellips(0.23, 0.29, 0.21, 0, 0.36, 0, br, 16);
    b.ellips(0.15, 0.2, 0.07, 0, 0.34, 0.15, lic, 12);
    for (const [x, y] of [[-0.05, 0.4], [0.05, 0.4], [0, 0.33], [-0.06, 0.27], [0.06, 0.27]]) b._add(b.delen, new THREE.ConeGeometry(0.02, 0.03, 3), [x, y, 0.215], [Math.PI, 0, 0], [1, 1, 0.5], donk);
    armen(b, donk, donk, { dik: 0.055, uit: 0.2, extra: (bb, k) => { bb.ellips(0.05, 0.17, 0.11, k * 0.215, 0.36, -0.01, donk, 10, [0, 0, k * 0.12]); if (k === 1) bb.box(0.06, 0.2, 0.16, 0.26, 0.27, 0.05, '#4c8fd6').box(0.065, 0.18, 0.14, 0.262, 0.27, 0.06, '#f6eedd'); } });
    b.zetDeel(3, NEK, 0);
    b.ellips(0.27, 0.23, 0.24, 0, 0.77, 0, br, 18);
    for (const k of [-1, 1]) { b.ellips(0.115, 0.115, 0.04, k * 0.11, 0.79, 0.2, lic, 14); b.bol(0.075, k * 0.11, 0.79, 0.215, WIT, 12).bol(0.042, k * 0.105, 0.785, 0.275, ZWART, 10).bol(0.014, k * 0.095, 0.805, 0.31, WIT, 6); }
    b._add(b.delen, new THREE.ConeGeometry(0.04, 0.09, 6).translate(0, -0.045, 0), [0, 0.73, 0.25], [0.3, 0, 0], [1, 1, 0.8], '#f2a33a');
    for (const k of [-1, 1]) b._add(b.delen, new THREE.ConeGeometry(0.06, 0.16, 5).translate(0, 0.08, 0), [k * 0.17, 0.94, -0.02], [0, 0, -k * 0.45], [1, 1, 0.7], donk);
    // kleine bril op de neus
    for (const k of [-1, 1]) b.torus(0.07, 0.009, k * 0.11, 0.79, 0.3, '#c9a24c', [0, 0, 0], 14);
    b.zetDeel(0);
    // reismantel en een lantaarn aan een stok
    b.cil(0.21, 0.3, 0.34, 0, 0.2, -0.03, '#4a3f6b', 16);
    b.box(0.3, 0.06, 0.06, 0, 0.54, -0.04, '#5d4f80');
    b.cil(0.01, 0.01, 0.34, -0.26, 0.26, 0.04, '#5d3a2a', 5);
    b.box(0.09, 0.11, 0.09, -0.26, 0.15, 0.04, '#4a5162').box(0.07, 0.08, 0.07, -0.26, 0.165, 0.04, '#ffd36b');
  },
  /** Bram de beer: warm bruin, ronde oren, een hartje op de borst. */
  bram(b) {
    const br = '#a06b45', lic = '#e6c49c', donk = '#7a4f33';
    benen(b, br, donk, 0.075, 0.09);
    romp(b, br, { breed: 0.2, top: 0.16 });
    b.ellips(0.15, 0.18, 0.07, 0, 0.36, 0.13, lic, 12);
    b.ellips(0.04, 0.035, 0.02, -0.022, 0.43, 0.19, '#e9578a', 8).ellips(0.04, 0.035, 0.02, 0.022, 0.43, 0.19, '#e9578a', 8)
      ._add(b.delen, new THREE.ConeGeometry(0.058, 0.06, 4).translate(0, -0.03, 0), [0, 0.415, 0.19], [0, Math.PI / 4, 0], [1, 1, 0.35], '#e9578a');
    b.torus(0.15, 0.045, 0, 0.56, 0, '#3fa37a', [Math.PI / 2, 0, 0], 14).ellips(0.05, 0.11, 0.03, -0.07, 0.46, 0.16, '#3fa37a', 8);
    // kamprugzak met een kookpot eraan
    b.box(0.28, 0.28, 0.14, 0, 0.26, -0.21, '#7a6a3f').box(0.29, 0.08, 0.15, 0, 0.5, -0.21, '#5f5230');
    b.cil(0.075, 0.075, 0.09, 0, 0.2, -0.3, '#8a9099', 12).torus(0.078, 0.01, 0, 0.3, -0.3, '#6b7383', [0, Math.PI / 2, 0], 12);
    b.box(0.06, 0.1, 0.02, -0.12, 0.3, -0.3, '#c9a24b');
    armen(b, br, donk, { dik: 0.062, uit: 0.2 });
    b.zetDeel(3, NEK, 0);
    b.ellips(0.26, 0.24, 0.24, 0, 0.78, 0, br, 18);
    for (const k of [-1, 1]) b.bol(0.085, k * 0.19, 0.97, -0.02, br, 10).ellips(0.05, 0.05, 0.03, k * 0.19, 0.97, 0.04, '#f0a5a0', 8);
    b.ellips(0.12, 0.09, 0.08, 0, 0.71, 0.19, lic, 12).ellips(0.045, 0.032, 0.03, 0, 0.75, 0.265, '#2a2230', 8);
    ogen(b, 0.82, 0.22, 0.095, 0.9);
    b.torus(0.03, 0.009, 0, 0.69, 0.262, '#4a2e1c', [0.2, 0, Math.PI], 10, Math.PI);
    b.zetDeel(0);
  },
  /** Byte de robot: blokkig maar vriendelijk, met een scherm als gezicht. */
  byte(b) {
    const gr = '#cfd6e2', grd = '#9aa3b4', bl = '#3d8fe0', scherm = '#24324a', oog = '#5ff0ff';
    for (const k of [-1, 1]) b.zetDeel(1, HEUP, k).cil(0.05, 0.05, 0.24, k * 0.08, 0.07, 0, grd, 8).box(0.12, 0.08, 0.17, k * 0.08, 0, 0.02, bl);
    b.zetDeel(0);
    b.box(0.34, 0.3, 0.26, 0, 0.24, 0, gr).box(0.36, 0.04, 0.28, 0, 0.5, 0, grd).box(0.16, 0.12, 0.02, 0, 0.32, 0.135, scherm)
      .bol(0.02, -0.04, 0.33, 0.145, '#ff7a59', 6).bol(0.02, 0.0, 0.33, 0.145, '#f6c445', 6).bol(0.02, 0.04, 0.33, 0.145, '#3fb34f', 6);
    armen(b, grd, bl, { dik: 0.045, uit: 0.21, extra: (bb, k) => bb.bol(0.06, k * 0.2, 0.47, 0, gr, 10) });
    b.cil(0.05, 0.05, 0.08, 0, 0.53, 0, grd, 8);
    b.zetDeel(3, NEK, 0);
    b.box(0.46, 0.36, 0.38, 0, 0.6, 0, gr).box(0.48, 0.04, 0.4, 0, 0.6, 0, grd).box(0.38, 0.25, 0.02, 0, 0.66, 0.19, scherm);
    for (const k of [-1, 1]) b.box(0.07, 0.09, 0.012, k * 0.08, 0.8, 0.2, oog).cil(0.06, 0.06, 0.05, k * 0.24, 0.78, 0, bl, 10, [0, 0, Math.PI / 2]);
    b.torus(0.05, 0.012, 0, 0.73, 0.2, oog, [0, 0, Math.PI], 10, Math.PI);
    b.cil(0.012, 0.012, 0.14, 0, 0.96, 0, grd, 6).bol(0.04, 0, 1.12, 0, '#ff7a59', 8);
    b.zetDeel(0);
    // gereedschapsriem en een kleine jetpack
    b.torus(0.19, 0.035, 0, 0.17, 0, '#6b4830', [Math.PI / 2, 0, 0], 16);
    for (const [x, kl] of [[-0.12, '#f2c94c'], [0.0, '#e2643e'], [0.12, '#9aa0aa']]) b.box(0.05, 0.1, 0.04, x, 0.1, 0.17, kl);
    for (const k of [-1, 1]) { b.cil(0.06, 0.07, 0.26, k * 0.1, 0.22, -0.2, '#cfd6e2', 10); b.kegel(0.05, 0.08, k * 0.1, 0.16, -0.2, '#5ff0ff', 8); }
  },
};
export const GIDS_IDS = Object.keys(GIDS_BOUW);

/** Geometrie van een gids. */
export function gidsGeo(id) {
  const b = new Bouwer('gids-' + id); b.ao = false;
  (GIDS_BOUW[id] || GIDS_BOUW.atlas)(b);
  return b.bouw().body;
}

// ---------- materiaal: stappen, zwaaien, knikken ----------
export const MAX_FIG = 64;
const FIG_GLSL = `
attribute float aFig; attribute vec3 aDeel;
uniform vec4 uFigA[${MAX_FIG}]; uniform vec4 uFigB[${MAX_FIG}]; uniform float uFigT;
vec2 figRot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
void figuur(inout vec3 p, inout vec3 n) {
  int fi = int(aFig + 0.5);
  vec4 A = uFigA[fi]; vec4 B = uFigB[fi];
  float fase = B.y, amp = B.z, zwaai = B.w, kant = aDeel.z, py = aDeel.y;
  if (aDeel.x > 0.5 && aDeel.x < 1.5) {
    float h = sin(fase) * 0.75 * amp * kant;
    p.yz = figRot(p.yz - vec2(py, 0.0), h) + vec2(py, 0.0); n.yz = figRot(n.yz, h);
  } else if (aDeel.x > 1.5 && aDeel.x < 2.5) {
    float h = -sin(fase) * 0.6 * amp * kant;
    p.yz = figRot(p.yz - vec2(py, 0.0), h) + vec2(py, 0.0); n.yz = figRot(n.yz, h);
    float z = kant > 0.0 ? zwaai * (2.5 + 0.35 * sin(uFigT * 9.0)) : 0.0;
    vec2 piv = vec2(kant * 0.17, py);
    p.xy = figRot(p.xy - piv, z) + piv; n.xy = figRot(n.xy, z);
  } else if (aDeel.x > 2.5) {
    float k = sin(uFigT * 1.6 + float(fi) * 1.37) * 0.07 * (1.0 - amp) + sin(fase * 2.0) * 0.03 * amp;
    p.yz = figRot(p.yz - vec2(py, 0.0), k) + vec2(py, 0.0); n.yz = figRot(n.yz, k);
  }
  float rol = sin(fase) * 0.07 * amp;
  p.xy = figRot(p.xy, rol); n.xy = figRot(n.xy, rol);
  p.y += abs(sin(fase)) * 0.06 * amp + (sin(uFigT * 2.3 + float(fi)) * 0.5 + 0.5) * 0.01;
  p *= B.x;
  p.xz = figRot(p.xz, -A.w); n.xz = figRot(n.xz, -A.w);
  p += A.xyz;
}
`;
/** Uniforms voor een groep figuren (gedeeld door het materiaal en het schaduwmateriaal). */
export function figUniforms() {
  return {
    uFigA: { value: Array.from({ length: MAX_FIG }, () => new THREE.Vector4(0, -50, 0, 0)) },
    uFigB: { value: Array.from({ length: MAX_FIG }, () => new THREE.Vector4(1, 0, 0, 0)) },
    uFigT: { value: 0 },
  };
}
function injecteer(sh, U, normaal) {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = FIG_GLSL + sh.vertexShader;
  if (normaal) sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(normal); { vec3 _fp = vec3(position); figuur(_fp, objectNormal); }');
  sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); { vec3 _fn = vec3(0.0, 1.0, 0.0); figuur(transformed, _fn); }');
}
/** Materiaal (Lambert met vertexkleuren) en schaduwmateriaal voor figuren met aFig/aDeel. */
export function figMaterialen(U) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (sh) => injecteer(sh, U, true);
  mat.customProgramCacheKey = () => 'klets-figuur';
  const diepte = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  diepte.onBeforeCompile = (sh) => injecteer(sh, U, false);
  diepte.customProgramCacheKey = () => 'klets-figuur-diepte';
  return { mat, diepte };
}
/** Voeg figuren samen tot één geometrie met een index per figuur (aFig). */
export function voegFigurenSamen(geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), kl = new Float32Array(n * 3), dl = new Float32Array(n * 3), fi = new Float32Array(n);
  let o = 0;
  geos.forEach((g, i) => {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); kl.set(g.attributes.color.array, o * 3);
    if (g.attributes.aDeel) dl.set(g.attributes.aDeel.array, o * 3);
    fi.fill(i, o, o + c); o += c;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(kl, 3));
  out.setAttribute('aDeel', new THREE.BufferAttribute(dl, 3));
  out.setAttribute('aFig', new THREE.BufferAttribute(fi, 1));
  out.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  return out;
}
