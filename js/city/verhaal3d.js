// Het verhaal zichtbaar in de 3D-stad (thema 1, Zwinvliet): hoogwater in de straten, De Slijkkraak, afval en slijk
// op het water, en alles wat er week per week en labo per labo verandert (zie js/city/verhaal.js voor de regels).
//
// - Hoogwater: één doorzichtig watervlak boven de straten met een masker (dicht bij de reien en rond de Markt het
//   diepst). Hoe hoger het verhaal het water zet, hoe verder het over de kaaien komt. Daarna blijven plassen en
//   natte kasseien liggen. Het water in de reien staat dan ook hoger (water3d.setPeil). Regen geeft ook plassen.
// - Zandzakken voor de deuren, roeibootjes op de Markt, geen karren of wandelaars in het water.
// - Per week: gezonken masten en een slijkbank bij de Scheepswerf, bruin plat riet en waterlelies aan het Minnewater,
//   slijk op de sluisdeuren en een fruitboot op het slib, zeehonden op de zandbank, drie bouwplaatsen in week 5.
// - Codes uit de Codekluis: een regenboog (REGENBOOG), een zeilbootje met Byte (ZEILBOOT), een vlonder (KIKKER),
//   een getijdenmeter (GETIJDEN), de fontein en lampjes langs de reien (HELDER).
// - De overwinning: vlaggetjes, vuurwerk, lampjes en een zandbankje met de slikgarnaal.
// Niets hiervan is aanklikbaar (behalve de kop van De Slijkkraak), zodat gebouwen, geheimen en markers klikbaar blijven.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, clamp, lerp } from '../core/util.js';
import { Bouwer } from './modellen.js';
import { bootGeo, dierGeo } from './brugge.js';
import { WATERS, WATER_Y, PLEKKEN, MARKT_HUIZEN, PLEIN, inWater, oeverPunten } from './layout.js';
import { Slijkkraak3D } from './slijkkraak3d.js';
import { Pad, BYTE_ROUTE } from './vaart.js';

const TAU = Math.PI * 2;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), E = new THREE.Euler(), K = new THREE.Color();
const YAS = new THREE.Vector3(0, 1, 0);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const VLOED_Y = 0.1;            // hoogte van het hoogwater in de straten
const VLOED_PEIL = -0.06;              // het water in de reien bij hoogwater (normaal WATER_Y = -0.5)
const MS = 72, MN = 256;               // het masker: MS x MS wereldeenheden rond de Markt, MN x MN texels

const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y); }`;
const VLOED_VS = `
varying vec2 vXZ; varying vec3 vW;
#include <fog_pars_vertex>
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vXZ = w.xz; vW = w.xyz; vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv;
  #ifdef USE_FOG
    vFogDepth = - mv.z;
  #endif
}`;
// Hoogwater (bruin, troebel, met rimpels en schuim aan de rand), natte kasseien en plassen die de lucht spiegelen.
const VLOED_FS = `
uniform sampler2D uMasker; uniform float uS; uniform float uT; uniform float uVloed; uniform float uPlas; uniform float uRegen; uniform float uNacht;
uniform vec3 uHor; uniform vec3 uTop; uniform vec3 uZon;
varying vec2 vXZ; varying vec3 vW;
#include <fog_pars_fragment>
${NOISE}
float ringen(vec2 p, float schaal, float snel){
  vec2 c = floor(p * schaal), f = fract(p * schaal) - 0.5;
  float ph = fract(uT * snel + h21(c));
  float d = length(f - (vec2(h21(c + 1.7), h21(c + 3.1)) - 0.5) * 0.5);
  return smoothstep(0.035, 0.0, abs(d - ph * 0.45)) * (1.0 - ph);
}
void main(){
  vec4 mk = texture2D(uMasker, vXZ / uS + 0.5);
  float m = mk.r, inW = mk.g;
  float n = vn(vXZ * 0.55), n2 = vn(vXZ * 1.9 + 7.3), n3 = vn(vXZ * 4.1 - 3.1);
  float diepte = m + (n - 0.5) * 0.24 - (1.0 - uVloed);
  float aan = step(0.002, uVloed);
  float water = aan * smoothstep(0.0, 0.03, diepte);
  float rand = aan * smoothstep(-0.14, 0.0, diepte) * (1.0 - water);
  float vlek = smoothstep(0.64, 0.7, n2 * 0.62 + n3 * 0.38);
  float plas = vlek * max(uPlas * step(0.1, m), uRegen) * (1.0 - inW) * (1.0 - water);
  float nat = uPlas * smoothstep(0.05, 0.35, m) * 0.28 * (1.0 - water) + uRegen * 0.12;
  vec3 V = normalize(cameraPosition - vW);
  float stroom = vn(vXZ * 1.2 + vec2(uT * 0.22, uT * 0.15));
  float r = ringen(vXZ, 0.7, 0.33) + ringen(vXZ + 13.0, 1.1, 0.27) * 0.7 + uRegen * ringen(vXZ + 5.0, 2.6, 0.9);
  vec2 g = (vec2(vn(vXZ * 3.0 + uT * 0.5), vn(vXZ * 3.0 - uT * 0.45 + 9.0)) - 0.5) * 0.25;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.18 + 0.62 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 lucht = mix(uHor, uTop, 0.3);
  // het bruine hoogwater
  vec3 modder = mix(vec3(0.085, 0.052, 0.016), vec3(0.16, 0.105, 0.035), stroom);
  // stromende strepen naar de reien toe
  float streep = smoothstep(0.55, 0.9, vn(vec2(vXZ.x * 0.6 + vXZ.y * 0.25, vXZ.y * 2.4 - uT * 0.6)));
  modder = mix(modder, vec3(0.24, 0.17, 0.07), streep * 0.45);
  vec3 cw = mix(modder, lucht * vec3(0.7, 0.62, 0.45), fres * 0.45);
  float schuim = smoothstep(0.05, 0.0, diepte) * (0.6 + 0.4 * n3);
  cw = mix(cw, vec3(0.50, 0.46, 0.33), schuim * 0.75);
  float vuil = smoothstep(0.72, 0.8, n3) * smoothstep(0.4, 0.7, n2);
  cw = mix(cw, vec3(0.30, 0.33, 0.10), vuil * 0.6);
  cw += vec3(0.55, 0.5, 0.38) * r * 0.32;
  float sp = pow(max(dot(N, normalize(normalize(uZon) + V)), 0.0), 140.0);
  cw += vec3(1.0, 0.95, 0.85) * sp * 1.6 * (1.0 - uNacht);
  // een plas: donker met de lucht erin
  vec3 cp = mix(vec3(0.05, 0.045, 0.035), lucht * 0.85, 0.35 + fres * 0.5) + lucht * r * 0.25;
  vec3 c = mix(vec3(0.035, 0.03, 0.022), cp, step(0.01, plas));
  c = mix(c, cw, water);
  float a = max(max(water * mix(0.93, 0.7, inW), plas * 0.8), max(rand * 0.55, nat));
  c *= mix(1.0, 0.38, uNacht);
  if (a < 0.01) discard;
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
// de regenboog: banden over de dikte van een halve torus
const BOOG_FS = `
uniform float uA; varying vec2 vUv;
vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main(){
  float v = vUv.y;                      // rond de buis
  float band = clamp((cos(v * 6.2832) * 0.5 + 0.5), 0.0, 1.0);
  vec3 k = hue(0.78 * (1.0 - band));
  float a = smoothstep(0.0, 0.2, band) * smoothstep(1.0, 0.8, band) * uA;
  gl_FragColor = vec4(k, a * 0.55);
}`;

/** Het masker voor het hoogwater: hoe "laag" ligt elk stukje stad (1 = aan het water of op de Markt, 0 = droog). */
function maakMasker() {
  const data = new Uint8Array(MN * MN * 4), m = new Float32Array(MN * MN);
  const af = new Float32Array(MN * MN), nat = new Uint8Array(MN * MN);
  const telt = (w) => w && !['zee', 'haven', 'sluiskolk', 'noordrei'].includes(w.id);
  for (let j = 0; j < MN; j++) for (let i = 0; i < MN; i++) {
    const x = ((i + 0.5) / MN - 0.5) * MS, z = ((j + 0.5) / MN - 0.5) * MS;
    const w = inWater(x, z, 0);
    nat[j * MN + i] = telt(w) ? 1 : 0;
    af[j * MN + i] = telt(w) ? 0 : 1e6;
  }
  const D = Math.SQRT2;
  for (let j = 0; j < MN; j++) for (let i = 0; i < MN; i++) { const k = j * MN + i; let v = af[k]; if (!v) continue;
    if (i > 0) v = Math.min(v, af[k - 1] + 1); if (j > 0) { v = Math.min(v, af[k - MN] + 1); if (i > 0) v = Math.min(v, af[k - MN - 1] + D); if (i < MN - 1) v = Math.min(v, af[k - MN + 1] + D); } af[k] = v; }
  for (let j = MN - 1; j >= 0; j--) for (let i = MN - 1; i >= 0; i--) { const k = j * MN + i; let v = af[k]; if (!v) continue;
    if (i < MN - 1) v = Math.min(v, af[k + 1] + 1); if (j < MN - 1) { v = Math.min(v, af[k + MN] + 1); if (i < MN - 1) v = Math.min(v, af[k + MN + 1] + D); if (i > 0) v = Math.min(v, af[k + MN - 1] + D); } af[k] = v; }
  const texel = MS / MN;
  for (let j = 0; j < MN; j++) for (let i = 0; i < MN; i++) {
    const k = j * MN + i, x = ((i + 0.5) / MN - 0.5) * MS, z = ((j + 0.5) / MN - 0.5) * MS, r = Math.hypot(x, z);
    const d = af[k] * texel;
    // dicht bij de reien, op de Markt en aan de Rozenhoedkaai ligt de stad het laagst
    let v = Math.max(clamp(1 - d / 7.5, 0, 1), clamp(1.2 - r / 12, 0, 1));
    v += 0.3 * clamp(1 - Math.hypot(x, z - 12) / 8, 0, 1);
    v *= 1 - smooth(26.5, 29.5, r);
    m[k] = clamp(v, 0, 1);
    data[k * 4] = Math.round(m[k] * 255); data[k * 4 + 1] = nat[k] ? 255 : 0; data[k * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, MN, MN, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return { tex: t, m, nat };
}

/** Een tekstbordje (canvas) voor de bouwplaatsen en het weerscherm. */
function tekstTex(w, h, teken) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  teken(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export class Verhaal3D {
  constructor(stad) {
    this.stad = stad; this.scene = stad.scene; this.r = rng('verhaal');
    this.mat = stad._lijfMat();
    this.stand = null;
    this.nu = { vloed: 0, plassen: 0, regen: 0 };
    this.props = [];
    this._bouwVloed();
    this.kraak = new Slijkkraak3D(stad);
    this._bouwAfval();
    this._bouwZandzakken();
    this._bouwWeek1();
    this._bouwWeek2();
    this._bouwWeek3();
    this._bouwWeek4();
    this._bouwWeek5();
    this._bouwFeest();
    // de kop van De Slijkkraak kan je aanklikken (een kort stukje verhaal)
    stad.kiesbaar = stad.kiesbaar || [];
    this.kraakKlik = this.kraak.groep;
  }

  // ---------- hulpjes ----------
  /** Een ding dat verschijnt of verdwijnt: 'schaal' (groeit), 'zak' (zakt weg in het water) of 'aan' (gewoon aan/uit). */
  _prop(obj, soort = 'schaal', diep = 1.2) {
    const p = { obj, soort, diep, nu: 0, doel: 0, basisY: obj.position.y, basisS: obj.scale.clone() };
    obj.visible = false; this.scene.add(obj); this.props.push(p);
    return p;
  }
  _mesh(bouwer, mat = this.mat) { const m = new THREE.Mesh(bouwer.bouw().body, mat); m.castShadow = true; m.receiveShadow = true; return m; }

  // ---------- hoogwater ----------
  _bouwVloed() {
    const mk = maakMasker();
    this.masker = mk;
    this.vloedMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uMasker: { value: null }, uS: { value: MS }, uT: { value: 0 }, uVloed: { value: 0 }, uPlas: { value: 0 }, uRegen: { value: 0 }, uNacht: { value: 0 },
        uHor: { value: new THREE.Color('#d6ecfb') }, uTop: { value: new THREE.Color('#4ea3ee') }, uZon: { value: new THREE.Vector3(0.4, 0.8, 0.3) },
      }]),
      vertexShader: VLOED_VS, fragmentShader: VLOED_FS, transparent: true, depthWrite: false, fog: true,
    });
    this.vloedMat.uniforms.uMasker.value = mk.tex;
    this.vloed = new THREE.Mesh(new THREE.PlaneGeometry(MS, MS).rotateX(-Math.PI / 2), this.vloedMat);
    this.vloed.position.y = VLOED_Y; this.vloed.renderOrder = 1; this.vloed.visible = false;
    this.scene.add(this.vloed);
  }
  /** Masker op (x, z): 0..1 (buiten het masker 0). */
  masker01(x, z) {
    const i = Math.floor((x / MS + 0.5) * MN), j = Math.floor((z / MS + 0.5) * MN);
    if (i < 0 || j < 0 || i >= MN || j >= MN) return 0;
    return this.masker.m[j * MN + i];
  }
  /** Staat (x, z) nu onder water? (voor de karren en wandelaars) */
  natOp(x, z) { return this.nu.vloed > 0.01 && this.masker01(x, z) > 1.04 - this.nu.vloed; }

  // ---------- afval op het water ----------
  _bouwAfval() {
    this.afvalPunten = [];
    const r = rng('afval');
    const zones = new Map();
    for (const w of WATERS) {
      if (w.id === 'zee') continue;
      const lengte = w.soort === 'strook' ? w.L : w.soort === 'boog' ? (w.a1 - w.a0) * w.r : Math.PI * (w.rx + w.rz) * 0.6;
      const n = Math.max(2, Math.round(lengte / 2.6));
      for (let i = 0; i < n; i++) {
        let x, z;
        if (w.soort === 'strook') { const s = r() * w.L, d = (r() - 0.5) * w.halfB * 1.4; x = w.x0 + w.dx * s + w.nx * d; z = w.z0 + w.dz * s + w.nz * d; }
        else if (w.soort === 'boog') { const a = w.a0 + r() * (w.a1 - w.a0), rr = w.r + (r() - 0.5) * w.halfB * 1.4; x = Math.cos(a) * rr; z = Math.sin(a) * rr; }
        else { const a = r() * TAU, k = Math.sqrt(r()) * 0.8; x = w.x + Math.cos(a) * w.rx * k; z = w.z + Math.sin(a) * w.rz * k; }
        const lijst = zones.get(w.zone) || zones.set(w.zone, []).get(w.zone);
        lijst.push({ x, z, zone: w.zone, soort: r() < 0.55 ? 0 : 1, rot: r() * TAU, f: r() * 9, k: lijst.length });
      }
    }
    // de reien rond de Markt in week 5 (afval van de grijze slijkarmen)
    const markt = [];
    for (const id of ['groenerei', 'spiegelrei', 'langerei', 'rozenhoedkaai']) {
      const w = WATERS.find(x => x.id === id);
      for (let i = 0; i < 7; i++) { const s = r() * Math.min(w.L, 4.5), d = (r() - 0.5) * w.halfB * 1.5; markt.push({ x: w.x0 + w.dx * s + w.nx * d, z: w.z0 + w.dz * s + w.nz * d, zone: 'markt', soort: r() < 0.5 ? 0 : 1, rot: r() * TAU, f: r() * 9, k: markt.length }); }
    }
    zones.set('markt', markt);
    // afval dat in de straten drijft bij hoogwater
    const straat = [];
    for (let i = 0; i < 400 && straat.length < 26; i++) {
      const x = (r() - 0.5) * 44, z = (r() - 0.5) * 44, m = this.masker01(x, z);
      if (m < 0.5 || inWater(x, z, 0.3) || Math.hypot(x - PLEIN.klasmeter.x, z - PLEIN.klasmeter.z) < 2.6) continue;
      straat.push({ x, z, zone: 'straat', m, soort: r() < 0.5 ? 0 : 1, rot: r() * TAU, f: r() * 9, k: straat.length });
    }
    zones.set('straat', straat);
    this.afvalZones = zones;
    const n = [...zones.values()].reduce((s, l) => s + l.length, 0);
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    this.flessen = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 7).rotateZ(Math.PI / 2), mat, n);
    this.zakjes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 5), mat, n);
    const kF = ['#9fd6e8', '#7fbf6a', '#f2f2ee', '#c9ced6', '#e2643e'], kZ = ['#f2f2ee', '#e9e4c8', '#3d8fe0', '#e9578a', '#f2c94c'];
    for (let i = 0; i < n; i++) { this.flessen.setColorAt(i, K.set(kF[i % kF.length])); this.zakjes.setColorAt(i, K.set(kZ[(i * 3) % kZ.length])); }
    for (const m of [this.flessen, this.zakjes]) { m.count = 0; m.frustumCulled = false; m.castShadow = false; this.scene.add(m); }
  }

  // ---------- zandzakken voor de deuren en bootjes op de Markt ----------
  _bouwZandzakken() {
    const b = new Bouwer('zandzakken'); b.ao = false;
    for (let i = 0; i < 3; i++) b.ellips(0.17, 0.09, 0.11, -0.3 + i * 0.3, 0.08, 0, i % 2 ? '#c9b48a' : '#bba579', 8);
    for (let i = 0; i < 2; i++) b.ellips(0.17, 0.09, 0.11, -0.15 + i * 0.3, 0.24, 0, '#c4ae82', 8);
    const geo = b.bouw().body;
    const plekken = [];
    for (const h of MARKT_HUIZEN) plekken.push({ x: h.x + Math.sin(h.rot) * 0.95, z: h.z + Math.cos(h.rot) * 0.95, rot: h.rot });
    for (const id of ['belfort', 'hallen', 'provinciaalhof', 'olvkerk', 'scheepswerf']) {
      const p = PLEKKEN[id], d = p.d / 2 + 0.35;
      plekken.push({ x: p.x + Math.sin(p.rot) * d, z: p.z + Math.cos(p.rot) * d, rot: p.rot });
    }
    this.zakken = new THREE.InstancedMesh(geo, this.mat, plekken.length);
    plekken.forEach((p, i) => { M4.compose(V3.set(p.x, 0.02, p.z), Q.setFromAxisAngle(YAS, p.rot), S3.set(1, 1, 1)); this.zakken.setMatrixAt(i, M4); });
    this.zakken.castShadow = true;
    this.zakkenProp = this._prop(this.zakken, 'schaal');
    // twee roeibootjes drijven op de Markt
    const roei = bootGeo('roei').body;
    this.straatBoten = [[-3.6, 2.8, 0.6], [3.7, -1.2, 2.1], [-1.6, 9.0, 1.3]].map(([x, z, rot]) => {
      const m = new THREE.Mesh(roei, this.mat); m.castShadow = true;
      m.position.set(x, VLOED_Y, z); m.rotation.y = rot;
      const p = this._prop(m, 'aan'); p.x = x; p.z = z; p.rot = rot;
      return p;
    });
  }

  // ---------- week 1: het Weerstation, het weerscherm, de regenboog ----------
  _bouwWeek1() {
    // ramen van het weerstation in de lantaarn van het Belfort
    const bf = PLEKKEN.belfort;
    this.weerLampMat = new THREE.MeshBasicMaterial({ color: '#2b2a30' });
    const b = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.62, 0.05), this.weerLampMat, 8);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + Math.PI / 8;
      M4.compose(V3.set(bf.x + Math.cos(a) * 0.665, 7.0, bf.z - 0.1 + Math.sin(a) * 0.665), Q.setFromAxisAngle(YAS, -a + Math.PI / 2), S3.set(1, 1, 1));
      b.setMatrixAt(i, M4);
    }
    this.scene.add(b);
    this.weerGloed = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.stad.gloedTex, color: '#ffd27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.weerGloed.position.set(bf.x, 7.1, bf.z - 0.1); this.weerGloed.scale.setScalar(3.2); this.weerGloed.renderOrder = 4;
    this.scene.add(this.weerGloed);
    // het weerscherm op de gevel (het bord bestaat al in stad3d.js: this.stad.weerbord)
    this.schermCanvas = document.createElement('canvas'); this.schermCanvas.width = 256; this.schermCanvas.height = 150;
    this.schermTex = new THREE.CanvasTexture(this.schermCanvas); this.schermTex.colorSpace = THREE.SRGBColorSpace;
    this.scherm = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.74), new THREE.MeshBasicMaterial({ map: this.schermTex, toneMapped: false }));
    const wb = this.stad.weerbord;
    if (wb) this.scherm.position.set(wb.position.x, wb.position.y + 0.07 + 0.37, wb.position.z + 0.065);
    this.scene.add(this.scherm); this.scherm.visible = false;
    // de regenboog boven het Belfort, en een kleine bij de fontein
    const boogMat = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: BOOG_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.boogMat = boogMat;
    const boogGeo = new THREE.TorusGeometry(1, 0.075, 10, 64, Math.PI);
    this.boog = new THREE.Mesh(boogGeo, boogMat); this.boog.scale.setScalar(13); this.boog.position.set(0, -1.5, -8); this.boog.visible = false; this.boog.renderOrder = 5;
    this.scene.add(this.boog);
    this.boogKlein = new THREE.Mesh(boogGeo, new THREE.ShaderMaterial({ uniforms: { uA: { value: 0.9 } }, vertexShader: boogMat.vertexShader, fragmentShader: BOOG_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.boogKlein.scale.setScalar(1.25); this.boogKlein.position.set(PLEIN.klasmeter.x, 1.2, PLEIN.klasmeter.z); this.boogKlein.renderOrder = 5;
    this.boogKleinProp = this._prop(this.boogKlein, 'schaal');
  }
  _tekenScherm(w) {
    const g = this.schermCanvas.getContext('2d'), W = 256, H = 150;
    g.fillStyle = '#10202f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7fd3ff'; g.font = '700 20px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText('WEER BRUGGE', 12, 8);
    g.fillStyle = '#ffffff'; g.font = '800 46px system-ui, sans-serif';
    g.fillText(w ? `${Math.round(w.temp)}°` : '--', 12, 34);
    g.font = '600 19px system-ui, sans-serif'; g.fillStyle = '#d7f0ff';
    const live = w && (w.bron === 'open-meteo' || w.bron === 'cache' || w.bron === 'test');
    g.fillText(w ? (w.tekst || '').slice(0, 18) : 'geen weer', 112, 40);
    g.fillText(w ? `wind ${Math.round(w.wind)} km/u` : '', 112, 64);
    g.fillText(w ? `regen ${Math.round((w.neerslag || 0) * 10) / 10} mm` : '', 12, 96);
    g.fillText(w?.druk ? `${Math.round(w.druk)} hPa` : '', 150, 96);
    g.fillStyle = live ? '#7be08f' : '#ffb35c'; g.font = '700 15px system-ui, sans-serif';
    g.fillText(live ? 'live' : 'geen live weer', 12, 124);
    this.schermTex.needsUpdate = true;
  }

  // ---------- week 2: gezonken bootjes en een slijkbank bij de Scheepswerf, het zeilbootje met Byte ----------
  _bouwWeek2() {
    this.masten = [[-0.9, -17.6, 0.35, 0.2], [-0.8, -21.4, -0.3, 0.5], [0.85, -18.6, 0.2, -0.4]].map(([x, z, kx, kz], i) => {
      const b = new Bouwer('mast' + i); b.ao = false;
      b.cil(0.045, 0.06, 2.1, 0, -0.9, 0, '#6b4a2e', 6);
      b.blok(0.9, 0.04, 0.04, 0, 0.75, 0, '#6b4a2e', [0, 0.4, 0]);
      b.blok(0.03, 0.5, 0.38, 0.06, 0.25, 0.06, i === 1 ? '#c94c3a' : '#e8dfc8', [0, 0.4, 0.05]);      // een flard zeil
      b.blok(0.5, 0.12, 0.24, 0, -0.08, 0, '#5a3e26', [0.2, 0.3, 0]);                                 // de rand van de romp
      const m = this._mesh(b); m.position.set(x, WATER_Y, z); m.rotation.set(kx, i, kz);
      return this._prop(m, 'zak', 2.4);
    });
    const sb = new Bouwer('slijkbank'); sb.ao = false;
    for (let i = 0; i < 9; i++) sb.ellips(0.55 + this.r() * 0.4, 0.22 + this.r() * 0.12, 0.6 + this.r() * 0.5, (this.r() - 0.5) * 1.1, 0, (this.r() - 0.5) * 2.6, ['#5c4a27', '#6b5730', '#4f3f20', '#76663a'][i % 4], 10);
    sb.cil(0.08, 0.08, 0.28, 0.3, 0.18, 0.4, '#9fd6e8', 8, [Math.PI / 2, 0, 0.6]).cil(0.1, 0.1, 0.18, -0.4, 0.2, -0.7, '#c9ced6', 8, [Math.PI / 2, 0.4, 0]);
    const bank = this._mesh(sb); bank.position.set(0.35, WATER_Y, -19.7);
    this.slijkbank = this._prop(bank, 'zak', 0.8);
    // het zeilbootje met Byte aan het roer (code ZEILBOOT)
    const z = new THREE.Group();
    const boot = new THREE.Mesh(bootGeo('zeil').body, this.mat); boot.castShadow = true; boot.scale.setScalar(0.7); z.add(boot);
    const bb = new Bouwer('byte-boot'); bb.ao = false;
    bb.box(0.2, 0.22, 0.16, 0, 0.12, 0.55, '#b7c3d4').box(0.16, 0.13, 0.14, 0, 0.36, 0.55, '#d5dde8').box(0.11, 0.04, 0.02, 0, 0.42, 0.63, '#4fd2ff').cil(0.01, 0.01, 0.12, 0, 0.49, 0.55, '#5c6372', 4).bol(0.03, 0, 0.62, 0.55, '#e2643e', 6);
    z.add(this._mesh(bb));
    this.zeilboot = this._prop(z, 'aan'); this.zeilboot.s = 0;
  }

  // ---------- week 3: riet, waterlelies, het Waterlabo, de vlonder ----------
  _bouwWeek3() {
    const mw = WATERS.find(w => w.id === 'minnewater');
    const rb = new Bouwer('riet'); rb.ao = false;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rb.cil(0.002, 0.03, 0.55 + (i % 3) * 0.18, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, '#ffffff', 4); }
    rb.cil(0.035, 0.035, 0.14, 0.05, 0.6, 0, '#7a5a3a', 6).cil(0.035, 0.035, 0.14, -0.08, 0.5, 0.05, '#7a5a3a', 6);
    const n = 46;
    this.riet = new THREE.InstancedMesh(rb.bouw().body, new THREE.MeshLambertMaterial({ vertexColors: true }), n);
    this.rietData = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + this.r() * 0.08, k = 0.9 + this.r() * 0.06;
      const x = mw.x + Math.cos(a) * mw.rx * k, z = mw.z + Math.sin(a) * mw.rz * k;
      this.rietData.push({ x, z, a, s: 0.8 + this.r() * 0.5, f: this.r() * 9 });
    }
    this.riet.castShadow = true; this.riet.frustumCulled = false; this.scene.add(this.riet);
    this.rietGroen = 0;
    // waterlelies en een kikker op een lelieblad
    const lb = new Bouwer('lelies'); lb.ao = false;
    for (let i = 0; i < 16; i++) {
      const a = this.r() * TAU, k = 0.35 + this.r() * 0.5, x = Math.cos(a) * mw.rx * k, z = Math.sin(a) * mw.rz * k, s = 0.18 + this.r() * 0.14;
      lb.cil(s, s, 0.02, x, 0, z, i % 2 ? '#4f9a3c' : '#5fae46', 10);
      if (i % 3 === 0) lb.kegel(0.08, 0.1, x + 0.05, 0.02, z, i % 2 ? '#ffffff' : '#f7a8c8', 6);
    }
    lb.ellips(0.08, 0.05, 0.1, 0.9, 0.06, -0.4, '#5fbf3c', 8).bol(0.025, 0.86, 0.12, -0.47, '#ffffff', 5).bol(0.025, 0.94, 0.12, -0.47, '#ffffff', 5);
    const lel = this._mesh(lb); lel.position.set(mw.x, WATER_Y + 0.01, mw.z); lel.castShadow = false;
    this.lelies = this._prop(lel, 'schaal');
    // de ramen van het Waterlabo (donker tot het labo begint)
    const wl = PLEKKEN.waterlabo, sc = wl.schaal || 1;
    this.laboMat = new THREE.MeshBasicMaterial({ color: '#27313c' });
    const ramen = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.5, 0.03), this.laboMat, 3);
    [-0.66, 0, 0.66].forEach((lx, i) => {
      const lz = 0.93, c = Math.cos(wl.rot), s = Math.sin(wl.rot);
      M4.compose(V3.set(wl.x + (c * lx + s * lz) * sc, 1.45 * sc, wl.z + (-s * lx + c * lz) * sc), Q.setFromAxisAngle(YAS, wl.rot), S3.setScalar(sc));
      ramen.setMatrixAt(i, M4);
    });
    this.scene.add(ramen);
    this.laboGloed = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.stad.gloedTex, color: '#ffe0a0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.laboGloed.position.set(wl.x + Math.sin(wl.rot) * 1.0, 1.5, wl.z + Math.cos(wl.rot) * 1.0); this.laboGloed.scale.setScalar(3.4); this.laboGloed.renderOrder = 4;
    this.scene.add(this.laboGloed);
    // de vlonder met een kikkerpoel (code KIKKER)
    const vb = new Bouwer('vlonder'); vb.ao = false;
    for (let i = 0; i < 6; i++) vb.box(1.3, 0.05, 0.2, 0, 0.0, -0.6 + i * 0.22, i % 2 ? '#a8845a' : '#9a7650');
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.55], [0.6, 0.55]]) vb.cil(0.05, 0.05, 0.8, x, -0.75, z, '#6e5238', 6);
    vb.ellips(0.08, 0.05, 0.1, 0.3, 0.07, 0.2, '#5fbf3c', 8).bol(0.025, 0.27, 0.12, 0.13, '#ffffff', 5).bol(0.025, 0.34, 0.12, 0.13, '#ffffff', 5);
    const vl = this._mesh(vb); vl.position.set(-1.6, 0.02, mw.z - mw.rz + 0.35);
    this.vlonder = this._prop(vl, 'schaal');
  }

  // ---------- week 4: de sluis, de fruitboot, de zeehonden, de getijdenmeter ----------
  _bouwWeek4() {
    const sb = new Bouwer('sluisslijk'); sb.ao = false;
    for (const z of [-53.95, -57.85]) for (let i = 0; i < 9; i++) sb.ico(0.2 + this.r() * 0.18, -1.5 + i * 0.38, -0.15 + this.r() * 0.6, z + (this.r() - 0.5) * 0.3, ['#5c4a27', '#6b5730', '#7b8a3a'][i % 3], 1, 0.8);
    const slijk = this._mesh(sb);
    this.sluisSlijk = this._prop(slijk, 'schaal');
    this.sluisSlijk.basisS = new THREE.Vector3(1, 1, 1);
    // de lamp van de sluiswachter: rood = vast, groen = de sluis werkt
    const lb = new Bouwer('sluislamp'); lb.ao = false;
    lb.cil(0.04, 0.05, 1.5, 0, 0, 0, '#3a3f4a', 6).box(0.22, 0.3, 0.22, 0, 1.5, 0, '#2d3240');
    const paal = this._mesh(lb); paal.position.set(2.2, 0, -52.9); this.scene.add(paal);
    this.sluisLampMat = new THREE.MeshBasicMaterial({ color: '#ff3b2f' });
    this.sluisLamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), this.sluisLampMat); this.sluisLamp.position.set(2.2, 1.66, -52.9); this.scene.add(this.sluisLamp);
    this.sluisGloed = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.stad.gloedTex, color: '#ff4a3a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    this.sluisGloed.position.copy(this.sluisLamp.position); this.sluisGloed.scale.setScalar(1.3); this.sluisGloed.renderOrder = 4; this.scene.add(this.sluisGloed);
    // de fruitboot: scheef op het slib, of veilig aan de kaai
    const fb = new Bouwer('fruitboot'); fb.ao = false;
    fb.box(1.3, 0.5, 3.4, 0, -0.3, 0, '#7a4b2e').box(1.36, 0.08, 3.46, 0, 0.18, 0, '#e8dfc8').box(0.9, 0.5, 0.8, 0, 0.2, -1.1, '#f0e6d0').dak(0.95, 0.3, 0.85, 0, 0.7, -1.1, '#c94c3a');
    const kist = ['#f0a531', '#e2643e', '#f2c94c', '#7fbf4a', '#e2643e', '#f0a531'];
    for (let i = 0; i < 6; i++) { const x = (i % 2 ? 0.28 : -0.28), z = -0.2 + Math.floor(i / 2) * 0.55; fb.box(0.48, 0.3, 0.44, x, 0.22, z, '#a8743f'); for (let k = 0; k < 3; k++) fb.bol(0.08, x - 0.12 + k * 0.12, 0.56, z, kist[i], 6); }
    fb.cil(0.04, 0.05, 1.8, 0, 0.2, 0.7, '#6b4a2e', 6);
    this.fruitboot = new THREE.Mesh(fb.bouw().body, this.mat); this.fruitboot.castShadow = true; this.fruitboot.visible = false; this.scene.add(this.fruitboot);
    const plaat = new Bouwer('slibplaat'); plaat.ao = false;
    for (let i = 0; i < 7; i++) plaat.ellips(0.8 + this.r() * 0.6, 0.18, 0.9 + this.r() * 0.6, (this.r() - 0.5) * 2.2, 0, (this.r() - 0.5) * 3.2, ['#5c4a27', '#6b5730', '#4f3f20'][i % 3], 10);
    const pl = this._mesh(plaat); pl.position.set(6.6, WATER_Y, -66.4);
    this.slibplaat = this._prop(pl, 'zak', 0.6);
    this.fruit = { nu: 0, plek: null };
    // de zandbank voor de haven met zeehonden
    const zb = new Bouwer('zandbank'); zb.ao = false;
    for (let i = 0; i < 6; i++) zb.ellips(1.2 + this.r() * 0.8, 0.22, 0.8 + this.r() * 0.5, (this.r() - 0.5) * 3.2, 0, (this.r() - 0.5) * 1.4, ['#e3d3a6', '#d8c592', '#ead9ad'][i % 3], 10);
    const bank = this._mesh(zb); bank.position.set(-10.5, WATER_Y, -70.5);
    this.zandbank = this._prop(bank, 'zak', 0.5);
    const zh = dierGeo('zeehond');
    this.zeehonden = [[-11.4, -70.2, 0.4], [-9.6, -70.8, 2.1], [-10.6, -71.1, 4.0]].map(([x, z, r]) => {
      const m = new THREE.Mesh(zh, this.mat); m.position.set(x, WATER_Y + 0.18, z); m.rotation.y = r; m.scale.setScalar(1.4); m.castShadow = true;
      return this._prop(m, 'schaal');
    });
    // de getijdenmeter op de havenmuur (code GETIJDEN): het water erin stijgt en daalt met eb en vloed
    const gb = new Bouwer('getijmeter'); gb.ao = false;
    gb.cil(0.05, 0.06, 2.2, 0, 0, 0, '#3a3f4a', 6).box(0.5, 1.5, 0.08, 0, 0.5, 0.06, '#f4efe2');
    for (let i = 0; i < 6; i++) gb.box(0.18, 0.025, 0.02, -0.12, 0.62 + i * 0.24, 0.11, '#2d3240');
    gb.box(0.6, 0.18, 0.1, 0, 2.05, 0.06, '#2f8fd6');
    const gm = new THREE.Group(); gm.add(this._mesh(gb));
    this.getijWater = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1, 0.03).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: '#2f8fd6' }));
    this.getijWater.position.set(0.1, 0.55, 0.11); gm.add(this.getijWater);
    gm.position.set(7.6, 0, -57.4); gm.rotation.y = Math.PI;
    this.getijmeter = this._prop(gm, 'schaal');
  }

  // ---------- week 5: drie bouwplaatsen in de Langerei, slijk in de fontein ----------
  _bouwWeek5() {
    const namen = ['Rietveld', 'Vistrap', 'Afvalvanger'];
    const plekken = [[-13.2, 0.95], [-19.8, 0.95], [-27.0, 0.95]];
    this.bouwplaatsen = plekken.map(([x, z], i) => {
      // fase 1: oranje boeien en een bordje
      const b1 = new Bouwer('bp1-' + i); b1.ao = false;
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; b1.cil(0.1, 0.12, 0.3, Math.cos(a) * 0.9, -0.1, Math.sin(a) * 0.55, '#ff7a1a', 8).bol(0.06, Math.cos(a) * 0.9, 0.22, Math.sin(a) * 0.55, '#ffffff', 6); }
      const fase1 = this._mesh(b1); fase1.position.set(x, WATER_Y, z);
      const bord = new THREE.Group();
      const paal = new Bouwer('bp-paal' + i); paal.ao = false; paal.cil(0.04, 0.04, 1.0, 0, 0, 0, '#6e5238', 6);
      bord.add(this._mesh(paal));
      const tex = tekstTex(256, 96, (g, W, H) => { g.fillStyle = '#ff8a2a'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffff'; g.fillRect(6, 6, W - 12, H - 12); g.fillStyle = '#2d3240'; g.font = '800 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(namen[i], W / 2, H / 2 + 2); });
      const plank = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.42), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
      plank.position.set(0, 1.05, 0.04); bord.add(plank);
      bord.position.set(x, 0, z + 1.75);
      // fase 2: een stelling
      const b2 = new Bouwer('bp2-' + i); b2.ao = false;
      const k2 = '#8a6440';
      for (const [px, pz] of [[-0.6, -0.45], [0.6, -0.45], [-0.6, 0.45], [0.6, 0.45]]) b2.box(0.05, 1.5, 0.05, px, -0.4, pz, k2);
      for (const yy of [0.2, 0.6]) b2.box(1.25, 0.04, 0.05, 0, yy, 0.45, k2).box(1.25, 0.04, 0.05, 0, yy, -0.45, k2).box(0.05, 0.04, 0.95, 0.6, yy, 0, k2).box(0.05, 0.04, 0.95, -0.6, yy, 0, k2);
      const fase2 = this._mesh(b2); fase2.position.set(x, 0, z);
      // fase 3: het echte bouwwerk
      const b3 = new Bouwer('bp3-' + i); b3.ao = false;
      if (i === 0) {        // rietveld met een reiger
        for (let k = 0; k < 22; k++) { const xx = (this.r() - 0.5) * 1.6, zz = (this.r() - 0.5) * 0.9; b3.cil(0.003, 0.035, 0.7 + this.r() * 0.5, xx, -0.1, zz, k % 3 ? '#5f9a3a' : '#79b04a', 4); }
        b3.box(1.7, 0.06, 1.0, 0, -0.12, 0, '#6b8a3a');
      } else if (i === 1) { // vistrap: treden met water en springende vissen
        for (let k = 0; k < 4; k++) b3.box(0.5, 0.18 + k * 0.16, 1.0, -0.75 + k * 0.5, -0.2, 0, k % 2 ? '#a7adb6' : '#8e95a0').box(0.44, 0.03, 0.9, -0.75 + k * 0.5, -0.02 + k * 0.16, 0, '#7fc8ee');
        b3.ellips(0.12, 0.05, 0.04, -0.3, 0.55, 0, '#c0c8d0', 6).ellips(0.1, 0.04, 0.035, 0.35, 0.75, 0.2, '#b0b8a0', 6);
      } else {              // afvalvanger: een raam met een net vol afval
        for (const px of [-0.7, 0.7]) b3.cil(0.05, 0.05, 1.2, px, -0.3, 0, '#3a3f4a', 6);
        b3.box(1.46, 0.06, 0.06, 0, 0.88, 0, '#3a3f4a').box(1.36, 0.7, 0.04, 0, 0.12, 0, '#2f5a3a');
        for (let k = 0; k < 6; k++) b3.box(0.14, 0.1, 0.1, -0.5 + k * 0.2, 0.12 + (k % 2) * 0.1, 0.05, ['#9fd6e8', '#f2f2ee', '#e9578a', '#f2c94c', '#7fbf6a', '#c9ced6'][k]);
      }
      const fase3 = this._mesh(b3); fase3.position.set(x, WATER_Y + 0.12, z);
      const reiger = i === 0 ? new THREE.Mesh(dierGeo('reiger'), this.mat) : null;
      if (reiger) { reiger.position.set(x + 0.3, WATER_Y + 0.05, z + 0.1); reiger.rotation.y = 2.4; reiger.castShadow = true; }
      return { fase1: this._prop(fase1, 'zak', 0.6), bord: this._prop(bord, 'schaal'), fase2: this._prop(fase2, 'schaal'), fase3: this._prop(fase3, 'schaal'), reiger: reiger ? this._prop(reiger, 'schaal') : null };
    });
    // slijk in de schaal van de fontein (tot de fontein weer spuit)
    const fs = new Bouwer('fonteinslijk'); fs.ao = false;
    fs.cil(1.8, 1.8, 0.04, 0, 0, 0, '#5c4a27', 20);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; fs.ellips(0.3, 0.07, 0.24, Math.cos(a) * 1.25, 0.03, Math.sin(a) * 1.25, i % 2 ? '#6b5730' : '#7b8a3a', 8); }
    fs.cil(0.06, 0.06, 0.24, 0.9, 0.05, -0.5, '#9fd6e8', 8, [Math.PI / 2, 0, 0.7]);
    const fsm = this._mesh(fs); fsm.position.set(PLEIN.klasmeter.x, 0.26, PLEIN.klasmeter.z); fsm.castShadow = false;
    this.fonteinSlijk = this._prop(fsm, 'aan');
  }

  // ---------- het feest: lampjes, vlaggetjes, vuurwerk, de slikgarnaal ----------
  _bouwFeest() {
    // lampjes langs de kaaien rond de Markt
    const punten = [];
    for (const id of ['rozenhoedkaai', 'dijver', 'groenerei', 'spiegelrei', 'langerei']) {
      const w = WATERS.find(x => x.id === id);
      for (const p of oeverPunten(w, 0.75)) if (Math.hypot(p.x, p.z) < 27) punten.push({ x: p.x + p.nx * 0.25, z: p.z + p.nz * 0.25 });
    }
    this.lampjes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), punten.length);
    const kl = ['#ffd27a', '#ff9ec4', '#9fe6ff', '#c8ff9a'];
    punten.forEach((p, i) => { M4.compose(V3.set(p.x, 0.42, p.z), Q.identity(), S3.setScalar(1)); this.lampjes.setMatrixAt(i, M4); this.lampjes.setColorAt(i, K.set(kl[i % 4])); });
    this.lampjesData = punten;
    this.lampjesProp = this._prop(this.lampjes, 'aan');
    // vlaggetjes over de Markt
    const vlag = new THREE.ConeGeometry(0.11, 0.24, 3).rotateX(Math.PI).translate(0, -0.12, 0);
    const lijnen = [];
    for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU + 0.3, a1 = a0 + Math.PI * 0.62; lijnen.push([{ x: Math.cos(a0) * 5.9, z: PLEIN.klasmeter.z + Math.sin(a0) * 5.9 }, { x: Math.cos(a1) * 5.9, z: PLEIN.klasmeter.z + Math.sin(a1) * 5.9 }]); }
    const nV = lijnen.length * 14;
    this.vlaggetjes = new THREE.InstancedMesh(vlag, new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }), nV);
    const vk = ['#e2643e', '#f2c94c', '#3d8fe0', '#38b37a', '#e9578a', '#9a68e0'];
    let n = 0;
    for (const [a, b] of lijnen) for (let k = 0; k < 14; k++) {
      const u = (k + 0.5) / 14, x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u, y = 2.6 - Math.sin(u * Math.PI) * 0.6;
      M4.compose(V3.set(x, y, z), Q.setFromAxisAngle(YAS, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2), S3.setScalar(1)); this.vlaggetjes.setMatrixAt(n, M4); this.vlaggetjes.setColorAt(n++, K.set(vk[k % 6]));
    }
    this.vlaggetjesProp = this._prop(this.vlaggetjes, 'aan');
    // vuurwerk (eenmalig na de overwinning, en kort bij het openen van de verloste stad)
    this.vuurwerk = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 360);
    this.vuurwerk.count = 0; this.vuurwerk.frustumCulled = false; this.vuurwerk.renderOrder = 6; this.scene.add(this.vuurwerk);
    this.vonken = []; this.feestT = 0; this.volgendePijl = 0;
    // de verslagen Slijkkraak: een vriendelijk zandbankje met een slikgarnaal in de haven
    const gb = new Bouwer('garnaal'); gb.ao = false;
    for (let i = 0; i < 4; i++) gb.ellips(0.9 + this.r() * 0.4, 0.2, 0.6 + this.r() * 0.3, (this.r() - 0.5) * 1.2, 0, (this.r() - 0.5) * 0.7, ['#e3d3a6', '#d8c592'][i % 2], 10);
    for (let k = 0; k < 6; k++) gb.ellips(0.11 - k * 0.012, 0.1 - k * 0.01, 0.1, 0.0 + Math.sin(k * 0.5) * 0.22, 0.3 + Math.cos(k * 0.5) * 0.12, -0.25 + k * 0.1, k % 2 ? '#f4a08a' : '#f7b39f', 8);
    gb.bol(0.03, -0.05, 0.42, -0.36, '#1d1710', 5).bol(0.03, 0.05, 0.42, -0.36, '#1d1710', 5);
    gb.cil(0.008, 0.008, 0.45, -0.03, 0.4, -0.35, '#e98a70', 4, [-1.0, 0, 0.3]).cil(0.008, 0.008, 0.45, 0.03, 0.4, -0.35, '#e98a70', 4, [-1.0, 0, -0.3]);
    const garnaal = this._mesh(gb); garnaal.position.set(4.6, WATER_Y, -64.6); garnaal.scale.setScalar(1.3);
    this.garnaal = this._prop(garnaal, 'schaal');
  }
  /** Start het feest (vuurwerk boven de Markt). lang = na een echte overwinning. */
  feest(lang = false) { this.feestT = Math.max(this.feestT, lang ? 16 : 8); }

  // ---------- toestand ----------
  /** De toestand van het verhaal (uit verhaal.js) overnemen. */
  zet(stand) {
    const eerst = !this.stand;
    this.stand = stand;
    this.kraak.zet(stand);
    if (!stand?.actief) { for (const p of this.props) p.doel = 0; return; }
    const w = stand.w;
    this.zakkenProp.doel = stand.vloed > 0.02 || stand.plassen > 0.6 ? 1 : 0;
    for (const b of this.straatBoten) b.doel = stand.vloed > 0.5 ? 1 : 0;
    for (const m of this.masten) m.doel = w.masten ? 1 : 0;
    this.slijkbank.doel = w.slijkbank ? 1 : 0;
    this.zeilboot.doel = w.zeilboot ? 1 : 0;
    this.lelies.doel = w.lelies ? 1 : 0;
    this.vlonder.doel = w.vlonder ? 1 : 0;
    this.sluisSlijk.doel = w.sluisVast ? 1 : 0;
    this.slibplaat.doel = w.fruitboot === 'scheef' ? 1 : 0;
    this.zandbank.doel = w.zeehondenBank ? 1 : 0;
    for (const z of this.zeehonden) z.doel = w.zeehondenBank ? 1 : 0;
    this.getijmeter.doel = w.getijmeter ? 1 : 0;
    this.bouwplaatsen.forEach(b => {
      b.fase1.doel = w.bouwplaatsen >= 1 && w.bouwplaatsen < 3 ? 1 : 0;
      b.bord.doel = w.bouwplaatsen >= 1 ? 1 : 0;
      b.fase2.doel = w.bouwplaatsen === 2 ? 1 : 0;
      b.fase3.doel = w.bouwplaatsen >= 3 ? 1 : 0;
      if (b.reiger) b.reiger.doel = w.bouwplaatsen >= 3 ? 1 : 0;
    });
    this.lampjesProp.doel = w.lampjes ? 1 : 0;
    this.vlaggetjesProp.doel = w.feest ? 1 : 0;
    this.garnaal.doel = w.garnaal ? 1 : 0;
    this.boogKleinProp.doel = w.regenboogCode ? 1 : 0;
    if (eerst) {
      // bij het openen staat alles meteen goed
      this.nu.vloed = stand.vloed; this.nu.plassen = stand.plassen;
      for (const p of this.props) p.nu = p.doel;
      this.rietGroen = w.rietGroen ? 1 : 0;
      if (w.feest) this.feest(false);
    }
  }
  setRaid(st) { this.kraak.setRaid(st); }

  tick(dt, t) {
    const st = this.stand, stad = this.stad;
    if (!st) return;
    const w = st.w || {};
    const k = 1 - Math.exp(-dt * 0.6);
    // tijdens de eindbaas stijgt het water weer (hoe meer levenspunten, hoe hoger)
    const raid = this.kraak.raid;
    const vloedDoel = raid ? 0.35 + 0.35 * (raid.maxHp ? raid.hp / raid.maxHp : 1) : st.vloed;
    const regen = stad.weerSterkte?.regen || 0;
    this.nu.vloed = lerp(this.nu.vloed, vloedDoel, k);
    this.nu.plassen = lerp(this.nu.plassen, st.plassen, k);
    this.nu.regen = lerp(this.nu.regen, regen, k);
    if (Math.abs(this.nu.vloed - vloedDoel) < 0.002) this.nu.vloed = vloedDoel;
    const vl = this.nu.vloed;
    // het waterpeil in de reien
    const peil = WATER_Y + (VLOED_PEIL - WATER_Y) * smooth(0, 0.6, vl);
    stad.water3d?.setPeil(peil);
    // het vlak boven de straten
    const u = this.vloedMat.uniforms;
    u.uT.value = t; u.uVloed.value = vl; u.uPlas.value = this.nu.plassen; u.uRegen.value = clamp(this.nu.regen * 1.2, 0, 1); u.uNacht.value = stad.nacht || 0;
    u.uHor.value.copy(stad.luchtMat.uniforms.uHor.value); u.uTop.value.copy(stad.luchtMat.uniforms.uTop.value);
    u.uZon.value.copy(stad.zon.position).sub(stad.zon.target.position).normalize();
    this.vloed.visible = vl > 0.002 || this.nu.plassen > 0.01 || this.nu.regen > 0.02;

    // ---- De Slijkkraak ----
    this.kraak.tick(dt, t, peil, stad.cam);
    const kl = stad.kiesbaar;
    const inLijst = kl.includes(this.kraakKlik);
    if (this.kraak.zichtbaar && !inLijst) kl.push(this.kraakKlik);
    if (!this.kraak.zichtbaar && inLijst) kl.splice(kl.indexOf(this.kraakKlik), 1);

    // ---- props ----
    for (const p of this.props) {
      p.nu = lerp(p.nu, p.doel, 1 - Math.exp(-dt * 1.4));
      if (Math.abs(p.nu - p.doel) < 0.004) p.nu = p.doel;
      const o = p.obj;
      o.visible = p.nu > 0.01;
      if (!o.visible) continue;
      if (p.soort === 'schaal') o.scale.copy(p.basisS).multiplyScalar(Math.max(0.001, p.nu));
      else if (p.soort === 'zak') o.position.y = p.basisY - (1 - p.nu) * p.diep;
    }
    // bootjes op de Markt deinen op het hoogwater
    for (const b of this.straatBoten) if (b.obj.visible) { b.obj.position.set(b.x + Math.sin(t * 0.2 + b.rot) * 0.15, VLOED_Y + Math.sin(t * 1.3 + b.x) * 0.02, b.z); b.obj.rotation.set(Math.sin(t * 1.1 + b.z) * 0.04, b.rot + Math.sin(t * 0.15) * 0.2, 0); }
    // masten en slijkbank volgen het peil
    for (const m of this.masten) { m.basisY = peil; }
    this.slijkbank.basisY = peil; this.slibplaat.basisY = peil; this.zandbank.basisY = peil;
    // het zeilbootje met Byte vaart heen en terug op de Oostvest: met zijn mast kan het niet onder de bruggen (vaart.js)
    if (this.zeilboot.obj.visible) {
      const zb = this.zeilboot;
      zb.pad = zb.pad || new Pad(BYTE_ROUTE.pts);
      zb.richting = zb.richting || 1;
      if ((zb.wacht || 0) > 0) zb.wacht -= dt;
      else {
        zb.s += dt * BYTE_ROUTE.v * zb.richting;
        if (zb.s > zb.pad.L || zb.s < 0) { zb.s = clamp(zb.s, 0, zb.pad.L); zb.richting = -zb.richting; zb.wacht = 2.5; }
      }
      const p = zb.pad.punt(zb.s), wiebel = Math.sin(t * 1.4) * 0.05 * (1 + (stad.weerSterkte?.wind || 0) * 2);
      const doelYaw = Math.atan2(p.dx * zb.richting, p.dz * zb.richting);
      let d = doelYaw - (zb.yaw ?? doelYaw); d = Math.atan2(Math.sin(d), Math.cos(d));
      zb.yaw = (zb.yaw ?? doelYaw) + d * (1 - Math.exp(-dt * 1.6));       // rustig keren aan het einde
      zb.obj.position.set(p.x, peil, p.z);
      zb.obj.rotation.set(0, zb.yaw, wiebel);
    }
    // riet: bruin en plat, of groen en recht
    this.rietGroen = lerp(this.rietGroen, w.rietGroen ? 1 : 0, 1 - Math.exp(-dt * 0.8));
    const g = this.rietGroen, wind = stad.weerSterkte?.wind || 0.2;
    this.rietData.forEach((d, i) => {
      const plat = (1 - g) * 1.05, zwaai = Math.sin(t * 1.6 + d.f) * (0.05 + wind * 0.12);
      E.set(plat * Math.cos(d.a) + zwaai, d.f, plat * Math.sin(d.a)); Q.setFromEuler(E);
      M4.compose(V3.set(d.x, peil, d.z), Q, S3.set(d.s, d.s * (0.75 + 0.25 * g), d.s)); this.riet.setMatrixAt(i, M4);
      this.riet.setColorAt(i, K.set('#8a6a3a').lerp(new THREE.Color('#5f9a3a'), g));
    });
    this.riet.instanceMatrix.needsUpdate = true; if (this.riet.instanceColor) this.riet.instanceColor.needsUpdate = true;
    this.lelies.obj.position.y = peil + 0.01;
    // het Weerstation, het weerscherm, het Waterlabo, de sluislamp
    const nacht = stad.nacht || 0;
    this.weerLampMat.color.set(w.weerstationLicht ? '#ffd27a' : '#2b2a30');
    this.weerGloed.material.opacity = w.weerstationLicht ? 0.25 + nacht * 0.6 : 0;
    this.weerGloed.quaternion.copy(stad.cam.quaternion);
    this.laboMat.color.set(w.waterlaboLicht ? '#ffe0a0' : '#27313c');
    this.laboGloed.material.opacity = w.waterlaboLicht ? 0.2 + nacht * 0.6 : 0;
    this.laboGloed.quaternion.copy(stad.cam.quaternion);
    const vast = w.sluisVast;
    this.sluisLampMat.color.set(vast ? '#ff3b2f' : '#3bff6a');
    this.sluisGloed.material.color.set(vast ? '#ff4a3a' : '#4aff7a');
    this.sluisGloed.material.opacity = (0.5 + 0.3 * Math.sin(t * (vast ? 5 : 1.5))) * (0.6 + nacht * 0.6);
    this.sluisGloed.quaternion.copy(stad.cam.quaternion);
    if (stad.weerbord) stad.weerbord.visible = !!w.weerscherm;
    this.scherm.visible = !!w.weerscherm;
    if (this.scherm.visible) { const sl = JSON.stringify([stad.weerNu?.temp, stad.weerNu?.tekst, stad.weerNu?.wind, stad.weerNu?.bron]); if (sl !== this._schermSleutel) { this._schermSleutel = sl; this._tekenScherm(stad.weerNu); } }
    // de regenboog: met de code REGENBOOG, als het tegelijk regent en de zon schijnt (of in het voorbeeld)
    const wn = stad.weerNu || {};
    const zonEnRegen = (wn.neerslag > 0 || ['regen', 'motregen', 'buien'].includes(wn.soort)) && (wn.wolken ?? 100) < 95 && nacht < 0.4;
    const boogAan = w.regenboogCode && (zonEnRegen || st.preview === 'w1raid');
    this.boogMat.uniforms.uA.value = lerp(this.boogMat.uniforms.uA.value, boogAan ? 1 : 0, 1 - Math.exp(-dt * 0.5));
    this.boog.visible = this.boogMat.uniforms.uA.value > 0.01;
    if (this.boog.visible) { const c = stad.cam.position; this.boog.rotation.y = Math.atan2(c.x - this.boog.position.x, c.z - this.boog.position.z); }
    if (this.boogKlein.visible) { const c = stad.cam.position; this.boogKlein.rotation.y = Math.atan2(c.x - this.boogKlein.position.x, c.z - this.boogKlein.position.z); }
    // de getijdenmeter: eb en vloed (halfdagelijks getij, ongeveer 12 uur en 25 minuten)
    if (this.getijmeter.obj.visible) { const f = Math.sin(Date.now() / (12.42 * 3600e3) * TAU); this.getijWater.scale.y = 0.75 + f * 0.6; }
    // de fruitboot: scheef op het slib, of veilig aan de kaai (en hij vaart er rustig naartoe)
    const fb = this.fruitboot, fw = w.fruitboot;
    fb.visible = !!fw;
    if (fw) {
      const scheef = { x: 6.6, z: -66.4, y: peil + 0.12, rx: 0.08, rz: 0.32, ry: 0.5 }, binnen = { x: -7.6, z: -59.9, y: peil + 0.02, rx: 0, rz: Math.sin(t * 1.2) * 0.03, ry: Math.PI / 2 };
      this.fruit.nu = lerp(this.fruit.nu, fw === 'binnen' ? 1 : 0, 1 - Math.exp(-dt * 0.35));
      if (this.fruit.plek == null) this.fruit.nu = fw === 'binnen' ? 1 : 0;
      this.fruit.plek = fw;
      const f = this.fruit.nu;
      fb.position.set(lerp(scheef.x, binnen.x, f), lerp(scheef.y, binnen.y, f), lerp(scheef.z, binnen.z, f));
      fb.rotation.set(lerp(scheef.rx, binnen.rx, f), lerp(scheef.ry, binnen.ry, f), lerp(scheef.rz, binnen.rz, f));
    }
    // fontein: slijk in de schaal zolang ze niet spuit
    const fontein = Math.max(stad.water3d?.helder('fontein') ?? 0, w.fonteinAan ? 1 : 0);
    this.fonteinSlijk.doel = fontein < 0.5 && !raid ? 1 : raid ? 1 : 0;
    // lampjes twinkelen
    if (this.lampjes.visible) {
      this.lampjesData.forEach((p, i) => { const s = 0.75 + 0.35 * Math.sin(t * 3 + i * 1.7); M4.compose(V3.set(p.x, 0.42, p.z), Q.identity(), S3.setScalar(s * this.lampjesProp.nu)); this.lampjes.setMatrixAt(i, M4); });
      this.lampjes.instanceMatrix.needsUpdate = true;
    }
    this._tickAfval(dt, t, peil, vl);
    this._tickVuurwerk(dt);
  }

  _tickAfval(dt, t, peil, vl) {
    const st = this.stand, water3d = this.stad.water3d;
    let nf = 0, nz = 0;
    const zet = (p, y) => {
      const bob = Math.sin(t * 1.3 + p.f) * 0.015, draai = p.rot + Math.sin(t * 0.2 + p.f) * 0.4;
      if (p.soort === 0) { M4.compose(V3.set(p.x + Math.sin(t * 0.13 + p.f) * 0.2, y + 0.04 + bob, p.z), Q.setFromAxisAngle(YAS, draai), S3.setScalar(1)); this.flessen.setMatrixAt(nf++, M4); }
      else { M4.compose(V3.set(p.x, y + 0.02 + bob, p.z + Math.cos(t * 0.11 + p.f) * 0.2), Q.setFromAxisAngle(YAS, draai), S3.set(1, 0.28, 0.8)); this.zakjes.setMatrixAt(nz++, M4); }
    };
    if (st?.actief && !st.baasWeg) {
      for (const [zone, lijst] of this.afvalZones) {
        let deel;
        if (zone === 'markt') deel = st.armen?.markt || 0;
        else if (zone === 'straat') deel = 1;
        else deel = 1 - (water3d?.helder(zone) ?? 0);
        const n = Math.round(lijst.length * clamp(deel, 0, 1));
        for (let i = 0; i < n; i++) {
          const p = lijst[i];
          if (zone === 'straat') { if (p.m > 1.08 - vl) zet(p, VLOED_Y); }
          else zet(p, peil);
        }
      }
    }
    this.flessen.count = nf; this.zakjes.count = nz;
    this.flessen.instanceMatrix.needsUpdate = true; this.zakjes.instanceMatrix.needsUpdate = true;
  }

  _tickVuurwerk(dt) {
    this.feestT = Math.max(0, this.feestT - dt);
    if (this.feestT > 0) {
      this.volgendePijl -= dt;
      if (this.volgendePijl <= 0) {
        this.volgendePijl = 0.7 + this.r() * 0.9;
        const x = (this.r() - 0.5) * 16, z = (this.r() - 0.5) * 12 - 2, y = 9 + this.r() * 5;
        const kleur = ['#ffd27a', '#ff6fa0', '#7fd3ff', '#9cff8a', '#ffffff', '#c59cff'][Math.floor(this.r() * 6)];
        for (let i = 0; i < 60; i++) {
          const a = this.r() * TAU, b = Math.acos(2 * this.r() - 1), v = 3 + this.r() * 2.5;
          this.vonken.push({ x, y, z, vx: Math.sin(b) * Math.cos(a) * v, vy: Math.cos(b) * v, vz: Math.sin(b) * Math.sin(a) * v, t: 0, life: 1.4 + this.r() * 0.8, kleur });
        }
        if (this.vonken.length > 360) this.vonken.splice(0, this.vonken.length - 360);
      }
    }
    let n = 0;
    this.vonken = this.vonken.filter(v => (v.t += dt) < v.life);
    for (const v of this.vonken) {
      v.vy -= 3.2 * dt; v.vx *= 0.985; v.vz *= 0.985; v.vy *= 0.985;
      v.x += v.vx * dt; v.y += v.vy * dt; v.z += v.vz * dt;
      const s = 1 - v.t / v.life;
      M4.compose(V3.set(v.x, v.y, v.z), Q.identity(), S3.setScalar(Math.max(0.01, s * 1.3))); this.vuurwerk.setMatrixAt(n, M4); this.vuurwerk.setColorAt(n, K.set(v.kleur)); n++;
    }
    this.vuurwerk.count = n; this.vuurwerk.instanceMatrix.needsUpdate = true; if (this.vuurwerk.instanceColor) this.vuurwerk.instanceColor.needsUpdate = true;
  }
}
