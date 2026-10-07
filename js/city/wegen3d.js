// Wegen, kruispunten, zebrapaden, overwegen, lantaarns en verkeer van de 3D-stad.
// Alles volgt de graaf uit wegen.js: auto's rijden rechts op hun rijstrook, slaan af op kruispunten
// en wachten voor de slagbomen als de trein komt.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, clamp } from '../core/util.js';
import { RINGEN, RIJBAAN, STOEP, WEG_HALF, RIJSTROOK, SPOOR_HALF, SPOOR_SPOREN, SPOOR_X, LAAN_HOEKEN, polar, hoekVerschil } from './layout.js';
import { wegennet, takPunt, rijPunt, takLijn, KRUIS } from './wegen.js';
import { Bouwer, autoGeo, lampGeo } from './modellen.js';
import { koetsGeo, fietsGeo } from './brugge.js';

const TAU = Math.PI * 2;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), K = new THREE.Color();
const YAS = new THREE.Vector3(0, 1, 0);
const BR = RIJBAAN + 2 * STOEP;     // 2.3
const Y_WEG = 0.02;

function canvasTex(w, h, teken, herhaal = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  teken(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (herhaal) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; }
  return t;
}
const ASFALT = '#5d6676', STOEPK = '#dcd8cf', BOORD = '#b5b0a6', LIJN = '#eef1f5';
const stoepPx = (n) => Math.round(n * STOEP / BR);

/** Rechte weg: v dwars (stoep - asfalt - stoep), u langs de weg (herhaalt elke 3 eenheden). */
function wegTex() {
  return canvasTex(128, 128, (g, w, h) => {
    const sp = stoepPx(h);
    g.fillStyle = STOEPK; g.fillRect(0, 0, w, h);
    g.fillStyle = '#cbc6bc'; for (let x = 0; x < w; x += 16) { g.fillRect(x, 0, 1, sp); g.fillRect(x, h - sp, 1, sp); }
    g.fillStyle = ASFALT; g.fillRect(0, sp, w, h - 2 * sp);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},0.05)`; g.fillRect(Math.random() * w, sp + Math.random() * (h - sp * 2), 2, 2); }
    g.fillStyle = BOORD; g.fillRect(0, sp - 2, w, 2); g.fillRect(0, h - sp, w, 2);
    g.fillStyle = LIJN; g.fillRect(0, sp + 3, w, 2); g.fillRect(0, h - sp - 5, w, 2);
    g.fillStyle = '#f2f2ea'; g.fillRect(0, h / 2 - 1.5, w * 0.5, 3);
  }, true);
}
/** Kruispunt: links een X (vier hoekstoepen), rechts een T (stoep doorlopend aan de onderkant = de kant zonder weg). */
function kruisTex() {
  return canvasTex(256, 128, (g) => {
    const n = 128, sp = stoepPx(n);
    for (const [x0, T] of [[0, false], [128, true]]) {
      g.fillStyle = ASFALT; g.fillRect(x0, 0, n, n);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},0.05)`; g.fillRect(x0 + Math.random() * n, Math.random() * n, 2, 2); }
      g.fillStyle = STOEPK;
      const hoek = (x, y) => { g.beginPath(); g.rect(x, y, sp, sp); g.fill(); };
      hoek(x0, 0); hoek(x0 + n - sp, 0); hoek(x0, n - sp); hoek(x0 + n - sp, n - sp);
      if (T) { g.fillRect(x0, n - sp, n, sp); g.fillStyle = BOORD; g.fillRect(x0, n - sp, n, 2); g.fillStyle = LIJN; g.fillRect(x0 + sp, n - sp - 5, n - 2 * sp, 2); }
      g.fillStyle = BOORD;
      g.fillRect(x0 + sp - 2, 0, 2, sp); g.fillRect(x0, sp - 2, sp, 2);
      g.fillRect(x0 + n - sp, 0, 2, sp); g.fillRect(x0 + n - sp, sp - 2, sp, 2);
      if (!T) { g.fillRect(x0 + sp - 2, n - sp, 2, sp); g.fillRect(x0, n - sp, sp, 2); g.fillRect(x0 + n - sp, n - sp, 2, sp); g.fillRect(x0 + n - sp, n - sp, sp, 2); }
    }
  });
}
function zebraTex() {
  return canvasTex(64, 32, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(250,250,245,0.95)';
    for (let x = 3; x < w - 2; x += 8) g.fillRect(x, 3, 4, h - 6);
  });
}

function strookGeo(punten, breed, y = Y_WEG) {
  const pos = [], uv = [], nor = [], idx = []; let L = 0;
  for (let i = 0; i < punten.length; i++) {
    const p = punten[i];
    if (i > 0) L += Math.hypot(p.x - punten[i - 1].x, p.z - punten[i - 1].z);
    const dx = p.dx, dz = p.dz;
    // links (v = 1) en rechts (v = 0) van de middellijn
    pos.push(p.x - dz * breed / 2 * -1, y, p.z + dx * breed / 2 * -1, p.x + dz * breed / 2 * -1, y, p.z - dx * breed / 2 * -1);
    uv.push(L / 3, 0, L / 3, 1);
    nor.push(0, 1, 0, 0, 1, 0);
    if (i > 0) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  return { pos, uv, nor, idx };
}
function voegSamen(delen) {
  const pos = [], uv = [], nor = [], idx = []; let o = 0;
  for (const d of delen) { pos.push(...d.pos); uv.push(...d.uv); nor.push(...d.nor); for (const i of d.idx) idx.push(i + o); o += d.pos.length / 3; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  // driehoeken moeten naar boven kijken
  const p = g.attributes.position.array, ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3;
    const ny = (p[b + 2] - p[a + 2]) * (p[c] - p[a]) - (p[b] - p[a]) * (p[c + 2] - p[a + 2]);
    if (ny < 0) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  }
  g.computeBoundingSphere();
  return g;
}
/** Een vlak vierkant (in wereldcoördinaten) met hoeken a,b,c,d en uv's. */
function quad(a, b, c, d, uvs, y) {
  return { pos: [a.x, y, a.z, b.x, y, b.z, c.x, y, c.z, d.x, y, d.z], uv: uvs, nor: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], idx: [0, 1, 2, 0, 2, 3] };
}

function armGeo() {
  const b = new Bouwer('slagboom'); b.ao = false;
  for (let i = 0; i < 6; i++) b.box(0.16, 0.05, 0.05, 0.1 + i * 0.16, -0.025, 0, i % 2 ? '#ffffff' : '#e0453a');
  return b.bouw().body;
}

export class Wegen3D {
  /** stad: de Stad3D (scene, materialen, kwaliteit) */
  constructor(stad) {
    this.stad = stad; this.scene = stad.scene;
    this.groep = new THREE.Group(); this.scene.add(this.groep);
    this.wegMat = new THREE.MeshLambertMaterial({ map: wegTex(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    this.kruisMat = new THREE.MeshLambertMaterial({ map: kruisTex(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    this.zebraMat = new THREE.MeshLambertMaterial({ map: zebraTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    this.stadR = null;
    this._bouwLampen();
    this._bouwOverwegDelen();
    this._bouwAutos();
  }

  /** Bouw het net opnieuw op als de stad gegroeid is. */
  zet(stadR) {
    if (this.stadR === stadR) return;
    this.stadR = stadR;
    for (const m of this.groep.children) m.geometry.dispose();
    this.groep.clear();
    const net = this.net = wegennet(stadR);
    // wegvakken (ingekort tot aan de kruispunten)
    const delen = net.takken.map(t => strookGeo(takLijn(t, t.soort === 'ring' ? 0.45 : 1, KRUIS, KRUIS), BR));
    const wegen = new THREE.Mesh(voegSamen(delen), this.wegMat); wegen.receiveShadow = true; this.groep.add(wegen);
    // kruispuntvlakken
    const kd = [], zd = [];
    const h = KRUIS + 0.04;
    for (const k of net.knopen) {
      const rx = Math.cos(k.hoek), rz = Math.sin(k.hoek), tx = -rz, tz = rx;
      const P = (t, r) => ({ x: k.x + tx * t + rx * r, z: k.z + tz * t + rz * r });
      const T = k.soort === 'T', u0 = T ? 0.5 : 0, u1 = T ? 1 : 0.5;
      // v = 0 -> naar binnen; voor de buitenste ring (T naar buiten) omgekeerd
      const vin = k.buiten && k.ring > 0 ? 1 : 0, vout = 1 - vin;
      kd.push(quad(P(-h, -h), P(h, -h), P(h, h), P(-h, h), [u0, vin, u1, vin, u1, vout, u0, vout], Y_WEG + 0.004));
    }
    const kruis = new THREE.Mesh(voegSamen(kd), this.kruisMat); kruis.receiveShadow = true; this.groep.add(kruis);
    // zebrapaden aan elk uiteinde van elk wegvak
    for (const t of net.takken) for (const s of [KRUIS + 0.32, t.lengte - KRUIS - 0.32]) {
      const p = takPunt(t, s), qx = -p.dz, qz = p.dx, hw = RIJBAAN / 2 - 0.05, hl = 0.24;
      const P = (a, b) => ({ x: p.x + qx * a + p.dx * b, z: p.z + qz * a + p.dz * b });
      zd.push(quad(P(-hw, -hl), P(hw, -hl), P(hw, hl), P(-hw, hl), [0, 0, 1, 0, 1, 1, 0, 1], Y_WEG + 0.008));
    }
    const zebra = new THREE.Mesh(voegSamen(zd), this.zebraMat); zebra.renderOrder = 1; this.groep.add(zebra);
    this._zetOverwegen();
    this._zetDwarsliggers();
    // lantaarns tot aan de rand van de stad
    let n = 0; while (n < this.lampen.length && this.lampen[n].R <= stadR + 1e-6) n++;
    for (const m of this.lampMeshes) m.count = n;
    this._zetAutos();
  }

  // ---------- overwegen ----------
  _bouwOverwegDelen() {
    this.armen = new THREE.InstancedMesh(armGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), 32);
    this.armen.count = 0; this.armen.castShadow = true; this.scene.add(this.armen);
    this.lichtMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.lichten = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), this.lichtMat, 64);
    this.lichten.count = 0; this.scene.add(this.lichten);
    this.overwegStatic = null;
  }
  _zetOverwegen() {
    if (this.overwegStatic) { this.scene.remove(this.overwegStatic); this.overwegStatic.geometry.dispose(); }
    const b = new Bouwer('overweg'); b.ao = false;
    this.slagbomen = []; this.overwegen = [];
    for (const o of this.net.overwegen) {
      const t = this.net.takken[o.tak];
      const p = takPunt(t, o.s);
      // rubberen overwegplaten tussen en naast de sporen (lopen dwars over de weg)
      const rx = -p.dz, rz = p.dx; // dwars op de weg
      void rx; void rz;
      b.box(RIJBAAN + 0.06, 0.05, 2.0, p.x, 0.0, p.z, '#727a88');
      for (const sz of SPOOR_SPOREN) b.box(RIJBAAN + 0.06, 0.012, 0.3, p.x, 0.05, p.z + sz, '#8a91a0');
      const ow = { x: p.x, z: p.z, tak: t.id, s: o.s, dicht: 0, doelDicht: 0, bomen: [] };
      for (const dir of [1, -1]) {
        const dx = p.dx * dir, dz = p.dz * dir, qx = -dz, qz = dx; // rechts van de rijrichting
        const af = SPOOR_HALF - 0.15;
        const px = p.x - dx * af + qx * (RIJBAAN / 2 + 0.18), pz = p.z - dz * af + qz * (RIJBAAN / 2 + 0.18);
        b.cil(0.05, 0.06, 0.5, px, 0, pz, '#f2f2ee', 6).box(0.14, 0.14, 0.14, px, 0.5, pz, '#3a3f4b');
        // andreaskruis met twee lichten
        const sx = p.x - dx * (af + 0.35) + qx * (RIJBAAN / 2 + 0.25), sz = p.z - dz * (af + 0.35) + qz * (RIJBAAN / 2 + 0.25);
        const yaw = Math.atan2(dx, dz);
        b.cil(0.025, 0.025, 0.95, sx, 0, sz, '#9aa0aa', 5);
        // andreaskruis: twee schuine witte balkjes met rode rand, loodrecht op de rijrichting
        for (const tilt of [Math.PI / 4, -Math.PI / 4]) {
          const lx = -Math.sin(tilt), ly = Math.cos(tilt), hl = 0.29;
          const wx = lx * Math.cos(yaw), wz = -lx * Math.sin(yaw);
          b.cil(0.045, 0.045, hl * 2, sx - wx * hl - dx * 0.035, 0.8 - ly * hl, sz - wz * hl - dz * 0.035, '#e0453a', 4, [0, yaw, tilt]);
          b.cil(0.03, 0.03, hl * 2 - 0.03, sx - wx * hl - dx * 0.05, 0.8 - ly * hl + 0.015, sz - wz * hl - dz * 0.05, '#f6f6f2', 4, [0, yaw, tilt]);
        }
        b.box(0.34, 0.12, 0.05, sx, 0.46, sz, '#2d3240', yaw);
        const L1 = { x: sx + Math.cos(yaw) * 0.1 - dx * 0.04, z: sz - Math.sin(yaw) * 0.1 - dz * 0.04 }, L2 = { x: sx - Math.cos(yaw) * 0.1 - dx * 0.04, z: sz + Math.sin(yaw) * 0.1 - dz * 0.04 };
        ow.bomen.push({ x: px, y: 0.52, z: pz, qx, qz, lichten: [[L1.x, 0.52, L1.z], [L2.x, 0.52, L2.z]], dx, dz });
      }
      this.overwegen.push(ow);
    }
    const geo = b.bouw().body;
    if (geo) {
      this.overwegStatic = new THREE.Mesh(geo, this.stad._lijfMat()); this.overwegStatic.castShadow = true; this.overwegStatic.receiveShadow = true;
      this.scene.add(this.overwegStatic);
    } else this.overwegStatic = null;
    this.armen.count = this.overwegen.length * 2; this.lichten.count = this.overwegen.length * 4;
    this._tekenOverwegen(0);
  }
  _tekenOverwegen(t) {
    let a = 0, l = 0;
    for (const o of this.overwegen) for (const b of o.bomen) {
      // arm wijst van de paal naar het midden van de weg (-rechts), en draait omhoog als de overweg open is
      const hoek = (1 - o.dicht) * 1.35;
      const yaw = Math.atan2(b.qz, -b.qx);
      Q.setFromAxisAngle(YAS, yaw); Q2.setFromAxisAngle(V3.set(0, 0, 1), hoek); Q.multiply(Q2);
      M4.compose(V3.set(b.x, b.y, b.z), Q, S3.set(1, 1, 1)); this.armen.setMatrixAt(a++, M4);
      const knip = o.dicht > 0.05 ? (Math.floor(t * 2.4) % 2) : -1;
      b.lichten.forEach((p, k) => {
        M4.makeTranslation(p[0], p[1], p[2]); this.lichten.setMatrixAt(l, M4);
        this.lichten.setColorAt(l, K.set(knip === k ? '#ff3b2f' : '#5a2a2a')); l++;
      });
      for (let k = b.lichten.length; k < 2; k++) l++;
    }
    this.armen.instanceMatrix.needsUpdate = true; this.lichten.instanceMatrix.needsUpdate = true;
    if (this.lichten.instanceColor) this.lichten.instanceColor.needsUpdate = true;
  }
  _zetDwarsliggers() {
    const L = SPOOR_X * 2 + 12;
    if (!this.liggers) {
      const n = Math.floor(L / 0.7) * 2;
      this.liggers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.06, 0.78), new THREE.MeshLambertMaterial({ color: '#7a5f48' }), n);
      this.liggers.receiveShadow = true; this.scene.add(this.liggers);
    }
    const vrij = this.overwegen.map(o => o.x);
    let k = 0;
    for (const tz of SPOOR_SPOREN) for (let x = -L / 2; x < L / 2; x += 0.7) {
      if (vrij.some(v => Math.abs(v - x) < WEG_HALF + 0.08)) continue;
      if (k >= this.liggers.instanceMatrix.count) break;
      M4.makeTranslation(x, 0.04, tz); this.liggers.setMatrixAt(k++, M4);
    }
    this.liggers.count = k; this.liggers.instanceMatrix.needsUpdate = true; this.liggers.computeBoundingSphere();
  }

  // ---------- lantaarns ----------
  _bouwLampen() {
    const pos = [];
    const knoopHoeken = LAAN_HOEKEN;
    // langs de ringen, op de buitenste stoep
    for (const R of RINGEN) {
      const n = Math.floor(TAU * R / 4.4);
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + 0.21, p = polar(R + RIJBAAN / 2 + 0.12, a);
        if (Math.abs(p.z) < SPOOR_HALF + 1.2) continue;
        if (knoopHoeken.some(h => Math.abs(hoekVerschil(a, h)) * R < KRUIS + 0.8)) continue;
        pos.push({ x: p.x, z: p.z, R, armX: -Math.cos(a), armZ: -Math.sin(a) });
      }
    }
    // langs de lanen
    for (const a of LAAN_HOEKEN) for (let i = 0; i < RINGEN.length - 1; i++) {
      for (let r = RINGEN[i] + KRUIS + 1.6; r < RINGEN[i + 1] - KRUIS - 1.2; r += 4.4) {
        const zij = (Math.round(r) % 2) ? 1 : -1, nx = -Math.sin(a) * zij, nz = Math.cos(a) * zij;
        const p = polar(r, a);
        pos.push({ x: p.x + nx * (RIJBAAN / 2 + 0.12), z: p.z + nz * (RIJBAAN / 2 + 0.12), R: RINGEN[i + 1], armX: -nx, armZ: -nz });
      }
    }
    pos.sort((p, q) => p.R - q.R);
    this.lampen = pos;
    const paal = new THREE.InstancedMesh(lampGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), pos.length);
    this.lampKopMat = new THREE.MeshBasicMaterial({ color: '#777777' });
    const kop = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.05, 0.1), this.lampKopMat, pos.length);
    this.lampGloedMat = new THREE.MeshBasicMaterial({ map: this.stad.gloedTex, color: '#ffcf7a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const gl = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.lampGloedMat, pos.length);
    pos.forEach((p, i) => {
      // lampGeo: arm langs +x; draai zodat +x boven de weg hangt
      const rot = Math.atan2(-p.armZ, p.armX);
      Q.setFromAxisAngle(YAS, rot);
      M4.compose(V3.set(p.x, 0, p.z), Q, S3.set(1, 1, 1)); paal.setMatrixAt(i, M4);
      const ox = p.armX * 0.16, oz = p.armZ * 0.16;
      M4.compose(V3.set(p.x + ox, 0.88, p.z + oz), Q, S3.set(1, 1, 1)); kop.setMatrixAt(i, M4);
      M4.compose(V3.set(p.x + ox * 2, 0.04, p.z + oz * 2), Q, S3.set(1.9, 1, 1.9)); gl.setMatrixAt(i, M4);
    });
    paal.castShadow = true;
    gl.renderOrder = 2;
    this.lampMeshes = [paal, kop, gl];
    for (const m of this.lampMeshes) { m.count = 0; this.scene.add(m); }
  }

  // ---------- verkeer ----------
  _bouwAutos() {
    const n = this.stad.kwaliteit === 'hoog' ? 80 : 46;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.autos = new THREE.InstancedMesh(autoGeo(), mat, n);
    this.autos.castShadow = true; this.autos.count = 0; this.scene.add(this.autos);
    const kl = ['#e2643e', '#3d8fe0', '#f6c445', '#ffffff', '#38b37a', '#e9578a', '#2d3240', '#9a68e0', '#f0a531', '#c7ced8'];
    for (let i = 0; i < n; i++) this.autos.setColorAt(i, K.set(kl[i % kl.length]));
    // Brugse paardenkoetsen en fietsers rijden tussen de auto's
    this.koetsen = new THREE.InstancedMesh(koetsGeo().body, mat, Math.max(4, Math.round(n / 8)));
    this.fietsen = new THREE.InstancedMesh(fietsGeo().body, mat, Math.max(6, Math.round(n / 4)));
    for (const m of [this.koetsen, this.fietsen]) { m.castShadow = true; m.count = 0; this.scene.add(m); }
    this.autoData = [];
    this.rr = rng('verkeer');
  }
  _zetAutos() {
    const net = this.net, rr = rng('autos-' + net.stadR.toFixed(1));
    const totaal = net.takken.reduce((s, t) => s + t.lengte, 0);
    const n = Math.min(this.autos.instanceMatrix.count, Math.round(totaal * 2 / 13));
    this.autoData = [];
    // verdeel over de takken naar lengte, met afstand tussen de auto's
    for (let i = 0; i < n; i++) {
      let x = rr() * totaal, t = net.takken[0];
      for (const tk of net.takken) { if (x < tk.lengte) { t = tk; break; } x -= tk.lengte; }
      const dir = rr() < 0.5 ? 1 : -1;
      const L = t.lengte - 2 * KRUIS; if (L < 1) continue;
      const p = KRUIS + rr() * L;
      if (this.autoData.some(a => a.tak === t && a.dir === dir && Math.abs(a.p - p) < 1.3)) continue;
      const w = rr();
      const soort = w < 0.1 ? 'koets' : w < 0.3 ? 'fiets' : 'auto';
      const v = soort === 'koets' ? 1.1 + rr() * 0.2 : soort === 'fiets' ? 1.4 + rr() * 0.4 : 1.9 + rr() * 0.5;
      this.autoData.push({ tak: t, dir, p, v, soort, bocht: null });
    }
    this.autos.count = this.autoData.length;
  }
  _sNaarP(a) { return a.dir > 0 ? a.p : a.tak.lengte - a.p; } // p = afgelegde weg vanaf het begin in rijrichting
  _volgende(a) {
    const net = this.net;
    const knoopId = a.dir > 0 ? a.tak.b : a.tak.a, k = net.knopen[knoopId];
    const opties = k.takken.filter(id => id !== a.tak.id);
    const keuze = net.takken[opties.length ? opties[Math.floor(this.rr() * opties.length)] : a.tak.id];
    const ndir = keuze.a === knoopId ? 1 : -1;
    const sIn = a.dir > 0 ? a.tak.lengte - KRUIS : KRUIS;
    const sUit = ndir > 0 ? KRUIS : keuze.lengte - KRUIS;
    const p0 = rijPunt(a.tak, sIn, a.dir), p2 = rijPunt(keuze, sUit, ndir);
    // controlepunt: snijpunt van de twee rijlijnen
    const den = p0.dx * p2.dz - p0.dz * p2.dx;
    let c;
    if (Math.abs(den) < 0.05) c = { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 };
    else { const tt = ((p2.x - p0.x) * p2.dz - (p2.z - p0.z) * p2.dx) / den; c = { x: p0.x + p0.dx * tt, z: p0.z + p0.dz * tt }; }
    let len = 0, vx = p0.x, vz = p0.z;
    for (let i = 1; i <= 8; i++) { const u = i / 8, x = (1 - u) * (1 - u) * p0.x + 2 * u * (1 - u) * c.x + u * u * p2.x, z = (1 - u) * (1 - u) * p0.z + 2 * u * (1 - u) * c.z + u * u * p2.z; len += Math.hypot(x - vx, z - vz); vx = x; vz = z; }
    a.bocht = { p0, c, p2, len: Math.max(0.2, len), u: 0, tak: keuze, dir: ndir };
  }
  /** dt in seconden; trein: { x, zicht, rijdt, half } */
  tick(dt, t, trein) {
    // overwegen: dicht als de trein in de buurt is
    for (const o of this.overwegen || []) {
      const dicht = trein && trein.zicht && Math.abs(trein.x - o.x) < trein.half + (trein.rijdt ? 7 : 1.2);
      o.doelDicht = dicht ? 1 : 0;
      o.dicht = clamp(o.dicht + (o.doelDicht ? 1 : -1) * dt * 0.9, 0, 1);
    }
    this._tekenOverwegen(t);
    // wachtrijen per tak en rijrichting
    const rijen = new Map();
    for (const a of this.autoData) if (!a.bocht) { const key = a.tak.id * 2 + (a.dir > 0 ? 1 : 0); (rijen.get(key) || rijen.set(key, []).get(key)).push(a); }
    for (const r of rijen.values()) r.sort((x, y) => y.p - x.p);
    for (const r of rijen.values()) {
      r.forEach((a, i) => {
        const L = a.tak.lengte;
        let max = L - KRUIS;
        if (i > 0) max = Math.min(max, r[i - 1].p - 1.05);
        // stoppen voor een gesloten overweg
        for (const o of this.overwegen) if (o.tak === a.tak.id && o.dicht > 0.02) {
          const po = a.dir > 0 ? o.s : L - o.s, stop = po - SPOOR_HALF - 0.55;
          if (a.p <= stop + 0.05) max = Math.min(max, stop);
        }
        a.p = Math.min(a.p + a.v * dt, Math.max(a.p, max));
        if (a.p >= L - KRUIS - 1e-3 && i === 0) this._volgende(a);
      });
    }
    // auto's, koetsen en fietsers in een bocht
    let i = 0, nk = 0, nf = 0;
    for (const a of this.autoData) {
      let x, z, hx, hz;
      if (a.bocht) {
        const b = a.bocht;
        b.u += a.v * dt / b.len;
        if (b.u >= 1) {
          // de nieuwe tak moet vrij zijn bij de ingang
          a.tak = b.tak; a.dir = b.dir; a.p = KRUIS; a.bocht = null;
        }
      }
      if (a.bocht) {
        const b = a.bocht, u = clamp(b.u, 0, 1);
        x = (1 - u) * (1 - u) * b.p0.x + 2 * u * (1 - u) * b.c.x + u * u * b.p2.x;
        z = (1 - u) * (1 - u) * b.p0.z + 2 * u * (1 - u) * b.c.z + u * u * b.p2.z;
        hx = 2 * (1 - u) * (b.c.x - b.p0.x) + 2 * u * (b.p2.x - b.c.x);
        hz = 2 * (1 - u) * (b.c.z - b.p0.z) + 2 * u * (b.p2.z - b.c.z);
      } else {
        const s = a.dir > 0 ? a.p : a.tak.lengte - a.p;
        const p = rijPunt(a.tak, s, a.dir, RIJSTROOK);
        x = p.x; z = p.z; hx = p.dx; hz = p.dz;
      }
      // autoGeo, koetsGeo en fietsGeo: voorkant = +z
      M4.compose(V3.set(x, Y_WEG, z), Q.setFromAxisAngle(YAS, Math.atan2(hx, hz)), S3.set(1, 1, 1));
      if (a.soort === 'koets' && nk < this.koetsen.instanceMatrix.count) this.koetsen.setMatrixAt(nk++, M4);
      else if (a.soort === 'fiets' && nf < this.fietsen.instanceMatrix.count) this.fietsen.setMatrixAt(nf++, M4);
      else this.autos.setMatrixAt(i++, M4);
    }
    this.autos.count = i; this.koetsen.count = nk; this.fietsen.count = nf;
    this.autos.instanceMatrix.needsUpdate = true;
    this.koetsen.instanceMatrix.needsUpdate = true;
    this.fietsen.instanceMatrix.needsUpdate = true;
  }

  setData(aan) {
    const k = aan ? '#b9c3d6' : '#ffffff';
    this.wegMat.color.set(k); this.kruisMat.color.set(k);
  }
  setNacht(L) {
    this.lampGloedMat.opacity = clamp(1 - L * 1.3, 0, 1) * 0.5;
    this.lampKopMat.color.copy(K.set('#8a8f99').lerp(new THREE.Color('#ffe2a0'), clamp(1 - L * 1.3, 0, 1)));
  }
}
export { WEG_HALF };
