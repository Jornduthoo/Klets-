// Het water van Zwinvliet in 3D: de vesten (ringvaart), de reien, het Minnewater, de sluis, de haven en de Noordzee,
// met bakstenen kaaimuren, kaaitrappen, stenen boogbruggen, rondvaartboten, zwanen, eenden en het slijk van de Slijkkraak.
//
// Al het water is één groot wateroppervlak onder de grond: de grond heeft gaten waar het water ligt (zie stad3d.js,
// het grondmasker). Een kleine zonekaart (textuur) zegt voor elk stukje water bij welke zone het hoort; de shader
// kiest per zone de helderheid: 0 = dik bruin slijk, 1 = helder blauw water. De helderheid komt uit js/city/water.js.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, clamp, lerp } from '../core/util.js';
import { WATERS, KADE, BERG_R, WEG_HALF, WATER_Y, VEST_R, inWater, oeverPunten, waterhuizen } from './layout.js';
import { bruggen } from './wegen.js';
import { Bouwer } from './modellen.js';
import { bootGeo, dierGeo, golfGeo, slijkvlekGeo, kaaiGeo, kaaitrapGeo } from './brugge.js';

export { WATER_Y };
const TAU = Math.PI * 2;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), K = new THREE.Color();
const YAS = new THREE.Vector3(0, 1, 0);
const BODEM_Y = -1.25;
const RAD = BERG_R + 0.5;           // de grondschijf (zelfde als in stad3d.js)
/** Volgorde van de zones in de zonekaart (de haven is ook de achtergrond: de zee buiten de kaart). */
export const ZONES = ['haven', ...new Set(WATERS.map(w => w.zone).filter(z => z !== 'haven')), 'fontein'];
const MAX_ZONES = 8;

const WATER_VS = `
uniform float uT; varying vec2 vXZ; varying vec3 vN;
#include <fog_pars_vertex>
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  float g = sin(w.x * 1.7 + uT * 1.6) * 0.012 + sin(w.z * 2.3 - uT * 1.1) * 0.012;
  w.y += g;
  vXZ = w.xz;
  vN = normalize(vec3(-cos(w.x * 1.7 + uT * 1.6) * 0.05, 1.0, cos(w.z * 2.3 - uT * 1.1) * 0.05));
  vec4 mv = viewMatrix * w;
  gl_Position = projectionMatrix * mv;
  #ifdef USE_FOG
    vFogDepth = - mv.z;
  #endif
}`;
const WATER_FS = `
uniform float uT; uniform float uNacht; uniform vec3 uZon; uniform sampler2D uZone; uniform float uRad; uniform float uHelder[${MAX_ZONES}];
varying vec2 vXZ; varying vec3 vN;
#include <fog_pars_fragment>
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y); }
float zoneHelder(vec2 p){
  vec2 uv = p / (2.0 * uRad) + 0.5;
  float id = floor(texture2D(uZone, uv).r * 255.0 / 32.0 + 0.5);
  float h = 0.0;
  for (int i = 0; i < ${MAX_ZONES}; i++) { if (abs(float(i) - id) < 0.5) h = uHelder[i]; }
  return h;
}
void main(){
  // zachte overgang tussen twee zones: vijf monsters rond het punt
  float h = (zoneHelder(vXZ) * 2.0 + zoneHelder(vXZ + vec2(0.45, 0.0)) + zoneHelder(vXZ - vec2(0.45, 0.0))
           + zoneHelder(vXZ + vec2(0.0, 0.45)) + zoneHelder(vXZ - vec2(0.0, 0.45))) / 6.0;
  float n = vn(vXZ * 0.9 + vec2(uT * 0.05, -uT * 0.03));
  float n2 = vn(vXZ * 3.1 - vec2(uT * 0.11, uT * 0.07));
  // kleuren in lineaire ruimte (de renderer zet ze om naar sRGB)
  vec3 diep = vec3(0.012, 0.16, 0.40), licht = vec3(0.05, 0.42, 0.62);
  vec3 helder = mix(diep, licht, 0.35 + 0.4 * n);
  // vies water: troebel bruingroen (erwtensoep) met kroos en schuimstrepen, maar wel nog glanzend water
  vec3 slijk = mix(vec3(0.11, 0.085, 0.030), vec3(0.20, 0.19, 0.050), smoothstep(0.3, 0.85, n));
  slijk = mix(slijk, vec3(0.16, 0.24, 0.035), smoothstep(0.70, 0.88, n2) * 0.85);   // kroos
  slijk = mix(slijk, vec3(0.42, 0.38, 0.24), smoothstep(0.93, 0.985, n2) * 0.7);    // vuil schuim
  vec3 c = mix(slijk, helder, smoothstep(0.0, 1.0, h));
  float gl = pow(max(dot(normalize(vN), normalize(uZon)), 0.0), 28.0);
  c += vec3(1.0, 0.98, 0.9) * gl * (0.28 + 0.6 * h) * (1.0 - uNacht * 0.75);
  c += mix(vec3(0.05, 0.05, 0.02), vec3(0.10, 0.16, 0.18), h) * smoothstep(0.78, 0.96, n2);   // rimpels
  c *= mix(1.0, 0.33, uNacht);
  gl_FragColor = vec4(c, mix(0.985, 0.86, h));
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Een polylijn (lijst punten) met lengtes, om boten en dieren langs te laten varen. */
class Pad {
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
const boog = (r, a0, a1, stap = 1.2) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * r / stap)), uit = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; uit.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); } return uit; };
const gr = (d) => d * Math.PI / 180;

/** Alle water, de kaaien, de bruggen en wat er leeft. */
export class Water3D {
  constructor(stad) {
    this.stad = stad;
    this.scene = stad.scene;
    this.r = rng('water');
    this.zoneHelder = {};      // zone -> 0..1 (gedempt naar het doel)
    this.doelHelder = {};
    this.uT = { value: 0 };
    this.mat = stad._lijfMat();
    this._bouwWater();
    this._bouwKaden();
    this._bouwBruggen();
    this._bouwLeven();
    this._bouwSlijk();
  }

  // ---------- het wateroppervlak ----------
  _zoneKaart() {
    const N = 512, data = new Uint8Array(N * N * 4);
    const idx = Object.fromEntries(ZONES.map((z, i) => [z, i]));
    for (let j = 0; j < N; j++) {
      const z = ((j + 0.5) / N - 0.5) * 2 * RAD;
      for (let i = 0; i < N; i++) {
        const x = ((i + 0.5) / N - 0.5) * 2 * RAD;
        const w = inWater(x, z, 0.9);
        data[(j * N + i) * 4] = (w ? idx[w.zone] ?? 0 : 0) * 32;
        data[(j * N + i) * 4 + 3] = 255;
      }
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
  }
  _bouwWater() {
    this.uHelder = { value: new Array(MAX_ZONES).fill(0) };
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uT: { value: 0 }, uNacht: { value: 0 }, uZon: { value: new THREE.Vector3(0.4, 0.8, 0.3) }, uZone: { value: null }, uRad: { value: RAD }, uHelder: { value: null },
      }]),
      vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: true, fog: true,
    });
    const u = this.waterMat.uniforms;
    u.uT = this.uT; u.uZone.value = this._zoneKaart(); u.uHelder = this.uHelder;
    const geo = new THREE.PlaneGeometry(340, 300, 120, 110).rotateX(-Math.PI / 2);
    this.vlak = new THREE.Mesh(geo, this.waterMat);
    this.vlak.position.set(0, WATER_Y, -35);
    this.vlak.renderOrder = 0;
    this.vlak.userData.id = 'water';
    this.scene.add(this.vlak);
    // de bodem (zodat je nooit door het water heen kijkt)
    const bodem = new THREE.Mesh(new THREE.CircleGeometry(240, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#5d5a44' }));
    bodem.position.y = BODEM_Y; this.scene.add(bodem);
  }

  // ---------- kaaimuren en kaaitrappen ----------
  _bouwKaden() {
    const brug = bruggen();
    const onderBrug = (x, z) => brug.some(b => {
      const px = x - b.x, pz = z - b.z, u = px * b.dx + pz * b.dz, v = -px * b.dz + pz * b.dx;
      return Math.abs(u) < b.lengte / 2 + 0.75 && Math.abs(v) < WEG_HALF + 0.45;
    });
    const stukken = [];
    for (const w of WATERS) {
      const stap = 0.7;
      for (const p of oeverPunten(w, stap)) {
        if (Math.hypot(p.x, p.z) > RAD - 0.6) continue;    // buiten de grondschijf: een natuurlijke kust
        if (onderBrug(p.x, p.z)) continue;
        stukken.push({ ...p, len: stap * 1.16 });
      }
    }
    const inst = new THREE.InstancedMesh(kaaiGeo(), this.mat, stukken.length);
    const tint = rng('kaai');
    stukken.forEach((p, i) => {
      M4.compose(V3.set(p.x, 0, p.z), Q.setFromAxisAngle(YAS, Math.atan2(p.nx, p.nz)), S3.set(p.len, 1, 1));
      inst.setMatrixAt(i, M4);
      const f = 0.9 + tint() * 0.16; inst.setColorAt(i, K.setRGB(f, f * (0.97 + tint() * 0.04), f * 0.96));
    });
    inst.castShadow = true; inst.receiveShadow = true;
    this.scene.add(inst);
    this.kade = inst;
    // kaaitrappen: hier en daar een trapje naar het water (niet onder een huis of een brug)
    const huizen = waterhuizen();
    const vrij = (p) => !huizen.some(h => Math.hypot(h.x - p.x, h.z - p.z) < 1.4);
    const kies = [];
    const rr = rng('trappen');
    for (const p of stukken) {
      if (!vrij(p) || p.w.id === 'zee' || p.w.id === 'sluiskolk') continue;
      const kans = p.w.id === 'rozenhoedkaai' || p.w.id === 'minnewater' ? 0.16 : p.w.soort === 'boog' ? 0.022 : 0.05;
      if (rr() < kans && !kies.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 5)) kies.push(p);
    }
    this.trappen = new THREE.InstancedMesh(kaaitrapGeo(), this.mat, Math.max(1, kies.length));
    kies.forEach((p, i) => { M4.compose(V3.set(p.x, 0, p.z), Q.setFromAxisAngle(YAS, Math.atan2(p.nx, p.nz)), S3.set(1, 1, 1)); this.trappen.setMatrixAt(i, M4); });
    this.trappen.count = kies.length; this.trappen.castShadow = true; this.trappen.receiveShadow = true;
    this.scene.add(this.trappen);
    this.trapPunten = kies;
  }

  // ---------- bruggen ----------
  /** Een stenen boogbrug (baksteen met een witte stenen boog) over een rei, in wereldcoördinaten in de Bouwer b. */
  _brug(b, br) {
    const S = br.lengte + 0.04, half = S / 2, wv = WEG_HALF + 0.24;
    const ux = br.dx, uz = br.dz, vx = -br.dz, vz = br.dx, ry = Math.atan2(ux, uz);
    const P = (u, v) => ({ x: br.x + ux * u + vx * v, z: br.z + uz * u + vz * v });
    const kroon = -0.13, vrij = kroon - WATER_Y;
    const n = 14, baks = ['#a9583f', '#b5634a', '#9e523a'], steen = '#ddd2bb', steen2 = '#cbbd9f';
    for (let i = 0; i < n; i++) {
      const u = -half + (i + 0.5) * S / n, t = u / half, ya = WATER_Y + vrij * Math.sqrt(Math.max(0, 1 - t * t)) - 0.02;
      const p = P(u, 0);
      b.box(wv * 2, -ya, S / n + 0.012, p.x, ya, p.z, baks[i % 3], ry);                      // gewelf en borstwering
      for (const k of [-1, 1]) { const q = P(u, k * (wv + 0.012)); b.box(0.03, 0.1, S / n + 0.012, q.x, ya - 0.005, q.z, steen, ry); }  // de witte boog
    }
    for (const k of [-1, 1]) {
      const a = P(k * (half + 0.3), 0);
      b.box(wv * 2 + 0.02, -BODEM_Y + 0.02, 0.62, a.x, BODEM_Y, a.z, baks[1], ry);          // landhoofd
      const q = P(0, k * (wv - 0.11));
      b.box(0.22, 0.3, S + 1.3, q.x, 0, q.z, baks[0], ry);                                   // borstwering
      b.box(0.28, 0.06, S + 1.36, q.x, 0.3, q.z, steen, ry);                                  // dekplaat
      for (const e of [-1, 1]) { const h = P(e * (half + 0.62), k * (wv - 0.11)); b.box(0.32, 0.46, 0.32, h.x, 0, h.z, steen2, ry); b.box(0.36, 0.06, 0.36, h.x, 0.46, h.z, steen, ry); }
      const s = P(0, k * (wv + 0.02)); b.box(0.06, 0.12, 0.34, s.x, kroon - 0.05, s.z, steen2, ry);   // sluitsteen
    }
  }
  _bouwBruggen() {
    this.brugGroepen = [];
    const perR = new Map();
    for (const br of bruggen()) { if (!perR.has(br.R)) perR.set(br.R, []); perR.get(br.R).push(br); }
    for (const [R, lijst] of perR) {
      const b = new Bouwer('bruggen' + R); b.ao = false;
      for (const br of lijst) this._brug(b, br);
      const m = new THREE.Mesh(b.bouw().body, this.mat);
      m.castShadow = true; m.receiveShadow = true; m.userData.id = 'brug';
      m.visible = false;
      this.scene.add(m);
      this.brugGroepen.push({ R, m });
    }
  }
  /** Enkel de bruggen van wegen die er al liggen (de stad groeit ring per ring). */
  zetStadR(stadR) { for (const g of this.brugGroepen) g.m.visible = g.R <= stadR + 1e-6; }

  // ---------- boten en dieren ----------
  _bouwLeven() {
    const mat = this.mat;
    const P = (x, z) => ({ x, z });
    // vaarroutes (heen en terug, of een lus), elk met een thuiszone: daar moet het water een beetje proper zijn
    const routes = [
      { zone: 'reie-zuid', soort: 'reie', pad: new Pad([P(-0.9, 11.3), P(0.8, 13.0), P(0, 15.5), P(0, 26.0), P(2.8, 28.0), P(6.5, 29.4)]), v: 0.55 },
      { zone: 'reie-noord', soort: 'reie', pad: new Pad([P(0, -11.4), P(0, -29.0), ...boog(VEST_R, gr(266), gr(184)), P(-27.5, -0.3), P(-18.4, 0)]), v: 0.6 },
      { zone: 'reie-zuid', soort: 'reie', pad: new Pad([P(18.4, 0), P(29.2, 0), ...boog(VEST_R, gr(3), gr(72))]), v: 0.5 },
      { zone: 'noordrei', soort: 'aak', pad: new Pad([P(0, -52.4), P(0, -31.2), ...boog(VEST_R, gr(272), gr(312))]), v: 0.4 },
      { zone: 'minnewater', soort: 'roei', pad: new Pad(boog(1, 0, TAU * 0.98, 0.05).map(p => P(p.x * 4.6, 28.6 + p.z * 1.25)), true), v: 0.32 },
      { zone: 'minnewater', soort: 'reie', pad: new Pad([...boog(VEST_R, gr(48), gr(132))]), v: 0.45 },
      { zone: 'haven', soort: 'vracht', pad: new Pad([P(0, -61.5), P(-2, -72), P(-8, -88)]), v: 0.5, groot: true },
      { zone: 'haven', soort: 'zeil', pad: new Pad(boog(1, 0, TAU * 0.98, 0.04).map(p => P(14 + p.x * 9, -82 + p.z * 5)), true), v: 0.7 },
    ];
    const geos = {};
    this.boten = routes.map((rt, i) => {
      const g = geos[rt.soort] || (geos[rt.soort] = bootGeo(rt.soort).body);
      const m = new THREE.Mesh(g, mat); m.castShadow = true; m.userData.id = 'boot';
      this.scene.add(m);
      return { obj: m, rt, s: this.r() * rt.pad.L, richting: i % 2 ? 1 : -1, wacht: 0 };
    });
    // aangemeerde bootjes langs de kaaien
    const roei = bootGeo('roei').body;
    const plekken = (this.trapPunten || []).slice(0, 10);
    this.aangemeerd = new THREE.InstancedMesh(roei, mat, Math.max(1, plekken.length));
    plekken.forEach((p, i) => {
      const x = p.x - p.nx * 0.55 + p.tx * 1.1, z = p.z - p.nz * 0.55 + p.tz * 1.1;
      M4.compose(V3.set(x, WATER_Y + 0.02, z), Q.setFromAxisAngle(YAS, Math.atan2(p.tx, p.tz)), S3.set(1, 1, 1));
      this.aangemeerd.setMatrixAt(i, M4);
    });
    this.aangemeerd.count = plekken.length; this.aangemeerd.castShadow = true; this.scene.add(this.aangemeerd);
    this.aangemeerdZones = plekken.map(p => p.w.zone);

    // dieren: ze zwemmen langs de reien en komen terug als hun zone helder wordt
    this.dieren = [];
    const geoD = {};
    const dier = (soort, w, zone, opts = {}) => {
      const g = geoD[soort] || (geoD[soort] = dierGeo(soort));
      const m = new THREE.Mesh(g, mat); m.castShadow = soort !== 'vis'; m.visible = false;
      this.scene.add(m);
      const d = { obj: m, soort, w, zone: zone || w.zone, f: this.r() * 10, v: (0.12 + this.r() * 0.12) * (this.r() < 0.5 ? 1 : -1), ...opts };
      if (w.soort === 'strook') { d.s = 0.6 + this.r() * (w.L - 1.2); d.lat = (this.r() - 0.5) * w.halfB * 1.1; }
      else if (w.soort === 'boog') { d.a = w.a0 + 0.05 + this.r() * (w.a1 - w.a0 - 0.1); d.lat = (this.r() - 0.5) * w.halfB * 1.1; }
      else { d.a = this.r() * TAU; d.k = 0.25 + this.r() * 0.55; }
      this.dieren.push(d);
    };
    const W = Object.fromEntries(WATERS.map(w => [w.id, w]));
    for (let i = 0; i < 5; i++) dier('zwaan', W.minnewater);
    for (let i = 0; i < 4; i++) dier('eend', W.minnewater);
    for (let i = 0; i < 2; i++) dier('zwaan', W['vest-zuid']);
    for (let i = 0; i < 2; i++) dier('zwaan', W.rozenhoedkaai);
    for (let i = 0; i < 3; i++) dier('eend', W.rozenhoedkaai);
    for (let i = 0; i < 2; i++) dier('zwaan', W.dijver);
    for (let i = 0; i < 3; i++) dier('eend', W.dijver);
    for (let i = 0; i < 2; i++) dier('zwaan', W['vest-oost']);
    for (let i = 0; i < 3; i++) dier('eend', W.spiegelrei);
    for (let i = 0; i < 3; i++) dier('meerkoet', W.groenerei);
    for (let i = 0; i < 2; i++) dier('zwaan', W['vest-west']);
    for (let i = 0; i < 3; i++) dier('eend', W.langerei);
    for (let i = 0; i < 2; i++) dier('zwaan', W['vest-noord']);
    for (let i = 0; i < 3; i++) dier('eend', W.noordrei);
    for (let i = 0; i < 4; i++) dier('vis', W.noordrei);
    for (let i = 0; i < 3; i++) dier('vis', W.dijver);
    for (let i = 0; i < 3; i++) dier('kikker', W.minnewater);
    for (let i = 0; i < 2; i++) dier('zeehond', W.haven);
    // reigers staan op de kaai van de rei naar de haven, meeuwen op de havendam
    const kaai = oeverPunten(W.noordrei, 3).filter(p => !inWater(p.x + p.nx * 0.5, p.z + p.nz * 0.5));
    for (const p of [kaai[2], kaai[9]].filter(Boolean)) this.dieren.push({ obj: this._statisch('reiger', p.x + p.nx * 0.3, 0.02, p.z + p.nz * 0.3, Math.atan2(-p.nx, -p.nz)), soort: 'reiger', zone: 'noordrei', vast: true });
    for (let i = 0; i < 5; i++) { const x = -9 + this.r() * 18, z = -58.6 - this.r() * 0.6; if (inWater(x, z)) continue; this.dieren.push({ obj: this._statisch('meeuw', x, 0.04, z, this.r() * TAU), soort: 'meeuw', zone: 'haven', vast: true }); }
    // golfjes onder wat drijft
    this.golven = new THREE.InstancedMesh(golfGeo(), new THREE.MeshBasicMaterial({ color: '#dff2fb', transparent: true, opacity: 0.5, depthWrite: false }), 90);
    this.golven.count = 0; this.golven.renderOrder = 2; this.scene.add(this.golven);
  }
  _statisch(soort, x, y, z, rot) {
    const m = new THREE.Mesh(dierGeo(soort), this.mat); m.castShadow = true; m.visible = false;
    m.position.set(x, y, z); m.rotation.y = rot; this.scene.add(m);
    return m;
  }

  /** Slijk van de Slijkkraak: vlekken op het water die verdwijnen als een zone helder wordt. */
  _bouwSlijk() {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    const geos = [0, 1, 2, 3].map(i => slijkvlekGeo(i + 1));
    this.slijk = [];
    for (const w of WATERS) {
      if (w.id === 'zee') continue;
      const lengte = w.soort === 'strook' ? w.L : w.soort === 'boog' ? (w.a1 - w.a0) * w.r : Math.PI * (w.rx + w.rz);
      const n = Math.max(2, Math.round(lengte / 6));
      for (let i = 0; i < n; i++) {
        let x, z;
        if (w.soort === 'strook') { const s = (i + 0.2 + this.r() * 0.6) / n * w.L, d = (this.r() - 0.5) * w.halfB * 0.9; x = w.x0 + w.dx * s + w.nx * d; z = w.z0 + w.dz * s + w.nz * d; }
        else if (w.soort === 'boog') { const a = w.a0 + (i + 0.2 + this.r() * 0.6) / n * (w.a1 - w.a0), r = w.r + (this.r() - 0.5) * w.halfB * 0.9; x = Math.cos(a) * r; z = Math.sin(a) * r; }
        else { const a = this.r() * TAU, k = Math.sqrt(this.r()) * 0.75; x = w.x + Math.cos(a) * w.rx * k; z = w.z + Math.sin(a) * w.rz * k; }
        const m = new THREE.Mesh(geos[i % 4], mat);
        const sc = w.soort === 'vlek' && w.id !== 'minnewater' ? 1.3 : Math.min(1, (w.halfB || 2) / 1.6);
        m.position.set(x, WATER_Y + 0.03, z);
        m.rotation.y = this.r() * TAU;
        m.userData.id = 'slijk';
        this.scene.add(m);
        this.slijk.push({ obj: m, zone: w.zone, f: this.r() * 9, sc });
      }
    }
  }

  /** De waterstand van het thema overnemen: { zones: { zone: { helder } } }. */
  setStand(stand) {
    this.stand = stand;
    for (const [zone, z] of Object.entries(stand?.zones || {})) this.doelHelder[zone] = z.helder;
    for (const z of ZONES) if (this.doelHelder[z] == null) this.doelHelder[z] = 0;
    // de eerste keer meteen goed zetten (niet langzaam laten opklaren bij het openen van de stad)
    if (!this._gezet) { this._gezet = true; for (const [z, h] of Object.entries(this.doelHelder)) this.zoneHelder[z] = h; }
  }

  _dierPos(d, t, dt) {
    const w = d.w;
    if (w.soort === 'strook') {
      d.s += d.v * dt; if (d.s < 0.5 || d.s > w.L - 0.5) { d.v = -d.v; d.s = clamp(d.s, 0.5, w.L - 0.5); }
      const lat = d.lat + Math.sin(t * 0.4 + d.f) * 0.15;
      return { x: w.x0 + w.dx * d.s + w.nx * lat, z: w.z0 + w.dz * d.s + w.nz * lat, hx: w.dx * Math.sign(d.v), hz: w.dz * Math.sign(d.v) };
    }
    if (w.soort === 'boog') {
      d.a += d.v * dt / w.r; if (d.a < w.a0 + 0.04 || d.a > w.a1 - 0.04) { d.v = -d.v; d.a = clamp(d.a, w.a0 + 0.04, w.a1 - 0.04); }
      const r = w.r + d.lat + Math.sin(t * 0.4 + d.f) * 0.15, c = Math.cos(d.a), s = Math.sin(d.a), sg = Math.sign(d.v);
      return { x: c * r, z: s * r, hx: -s * sg, hz: c * sg };
    }
    d.a += d.v * dt * 0.35;
    const c = Math.cos(d.a), s = Math.sin(d.a), sg = Math.sign(d.v);
    return { x: w.x + c * w.rx * d.k, z: w.z + s * w.rz * d.k, hx: -s * w.rx * sg, hz: c * w.rz * sg };
  }

  tick(dt, t, { nacht = 0, zonDir, wind = 0 } = {}) {
    this.uT.value = t;
    const k = 1 - Math.exp(-dt * 0.9);
    for (const zone of Object.keys(this.doelHelder)) this.zoneHelder[zone] = lerp(this.zoneHelder[zone] ?? 0, this.doelHelder[zone], k);
    const u = this.waterMat.uniforms;
    ZONES.forEach((z, i) => { this.uHelder.value[i] = this.zoneHelder[z] ?? 0; });
    u.uNacht.value = nacht;
    if (zonDir) u.uZon.value.copy(zonDir);
    // slijk: zakt weg als de zone helder is
    for (const s of this.slijk) {
      const h = this.zoneHelder[s.zone] ?? 0;
      const sc = clamp(1 - h * 1.15, 0, 1) * s.sc;
      s.obj.visible = sc > 0.02;
      if (!s.obj.visible) continue;
      s.obj.scale.set(sc, sc * (0.9 + Math.sin(t * 0.7 + s.f) * 0.1), sc);
      s.obj.position.y = WATER_Y + 0.03 - (1 - sc) * 0.25;
    }
    let ng = 0;
    const golf = (x, z, s) => { if (ng < this.golven.instanceMatrix.count) { M4.compose(V3.set(x, WATER_Y + 0.015, z), Q.identity(), S3.setScalar(s)); this.golven.setMatrixAt(ng++, M4); } };
    // boten varen hun route, maar enkel als het water van hun thuiszone al een beetje proper is
    for (const b of this.boten) {
      const h = this.zoneHelder[b.rt.zone] ?? 0;
      b.obj.visible = h > 0.25;
      if (!b.obj.visible) continue;
      if (b.wacht > 0) b.wacht -= dt;
      else {
        b.s += b.rt.v * dt * b.richting;
        if (!b.rt.pad.lus && (b.s > b.rt.pad.L || b.s < 0)) { b.richting = -b.richting; b.s = clamp(b.s, 0, b.rt.pad.L); b.wacht = 3 + this.r() * 4; }
      }
      const p = b.rt.pad.punt(b.s);
      b.obj.position.set(p.x, WATER_Y + Math.sin(t * 1.3 + b.s) * 0.012, p.z);
      b.obj.rotation.set(0, Math.atan2(p.dx * b.richting, p.dz * b.richting), Math.sin(t * 1.1 + b.s) * 0.03 * (1 + wind));
      golf(p.x, p.z, b.rt.groot ? 4.2 : 1.5);
    }
    const aan = this.aangemeerdZones || [];
    this.aangemeerd.visible = aan.length > 0 && aan.some(z => (this.zoneHelder[z] ?? 0) > 0.3);
    // dieren: zichtbaar naar de helderheid, en ze zwemmen zachtjes langs de rei
    for (const d of this.dieren) {
      const h = this.zoneHelder[d.zone] ?? 0;
      const drempel = d.soort === 'vis' ? 0.5 : d.soort === 'zwaan' ? 0.6 : 0.4;
      d.obj.visible = h > drempel;
      if (!d.obj.visible || d.vast) continue;
      const p = this._dierPos(d, t, dt);
      const y = d.soort === 'vis' ? WATER_Y - 0.1 + Math.sin(t * 2 + d.f) * 0.04 : d.soort === 'kikker' ? WATER_Y + 0.01 : WATER_Y + 0.0;
      d.obj.position.set(p.x, y, p.z);
      d.obj.rotation.y = Math.atan2(-p.hx, -p.hz);        // de dieren kijken naar -z: draai ze in hun zwemrichting
      if (d.soort !== 'vis') golf(p.x, p.z, d.soort === 'zwaan' ? 0.8 : 0.55);
    }
    this.golven.count = ng; this.golven.instanceMatrix.needsUpdate = true;
  }

  /** Hoe helder is deze zone nu (gedempt)? */
  helder(zone) { return this.zoneHelder[zone] ?? 0; }
  /** De gemiddelde helderheid, voor de HUD. */
  get gemiddeld() { const v = Object.values(this.zoneHelder); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
}

export class Waterval {
  constructor(stad, { x = 9.2, z = 36.0, hoogte = 2.4, breedte = 3.2, rot = 0 } = {}) {
    this.stad = stad;
    const groep = this.groep = new THREE.Group();
    groep.position.set(x, 0, z); groep.rotation.y = rot;
    // rots
    // rotsblokken in plaats van een gladde doos: een ruwe stapel met mos bovenop, het water valt over de voorste rand
    const rr = rng('rots'), rotsGeo = new THREE.IcosahedronGeometry(1, 0);
    const steen = new THREE.MeshLambertMaterial({ color: '#958c7c', flatShading: true }), steen2 = new THREE.MeshLambertMaterial({ color: '#7f786b', flatShading: true });
    const mos = new THREE.MeshLambertMaterial({ color: '#6d8a45', flatShading: true });
    const blok = (mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(rotsGeo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rr() * 0.6, rr() * TAU, rr() * 0.6); m.castShadow = true; m.receiveShadow = true; groep.add(m); };
    const zb = (breedte + 1.6) / 2;
    for (let i = 0; i < 5; i++) {
      const z = -zb + (i + 0.5) / 5 * 2 * zb;
      blok(i % 2 ? steen : steen2, 0.95 + rr() * 0.2, hoogte * 0.45, z, 1.05, hoogte * 0.62, 0.75 + rr() * 0.2);   // de wand
      blok(steen2, -0.2 + rr() * 0.3, -0.25, z + (rr() - 0.5) * 0.4, 0.45 + rr() * 0.2, 0.35, 0.45 + rr() * 0.2);  // brokken in het water
    }
    for (let i = 0; i < 4; i++) blok(mos, 1.1 + rr() * 0.3, hoogte * 0.98, -zb * 0.8 + i / 3 * zb * 1.6, 0.85, 0.22, 0.6);
    // vallend water
    this.uT = { value: 0 };
    this.uHelder = { value: 0 };
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: this.uT, uHelder: this.uHelder },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uT; uniform float uHelder; varying vec2 vUv;
        float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
        void main(){
          float str = h21(floor(vec2(vUv.x * 22.0, (vUv.y + uT * 0.9) * 10.0)));
          vec3 helder = vec3(0.78, 0.92, 0.99), slijk = vec3(0.42, 0.44, 0.3);
          vec3 c = mix(slijk, helder, uHelder) * (0.72 + 0.4 * str);
          gl_FragColor = vec4(c, 0.86);
          #include <colorspace_fragment>
        }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
    });
    const valH = hoogte - WATER_Y;
    const val = new THREE.Mesh(new THREE.PlaneGeometry(breedte, valH), mat);
    val.position.set(-0.7, WATER_Y + valH / 2 - 0.2, 0); val.rotation.y = -Math.PI / 2;
    groep.add(val);
    // nevel
    this.nevel = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#eef8ff', transparent: true, opacity: 0.55, depthWrite: false }), 18);
    this.nevelData = [];
    const r = rng('nevel');
    for (let i = 0; i < 18; i++) this.nevelData.push({ a: r() * TAU, r: r() * 1.3, y: r() * 0.7, s: 0.2 + r() * 0.35, f: r() * 9 });
    groep.add(this.nevel);
    stad.scene.add(groep);
  }
  tick(dt, t, helder = 0) {
    this.uT.value = t; this.uHelder.value = helder;
    let i = 0;
    for (const p of this.nevelData) {
      const s = p.s * (0.7 + 0.5 * Math.sin(t * 1.6 + p.f)) * (0.5 + helder * 0.8);
      M4.compose(V3.set(-1.0 - Math.cos(p.a) * p.r * 0.4, WATER_Y + p.y + ((t * 0.5 + p.f) % 1) * 0.6, Math.sin(p.a) * p.r), Q.identity(), S3.set(s, s, s));
      this.nevel.setMatrixAt(i++, M4);
    }
    this.nevel.instanceMatrix.needsUpdate = true;
    void dt;
  }
}

/** Stralen van de fontein op de Markt: ze spuiten hoger als het water properder is. */
export class Fontein {
  constructor(stad, { x = 0, z = 4.3 } = {}) {
    this.stad = stad;
    const mat = new THREE.MeshLambertMaterial({ color: '#cdeeff', transparent: true, opacity: 0.8, depthWrite: false });
    this.straal = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.12, 1, 7).translate(0, 0.5, 0), mat, 90);
    this.straal.count = 0;
    this.pos = { x, z };
    this.data = [];
    const r = rng('fontein');
    for (let i = 0; i < 90; i++) {
      const ring = i < 10 ? 0 : i < 40 ? 1 : 2;
      this.data.push({ a: r() * TAU, ring, f: r() * 9, r: ring === 0 ? 0 : ring === 1 ? 0.55 : 1.5 });
    }
    stad.scene.add(this.straal);
  }
  tick(dt, t, aan = 0) {
    let i = 0;
    for (const p of this.data) {
      const kracht = aan * (0.7 + 0.3 * Math.sin(t * 2.2 + p.f));
      if (kracht < 0.05) continue;
      const hoog = (p.ring === 0 ? 2.6 : p.ring === 1 ? 1.1 : 0.6) * kracht;
      const y = (p.ring === 0 ? 2.3 : p.ring === 1 ? 1.65 : 0.4);
      M4.compose(V3.set(this.pos.x + Math.cos(p.a) * p.r, y, this.pos.z + Math.sin(p.a) * p.r), Q.setFromAxisAngle(new THREE.Vector3(Math.cos(p.a), 0, Math.sin(p.a)), p.ring === 0 ? 0 : 0.5),
        S3.set(1, Math.max(0.05, hoog), 1));
      this.straal.setMatrixAt(i++, M4);
    }
    this.straal.count = i;
    this.straal.instanceMatrix.needsUpdate = true;
    void dt;
  }
}
