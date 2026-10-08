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
const torCache = new Map();
function torGeo(r, t, seg, boog) { const k = r + ':' + t + ':' + seg + ':' + boog; if (!torCache.has(k)) torCache.set(k, new THREE.TorusGeometry(r, t, 6, seg, boog)); return torCache.get(k); }
const icoCache = new Map();
function icoGeo(d) { if (!icoCache.has(d)) icoCache.set(d, new THREE.IcosahedronGeometry(1, d)); return icoCache.get(d); }

/** Verzamelt onderdelen en voegt ze samen tot een geometrie met vertexkleuren. */
export class Bouwer {
  constructor(seed = 'x') { this.delen = []; this.ramen = []; this.r = rng(seed); this.ao = true; this.deel = null; }
  _add(lijst, geo, p, rot, s, kleur) {
    tmpE.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(tmpP.set(p[0], p[1], p[2]), tmpQ, tmpS.set(s[0], s[1], s[2]));
    lijst.push({ geo, m: tmpM.clone(), kleur, deel: this.deel });
    return this;
  }
  /** Onderdelen die hierna komen, bewegen apart (voor figuren): soort 1 = been, 2 = arm, 3 = hoofd; scharnier op hoogte py; kant -1/1. */
  zetDeel(soort = 0, py = 0, kant = 0) { this.deel = soort ? [soort, py, kant] : null; return this; }
  /** ellipsoïde (middelpunt x,y,z) */
  ellips(rx, ry, rz, x, y, z, kleur, seg = 12, rot = [0, 0, 0]) { return this._add(this.delen, sphGeo(seg, false), [x, y, z], rot, [rx, ry, rz], kleur); }
  /** torus (ring) rond de z-as; rot draait hem */
  torus(r, t, x, y, z, kleur, rot = [0, 0, 0], seg = 16, boog = Math.PI * 2) { return this._add(this.delen, torGeo(r, t, seg, boog), [x, y, z], rot, [1, 1, 1], kleur); }
  /** blok met onderkant op y */
  box(w, h, d, x, y, z, kleur, ry = 0) { return this._add(this.delen, GEO.box, [x, y, z], [0, ry, 0], [w, h, d], kleur); }
  /** blok met vrije draaiing rond zijn onderkant */
  blok(w, h, d, x, y, z, kleur, rot = [0, 0, 0]) { return this._add(this.delen, GEO.box, [x, y, z], rot, [w, h, d], kleur); }
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
  // ---------- middeleeuwse bouwdoos ----------
  /** Trapgevel boven een muur: de gevel staat dwars op z (op diepte z), breedte w, vanaf hoogte y0, totaal hoogte H. */
  trapgevel(w, y0, H, z, kleur, treden = 4, dikte = 0.2) {
    const stap = w / (treden * 2 + 1), sh = H / treden;
    for (let i = 0; i < treden; i++) this.box(w - i * 2 * stap, sh, dikte, 0, y0 + i * sh, z, i % 2 ? tint(kleur, 0.94) : kleur);
    this.box(stap * 1.1, sh * 0.7, dikte + 0.02, 0, y0 + H, z, tint(kleur, 1.08));
    return this;
  }
  /**
   * Een middeleeuws huis met de gevel naar +z: muur (w x h x d), een steil dak met de nok langs z, een trapgevel,
   * puntgevel of vakwerkgevel, ramen met luiken, een deur en een schoorsteen. x, z: midden van het huis.
   */
  middeleeuwsHuis({ x = 0, z = 0, w = 1.4, d = 1.4, h = 1.6, y = 0.06, muur = '#b4553c', dak = '#8a8494', gevel = 'trap', luik = '#3f6b4a', treden = 4, schouw = true, deur = true, verd = 0 } = {}) {
    const H = w * 0.78;
    this.box(w, h, d, x, y, z, muur);
    this.dak(w + 0.08, H, d + 0.1, x, y + h, z, dak, Math.PI / 2);
    const zf = z + d / 2;
    if (gevel === 'trap') {
      for (const zz of [zf - 0.08, z - d / 2 + 0.08]) this._gevelOp(x, () => this.trapgevel(w, y + h, H, zz, muur, treden));
    } else if (gevel === 'vakwerk') {
      // vakwerk: donkere balken op een lichte gevel, ook in de puntgevel
      const balk = '#3b2a20', t = 0.05;
      for (const bx of [-w / 2 + 0.03, 0, w / 2 - 0.03]) this.box(t, h, 0.03, x + bx, y, zf + 0.012, balk);
      for (const by of [0.02, h * 0.5, h - 0.05]) this.box(w, t, 0.03, x, y + by, zf + 0.012, balk);
      for (const [bx, k] of [[-w / 4, 1], [w / 4, -1]]) this.cil(0.022, 0.022, Math.hypot(w / 2, h * 0.5) * 0.98, x + bx - k * w / 4 * 0.96, y + 0.04, zf + 0.012, balk, 4, [0, 0, -k * Math.atan2(w / 2, h * 0.5)]);
      this.box(t, H * 0.85, 0.03, x, y + h, zf - 0.02, balk);
      this.box(w * 0.55, t, 0.03, x, y + h + H * 0.4, zf - 0.02, balk);
    }
    // ramen met luiken op de voorgevel (en de achtergevel)
    const verdH = Math.max(0.55, h / Math.max(1, Math.round(h / 0.62)));
    const n = Math.max(1, Math.round(h / verdH)), kol = w > 1.25 ? 2 : 1;
    for (let f = 0; f < n; f++) for (let c = 0; c < kol; c++) {
      const rx = x + (kol === 1 ? 0 : (c ? 1 : -1) * w * 0.24), ry = y + f * verdH + verdH * 0.35;
      if (f === 0 && deur && (kol === 1 || c === 0) && w < 1.3) continue;
      this.raam(0.16, 0.26, 0.03, rx, ry, zf + 0.01, 0, 0.6);
      if (luik) { this.box(0.07, 0.27, 0.025, rx - 0.12, ry, zf + 0.015, luik); this.box(0.07, 0.27, 0.025, rx + 0.12, ry, zf + 0.015, luik); }
      this.raam(0.16, 0.26, 0.03, rx, ry, z - d / 2 - 0.01, 0, 0.5);
    }
    // zijramen
    for (let f = 0; f < n; f++) for (const sx of [-1, 1]) this.raam(0.03, 0.24, 0.15, x + sx * (w / 2 + 0.01), y + f * verdH + verdH * 0.35, z, 0, 0.45);
    this.raam(0.13, 0.18, 0.03, x, y + h + H * 0.3, zf + 0.0, 0, 0.4);            // zolderraampje
    if (deur) this.box(0.26, 0.46, 0.04, x + (w < 1.3 ? 0 : w * 0.24), y, zf + 0.01, '#5a3a26').box(0.3, 0.05, 0.05, x + (w < 1.3 ? 0 : w * 0.24), y + 0.46, zf + 0.02, tint(muur, 0.8));
    if (schouw) this.box(0.16, H * 0.55 + 0.25, 0.16, x + w * 0.28, y + h + H * 0.35, z - d * 0.22, tint(muur, 0.85)).box(0.2, 0.05, 0.2, x + w * 0.28, y + h + H * 0.9 + 0.25, z - d * 0.22, '#5a4a40');
    void verd;
    return this;
  }
  _gevelOp(x, f) { if (!x) return f(); const n0 = this.delen.length; f(); for (let i = n0; i < this.delen.length; i++) this.delen[i].m.premultiply(new THREE.Matrix4().makeTranslation(x, 0, 0)); }
  /** Een vaandel aan de gevel (hangt naar beneden), in de kleur van de wijk. */
  vaandel(x, y, z, kleur, h = 0.5) { return this.box(0.03, 0.03, 0.22, x, y, z + 0.08, '#2d2a28').box(0.2, h, 0.025, x, y - h + 0.02, z + 0.19, kleur).box(0.2, 0.06, 0.03, x, y - h - 0.02, z + 0.19, tint(kleur, 0.7)); }
  /** stoep/kavel onder een gebouw */
  kavel(w, d, k = C.pad) { return this.box(w, 0.06, d, 0, 0, 0, k); }

  _merge(lijst) {
    if (!lijst.length) return null;
    let n = 0;
    const geos = lijst.map(d => { const g = d.geo.index ? d.geo.toNonIndexed() : d.geo.clone(); g.applyMatrix4(d.m); n += g.attributes.position.count; return { g, kleur: d.kleur, deel: d.deel }; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), kl = new Float32Array(n * 3);
    const metDelen = lijst.some(d => d.deel), dl = metDelen ? new Float32Array(n * 3) : null;
    let o = 0;
    let ymax = 0;
    for (const { g } of geos) { const p = g.attributes.position.array; for (let i = 1; i < p.length; i += 3) ymax = Math.max(ymax, p[i]); }
    for (const { g, kleur, deel } of geos) {
      const p = g.attributes.position.array, nn = g.attributes.normal.array;
      col.set(kleur).convertSRGBToLinear();
      pos.set(p, o * 3); nor.set(nn, o * 3);
      if (dl) { const dd = deel || [0, 0, 0]; for (let i = 0; i < p.length / 3; i++) dl.set(dd, (o + i) * 3); }
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
    if (dl) out.setAttribute('aDeel', new THREE.BufferAttribute(dl, 3));
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
  const F = macht === 'Hart' ? ONTWERPEN.Hart : ONTWERPEN.Middeleeuws;
  F[Math.min(3, Math.max(0, niveau))](b, A, Ad, Al, variant);
  return b.bouw();
}

// De doelgebouwen in Zwinvliet: middeleeuwse huizen, gildehuizen en hallen. De kleur van de wijk zit in de
// luiken, de vaandels en de luifel, zodat je de wijken nog altijd herkent.
const MUREN = ['#b4553c', '#a84e36', '#c06848', '#9c4a36'], PLEISTER = ['#efe4cc', '#e8dcc0', '#f2e8d4'];
const DAKEN = ['#8a8494', '#8a5444', '#a2503a', '#7d7788'];
const MIDDELEEUWS = [
  (b, A, Ad, Al, v) => { // vakwerkhuisje met een kraam van de wijk
    b.middeleeuwsHuis({ z: -0.3, w: 1.3, d: 1.3, h: 0.95, muur: PLEISTER[v % 3], dak: DAKEN[1], gevel: 'vakwerk', luik: Ad });
    b.box(1.0, 0.04, 0.5, 0.1, 0.5, 0.65, '#8a6440').box(0.04, 0.5, 0.04, -0.36, 0.06, 0.88, '#5a3e2a').box(0.04, 0.5, 0.04, 0.56, 0.06, 0.88, '#5a3e2a');
    b.dak(1.1, 0.16, 0.56, 0.1, 0.56, 0.62, A).box(0.9, 0.1, 0.4, 0.1, 0.4, 0.66, '#9c7a52');
    for (let i = 0; i < 3; i++) b.bol(0.08, -0.15 + i * 0.25, 0.53, 0.66, ['#e2643e', '#f2c94c', '#6fae4a'][i], 6);
    b.boom(-0.85, 0.85, 0.75).struik(0.95, -0.9);
  },
  (b, A, Ad) => { // smal koopmanshuis met trapgevel, luiken en een uithangbord
    b.middeleeuwsHuis({ z: -0.1, w: 1.25, d: 1.6, h: 1.75, muur: MUREN[0], dak: DAKEN[0], gevel: 'trap', luik: A, treden: 4 });
    b.box(0.03, 0.03, 0.3, 0.42, 1.3, 0.8, '#2d2a28').box(0.03, 0.26, 0.26, 0.42, 1.0, 0.92, A).box(0.035, 0.12, 0.12, 0.42, 1.07, 0.92, '#f2e8d4');
    b.bloemen(-0.8, 0.85, 0.3, 0.3).boom(0.85, 0.9, 0.7);
  },
  (b, A, Ad, Al) => { // gildehuis: twee trapgevels naast elkaar en een traptorentje
    b.middeleeuwsHuis({ x: -0.48, z: -0.05, w: 1.0, d: 1.7, h: 2.0, muur: MUREN[1], dak: DAKEN[2], gevel: 'trap', luik: A, treden: 3, schouw: false });
    b.middeleeuwsHuis({ x: 0.52, z: 0.0, w: 1.0, d: 1.6, h: 1.7, muur: PLEISTER[0], dak: DAKEN[0], gevel: 'trap', luik: A, treden: 3, deur: false });
    b.cil(0.22, 0.24, 2.5, 0.02, 0.06, -0.85, '#c9b48e', 8).kegel(0.3, 0.9, 0.02, 2.56, -0.85, DAKEN[3], 8).bol(0.05, 0.02, 3.48, -0.85, '#d9b14a', 6);
    b.vaandel(-0.48, 1.85, 0.8, A, 0.6).vaandel(0.52, 1.55, 0.8, Al, 0.5);
  },
  (b, A, Ad, Al) => { // grote gildehal met een hoge toren en een spits
    b.middeleeuwsHuis({ x: 0.3, z: 0.1, w: 1.6, d: 1.9, h: 1.6, muur: '#d9c9a8', dak: DAKEN[0], gevel: 'trap', luik: A, treden: 5, schouw: false });
    b.box(0.95, 3.6, 0.95, -0.65, 0.06, -0.55, '#cdbb98').box(1.03, 0.14, 1.03, -0.65, 3.66, -0.55, '#bda98c');
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.box(0.12, 0.25, 0.12, -0.65 + Math.cos(a) * 0.44, 3.8, -0.55 + Math.sin(a) * 0.44, '#cdbb98'); }
    b.kegel(0.55, 1.9, -0.65, 3.8, -0.55, DAKEN[3], 8).bol(0.08, -0.65, 5.75, -0.55, '#d9b14a', 6);
    b.raam(0.18, 0.5, 0.03, -0.65, 2.7, -0.07, 0, 0.5).raam(0.18, 0.5, 0.03, -0.65, 1.6, -0.07, 0, 0.5);
    b.cil(0.17, 0.17, 0.03, -0.65, 3.25, -0.06, '#f2e8d4', 12, [Math.PI / 2, 0, 0]);
    b.vaandel(0.0, 1.5, 1.05, A, 0.65).vaandel(0.6, 1.5, 1.05, A, 0.65);
    b.cil(0.02, 0.02, 0.8, -0.65, 5.7, -0.55, '#2d2a28', 4).box(0.32, 0.2, 0.02, -0.49, 6.25, -0.55, A);
  },
];
const ONTWERPEN = {
  Middeleeuws: MIDDELEEUWS,
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
    (b, A, Ad) => { // kloostertuin met een waterput
      b.kavel(2.2, 2.2, C.gras);
      for (const [x, z, w, d] of [[0, -0.95, 2.0, 0.16], [0, 0.95, 0.7, 0.16], [-0.95, 0, 0.16, 2.0], [0.95, 0, 0.16, 2.0]]) b.box(w, 0.2, d, x, 0.06, z, C.haag);
      b.cil(0.3, 0.32, 0.35, 0, 0.06, 0, '#b9ad94', 10).cil(0.24, 0.24, 0.02, 0, 0.4, 0, '#2f4f6a', 10);
      b.cil(0.025, 0.025, 0.6, -0.27, 0.06, 0, '#5a3e2a', 4).cil(0.025, 0.025, 0.6, 0.27, 0.06, 0, '#5a3e2a', 4).dak(0.7, 0.25, 0.5, 0, 0.66, 0, Ad, Math.PI / 2);
      b.bloemen(-0.5, -0.5, 0.5, 0.4).bloemen(0.5, -0.5, 0.5, 0.4, A).bloemen(-0.5, 0.5, 0.5, 0.4, A).boom(0.55, 0.5, 0.8);
    },
    (b, A, Ad) => { // kapelletje met een klokkentorentje
      b.kavel(2.2, 2.2, C.gras);
      b.box(1.1, 1.0, 1.6, 0, 0.06, -0.15, '#f1ead8').dak(1.18, 0.75, 1.7, 0, 1.06, -0.15, '#8a8494', Math.PI / 2);
      b.box(0.36, 0.55, 0.04, 0, 0.06, 0.66, A).cil(0.18, 0.18, 0.04, 0, 0.6, 0.66, A, 10, [Math.PI / 2, 0, 0]);
      b.box(0.3, 0.45, 0.3, 0, 1.55, 0.35, '#f1ead8').kegel(0.26, 0.6, 0, 2.0, 0.35, '#8a8494', 4).bol(0.04, 0, 2.62, 0.35, '#d9b14a', 6);
      for (const dz of [-0.6, -0.1]) for (const sx of [-1, 1]) b.raam(0.03, 0.4, 0.14, sx * 0.56, 0.35, dz, 0, 0.7);
      b.bloemen(-0.7, 0.85, 0.5, 0.3).bloemen(0.7, 0.85, 0.5, 0.3).boom(-0.85, -0.85, 0.7);
    },
    (b, A, Ad) => { // begijnhofhuisjes rond een grasveld
      b.kavel(2.3, 2.3, C.gras);
      b.middeleeuwsHuis({ x: -0.55, z: -0.45, w: 0.95, d: 1.2, h: 1.0, muur: '#f4efe2', dak: '#8a5444', gevel: 'trap', luik: A, treden: 3 });
      b.middeleeuwsHuis({ x: 0.55, z: -0.45, w: 0.95, d: 1.2, h: 1.0, muur: '#f4efe2', dak: '#8a5444', gevel: 'trap', luik: A, treden: 3, schouw: false });
      b.box(2.2, 0.35, 0.08, 0, 0.06, 1.05, '#f4efe2').box(0.4, 0.42, 0.1, 0, 0.06, 1.05, Ad);
      b.boom(0, 0.5, 0.75).bloemen(-0.7, 0.55, 0.4, 0.3).bloemen(0.7, 0.55, 0.4, 0.3, A);
    },
    (b, A, Ad, Al) => { // een kerkje met een spitse toren
      b.kavel(2.3, 2.3, C.gras);
      b.box(1.2, 1.4, 1.7, 0.2, 0.06, -0.15, '#cdbb98').dak(1.28, 0.95, 1.8, 0.2, 1.46, -0.15, '#8a8494', Math.PI / 2);
      b.box(0.75, 2.6, 0.75, -0.55, 0.06, 0.55, '#c4b08c').kegel(0.52, 2.2, -0.55, 2.66, 0.55, '#7d7788', 8).bol(0.06, -0.55, 4.9, 0.55, '#d9b14a', 6);
      b.box(0.3, 0.5, 0.04, -0.55, 0.06, 0.93, A).raam(0.14, 0.4, 0.03, -0.55, 1.6, 0.93, 0, 0.6).cil(0.13, 0.13, 0.03, -0.55, 2.2, 0.93, '#f2e8d4', 10, [Math.PI / 2, 0, 0]);
      for (const dz of [-0.7, -0.2, 0.3]) for (const sx of [-1, 1]) b.raam(0.03, 0.55, 0.16, 0.2 + sx * 0.61, 0.4, dz, 0, 0.7);
      b.boom(0.85, 0.9, 0.7).bloemen(-0.9, -0.9, 0.3, 0.3, A);
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
  b.box(3.4, 0.08, 4.8, 0, 0, 0, '#d4c8b0');
  const bord = (y) => { b.box(0.08, y, 0.08, 1.25, 0.08, 1.9, '#5a3e2a').box(0.7, 0.05, 0.05, 1.25, y, 1.9, '#3b2a20').box(0.6, 0.4, 0.04, 1.25, y - 0.45, 1.9, '#8a6440').box(0.44, 0.26, 0.05, 1.25, y - 0.38, 1.9, A); };
  // middeleeuwse gidsgebouwen; de kleur van de wijk zit in de luiken, de vaandels en het uithangbord
  if (gids === 'atlas') {
    // de Kaartenkamer: een breed gildehuis met trapgevel en een vergulde hemelbol op het dak
    b.middeleeuwsHuis({ z: -0.6, w: 2.4, d: 2.4, h: 1.9, y: 0.08, muur: '#c06848', dak: '#8a8494', gevel: 'trap', luik: A, treden: 5 });
    b.cil(0.08, 0.1, 0.5, 0, 3.75, -0.6, '#8a6a44', 6).bol(0.42, 0, 4.55, -0.6, C.water, 14);
    b.torus(0.5, 0.035, 0, 4.55, -0.6, '#d9b14a', [0, 0, 0.4], 20).torus(0.5, 0.035, 0, 4.55, -0.6, '#d9b14a', [Math.PI / 2, 0.3, 0], 20);
    b.vaandel(-0.7, 1.8, 0.62, A, 0.7).vaandel(0.7, 1.8, 0.62, A, 0.7).boom(-1.25, 1.5).boom(-1.25, 0.6, 0.8);
    bord(1.6);
  } else if (gids === 'woordje') {
    // de Uitkijkpost: een stenen wachttoren met een houten omloop en een spits dak
    b.middeleeuwsHuis({ x: 0.55, z: -0.6, w: 1.6, d: 2.0, h: 1.3, y: 0.08, muur: '#efe4cc', dak: '#a2503a', gevel: 'vakwerk', luik: A });
    b.box(1.3, 3.6, 1.3, -0.95, 0.08, -0.6, '#cdbb98').box(1.6, 0.12, 1.6, -0.95, 3.68, -0.6, '#7a5636');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.box(0.06, 0.4, 0.06, -0.95 + Math.cos(a) * 0.76, 3.8, -0.6 + Math.sin(a) * 0.76, '#5a3e2a'); }
    b.box(1.0, 0.7, 1.0, -0.95, 3.8, -0.6, '#cdbb98').cil(0.001, 1.05, 1.3, -0.95, 4.5, -0.6, '#7d7788', 4, [0, Math.PI / 4, 0]).bol(0.08, -0.95, 5.85, -0.6, '#d9b14a', 6);
    b.cil(0.02, 0.02, 0.8, -0.95, 5.85, -0.6, '#2d2a28', 4).box(0.4, 0.26, 0.02, -0.74, 6.35, -0.6, A);
    for (let f = 0; f < 3; f++) b.raam(0.16, 0.3, 0.03, -0.95, 0.6 + f * 1.0, 0.06, 0, 0.6);
    for (let i = 0; i < 3; i++) b.box(0.6, 0.12, 0.25, -0.9 + i * 0.9, 0.3, 1.5, C.hout);
  } else if (gids === 'tella') {
    // de Proefkeuken: een keukenhuis met een grote schoorsteen en een ketel op het vuur buiten
    b.middeleeuwsHuis({ z: -0.7, w: 2.5, d: 2.2, h: 1.4, y: 0.08, muur: '#efe4cc', dak: '#a2503a', gevel: 'vakwerk', luik: A, schouw: false });
    b.box(0.5, 3.4, 0.5, 0.9, 0.08, -1.3, '#b05e42').box(0.6, 0.1, 0.6, 0.9, 3.48, -1.3, '#8a4a36');
    b.cil(0.5, 0.55, 2.3, -1.15, 0.08, -0.9, '#cdbb98', 10).kegel(0.62, 1.0, -1.15, 2.38, -0.9, '#7d7788', 10);
    b.cil(0.05, 0.05, 0.7, -0.5, 0.08, 1.2, '#3b2a20', 4).cil(0.05, 0.05, 0.7, 0.5, 0.08, 1.2, '#3b2a20', 4).box(1.1, 0.05, 0.05, 0, 0.75, 1.2, '#3b2a20');
    b.cil(0.24, 0.18, 0.3, 0, 0.3, 1.2, '#2d2a28', 10).cil(0.2, 0.2, 0.02, 0, 0.6, 1.2, A, 10);
    b.ico(0.18, 0, 0.12, 1.2, '#ff9a3c', 0, 0.6);
    b.box(0.03, 0.03, 0.3, 0.8, 1.3, 0.5, '#2d2a28').box(0.03, 0.3, 0.3, 0.8, 1.0, 0.62, A);
  } else if (gids === 'kroniek') {
    // het Archief: een stenen abdijhuis met een vierkante toren en een uurwerk
    b.middeleeuwsHuis({ x: 0.45, z: -0.4, w: 1.9, d: 2.4, h: 1.6, y: 0.08, muur: '#d9c9a8', dak: '#7d7788', gevel: 'trap', luik: A, treden: 4 });
    b.box(1.3, 3.8, 1.3, -0.95, 0.08, -0.8, '#cdbb98').box(1.4, 0.12, 1.4, -0.95, 3.88, -0.8, '#bda98c');
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.box(0.14, 0.3, 0.14, -0.95 + Math.cos(a) * 0.6, 4.0, -0.8 + Math.sin(a) * 0.6, '#cdbb98'); }
    b.cil(0.001, 0.85, 1.4, -0.95, 4.0, -0.8, '#7d7788', 4, [0, Math.PI / 4, 0]).bol(0.08, -0.95, 5.45, -0.8, '#d9b14a', 6);
    b.cil(0.26, 0.26, 0.04, -0.95, 3.1, -0.13, '#f4efe2', 12, [Math.PI / 2, 0, 0]).box(0.03, 0.2, 0.02, -0.95, 3.02, -0.1, '#2d3240');
    for (let f = 0; f < 2; f++) b.raam(0.18, 0.42, 0.03, -0.95, 0.7 + f * 1.1, -0.14, 0, 0.6);
    b.vaandel(0.45, 1.5, 0.82, A, 0.6);
  } else if (gids === 'bram') {
    b.cil(1.62, 1.62, 0.06, 0, 0.04, -0.3, C.gras, 20).cil(0.5, 0.55, 0.22, 0, 0.08, -0.2, '#8a8f99', 10);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; if (Math.sin(a) > 0.75) continue; b.box(0.7, 0.22, 0.28, Math.cos(a) * 1.2, 0.08, -0.2 + Math.sin(a) * 1.2, C.hout, -a + Math.PI / 2); }
    b.cil(0.06, 0.06, 1.5, -1.05, 0.08, -1.2, '#5a3e2a', 6).cil(0.06, 0.06, 1.5, 1.05, 0.08, -1.2, '#5a3e2a', 6)
      .kegel(1.3, 0.85, 0, 1.55, -1.2, A, 6).boom(1.3, 1.6, 1.2).boom(-1.3, 1.5, 1.0).bloemen(0.2, 1.85, 1.0, 0.3);
  } else if (gids === 'byte') {
    // de Werkplaats: een smidse met een open werkplaats, een grote schouw en een aambeeld
    b.middeleeuwsHuis({ z: -0.8, w: 2.6, d: 2.0, h: 1.3, y: 0.08, muur: '#a84e36', dak: '#8a8494', gevel: 'trap', luik: A, treden: 4, schouw: false });
    b.box(0.6, 3.2, 0.6, -0.95, 0.08, -1.4, '#8a4a36').box(0.7, 0.1, 0.7, -0.95, 3.28, -1.4, '#6e3a2a');
    b.box(2.4, 0.08, 1.2, 0.1, 1.15, 0.65, '#8a5444').dak(2.4, 0.3, 1.2, 0.1, 1.2, 0.65, A);
    for (const dx of [-1.05, 1.15]) b.box(0.1, 1.1, 0.1, dx, 0.08, 1.2, '#5a3e2a');
    b.box(0.5, 0.35, 0.5, -0.4, 0.08, 0.5, '#6e6a66').ico(0.18, -0.4, 0.5, 0.5, '#ff7a2a', 0, 0.5);
    b.box(0.14, 0.25, 0.14, 0.5, 0.08, 0.6, '#5a4636').box(0.32, 0.1, 0.14, 0.5, 0.33, 0.6, '#3a3f4b');
    for (let i = 0; i < 3; i++) b.cil(0.17, 0.17, 0.32, 1.05 - i * 0.05, 0.08, 1.55 - i * 0.38, '#8a5a33', 8);
    b.cil(0.4, 0.4, 0.12, 1.3, 0.5, -0.2, '#6e5238', 12, [0, 0, Math.PI / 2]);
  }
  // voorpleintje waar de gids staat
  b.cil(0.62, 0.62, 0.05, 2.35, 0, 1.35, C.pad, 18).cil(0.5, 0.5, 0.052, 2.35, 0, 1.35, tint(A, 1.55), 18);
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
  if (has('kleur-nacht')) dak = '#5a73cf';
  if (has('cape')) dak = '#5a73cf';
  b.box(1.95, 0.05, 1.95, 0, 0, 0, C.gras);
  const padK = has('spoor-licht') ? '#fff3b0' : has('spoor-sterren') ? '#e8dcff' : has('spoor-blaadjes') ? '#b9e39a' : has('spoor-noten') ? '#bfe3ff' : has('spoor-letters') ? '#ffe2b8' : C.pad;
  b.box(0.36, 0.06, 0.65, 0, 0.01, 0.65, padK);
  // een vakwerkhuisje: lichte gevel met donkere balken, een steil dak in de kleur van de reiziger
  b.box(1.25, 0.85, 1.0, 0, 0.05, -0.2, '#f1e8d4').dak(1.38, 0.85, 1.14, 0, 0.9, -0.2, dak);
  for (const bx of [-0.6, 0.6]) b.box(0.05, 0.85, 0.02, bx, 0.05, 0.305, '#4a3628');
  b.box(1.25, 0.05, 0.02, 0, 0.82, 0.305, '#4a3628').box(0.5, 0.05, 0.02, -0.38, 0.4, 0.305, '#4a3628').box(0.5, 0.05, 0.02, 0.38, 0.4, 0.305, '#4a3628');
  b.box(0.26, 0.48, 0.04, 0, 0.05, 0.31, has('sjaal-rood') ? '#d23f3f' : has('sjaal-blauw') ? '#3a6fd6' : C.hout);
  b.raam(0.2, 0.2, 0.04, -0.33, 0.5, 0.31, 0, 0.8).raam(0.2, 0.2, 0.04, 0.33, 0.5, 0.31, 0, 0.8).raam(0.04, 0.22, 0.22, 0.63, 0.45, -0.2, 0, 0.6).raam(0.04, 0.22, 0.22, -0.63, 0.45, -0.2, 0, 0.6);
  if (has('cape')) for (let i = 0; i < 4; i++) b.raam(0.07, 0.07, 0.07, -0.45 + i * 0.3, 1.38, -0.2 + (i % 2 ? 0.25 : -0.25), 0, 1);
  if (has('pet-oranje')) b.box(0.9, 0.05, 0.3, 0, 0.62, 0.45, '#e2783e');
  if (has('muts')) b.box(0.18, 0.5, 0.18, 0.35, 1.25, -0.4, '#d23f3f').box(0.22, 0.06, 0.22, 0.35, 1.75, -0.4, C.wit);
  else b.box(0.15, 0.45, 0.15, 0.35, 1.25, -0.4, '#a85a40');
  if (has('bladerkrans')) b.bloemen(-0.6, 0.65, 0.55, 0.4).bloemen(0.6, 0.65, 0.55, 0.4);
  else b.struik(-0.65, 0.65).struik(0.65, 0.7, 0.8);
  if (has('veer')) b.cil(0.03, 0.03, 0.7, 0.75, 0.05, 0.15, C.hout, 5).box(0.2, 0.18, 0.18, 0.75, 0.75, 0.15, '#3fb34f').dak(0.26, 0.12, 0.24, 0.75, 0.93, 0.15, '#e04a3a');
  if (has('koptelefoon')) for (let i = 0; i < 2; i++) b.box(0.42, 0.03, 0.36, -0.25 + i * 0.48, 1.3, 0.05, '#2c4a7a');
  if (has('bril')) b.cil(0.05, 0.07, 0.35, -0.35, 1.4, -0.35, C.donker, 6, [0.6, 0, 0.3]);
  if (has('rugzak')) for (let i = 0; i < 3; i++) b.box(0.03, 0.2, 0.3, -0.75 + i * 0.12, 0.05, -0.75, '#4c8fd6');
  if (has('lantaarn')) b.cil(0.025, 0.03, 0.6, 0.3, 0.05, 0.8, C.donker, 5).raam(0.12, 0.14, 0.12, 0.3, 0.65, 0.8, 0, 1);
  if (has('spoor-licht') || has('spoor-sterren')) for (let i = 0; i < 3; i++) b.raam(0.06, 0.06, 0.06, (i % 2 ? 0.25 : -0.25), 0.05, 0.45 + i * 0.18, 0, 1);
  if (has('feesthoed')) { const kl = ['#e9a23b', '#e2643e', '#3fa37a', '#4c8fd6', '#9a6ad6', '#d9577b']; for (let i = 0; i < 6; i++) b.box(0.1, 0.1, 0.02, -0.55 + i * 0.22, 0.78 + (i % 2) * 0.04, 0.37, kl[i]); }
  return b.bouw();
}

// ---------- vaste gebouwen op het plein ----------
export function stationGebouw() {
  // een oud stationnetje (zoals in de tijd van de eerste stoomtreinen): baksteen, een leien dak, een klokkentorentje
  // en een houten perronkap. Voorkant naar het spoor (+z).
  const b = new Bouwer('station');
  const bk = '#a84e36', st = '#d9c9a8', lei = '#7d7788';
  b.box(11.6, 0.12, 3.6, 0, 0, -1.9, '#cfc4ae');
  b.box(8.6, 1.8, 2.3, 0, 0.12, -2.2, bk).box(8.7, 0.12, 2.4, 0, 1.92, -2.2, st).dak(8.8, 1.1, 2.6, 0, 2.04, -2.2, lei);
  b.box(2.4, 2.9, 2.6, 0, 0.12, -2.1, bk).dak(2.5, 1.1, 2.75, 0, 3.02, -2.1, lei, Math.PI / 2);
  b.trapgevel(2.4, 3.02, 1.1, -0.86, bk, 5, 0.2);
  b.box(0.9, 1.3, 0.9, 3.4, 2.0, -2.6, st).cil(0.001, 0.75, 1.2, 3.4, 3.3, -2.6, lei, 4, [0, Math.PI / 4, 0]).bol(0.07, 3.4, 4.55, -2.6, '#d9b14a', 6);
  b.cil(0.32, 0.32, 0.05, 3.4, 2.75, -2.13, '#f4efe2', 16, [Math.PI / 2, 0, 0]).box(0.03, 0.2, 0.02, 3.4, 2.66, -2.1, '#2d3240');
  b.ramenRond(8.6, 2.3, 0, -2.2, 0.12, 2, 0.85, 10, 0.26, 0.5, [0, 2]).ramenRond(2.4, 2.6, 0, -2.1, 2.0, 1, 0.9, 2, 0.3, 0.5, [0, 2]);
  b.box(1.0, 1.4, 0.06, 0, 0.12, -0.84, '#5a3a26');
  // perrons met een houten kap
  b.box(13, 0.3, 0.9, 0, 0, -1.45, '#b9ad94').box(13, 0.3, 0.9, 0, 0, 1.45, '#b9ad94');
  for (let i = -3; i <= 3; i++) b.box(0.1, 1.5, 0.1, i * 1.9, 0.3, 1.2, '#5a3e2a').box(0.1, 1.5, 0.1, i * 1.9, 0.3, 1.9, '#5a3e2a');
  b.dak(13.2, 0.35, 1.3, 0, 1.8, 1.55, '#a2503a');
  for (let i = 0; i < 4; i++) b.box(0.8, 0.1, 0.25, -5 + i * 3.3, 0.45, 1.75, C.hout);
  for (const x of [-5.6, 5.6]) b.box(0.06, 0.6, 0.06, x, 0.3, -1.1, '#2d2a28').box(0.14, 0.18, 0.14, x, 0.9, -1.1, '#ffd27a');
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
  // De Poort: een stenen tunnelmond in de berg met twee torentjes en vaandels (de weg naar de middelbare school)
  const b = new Bouwer('poort');
  b.box(6, 6.4, 3, 0, 0, 0, '#b9ad94').box(6.3, 0.5, 3.3, 0, 6.4, 0, '#a8987c').box(3.4, 4.6, 3.2, 0, 0, 0, '#202230');
  b.cil(1.7, 1.7, 3.2, 0, 4.6, 0, '#202230', 16, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) b.box(0.6, 0.6, 3.3, -2.6 + i * 1.04, 6.9, 0, '#b9ad94');
  for (const sx of [-1, 1]) { b.cil(0.7, 0.75, 8.2, sx * 3.0, 0, 0.2, '#a85a40', 10).kegel(0.85, 2.0, sx * 3.0, 8.2, 0.2, '#7d7788', 10).bol(0.15, sx * 3.0, 10.25, 0.2, '#d9b14a', 8); }
  b.box(1.0, 1.5, 0.05, -1.4, 4.4, 1.55, '#2f5a7a').box(1.0, 1.5, 0.05, 1.4, 4.4, 1.55, '#b8352e');
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
export function treinGeo() {
  // een stoomtrein: een zwarte locomotief met een rode bufferbalk, een tender en twee houten rijtuigen. Voorkant = +x.
  const b = new Bouwer('trein'); b.ao = false;
  const zw = '#2d2a28', rood = '#a8352e', goud = '#d9b14a';
  // locomotief
  b.box(2.6, 0.22, 0.8, 3.4, 0.12, 0, zw);
  b.cil(0.34, 0.34, 2.0, 3.85, 0.68, 0, '#333a33', 12, [0, 0, -Math.PI / 2]);
  for (const x of [3.2, 3.8, 4.4]) b.cil(0.36, 0.36, 0.04, x, 0.68, 0, goud, 12, [0, 0, -Math.PI / 2]);
  b.cil(0.1, 0.16, 0.55, 4.45, 0.96, 0, zw, 8).cil(0.2, 0.12, 0.12, 4.45, 1.48, 0, zw, 8);    // schoorsteen
  b.koepel(0.16, 3.7, 1.0, 0, goud, 8);                                                        // stoomdom
  b.box(0.9, 0.95, 0.86, 2.55, 0.3, 0, '#2f4a3a').box(1.0, 0.08, 0.96, 2.55, 1.25, 0, zw);   // cabine
  b.box(0.12, 0.25, 0.9, 4.95, 0.12, 0, rood).box(0.3, 0.12, 0.6, 5.1, 0.12, 0, zw);          // bufferbalk en baanruimer
  b.box(0.16, 0.16, 0.05, 4.9, 0.85, 0, '#ffe7a0');
  for (const x of [2.6, 3.3, 4.0]) for (const z of [-0.38, 0.38]) b.cil(0.24, 0.24, 0.06, x, 0.24, z, rood, 12, [Math.PI / 2, 0, 0]);
  // tender met kolen
  b.box(1.3, 0.6, 0.82, 1.35, 0.15, 0, '#2f4a3a').box(1.1, 0.12, 0.7, 1.35, 0.75, 0, '#1e1c1a');
  // rijtuigen
  const rijtuig = (x0) => {
    b.box(2.8, 0.75, 0.84, x0, 0.2, 0, '#7a3a2a').box(2.8, 0.06, 0.86, x0, 0.62, 0, goud);
    b.dak(2.9, 0.2, 0.92, x0, 0.95, 0, '#3a3f4b');
    for (let i = 0; i < 4; i++) for (const z of [-0.43, 0.43]) b.raam(0.36, 0.26, 0.02, x0 - 1.0 + i * 0.67, 0.68, z, 0, 0.7);
    for (const dx of [-0.9, 0.9]) for (const z of [-0.36, 0.36]) b.cil(0.17, 0.17, 0.05, x0 + dx, 0.17, z, zw, 10, [Math.PI / 2, 0, 0]);
  };
  rijtuig(-1.4); rijtuig(-4.4);
  return b.bouw();
}
export function steigerGeo() {
  const b = new Bouwer('steiger'); b.ao = false;
  const k = '#8a6440';
  for (const [x, z] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) b.box(0.06, 1, 0.06, x, 0, z, k);
  for (let y = 0; y < 4; y++) { const yy = y * 0.25 + 0.2; b.box(1.96, 0.04, 0.06, 0, yy, 0.95, k).box(1.96, 0.04, 0.06, 0, yy, -0.95, k).box(0.06, 0.04, 1.96, 0.95, yy, 0, k).box(0.06, 0.04, 1.96, -0.95, yy, 0, k); }
  return b.bouw().body;
}
export function bouwplaatsGeo() {
  // een middeleeuwse bouwwerf: stenen, balken, een houten hek en een houten kraan (met een tredmolen)
  const b = new Bouwer('bouwplaats'); b.ao = false;
  b.box(2.2, 0.06, 2.2, 0, 0, 0, '#c8b89a').box(1.6, 0.25, 1.4, 0, 0.06, -0.1, '#cdbb98');
  for (let i = 0; i < 8; i++) { const t = i / 8 * 4; const side = Math.floor(t), f = t - side; const p = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]; const x = (p[side][0] + (p[side + 1][0] - p[side][0]) * f) * 1.02, z = (p[side][1] + (p[side + 1][1] - p[side][1]) * f) * 1.02; b.box(0.06, 0.35, 0.06, x, 0.06, z, '#6e5238'); }
  b.box(2.06, 0.05, 0.04, 0, 0.28, 1.03, '#8a6440').box(2.06, 0.05, 0.04, 0, 0.28, -1.03, '#8a6440').box(0.04, 0.05, 2.06, 1.03, 0.28, 0, '#8a6440').box(0.04, 0.05, 2.06, -1.03, 0.28, 0, '#8a6440');
  b.box(0.4, 0.3, 0.3, 0.6, 0.06, 0.65, '#cdbb98').box(0.5, 0.1, 0.3, -0.55, 0.06, 0.7, '#9c7a52').box(0.5, 0.1, 0.3, -0.55, 0.16, 0.7, '#8a6440');
  // houten kraan met tredmolen
  b.box(0.16, 3.0, 0.16, -0.75, 0.06, -0.75, '#6e5238');
  b.cil(0.4, 0.4, 0.2, -0.75, 0.5, -0.45, '#8a6440', 12, [Math.PI / 2, 0, 0]);
  return b.bouw().body;
}
export function kraanArmGeo() {
  const b = new Bouwer('kraanarm'); b.ao = false;
  b.box(2.6, 0.12, 0.12, 0.7, 0, 0, '#7a5c40').box(0.4, 0.3, 0.3, -0.5, -0.1, 0, '#cdbb98').box(0.02, 0.8, 0.02, 1.6, -0.8, 0, '#3b2a20').box(0.14, 0.12, 0.14, 1.6, -0.9, 0, '#b9ad94');
  return b.bouw().body;
}
export function lampGeo() {
  const b = new Bouwer('lamp'); b.ao = false;
  // een houten paal met een smeedijzeren arm en een lantaarn eraan (de lantaarn zelf licht op, zie wegen3d.js)
  b.box(0.07, 0.86, 0.07, 0, 0, 0, '#4a3628').box(0.11, 0.06, 0.11, 0, 0, 0, '#3a2a20');
  b.box(0.22, 0.025, 0.025, 0.09, 0.84, 0, '#2d2a28').box(0.015, 0.06, 0.015, 0.17, 0.78, 0, '#2d2a28');
  b.cil(0.001, 0.09, 0.07, 0.17, 0.775, 0, '#2d2a28', 4, [0, Math.PI / 4, 0]);
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
