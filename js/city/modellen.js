// Low-poly modellen in code: gebouwen per wijk en niveau, hoofdkwartieren van de gidsen, huizen,
// station, bomen, auto's en de trein. Elk model is een samengevoegde geometrie met vertexkleuren
// (een tekenopdracht per soort), plus een aparte geometrie voor de ramen die 's nachts oplichten.
import * as THREE from '../../vendor/three.module.min.js';
import { rng } from '../core/util.js';
import { KLEUR } from './layout.js';

const C = {
  creme: '#f6eedd', wit: '#fbfaf6', grijs: '#dfe3ea', zand: '#f0dcb8', baksteen: '#d97c55', donker: '#4a5162',
  beton: '#cfd2d8', pad: '#e3ded4', gras: '#86cc5c', haag: '#4fa548', hout: '#a8743f', glas: '#8fbbe0',
  goud: '#f2c94c', water: '#5bb8e8', blad: '#5cb84a', blad2: '#7ccf52', dennen: '#3f8f4a', stam: '#8a5a33',
  geel: '#ffd166', zwart: '#2d3240',
};
export const KLEUREN = C;

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
const col = new THREE.Color();

export function tint(hex, f) { const c = new THREE.Color(hex); if (f > 1) c.lerp(new THREE.Color('#ffffff'), f - 1); else c.multiplyScalar(f); return '#' + c.getHexString(); }

// ---------- primitieven ----------
function prismaGeo() {
  // driehoekig prisma: breedte 1 (x), hoogte 1 (y), diepte 1 (z); nok langs x
  const v = [
    [-.5, 0, -.5], [.5, 0, -.5], [.5, 0, .5], [-.5, 0, .5], [-.5, 1, 0], [.5, 1, 0],
  ];
  const f = [[0, 1, 5], [0, 5, 4], [3, 4, 5], [3, 5, 2], [0, 4, 3], [1, 2, 5], [0, 3, 2], [0, 2, 1]];
  const pos = [];
  for (const t of f) {
    // zorg dat elke driehoek naar buiten wijst (het prisma is convex)
    const [a, b, c] = t.map(i => v[i]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3 - 0.33, (a[2] + b[2] + c[2]) / 3];
    const tri = n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0 ? [a, c, b] : [a, b, c];
    for (const q of tri) pos.push(...q);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0),
  prisma: prismaGeo(),
};
const cylCache = new Map();
function cylGeo(rt, rb, seg) { const k = rt + ':' + rb + ':' + seg; if (!cylCache.has(k)) cylCache.set(k, new THREE.CylinderGeometry(rt, rb, 1, seg, 1).translate(0, .5, 0)); return cylCache.get(k); }
const sphCache = new Map();
function sphGeo(seg, half) { const k = seg + ':' + half; if (!sphCache.has(k)) sphCache.set(k, new THREE.SphereGeometry(1, seg, Math.max(3, Math.round(seg / 2)), 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI)); return sphCache.get(k); }
const icoCache = new Map();
function icoGeo(d) { if (!icoCache.has(d)) icoCache.set(d, new THREE.IcosahedronGeometry(1, d)); return icoCache.get(d); }

/** Verzamelt onderdelen en voegt ze samen tot een geometrie met vertexkleuren. */
export class Bouwer {
  constructor(seed = 'x') { this.delen = []; this.ramen = []; this.r = rng(seed); this.ao = true; }
  _add(lijst, geo, p, rot, s, kleur) {
    tmpE.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(tmpP.set(p[0], p[1], p[2]), tmpQ, tmpS.set(s[0], s[1], s[2]));
    lijst.push({ geo, m: tmpM.clone(), kleur });
    return this;
  }
  /** blok met onderkant op y */
  box(w, h, d, x, y, z, kleur, ry = 0) { return this._add(this.delen, GEO.box, [x, y, z], [0, ry, 0], [w, h, d], kleur); }
  /** zadeldak: nok langs x (of langs z met ry = PI/2) */
  dak(w, h, d, x, y, z, kleur, ry = 0) { return this._add(this.delen, GEO.prisma, [x, y, z], [0, ry, 0], [w, h, d], kleur); }
  cil(rt, rb, h, x, y, z, kleur, seg = 10, rot = [0, 0, 0]) { return this._add(this.delen, cylGeo(rt, rb, seg), [x, y, z], rot, [1, h, 1], kleur); }
  kegel(r, h, x, y, z, kleur, seg = 10) { return this._add(this.delen, cylGeo(0.001, r, seg), [x, y, z], [0, 0, 0], [1, h, 1], kleur); }
  koepel(r, x, y, z, kleur, seg = 12, sy = 1) { return this._add(this.delen, sphGeo(seg, true), [x, y, z], [0, 0, 0], [r, r * sy, r], kleur); }
  bol(r, x, y, z, kleur, seg = 10) { return this._add(this.delen, sphGeo(seg, false), [x, y, z], [0, 0, 0], [r, r, r], kleur); }
  ico(r, x, y, z, kleur, d = 0, sy = 1) { return this._add(this.delen, icoGeo(d), [x, y, z], [0, this.r() * 6, 0], [r, r * sy, r], kleur); }
  /** een raam (dun blokje) op een gevel; kleur = nachtkleur */
  raam(w, h, d, x, y, z, ry = 0, aanKans = 0.62) {
    const lit = this.r() < aanKans;
    const k = lit ? (this.r() < 0.7 ? '#ffd27a' : '#fff1c4') : '#2c3550';
    return this._add(this.ramen, GEO.box, [x, y, z], [0, ry, 0], [w, h, d], k);
  }
  /** rijen ramen rond een blok (midden x,z; breedte w, diepte d) */
  ramenRond(w, d, x, z, y0, verd, verdH, perZijde = 3, rw = 0.22, rh = 0.3, zijden = [0, 1, 2, 3], kans) {
    const uit = 0.035;
    for (let f = 0; f < verd; f++) {
      const y = y0 + f * verdH + verdH * 0.3;
      for (const zz of zijden) {
        const lang = zz % 2 === 0 ? w : d;
        const n = Math.max(1, Math.round(perZijde * (lang / Math.max(w, d))));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n - 0.5;
          if (zz === 0) this.raam(rw, rh, uit, x + t * w * 0.86, y, z + d / 2, 0, kans);
          if (zz === 2) this.raam(rw, rh, uit, x + t * w * 0.86, y, z - d / 2, 0, kans);
          if (zz === 1) this.raam(uit, rh, rw, x + w / 2, y, z + t * d * 0.86, 0, kans);
          if (zz === 3) this.raam(uit, rh, rw, x - w / 2, y, z + t * d * 0.86, 0, kans);
        }
      }
    }
    return this;
  }
  /** glazen band (doorlopend raam) rond een blok */
  glasband(w, d, x, z, y, h, kans = 0.6) {
    const uit = 0.03;
    this.raam(w * 0.92, h, uit, x, y, z + d / 2, 0, kans); this.raam(w * 0.92, h, uit, x, y, z - d / 2, 0, kans);
    this.raam(uit, h, d * 0.92, x + w / 2, y, z, 0, kans); this.raam(uit, h, d * 0.92, x - w / 2, y, z, 0, kans);
    return this;
  }
  /** kleine boom */
  boom(x, z, s = 1, y = 0) { this.cil(0.05 * s, 0.07 * s, 0.35 * s, x, y, z, C.stam, 5); this.ico(0.3 * s, x, y + 0.5 * s, z, this.r() < 0.5 ? C.blad : C.blad2, 0, 1.1); return this; }
  struik(x, z, s = 1, k = C.haag) { return this.ico(0.18 * s, x, 0.12 * s, z, k, 0, 0.75); }
  bloemen(x, z, w, d, k) { this.box(w, 0.12, d, x, 0.04, z, C.haag); for (let i = 0; i < 4; i++) this.box(0.08, 0.06, 0.08, x + (this.r() - .5) * w * 0.8, 0.16, z + (this.r() - .5) * d * 0.8, k || (this.r() < .5 ? '#ff8fb1' : '#ffe066')); return this; }
  /** stoep/kavel onder een gebouw */
  kavel(w, d, k = C.pad) { return this.box(w, 0.06, d, 0, 0, 0, k); }

  _merge(lijst) {
    if (!lijst.length) return null;
    let n = 0;
    const geos = lijst.map(d => { const g = d.geo.index ? d.geo.toNonIndexed() : d.geo.clone(); g.applyMatrix4(d.m); n += g.attributes.position.count; return { g, kleur: d.kleur }; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), kl = new Float32Array(n * 3);
    let o = 0;
    let ymax = 0;
    for (const { g } of geos) { const p = g.attributes.position.array; for (let i = 1; i < p.length; i += 3) ymax = Math.max(ymax, p[i]); }
    for (const { g, kleur } of geos) {
      const p = g.attributes.position.array, nn = g.attributes.normal.array;
      col.set(kleur).convertSRGBToLinear();
      pos.set(p, o * 3); nor.set(nn, o * 3);
      for (let i = 0; i < p.length / 3; i++) {
        // zachte "ambient occlusion": onderaan iets donkerder
        const y = p[i * 3 + 1];
        const ao = this.ao ? 0.72 + 0.28 * Math.min(1, Math.max(0, y / 0.9)) : 1;
        kl[(o + i) * 3] = col.r * ao; kl[(o + i) * 3 + 1] = col.g * ao; kl[(o + i) * 3 + 2] = col.b * ao;
      }
      o += p.length / 3;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(kl, 3));
    out.computeBoundingSphere(); out.computeBoundingBox();
    out.userData.hoogte = ymax;
    return out;
  }
  bouw() { const r = { body: this._merge(this.delen) }; const ao = this.ao; this.ao = false; r.ramen = this._merge(this.ramen); this.ao = ao; return r; }
}

// ---------- gebouwen per wijk ----------
/** Ontwerp voor een doelgebouw. Kavel ~2.3 x 2.3. Voorkant = +z. */
export function doelGebouw(macht, niveau, variant = 0) {
  const A = KLEUR[macht] || '#888888', Ad = tint(A, 0.78), Al = tint(A, 1.35);
  const b = new Bouwer(macht + niveau + ':' + variant);
  b.kavel(2.3, 2.3);
  const F = ONTWERPEN[macht] || ONTWERPEN.Taal;
  F[Math.min(3, Math.max(0, niveau))](b, A, Ad, Al, variant);
  return b.bouw();
}

const ONTWERPEN = {
  Taal: [
    (b, A, Ad) => { // boekwinkel
      b.box(1.5, 1.0, 1.2, 0, 0.06, -0.15, C.creme).dak(1.66, 0.6, 1.36, 0, 1.06, -0.15, A)
        .box(1.5, 0.06, 0.4, 0, 0.72, 0.62, Ad).box(0.3, 0.55, 0.04, 0, 0.06, 0.46, C.hout)
        .ramenRond(1.5, 1.2, 0, -0.15, 0.06, 1, 0.9, 3).bloemen(-0.75, 0.85, 0.5, 0.3).boom(0.8, 0.8, 0.9);
    },
    (b, A, Ad) => { // herenhuis met dakkapel
      b.box(1.9, 1.7, 1.5, 0, 0.06, -0.1, C.zand).box(1.94, 0.1, 1.54, 0, 0.9, -0.1, C.wit)
        .dak(2.02, 0.8, 1.66, 0, 1.76, -0.1, A).box(0.5, 0.4, 0.5, 0.4, 1.95, 0.25, C.wit).dak(0.6, 0.3, 0.6, 0.4, 2.35, 0.25, Ad, Math.PI / 2)
        .box(1.9, 0.08, 0.35, 0, 0.75, 0.82, Ad).ramenRond(1.9, 1.5, 0, -0.1, 0.06, 2, 0.8, 4).boom(-0.85, 0.9, 0.8);
    },
    (b, A, Ad) => { // bibliotheek met zuilen
      b.box(2.1, 0.2, 1.9, 0, 0.06, 0, C.wit).box(1.9, 1.8, 1.4, 0, 0.26, -0.15, C.creme)
        .box(2.0, 0.18, 1.5, 0, 2.06, -0.15, C.wit).dak(2.0, 0.55, 1.5, 0, 2.24, -0.15, A);
      for (let i = 0; i < 5; i++) b.cil(0.07, 0.08, 1.6, -0.8 + i * 0.4, 0.26, 0.72, C.wit, 8);
      b.box(1.9, 0.14, 0.4, 0, 1.86, 0.72, C.wit).dak(1.9, 0.4, 0.4, 0, 2.0, 0.72, Ad).ramenRond(1.9, 1.4, 0, -0.15, 0.26, 2, 0.85, 4, 0.2, 0.42, [1, 2, 3]);
    },
    (b, A, Ad, Al) => { // grote bibliotheek met koepel
      b.box(2.25, 0.25, 2.2, 0, 0.06, 0, C.wit).box(2.1, 1.5, 1.9, 0, 0.31, 0, C.zand).box(2.16, 0.14, 1.96, 0, 1.81, 0, C.wit)
        .box(1.5, 1.1, 1.4, 0, 1.95, 0, C.creme).cil(0.62, 0.62, 0.5, 0, 3.05, 0, C.wit, 16).koepel(0.66, 0, 3.55, 0, A, 16, 1.1)
        .cil(0.12, 0.12, 0.35, 0, 4.2, 0, Al, 8).kegel(0.16, 0.3, 0, 4.55, 0, A, 8)
        .ramenRond(2.1, 1.9, 0, 0, 0.31, 2, 0.7, 5).ramenRond(1.5, 1.4, 0, 0, 1.95, 1, 1.0, 4, 0.22, 0.5);
      for (let i = 0; i < 4; i++) b.cil(0.06, 0.07, 1.4, -0.45 + i * 0.3, 0.31, 1.05, C.wit, 8);
    },
  ],
  Getal: [
    (b, A) => { // modern kiosk-kantoortje
      b.box(1.6, 1.1, 1.3, 0, 0.06, 0, C.grijs).box(1.7, 0.12, 1.4, 0, 1.16, 0, A).glasband(1.6, 1.3, 0, 0, 0.35, 0.5)
        .box(0.5, 0.25, 0.5, 0.35, 1.28, -0.2, C.beton).boom(-0.85, 0.85, 0.8).struik(0.85, 0.9);
    },
    (b, A, Ad) => { // kantoor met rode band
      b.box(1.8, 2.7, 1.6, 0, 0.06, 0, C.wit).box(0.35, 2.75, 1.64, -0.55, 0.06, 0, A).box(1.84, 0.12, 1.64, 0, 2.76, 0, Ad)
        .ramenRond(1.8, 1.6, 0.15, 0, 0.1, 4, 0.66, 4, 0.2, 0.36).box(0.4, 0.3, 0.4, 0.4, 2.88, -0.3, C.beton);
    },
    (b, A, Ad) => { // toren
      b.box(1.9, 0.5, 1.9, 0, 0.06, 0, C.grijs).box(1.5, 4.4, 1.5, 0, 0.56, 0, C.wit)
        .box(1.56, 0.1, 1.56, 0, 2.6, 0, A).box(1.3, 0.6, 1.3, 0, 4.96, 0, A).box(1.0, 0.25, 1.0, 0, 5.56, 0, Ad)
        .ramenRond(1.5, 1.5, 0, 0, 0.6, 6, 0.7, 4, 0.18, 0.38).glasband(1.9, 1.9, 0, 0, 0.12, 0.3);
    },
    (b, A, Ad, Al) => { // wolkenkrabber
      b.box(2.2, 1.0, 2.2, 0, 0.06, 0, C.grijs).glasband(2.2, 2.2, 0, 0, 0.2, 0.6)
        .box(1.45, 6.8, 1.45, 0, 1.06, 0, C.wit).box(0.2, 6.9, 0.2, 0.73, 1.06, 0.73, A).box(0.2, 6.9, 0.2, -0.73, 1.06, 0.73, A)
        .box(0.2, 6.9, 0.2, 0.73, 1.06, -0.73, A).box(0.2, 6.9, 0.2, -0.73, 1.06, -0.73, A)
        .box(1.2, 0.8, 1.2, 0, 7.86, 0, Ad).box(0.8, 0.5, 0.8, 0, 8.66, 0, A).cil(0.04, 0.06, 1.5, 0, 9.16, 0, C.grijs, 6).bol(0.1, 0, 10.7, 0, Al, 6)
        .ramenRond(1.45, 1.45, 0, 0, 1.1, 10, 0.67, 3, 0.26, 0.4);
    },
  ],
  Wereld: [
    (b, A) => { // huisje met moestuin
      b.box(1.2, 0.9, 1.1, -0.3, 0.06, -0.3, C.creme).dak(1.32, 0.6, 1.24, -0.3, 0.96, -0.3, A, Math.PI / 2)
        .ramenRond(1.2, 1.1, -0.3, -0.3, 0.06, 1, 0.8, 2).bloemen(0.65, 0.55, 0.7, 0.8, '#ffe066').boom(0.75, -0.6, 1.0).boom(-0.8, 0.8, 0.8);
    },
    (b, A, Ad) => { // kaartenhuis met mansardedak
      b.box(1.8, 1.4, 1.5, 0, 0.06, -0.1, C.creme).cil(0.9, 1.25, 0.75, 0, 1.46, -0.1, A, 4, [0, Math.PI / 4, 0])
        .box(1.1, 0.12, 0.8, 0, 2.2, -0.1, Ad).ramenRond(1.8, 1.5, 0, -0.1, 0.06, 2, 0.65, 3).boom(0.85, 0.85, 0.8).struik(-0.8, 0.9);
    },
    (b, A, Ad) => { // museum met wereldbol
      b.box(2.1, 1.5, 1.7, 0, 0.06, -0.1, C.wit).box(2.16, 0.14, 1.76, 0, 1.56, -0.1, A)
        .cil(0.12, 0.16, 0.4, 0, 1.7, -0.1, C.goud, 8).bol(0.62, 0, 2.66, -0.1, C.water, 14).cil(0.66, 0.66, 0.08, 0, 2.62, -0.1, A, 16)
        .ico(0.28, 0.25, 2.85, 0.32, A, 0, 0.5).ico(0.22, -0.35, 2.55, 0.35, A, 0, 0.5)
        .ramenRond(2.1, 1.7, 0, -0.1, 0.06, 2, 0.7, 4).boom(0.95, 0.95, 0.7);
    },
    (b, A, Ad, Al) => { // sterrenwacht
      b.box(2.2, 1.0, 1.4, 0, 0.06, 0.35, C.wit).box(2.26, 0.1, 1.46, 0, 1.06, 0.35, A)
        .cil(0.8, 0.9, 3.2, 0, 0.06, -0.3, C.creme, 16).cil(0.92, 0.92, 0.18, 0, 3.26, -0.3, A, 16).koepel(0.85, 0, 3.44, -0.3, C.wit, 16, 1)
        .box(0.22, 0.9, 1.0, 0, 3.6, -0.3, Ad).cil(0.1, 0.12, 0.8, 0, 4.0, 0.15, C.donker, 8, [0.8, 0, 0])
        .ramenRond(2.2, 1.4, 0, 0.35, 0.06, 1, 0.9, 4).ramenRond(1.2, 1.2, 0, -0.3, 1.1, 3, 0.7, 2, 0.18, 0.32);
    },
  ],
  Hart: [
    (b, A, Ad) => { // pergola met bloemen
      b.kavel(2.2, 2.2, C.gras);
      for (const [x, z] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]]) b.cil(0.05, 0.05, 0.95, x, 0.06, z, C.wit, 6);
      for (let i = 0; i < 6; i++) b.box(1.5, 0.06, 0.1, 0, 1.0, -0.55 + i * 0.22, A);
      b.bloemen(-0.75, 0.85, 0.5, 0.35).bloemen(0.75, 0.85, 0.5, 0.35).bloemen(0, -0.9, 1.2, 0.3)
        .box(0.6, 0.15, 0.25, 0, 0.2, 0, C.hout).box(0.6, 0.25, 0.05, 0, 0.32, -0.1, C.hout).boom(0.85, -0.85, 0.9);
    },
    (b, A, Ad) => { // buurthuis
      b.box(1.8, 1.2, 1.4, 0, 0.06, -0.15, C.wit).dak(1.94, 0.75, 1.54, 0, 1.26, -0.15, A)
        .cil(0.22, 0.22, 0.04, 0, 1.6, 0.62, Ad, 12, [Math.PI / 2, 0, 0]).box(0.35, 0.65, 0.04, 0, 0.06, 0.56, Ad)
        .ramenRond(1.8, 1.4, 0, -0.15, 0.06, 1, 1.0, 4).bloemen(-0.6, 0.85, 0.7, 0.3).bloemen(0.6, 0.85, 0.7, 0.3);
    },
    (b, A, Ad) => { // theepaviljoen
      b.kavel(2.2, 2.2, C.gras).cil(1.0, 1.0, 0.15, 0, 0.06, 0, C.pad, 12).cil(0.8, 0.8, 1.3, 0, 0.21, 0, C.wit, 8)
        .kegel(1.15, 1.0, 0, 1.51, 0, A, 8).cil(0.06, 0.06, 0.35, 0, 2.5, 0, C.goud, 6).bol(0.1, 0, 2.9, 0, C.goud, 6)
        .ramenRond(1.3, 1.3, 0, 0, 0.21, 1, 1.1, 2, 0.3, 0.5).boom(-0.9, 0.9, 0.7).boom(0.9, -0.9, 0.7).bloemen(0.85, 0.85, 0.4, 0.4);
    },
    (b, A, Ad, Al) => { // grote serre met tuin
      b.kavel(2.3, 2.3, C.gras).cil(1.05, 1.1, 0.35, 0, 0.06, -0.1, A, 16).koepel(1.0, 0, 0.41, -0.1, '#bfeff0', 16, 1.4)
        .cil(0.06, 0.06, 0.4, 0, 1.8, -0.1, A, 6).bol(0.12, 0, 2.25, -0.1, Al, 8)
        .box(0.7, 0.8, 0.6, 0, 0.06, 0.85, C.wit).dak(0.8, 0.35, 0.7, 0, 0.86, 0.85, A, Math.PI / 2)
        .boom(-0.95, 0.95, 0.8).boom(0.95, 0.95, 0.8).bloemen(-0.95, -0.95, 0.4, 0.4).bloemen(0.95, -0.95, 0.4, 0.4)
        .glasband(0.7, 0.6, 0, 0.85, 0.3, 0.3);
    },
  ],
  Maker: [
    (b, A) => { // werkplaats met zaagtanddak
      b.box(1.8, 0.9, 1.4, 0, 0.06, -0.1, C.grijs);
      for (let i = 0; i < 3; i++) b.dak(0.6, 0.4, 1.4, -0.6 + i * 0.6, 0.96, -0.1, A, 0);
      b.box(0.6, 0.6, 0.05, 0.4, 0.06, 0.61, A).ramenRond(1.8, 1.4, 0, -0.1, 0.06, 1, 0.8, 3, 0.25, 0.3, [0, 1, 3]).struik(-0.8, 0.85).struik(-0.5, 0.9);
    },
    (b, A, Ad) => { // makerspace met zonnepanelen
      b.box(1.9, 1.6, 1.6, 0, 0.06, 0, C.wit).box(1.94, 0.1, 1.64, 0, 1.66, 0, A).box(1.9, 0.5, 0.06, 0, 0.06, 0.79, A);
      for (let i = 0; i < 3; i++) b.box(0.5, 0.04, 1.2, -0.6 + i * 0.6, 1.86, 0, '#2c4a7a', 0);
      for (let i = 0; i < 3; i++) b.box(0.04, 0.12, 0.04, -0.6 + i * 0.6, 1.76, 0.3, C.grijs);
      b.ramenRond(1.9, 1.6, 0, 0, 0.6, 2, 0.5, 4, 0.24, 0.26);
    },
    (b, A, Ad) => { // atelier met schoorsteen
      b.box(2.0, 1.4, 1.5, 0, 0.06, 0.1, C.grijs);
      for (let i = 0; i < 4; i++) b.dak(0.5, 0.45, 1.5, -0.75 + i * 0.5, 1.46, 0.1, A);
      b.cil(0.22, 0.28, 3.0, 0.7, 0.06, -0.75, C.wit, 10).cil(0.29, 0.29, 0.25, 0.7, 2.0, -0.75, A, 10).cil(0.29, 0.29, 0.25, 0.7, 2.7, -0.75, A, 10)
        .ramenRond(2.0, 1.5, 0, 0.1, 0.1, 2, 0.6, 4, 0.26, 0.32, [0, 1, 3]);
    },
    (b, A, Ad, Al) => { // innovatiecampus met windmolen
      b.box(1.1, 2.6, 1.6, -0.55, 0.06, 0.2, C.wit).box(1.0, 1.8, 1.4, 0.6, 0.06, 0.3, C.grijs).box(0.6, 0.3, 0.5, 0.05, 1.4, 0.3, A)
        .box(1.14, 0.12, 1.64, -0.55, 2.66, 0.2, A).box(1.04, 0.12, 1.44, 0.6, 1.86, 0.3, A)
        .cil(0.06, 0.1, 3.6, 0.65, 1.96, -0.2, C.wit, 8).box(0.18, 0.18, 0.3, 0.65, 5.5, -0.15, C.wit)
        .box(0.07, 1.6, 0.03, 0.65, 5.6, 0.02, C.wit).box(0.07, 1.6, 0.03, 0.65, 4.15, 0.02, C.wit)
        .ramenRond(1.1, 1.6, -0.55, 0.2, 0.1, 3, 0.8, 3, 0.24, 0.4).ramenRond(1.0, 1.4, 0.6, 0.3, 0.1, 2, 0.8, 3, 0.24, 0.4);
    },
  ],
  Brein: [
    (b, A) => { // klein sterrenhuisje
      b.cil(0.65, 0.7, 1.0, 0, 0.06, 0, C.creme, 10).kegel(0.85, 0.8, 0, 1.06, 0, A, 10).ramenRond(1.2, 1.2, 0, 0, 0.06, 1, 0.9, 2)
        .boom(0.85, 0.85, 0.8).bloemen(-0.8, 0.8, 0.4, 0.4);
    },
    (b, A, Ad) => { // achthoekige toren
      b.cil(0.75, 0.8, 2.6, 0, 0.06, 0, C.wit, 8).cil(0.9, 0.9, 0.12, 0, 2.66, 0, Ad, 8).kegel(0.95, 1.0, 0, 2.78, 0, A, 8)
        .ramenRond(1.3, 1.3, 0, 0, 0.1, 3, 0.8, 2, 0.2, 0.36).struik(0.9, 0.9).struik(-0.9, 0.8);
    },
    (b, A, Ad) => { // uitkijktoren
      b.box(1.2, 0.8, 1.2, 0, 0.06, 0, C.creme).box(0.8, 4.0, 0.8, 0, 0.86, 0, C.wit)
        .box(1.3, 0.12, 1.3, 0, 4.86, 0, Ad).box(1.1, 0.7, 1.1, 0, 4.98, 0, C.glas).box(1.25, 0.1, 1.25, 0, 5.68, 0, Ad)
        .cil(0.001, 0.9, 1.0, 0, 5.78, 0, A, 4, [0, Math.PI / 4, 0]).ramenRond(0.8, 0.8, 0, 0, 1.0, 5, 0.75, 1, 0.2, 0.3)
        .glasband(1.1, 1.1, 0, 0, 5.05, 0.45, 0.9);
    },
    (b, A, Ad, Al) => { // hoge spits met uitkijkdek
      b.cil(1.0, 1.1, 0.7, 0, 0.06, 0, C.wit, 12).cil(0.45, 0.6, 6.0, 0, 0.76, 0, C.creme, 8)
        .cil(1.0, 0.7, 0.4, 0, 6.76, 0, Ad, 12).cil(0.95, 0.95, 0.6, 0, 7.16, 0, C.glas, 12).cil(1.05, 1.05, 0.12, 0, 7.76, 0, Ad, 12)
        .kegel(0.7, 2.2, 0, 7.88, 0, A, 8).bol(0.12, 0, 10.15, 0, Al, 6)
        .ramenRond(0.9, 0.9, 0, 0, 1.0, 7, 0.8, 1, 0.16, 0.34).glasband(1.9, 1.9, 0, 0, 7.2, 0.5, 0.95);
    },
  ],
};

// ---------- hoofdkwartieren van de gidsen (3.0 breed x 4.4 diep) ----------
export function hqGebouw(gids, macht) {
  const A = KLEUR[macht], Ad = tint(A, 0.75), Al = tint(A, 1.4);
  const b = new Bouwer('hq-' + gids);
  b.box(3.4, 0.08, 4.8, 0, 0, 0, C.pad);
  const bord = (y) => { b.cil(0.05, 0.05, y, 1.25, 0.08, 1.9, C.donker, 6).cil(0.42, 0.42, 0.08, 1.25, y, 1.9, A, 16, [Math.PI / 2, 0, 0]).cil(0.3, 0.3, 0.1, 1.25, y, 1.9, C.wit, 16, [Math.PI / 2, 0, 0]); };
  if (gids === 'atlas') {
    b.box(2.8, 1.6, 2.6, 0, 0.08, -0.6, C.creme).box(2.9, 0.14, 2.7, 0, 1.68, -0.6, A).box(2.0, 0.9, 1.8, 0, 1.82, -0.6, C.wit)
      .cil(0.15, 0.2, 0.4, 0, 2.72, -0.6, C.goud, 8).bol(0.85, 0, 3.95, -0.6, C.water, 16).cil(0.9, 0.9, 0.1, 0, 3.9, -0.6, A, 20)
      .ico(0.4, 0.35, 4.3, -0.1, A, 0, 0.55).ico(0.35, -0.5, 3.75, -0.05, A, 0, 0.55).ico(0.3, 0.2, 3.6, -1.35, A, 0, 0.55)
      .ramenRond(2.8, 2.6, 0, -0.6, 0.08, 2, 0.75, 5).box(0.6, 0.9, 0.05, 0, 0.08, 0.71, Ad).boom(-1.2, 1.4).boom(-1.25, 0.5, 0.8);
    bord(1.6);
  } else if (gids === 'woordje') {
    b.box(3.0, 1.5, 2.4, 0, 0.08, -0.7, C.zand).dak(3.15, 1.0, 2.6, 0, 1.58, -0.7, A).box(3.0, 0.08, 0.9, 0, 1.3, 0.95, Ad)
      .cil(0.05, 0.05, 1.22, -1.4, 0.08, 1.35, C.wit, 6).cil(0.05, 0.05, 1.22, 1.4, 0.08, 1.35, C.wit, 6)
      .box(0.7, 1.4, 0.7, -1.0, 1.58, -0.7, C.wit).dak(0.8, 0.5, 0.8, -1.0, 2.98, -0.7, Ad, Math.PI / 2)
      .cil(0.25, 0.25, 0.05, -1.0, 2.5, -0.33, C.wit, 16, [Math.PI / 2, 0, 0]).box(0.04, 0.18, 0.02, -1.0, 2.45, -0.3, C.zwart)
      .ramenRond(3.0, 2.4, 0, -0.7, 0.08, 1, 1.1, 6, 0.3, 0.6);
    for (let i = 0; i < 3; i++) b.box(0.6, 0.12, 0.25, -0.9 + i * 0.9, 0.3, 1.5, C.hout);
    // tekstballon-bord
    b.box(1.2, 0.7, 0.08, 0.6, 2.75, 0.2, C.wit).box(0.25, 0.25, 0.08, 0.3, 2.5, 0.2, C.wit);
    b.box(0.8, 0.07, 0.09, 0.6, 3.15, 0.2, A).box(0.6, 0.07, 0.09, 0.5, 2.95, 0.2, A);
  } else if (gids === 'tella') {
    b.cil(1.25, 1.3, 1.3, 0, 0.08, -0.4, C.wit, 12).cil(1.45, 1.45, 0.12, 0, 1.38, -0.4, Ad, 12).kegel(1.5, 1.2, 0, 1.5, -0.4, A, 12)
      .cil(0.06, 0.06, 0.5, 0, 2.7, -0.4, C.goud, 6).bol(0.14, 0, 3.25, -0.4, Al, 8)
      .ramenRond(2.2, 2.2, 0, -0.4, 0.08, 1, 1.1, 6, 0.32, 0.5)
      .box(2.4, 0.9, 0.12, 0, 0.6, 1.5, C.donker).box(2.2, 0.7, 0.04, 0, 0.7, 1.57, '#1d2b3a');
    b.raam(0.25, 0.4, 0.04, -0.75, 0.85, 1.6, 0, 1).raam(0.25, 0.4, 0.04, -0.4, 0.85, 1.6, 0, 1).raam(0.25, 0.4, 0.04, 0.4, 0.85, 1.6, 0, 1).raam(0.25, 0.4, 0.04, 0.75, 0.85, 1.6, 0, 1);
    b.cil(0.05, 0.05, 0.6, -1.1, 0.08, 1.5, C.donker, 6).cil(0.05, 0.05, 0.6, 1.1, 0.08, 1.5, C.donker, 6);
  } else if (gids === 'kroniek') {
    b.box(2.6, 1.2, 2.0, 0, 0.08, -0.2, C.baksteen).box(2.66, 0.1, 2.06, 0, 1.28, -0.2, C.wit)
      .box(1.4, 2.2, 1.4, -0.5, 1.38, -0.5, C.creme).box(1.6, 0.9, 1.6, -0.5, 3.58, -0.5, C.glas)
      .cil(0.001, 1.25, 1.1, -0.5, 4.48, -0.5, A, 4, [0, Math.PI / 4, 0]).bol(0.15, -0.5, 5.65, -0.5, Al, 8)
      .ramenRond(2.6, 2.0, 0, -0.2, 0.08, 1, 1.0, 5).ramenRond(1.4, 1.4, -0.5, -0.5, 1.4, 2, 1.0, 2).glasband(1.6, 1.6, -0.5, -0.5, 3.65, 0.7, 0.9)
      .cil(0.05, 0.05, 2.2, 1.2, 0.08, 1.3, C.donker, 6).box(0.5, 0.15, 0.08, 1.2, 1.9, 1.3, A).box(0.5, 0.15, 0.08, 1.2, 1.5, 1.3, C.wit);
  } else if (gids === 'bram') {
    b.cil(2.1, 2.1, 0.06, 0, 0.04, -0.2, C.gras, 20).cil(0.5, 0.55, 0.22, 0, 0.08, -0.2, '#8a8f99', 10);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; if (Math.sin(a) > 0.75) continue; b.box(0.75, 0.22, 0.3, Math.cos(a) * 1.35, 0.08, -0.2 + Math.sin(a) * 1.35, C.hout, -a + Math.PI / 2); }
    b.cil(0.06, 0.06, 1.5, -1.3, 0.08, -1.6, C.wit, 6).cil(0.06, 0.06, 1.5, 1.3, 0.08, -1.6, C.wit, 6)
      .kegel(1.8, 0.9, 0, 1.55, -1.6, A, 6).boom(1.4, 1.5, 1.4).boom(-1.4, 1.4, 1.1).bloemen(0.2, 1.8, 1.0, 0.3);
  } else if (gids === 'byte') {
    b.box(2.9, 1.5, 2.4, 0, 0.08, -0.7, C.grijs);
    for (let i = 0; i < 4; i++) b.dak(0.725, 0.5, 2.4, -1.09 + i * 0.725, 1.58, -0.7, A);
    b.box(1.1, 1.0, 0.06, -0.6, 0.08, 0.53, A).cil(0.5, 0.5, 0.14, 0.75, 2.3, 0.3, C.wit, 10, [Math.PI / 2, 0, 0]).cil(0.25, 0.25, 0.16, 0.75, 2.3, 0.3, A, 10, [Math.PI / 2, 0, 0])
      .cil(0.05, 0.05, 1.3, 0.75, 0.9, 0.3, C.donker, 6).ramenRond(2.9, 2.4, 0, -0.7, 0.08, 1, 1.0, 5, 0.3, 0.45, [1, 2, 3])
      .box(0.3, 0.3, 0.3, 1.1, 0.08, 1.2, A).box(0.3, 0.3, 0.3, 1.1, 0.38, 1.2, Al).box(0.3, 0.3, 0.3, 0.75, 0.08, 1.3, C.wit);
  }
  return b.bouw();
}

/** Kampvuur: losse vlammen (geanimeerd) */
export function vlamGeo() { const b = new Bouwer('vlam'); b.ao = false; b.kegel(0.32, 0.8, 0, 0, 0, '#ff9a3c', 6).kegel(0.18, 0.55, 0.05, 0, 0.05, '#ffe066', 6); return b.bouw().body; }

// ---------- huis van een leerling ----------
export function huisGebouw(dakKleur, deco = [], seed = 'h') {
  const b = new Bouwer(seed);
  const has = (id) => deco.includes(id);
  let dak = dakKleur;
  if (has('kleur-goud')) dak = '#f2c230';
  if (has('kleur-nacht')) dak = '#2b3a78';
  if (has('cape')) dak = '#2b3a78';
  b.box(1.95, 0.05, 1.95, 0, 0, 0, C.gras);
  const padK = has('spoor-licht') ? '#fff3b0' : has('spoor-sterren') ? '#e8dcff' : has('spoor-blaadjes') ? '#b9e39a' : has('spoor-noten') ? '#bfe3ff' : has('spoor-letters') ? '#ffe2b8' : C.pad;
  b.box(0.36, 0.06, 0.65, 0, 0.01, 0.65, padK);
  b.box(1.25, 0.85, 1.0, 0, 0.05, -0.2, C.creme).dak(1.38, 0.62, 1.14, 0, 0.9, -0.2, dak);
  b.box(0.26, 0.48, 0.04, 0, 0.05, 0.31, has('sjaal-rood') ? '#d23f3f' : has('sjaal-blauw') ? '#3a6fd6' : C.hout);
  b.raam(0.22, 0.22, 0.04, -0.38, 0.45, 0.31, 0, 0.8).raam(0.22, 0.22, 0.04, 0.38, 0.45, 0.31, 0, 0.8).raam(0.04, 0.22, 0.22, 0.63, 0.45, -0.2, 0, 0.6).raam(0.04, 0.22, 0.22, -0.63, 0.45, -0.2, 0, 0.6);
  if (has('cape')) for (let i = 0; i < 4; i++) b.raam(0.07, 0.07, 0.07, -0.45 + i * 0.3, 1.25, -0.2 + (i % 2 ? 0.25 : -0.25), 0, 1);
  if (has('pet-oranje')) b.box(0.9, 0.05, 0.3, 0, 0.62, 0.45, '#e2783e');
  if (has('muts')) b.box(0.18, 0.5, 0.18, 0.35, 1.0, -0.4, '#d23f3f').box(0.22, 0.06, 0.22, 0.35, 1.5, -0.4, C.wit);
  else b.box(0.15, 0.4, 0.15, 0.35, 1.0, -0.4, C.baksteen);
  if (has('bladerkrans')) b.bloemen(-0.6, 0.65, 0.55, 0.4).bloemen(0.6, 0.65, 0.55, 0.4);
  else b.struik(-0.65, 0.65).struik(0.65, 0.7, 0.8);
  if (has('veer')) b.cil(0.03, 0.03, 0.7, 0.75, 0.05, 0.15, C.hout, 5).box(0.2, 0.18, 0.18, 0.75, 0.75, 0.15, '#3fb34f').dak(0.26, 0.12, 0.24, 0.75, 0.93, 0.15, '#e04a3a');
  if (has('koptelefoon')) for (let i = 0; i < 2; i++) b.box(0.42, 0.03, 0.36, -0.25 + i * 0.48, 1.18, 0.05, '#2c4a7a');
  if (has('bril')) b.cil(0.05, 0.07, 0.35, -0.35, 1.18, -0.35, C.donker, 6, [0.6, 0, 0.3]);
  if (has('rugzak')) for (let i = 0; i < 3; i++) b.box(0.03, 0.2, 0.3, -0.75 + i * 0.12, 0.05, -0.75, '#4c8fd6');
  if (has('lantaarn')) b.cil(0.025, 0.03, 0.6, 0.3, 0.05, 0.8, C.donker, 5).raam(0.12, 0.14, 0.12, 0.3, 0.65, 0.8, 0, 1);
  if (has('spoor-licht') || has('spoor-sterren')) for (let i = 0; i < 3; i++) b.raam(0.06, 0.06, 0.06, (i % 2 ? 0.25 : -0.25), 0.05, 0.45 + i * 0.18, 0, 1);
  if (has('feesthoed')) { const kl = ['#e9a23b', '#e2643e', '#3fa37a', '#4c8fd6', '#9a6ad6', '#d9577b']; for (let i = 0; i < 6; i++) b.box(0.1, 0.1, 0.02, -0.55 + i * 0.22, 0.78 + (i % 2) * 0.04, 0.37, kl[i]); }
  return b.bouw();
}

// ---------- vaste gebouwen op het plein ----------
export function stationGebouw() {
  const b = new Bouwer('station');
  // hoofdgebouw (noordkant van het spoor), voorkant naar het spoor (+z)
  b.box(11.6, 0.12, 3.6, 0, 0, -1.9, C.pad);
  b.box(9.0, 2.0, 2.4, 0, 0.12, -2.2, C.baksteen).box(9.1, 0.16, 2.5, 0, 2.12, -2.2, C.wit).dak(9.2, 0.9, 2.6, 0, 2.28, -2.2, '#2f8f8a');
  b.box(2.6, 3.4, 2.7, 0, 0.12, -2.1, C.zand).box(2.7, 0.16, 2.8, 0, 3.52, -2.1, C.wit).dak(2.8, 1.0, 2.9, 0, 3.68, -2.1, '#2f8f8a', Math.PI / 2);
  b.box(1.1, 2.0, 1.1, 3.6, 2.28, -2.6, C.zand).cil(0.001, 0.85, 1.1, 3.6, 4.28, -2.6, '#2f8f8a', 4, [0, Math.PI / 4, 0]);
  b.cil(0.38, 0.38, 0.05, 3.6, 3.4, -2.03, C.wit, 16, [Math.PI / 2, 0, 0]);
  b.raam(0.36, 0.36, 0.02, 3.6, 3.22, -2.0, 0, 1);
  b.ramenRond(9.0, 2.4, 0, -2.2, 0.12, 2, 0.95, 10, 0.3, 0.55, [0, 2]).ramenRond(2.6, 2.7, 0, -2.1, 2.3, 1, 1.0, 3, 0.35, 0.6, [0, 2]);
  b.box(1.2, 1.5, 0.06, 0, 0.12, -0.74, '#1d2b3a');
  // perrons + overkapping
  b.box(13, 0.32, 0.9, 0, 0, -1.45, C.beton).box(13, 0.32, 0.9, 0, 0, 1.45, C.beton);
  b.box(13, 0.04, 0.14, 0, 0.32, -1.05, C.geel).box(13, 0.04, 0.14, 0, 0.32, 1.05, C.geel);
  for (let i = -3; i <= 3; i++) { b.cil(0.05, 0.05, 1.5, i * 1.9, 0.32, 1.55, C.wit, 6); }
  b.box(13.2, 0.1, 1.2, 0, 1.82, 1.55, '#2f8f8a').box(13.2, 0.18, 0.08, 0, 1.74, 2.12, C.wit);
  for (let i = 0; i < 4; i++) b.box(0.8, 0.12, 0.25, -5 + i * 3.3, 0.45, 1.75, C.hout);
  return b.bouw();
}
export function klasmeterGebouw() {
  const b = new Bouwer('klasmeter');
  b.cil(1.7, 1.8, 0.2, 0, 0, 0, C.wit, 20).cil(1.45, 1.45, 0.06, 0, 0.18, 0, C.water, 20)
    .cil(0.35, 0.45, 0.3, 0, 0.2, 0, C.wit, 10).cil(0.18, 0.28, 3.4, 0, 0.5, 0, C.creme, 8).kegel(0.3, 0.5, 0, 3.9, 0, C.goud, 8);
  return b.bouw();
}
export function kluisGebouw() {
  const b = new Bouwer('kluis');
  b.box(2.2, 0.1, 2.0, 0, 0, 0, C.pad).box(1.8, 0.2, 1.5, 0, 0.1, -0.1, C.wit).box(1.6, 1.3, 1.3, 0, 0.3, -0.1, C.grijs)
    .box(1.7, 0.14, 1.4, 0, 1.6, -0.1, C.wit).dak(1.7, 0.45, 1.4, 0, 1.74, -0.1, '#8d6ad6');
  for (let i = 0; i < 4; i++) b.cil(0.06, 0.07, 1.3, -0.6 + i * 0.4, 0.3, 0.62, C.wit, 8);
  b.cil(0.32, 0.32, 0.08, 0, 0.85, 0.57, C.goud, 16, [Math.PI / 2, 0, 0]).cil(0.12, 0.12, 0.1, 0, 0.85, 0.6, '#b8860b', 8, [Math.PI / 2, 0, 0]);
  return b.bouw();
}
export function missiebordGebouw() {
  const b = new Bouwer('bord');
  b.box(2.4, 0.08, 1.2, 0, 0, 0, C.pad).cil(0.06, 0.06, 1.9, -0.95, 0.08, 0, C.donker, 6).cil(0.06, 0.06, 1.9, 0.95, 0.08, 0, C.donker, 6)
    .box(2.2, 1.2, 0.1, 0, 0.75, 0, C.hout).box(2.0, 1.0, 0.04, 0, 0.85, 0.06, C.creme).dak(2.4, 0.3, 0.4, 0, 1.98, 0, '#e9a23b');
  const kl = Object.values(KLEUR);
  for (let i = 0; i < 6; i++) b.box(0.5, 0.36, 0.03, -0.66 + (i % 3) * 0.66, 0.95 + Math.floor(i / 3) * 0.45, 0.09, kl[i]);
  return b.bouw();
}
export function poortGebouw() {
  const b = new Bouwer('poort');
  b.box(6, 7, 3, 0, 0, 0, '#c9c2b8').box(6.4, 0.6, 3.4, 0, 7, 0, '#e9a23b').box(3.4, 4.6, 3.2, 0, 0, 0, '#202230');
  b.cil(1.7, 1.7, 3.2, 0, 4.6, 0, '#202230', 16, [Math.PI / 2, 0, 0]);
  b.cil(0.3, 0.3, 1.2, -2.5, 7.6, 0, C.goud, 8).cil(0.3, 0.3, 1.2, 2.5, 7.6, 0, C.goud, 8).bol(0.45, -2.5, 9.1, 0, '#ffe08a', 10).bol(0.45, 2.5, 9.1, 0, '#ffe08a', 10);
  return b.bouw();
}
export function tunnelGebouw() {
  const b = new Bouwer('tunnel');
  b.box(5.4, 5.2, 2.4, 0, 0, 0, '#b9b2a6').box(5.8, 0.4, 2.8, 0, 5.2, 0, '#8f877b').box(3.0, 3.6, 2.6, 0, 0, 0, '#1b1c26');
  b.cil(1.5, 1.5, 2.6, 0, 3.6, 0, '#1b1c26', 14, [Math.PI / 2, 0, 0]);
  return b.bouw();
}

// ---------- klein spul ----------
export function boomGeo(soort = 'loof') {
  const b = new Bouwer('boom-' + soort);
  b.ao = false;
  if (soort === 'den') b.cil(0.06, 0.08, 0.4, 0, 0, 0, C.stam, 5).kegel(0.55, 0.9, 0, 0.3, 0, C.dennen, 7).kegel(0.42, 0.8, 0, 0.8, 0, tint(C.dennen, 1.12), 7);
  else b.cil(0.06, 0.09, 0.55, 0, 0, 0, C.stam, 5).ico(0.5, 0, 0.85, 0, '#ffffff', 0, 1.05).ico(0.32, 0.18, 1.15, 0.1, '#ffffff', 0, 1);
  return b.bouw().body;
}
export function autoGeo() {
  const b = new Bouwer('auto'); b.ao = false;
  b.box(0.36, 0.16, 0.72, 0, 0.05, 0, '#ffffff').box(0.3, 0.14, 0.38, 0, 0.21, -0.04, '#aebfd2');
  b.box(0.06, 0.06, 0.02, -0.11, 0.12, 0.36, '#fff6c8').box(0.06, 0.06, 0.02, 0.11, 0.12, 0.36, '#fff6c8');
  const g = b.bouw().body;
  // ramen van de cabine donker: vertexkleuren op de cabine een beetje donker maken is genoeg
  return g;
}
export function treinGeo() {
  const b = new Bouwer('trein'); b.ao = false;
  const wagon = (x0, kop) => {
    b.box(3.0, 0.75, 0.86, x0, 0.18, 0, C.wit).box(3.0, 0.12, 0.88, x0, 0.32, 0, '#e9a23b').box(2.9, 0.08, 0.8, x0, 0.93, 0, C.grijs)
      .box(2.6, 0.22, 0.88, x0, 0.55, 0, '#28324a');
    if (kop) b.box(0.4, 0.55, 0.8, x0 + 1.6, 0.18, 0, C.wit).box(0.1, 0.3, 0.7, x0 + 1.8, 0.45, 0, '#28324a').box(0.12, 0.08, 0.6, x0 + 1.86, 0.3, 0, '#e2643e');
    for (const dx of [-1.0, 1.0]) b.box(0.6, 0.16, 0.7, x0 + dx, 0.02, 0, '#3a3f4b');
  };
  wagon(3.2, true); wagon(0, false); wagon(-3.2, false);
  b.box(0.4, 0.55, 0.8, -4.8, 0.18, 0, C.wit).box(0.1, 0.3, 0.7, -5.0, 0.45, 0, '#28324a');
  const r = b.bouw();
  return r;
}
export function steigerGeo() {
  const b = new Bouwer('steiger'); b.ao = false;
  const k = '#f2a33a';
  for (const [x, z] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) b.box(0.06, 1, 0.06, x, 0, z, k);
  for (let y = 0; y < 4; y++) { const yy = y * 0.25 + 0.2; b.box(1.96, 0.04, 0.06, 0, yy, 0.95, k).box(1.96, 0.04, 0.06, 0, yy, -0.95, k).box(0.06, 0.04, 1.96, 0.95, yy, 0, k).box(0.06, 0.04, 1.96, -0.95, yy, 0, k); }
  return b.bouw().body;
}
export function bouwplaatsGeo() {
  const b = new Bouwer('bouwplaats'); b.ao = false;
  b.box(2.2, 0.06, 2.2, 0, 0, 0, '#c8b89a').box(1.6, 0.2, 1.4, 0, 0.06, -0.1, C.beton);
  for (let i = 0; i < 8; i++) { const t = i / 8 * 4; const side = Math.floor(t), f = t - side; const p = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]; const x = (p[side][0] + (p[side + 1][0] - p[side][0]) * f) * 1.02, z = (p[side][1] + (p[side + 1][1] - p[side][1]) * f) * 1.02; b.box(0.06, 0.35, 0.06, x, 0.06, z, '#f28c28'); }
  b.box(2.06, 0.07, 0.04, 0, 0.3, 1.03, '#ffffff').box(2.06, 0.07, 0.04, 0, 0.3, -1.03, '#ffffff').box(0.04, 0.07, 2.06, 1.03, 0.3, 0, '#ffffff').box(0.04, 0.07, 2.06, -1.03, 0.3, 0, '#ffffff');
  b.box(0.4, 0.3, 0.3, 0.6, 0.06, 0.65, '#d6b26b').box(0.3, 0.3, 0.3, -0.6, 0.06, 0.7, '#9aa0aa');
  // kraanmast
  b.box(0.16, 3.0, 0.16, -0.75, 0.06, -0.75, '#f6c445');
  return b.bouw().body;
}
export function kraanArmGeo() {
  const b = new Bouwer('kraanarm'); b.ao = false;
  b.box(2.6, 0.12, 0.12, 0.7, 0, 0, '#f6c445').box(0.4, 0.3, 0.3, -0.5, -0.1, 0, '#9aa0aa').box(0.02, 0.8, 0.02, 1.6, -0.8, 0, '#4a5162').box(0.12, 0.12, 0.12, 1.6, -0.9, 0, '#4a5162');
  return b.bouw().body;
}
export function lampGeo() {
  const b = new Bouwer('lamp'); b.ao = false;
  b.cil(0.025, 0.035, 0.9, 0, 0, 0, '#4a5162', 5).box(0.22, 0.04, 0.06, 0.08, 0.9, 0, '#4a5162');
  return b.bouw().body;
}
export function mensGeo() {
  const b = new Bouwer('mens'); b.ao = false;
  b.cil(0.06, 0.07, 0.22, 0, 0, 0, '#ffffff', 6).bol(0.055, 0, 0.28, 0, '#fbe3cf', 6);
  return b.bouw().body;
}
export function wolkGeo(seed) {
  const b = new Bouwer('wolk' + seed); b.ao = false;
  const r = rng('w' + seed);
  for (let i = 0; i < 6; i++) b.ico(1.2 + r() * 1.2, (r() - 0.5) * 5, r() * 0.8, (r() - 0.5) * 2.4, '#ffffff', 1, 0.7);
  return b.bouw().body;
}
