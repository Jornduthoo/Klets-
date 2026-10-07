// De mensen in de 3D-stad: de zes gidsen bij hun gebouw, je eigen reiziger bij je huis, de andere
// reizigers en een paar inwoners op het stationsplein en de stoepen. Alle figuren zitten in één geometrie
// (één tekenopdracht); de shader laat ze stappen, wiebelen, knikken en zwaaien.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, clamp } from '../core/util.js';
import { avatarGeo, gidsGeo, figUniforms, figMaterialen, voegFigurenSamen, MAX_FIG } from '../figuren/modellen.js';
import { AVATAR_OPTIES } from '../figuren/uiterlijk.js';
import { WIJKEN, RINGEN, RIJBAAN, gidsPlek, PLEIN, LAAN_HOEKEN, hoekVerschil } from './layout.js';

const TAU = Math.PI * 2;
const PLEIN_M = { x: PLEIN.klasmeter.x, z: PLEIN.klasmeter.z + 0.3 };
const SCHAAL = { gids: 1.25, reiziger: 0.6, inwoner: 0.57 };
// stoepvakken waar inwoners wandelen (tussen twee lanen, weg van het spoor)
const STOEPVAKKEN = [[15, 55], [65, 115], [125, 165], [195, 235], [245, 295], [305, 345]].map(([a, b]) => [a * Math.PI / 180, b * Math.PI / 180]);

export class Figuren3D {
  constructor(stad) {
    this.stad = stad;
    this.U = figUniforms();
    const { mat, diepte } = figMaterialen(this.U);
    this.mat = mat; this.diepte = diepte;
    this.mesh = null; this.sleutel = ''; this.figs = [];
    this.rr = rng('figuren');
  }

  /** Zet de figuren voor dit stadsmodel (enkel opnieuw bouwen als er iets veranderde). */
  zet(model, { inwoners = 10 } = {}) {
    const lijst = [];
    for (const w of WIJKEN) lijst.push({ soort: 'gids', id: w.gids, plek: gidsPlek(w) });
    const huizen = model?.huizen || [];
    const ik = huizen.find(h => h.ik);
    if (ik) lijst.push({ soort: 'ik', look: ik.look, huis: ik.slot, pid: ik.pid });
    for (const h of huizen) if (!h.ik) lijst.push({ soort: 'reiziger', look: h.look, pid: h.pid });
    const r = rng('inwoners');
    const O = AVATAR_OPTIES;
    for (let i = 0; i < inwoners; i++) {
      lijst.push({ soort: 'inwoner', look: { huid: Math.floor(r() * 6), haar: O.haar[Math.floor(r() * 6)], haarKleur: Math.floor(r() * 6), kleren: Math.floor(r() * 8), broek: Math.floor(r() * 4), uitrusting: {} }, stoep: i % 2 === 1 });
    }
    const figs = lijst.slice(0, MAX_FIG);
    const sleutel = JSON.stringify(figs.map(f => [f.soort, f.id, f.look, f.huis?.x]));
    if (sleutel === this.sleutel) return;
    this.sleutel = sleutel;
    if (this.mesh) { this.stad.scene.remove(this.mesh); this.mesh.geometry.dispose(); }
    const geos = figs.map(f => f.soort === 'gids' ? gidsGeo(f.id) : avatarGeo(f.look));
    const geo = voegFigurenSamen(geos);
    for (const g of geos) g.dispose();
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.diepte;
    this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = false;
    this.stad.scene.add(this.mesh);
    // gedrag
    const vorige = new Map(this.figs.map(f => [f.soort + (f.id || f.pid || ''), f]));
    this.figs = figs.map((f, i) => {
      const oud = vorige.get(f.soort + (f.id || f.pid || ''));
      const st = { ...f, i, x: 0, z: 0, yaw: 0, fase: this.rr() * TAU, amp: 0, zwaai: 0, wacht: this.rr() * 3 };
      if (f.soort === 'gids') { st.x = f.plek.x; st.z = f.plek.z; st.yaw = f.plek.rot; st.basisYaw = f.plek.rot; st.volgendeZwaai = 2 + this.rr() * 6; }
      else if (f.soort === 'ik') this._ikPad(st);
      else if (f.soort === 'inwoner' && f.stoep) this._stoepPad(st);
      else this._pleinPad(st);
      if (oud && oud.pad === st.pad) Object.assign(st, { x: oud.x, z: oud.z, yaw: oud.yaw, a: oud.a, dir: oud.dir, fase: oud.fase });
      return st;
    });
    for (let i = this.figs.length; i < MAX_FIG; i++) this.U.uFigA.value[i].set(0, -50, 0, 0);
  }

  // ---------- paden ----------
  _pleinPad(st) {
    st.pad = 'plein'; st.r = 2.45 + this.rr() * 0.25; st.a = this.rr() * TAU; st.dir = this.rr() < 0.5 ? 1 : -1; st.v = 0.32 + this.rr() * 0.18;
  }
  _stoepPad(st) {
    const vak = STOEPVAKKEN[Math.floor(this.rr() * STOEPVAKKEN.length)];
    const R = this.rr() < 0.5 ? RINGEN[0] : RINGEN[1], kant = this.rr() < 0.5 ? 1 : -1;
    st.pad = 'stoep'; st.r = R + kant * (RIJBAAN / 2 + 0.2); st.a0 = vak[0]; st.a1 = vak[1]; st.a = vak[0] + this.rr() * (vak[1] - vak[0]); st.dir = this.rr() < 0.5 ? 1 : -1; st.v = 0.36 + this.rr() * 0.1;
  }
  _ikPad(st) {
    // heen en weer op de stoep voor het eigen huis
    const s = st.huis, R = RINGEN.reduce((b, R) => Math.abs(R - s.r) < Math.abs(b - s.r) ? R : b, RINGEN[0]);
    const r = R + Math.sign(s.r - R) * (RIJBAAN / 2 + 0.2), half = 1.25 / r;
    let a0 = s.a - half, a1 = s.a + half;
    // niet tot op een kruispunt
    for (const l of LAAN_HOEKEN) { const d = hoekVerschil(l, s.a); if (Math.abs(d) < half + 1.8 / r) { if (d > 0) a1 = Math.min(a1, l - 1.8 / r); else a0 = Math.max(a0, l + 1.8 / r); } }
    st.pad = 'ik'; st.r = r; st.a0 = a0; st.a1 = a1; st.a = s.a; st.dir = 1; st.v = 0.3;
    st.deur = { x: s.x + Math.sin(s.rot) * 0.9, z: s.z + Math.cos(s.rot) * 0.9 };
  }

  tick(dt, t) {
    if (!this.mesh) return;
    this.U.uFigT.value = t;
    const A = this.U.uFigA.value, B = this.U.uFigB.value;
    for (const f of this.figs) {
      let loopt = false;
      if (f.soort === 'gids') {
        // staan, rondkijken en af en toe zwaaien
        f.volgendeZwaai -= dt;
        if (f.volgendeZwaai < 0) { f.zwaaiT = 1.8; f.volgendeZwaai = 6 + this.rr() * 8; }
        if (f.zwaaiT > 0) f.zwaaiT -= dt;
        const doelZ = f.zwaaiT > 0 ? 1 : 0;
        f.zwaai += (doelZ - f.zwaai) * clamp(dt * 6, 0, 1);
        f.yaw = f.basisYaw + Math.sin(t * 0.4 + f.i) * 0.35;
      } else {
        if (f.wacht > 0) { f.wacht -= dt; }
        else {
          loopt = true;
          if (f.pad === 'plein') {
            f.a += f.dir * f.v * dt / f.r;
            if (this.rr() < dt * 0.06) { f.wacht = 1 + this.rr() * 2.5; }
            if (this.rr() < dt * 0.03) f.dir *= -1;
          } else {
            f.a += f.dir * f.v * dt / f.r;
            if (f.a > f.a1) { f.a = f.a1; f.dir = -1; f.wacht = 0.6 + this.rr() * (f.pad === 'ik' ? 2.5 : 1.2); }
            if (f.a < f.a0) { f.a = f.a0; f.dir = 1; f.wacht = 0.6 + this.rr() * (f.pad === 'ik' ? 2.5 : 1.2); }
          }
        }
        const plein = f.pad === 'plein', c = plein ? PLEIN_M : { x: 0, z: 0 }, rz = plein ? f.r * 0.88 : f.r;
        f.x = c.x + Math.cos(f.a) * f.r; f.z = c.z + Math.sin(f.a) * rz;
        const dx = -Math.sin(f.a) * f.r * f.dir, dz = Math.cos(f.a) * rz * f.dir;
        if (loopt) f.yaw = Math.atan2(dx, dz);
        else if (f.pad === 'ik' && f.deur) f.yaw += hoekVerschil(Math.atan2(f.deur.x - f.x, f.deur.z - f.z) + Math.PI, f.yaw) * clamp(dt * 3, 0, 1);
        f.zwaai = 0;
      }
      f.amp += ((loopt ? 1 : 0) - f.amp) * clamp(dt * 8, 0, 1);
      f.fase += dt * (loopt ? 9 : 2);
      A[f.i].set(f.x, 0.02, f.z, f.yaw);
      B[f.i].set(SCHAAL[f.soort === 'ik' ? 'reiziger' : f.soort], f.fase, f.amp, f.zwaai);
    }
  }
  /** Waar staat de eigen reiziger nu (voor een marker). */
  positieIk() { const f = this.figs.find(x => x.soort === 'ik'); return f ? { x: f.x, y: 0.9, z: f.z } : null; }
  setData(aan) { this.mat.color.set(aan ? '#9aa6c0' : '#ffffff'); }
}
