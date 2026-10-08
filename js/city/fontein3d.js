// De grote fontein op de Markt van Zwinvliet: middeleeuwse steen en echt water.
//
// Steen (fonteinGebouw): een achthoekig bekken met gebeeldhouwde panelen en een dekrand, vier leeuwenkoppen op de
// hoeken, een zuil met een brede schaal, een tweede zuiltje met een kleine schaal en een dennenappel als bekroning.
// Water (Fontein): een straal en een paraplu van stralen uit de top, een watergordijn dat over de rand van de schaal
// valt, vier bogen uit de leeuwenmuilen, spatkringen en schuim waar het water neerkomt, een golvend wateroppervlak
// en een beetje nevel. Alles is instanced of één mesh: zeven tekenopdrachten.
//
// Het verhaal: zolang de fontein "stil" is (De Slijkkraak, week 1 tot het labo van week 5), staat het water laag,
// bruin en troebel en spuit er niets. Wordt ze hersteld, dan komt ze in een paar seconden op gang: eerst sputtert de
// top, dan valt het gordijn, dan spuiten de leeuwen.
import * as THREE from '../../vendor/three.module.min.js';
import { Bouwer } from './modellen.js';
import { rng, clamp, lerp } from '../core/util.js';

const TAU = Math.PI * 2;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
const ZAS = new THREE.Vector3(0, 0, 1), T3 = new THREE.Vector3(), DRUPPEL = new THREE.Color('#d7efff');

// maten (lokaal, de fontein staat op y = 0)
export const FONTEIN = {
  R: 2.2,                      // buitenstraal van het achthoekige bekken (tot de hoeken)
  binnen: 1.96,                // binnenkant van de muur (tot de hoeken)
  vol: 0.43, stil: 0.27,       // waterpeil in het bekken
  schaalY: 1.57, schaalR: 1.0, // de grote schaal
  topY: 2.5,                   // de dennenappel
  leeuwR: 1.86, leeuwY: 0.66,  // muil van de leeuwen
};
const K8 = Math.cos(Math.PI / 8);

/** De stenen fontein (één geometrie met vertexkleuren). */
export function fonteinGebouw() {
  const b = new Bouwer('fontein');
  const steen = '#d8cfbb', steen2 = '#c8bda4', donker = '#a99c80', goud = '#c9a24b', bodem = '#7d7563';
  const F = FONTEIN, ap = F.R * K8, zijde = 2 * F.R * Math.sin(Math.PI / 8);
  b.cil(F.R + 0.25, F.R + 0.32, 0.06, 0, 0, 0, steen2, 8);                 // een lage trede rond het bekken
  b.cil(F.binnen * K8, F.binnen * K8, 0.2, 0, 0.02, 0, bodem, 24);         // de bodem van het bekken
  for (let k = 0; k < 8; k++) {
    const th = k * TAU / 8 + Math.PI / 8, ry = Math.PI / 2 - th, c = Math.cos(th), s = Math.sin(th);
    const r = ap - 0.12;
    b.box(zijde + 0.03, 0.46, 0.24, c * r, 0.06, s * r, steen, ry);                         // de muur
    b.box(zijde + 0.16, 0.07, 0.38, c * (ap - 0.1), 0.52, s * (ap - 0.1), '#e6dece', ry);   // de dekrand
    b.box(zijde * 0.62, 0.22, 0.03, c * (ap + 0.005), 0.16, s * (ap + 0.005), donker, ry);  // gebeeldhouwd paneel
    b.box(zijde * 0.5, 0.15, 0.03, c * (ap + 0.02), 0.195, s * (ap + 0.02), steen2, ry);
    b.bol(0.05, c * (ap + 0.035), 0.27, s * (ap + 0.035), goud, 6);                          // een rozet
  }
  // de leeuwen op vier hoeken: een kop met manen en een muil naar binnen
  for (let k = 0; k < 4; k++) {
    const a = k * TAU / 4 + TAU / 8, c = Math.cos(a), s = Math.sin(a), ry = Math.PI / 2 - a;
    const r = F.R * 0.93;
    b.box(0.3, 0.12, 0.3, c * r, 0.58, s * r, steen2, ry);                                   // sokkel op de rand
    b.ellips(0.17, 0.17, 0.12, c * (r - 0.02), 0.82, s * (r - 0.02), '#b8a57a', 10, [0, -a, 0]);   // manen
    b.bol(0.11, c * (r - 0.1), 0.8, s * (r - 0.1), '#d2c39c', 8);                           // kop
    b.box(0.1, 0.07, 0.1, c * (r - 0.21), F.leeuwY + 0.05, s * (r - 0.21), '#c4b48c', ry);  // snuit
    b.bol(0.022, c * (r - 0.17) - s * 0.05, 0.86, s * (r - 0.17) + c * 0.05, '#3b3226', 4).bol(0.022, c * (r - 0.17) + s * 0.05, 0.86, s * (r - 0.17) - c * 0.05, '#3b3226', 4);
  }
  // de zuil met de grote schaal
  b.cil(0.56, 0.64, 0.3, 0, 0.2, 0, steen2, 8);
  b.cil(0.33, 0.33, 0.06, 0, 0.5, 0, '#e6dece', 12);
  b.cil(0.24, 0.29, 0.78, 0, 0.56, 0, steen, 12);
  b.cil(0.31, 0.31, 0.06, 0, 1.3, 0, '#e6dece', 12);
  b.cil(F.schaalR, 0.4, 0.24, 0, F.schaalY - 0.24, 0, steen, 18);
  b.torus(F.schaalR, 0.045, 0, F.schaalY, 0, '#e6dece', [Math.PI / 2, 0, 0], 28);
  b.cil(F.schaalR - 0.06, F.schaalR - 0.06, 0.02, 0, F.schaalY - 0.04, 0, bodem, 18);
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; b.bol(0.06, Math.cos(a) * (F.schaalR - 0.05), F.schaalY - 0.2, Math.sin(a) * (F.schaalR - 0.05), steen2, 6); }   // waterspuwertjes onder de rand
  // het tweede zuiltje, de kleine schaal en de dennenappel
  b.cil(0.11, 0.15, 0.5, 0, F.schaalY, 0, steen, 10);
  b.cil(0.36, 0.15, 0.12, 0, 2.07, 0, steen, 14);
  b.torus(0.36, 0.025, 0, 2.19, 0, '#e6dece', [Math.PI / 2, 0, 0], 20);
  b.ellips(0.1, 0.17, 0.1, 0, 2.33, 0, goud, 8);
  return b.bouw();
}

// ---------------------------------------------------------------- water
const WATER_VS = `
varying vec2 vP; varying vec3 vW;
void main() { vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WATER_FS = `
uniform float uT, uAan, uTroebel, uLicht; uniform vec2 uInslag[4]; uniform float uGordijn;
varying vec2 vP; varying vec3 vW;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruis(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vP; float r = length(p);
  // kringen: rond het gordijn en waar de leeuwen neerkomen
  float g = sin((r - uGordijn) * 26.0 - uT * 7.0) * exp(-abs(r - uGordijn) * 3.0);
  for (int i = 0; i < 4; i++) { float d = length(p - uInslag[i]); g += 0.8 * sin(d * 34.0 - uT * 9.0) * exp(-d * 4.0); }
  g = g * uAan + (ruis(p * 6.0 + uT * 0.3) - 0.5) * 0.6;
  vec3 helder = mix(vec3(0.13, 0.42, 0.6), vec3(0.38, 0.7, 0.84), 0.5 + 0.25 * g);
  helder += vec3(0.9, 0.95, 1.0) * smoothstep(0.55, 0.95, g) * 0.35;                    // glinsteringen
  float sch = smoothstep(0.08, 0.0, abs(r - uGordijn)) * uAan;                        // schuim waar het gordijn valt
  vec3 troebel = mix(vec3(0.27, 0.25, 0.12), vec3(0.37, 0.36, 0.17), ruis(p * 3.0 + 1.7));
  troebel = mix(troebel, vec3(0.45, 0.5, 0.2), smoothstep(0.62, 0.8, ruis(p * 5.0 - uT * 0.05)) * 0.6);   // groen kroos
  vec3 c = mix(helder, troebel, uTroebel);
  c = mix(c, vec3(0.95, 0.98, 1.0), sch * 0.7);
  gl_FragColor = vec4(c * uLicht, mix(0.88, 0.97, uTroebel));
}`;
const GORDIJN_VS = `
varying vec2 vU; void main() { vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GORDIJN_FS = `
uniform float uT, uAan, uLicht; varying vec2 vU;
float hash(float x) { return fract(sin(x * 91.7) * 43758.5); }
void main() {
  float x = vU.x * 90.0, kol = floor(x);
  float streep = smoothstep(0.5, 0.0, abs(fract(x) - 0.5)) * (0.5 + 0.5 * hash(kol));
  float v = vU.y + uT * (0.9 + 0.4 * hash(kol + 3.0));                 // naar beneden schuivend
  float druppels = 0.55 + 0.45 * sin(v * 18.0 + hash(kol) * 6.28);
  float a = (0.18 + 0.5 * streep * druppels) * uAan;
  a *= smoothstep(0.0, 0.08, vU.y) * (0.75 + 0.25 * smoothstep(1.0, 0.85, vU.y));
  gl_FragColor = vec4(vec3(0.82, 0.93, 1.0) * uLicht, a);
}`;
const KRING_VS = `
attribute float aFase; varying float vF; varying vec2 vP;
void main() { vF = aFase; vP = position.xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const KRING_FS = `
uniform float uAan, uLicht; varying float vF; varying vec2 vP;
void main() { float r = length(vP); float ring = smoothstep(0.62, 0.8, r) * smoothstep(1.0, 0.86, r);
  float a = ring * (1.0 - vF) * 0.75 * uAan + smoothstep(0.5, 0.0, r) * 0.45 * uAan * (1.0 - vF * 0.5);
  gl_FragColor = vec4(vec3(0.96, 0.99, 1.0) * uLicht, a); }`;

/** Het water van de fontein. tick(dt, t, aan): aan 0..1 (0 = stil en troebel). */
export class Fontein {
  constructor(stad, { x = 0, z = 0 } = {}) {
    this.stad = stad; this.pos = { x, z };
    this.k = 0; this.helder = 0; this.eerste = true;
    const F = FONTEIN, groep = new THREE.Group(); groep.position.set(x, 0, z); this.groep = groep;
    const r = rng('fontein');
    // het wateroppervlak in het bekken (achthoek) en in de grote schaal
    this.uW = { uT: { value: 0 }, uAan: { value: 0 }, uTroebel: { value: 1 }, uLicht: { value: 1 }, uGordijn: { value: 1.12 },
      uInslag: { value: [0, 1, 2, 3].map(k => { const a = k * TAU / 4 + TAU / 8; return new THREE.Vector2(Math.cos(a) * 1.3, -Math.sin(a) * 1.3); }) } };
    const wMat = new THREE.ShaderMaterial({ uniforms: this.uW, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false });
    this.bekken = new THREE.Mesh(new THREE.CircleGeometry(F.binnen - 0.02, 8, 0), wMat);
    this.bekken.rotation.x = -Math.PI / 2; this.bekken.renderOrder = 2; groep.add(this.bekken);
    this.uS = { ...this.uW, uGordijn: { value: 0.0 }, uInslag: { value: [0, 1, 2, 3].map(k => { const a = k * TAU / 4; return new THREE.Vector2(Math.cos(a) * 0.72, Math.sin(a) * 0.72); }) } };
    this.schaal = new THREE.Mesh(new THREE.CircleGeometry(F.schaalR - 0.07, 24), new THREE.ShaderMaterial({ uniforms: this.uS, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false }));
    this.schaal.rotation.x = -Math.PI / 2; this.schaal.position.y = F.schaalY - 0.03; this.schaal.renderOrder = 2; groep.add(this.schaal);
    // het gordijn: een open kegel van de rand van de schaal tot in het bekken (bovenkant op y = 0, schaal y = lengte)
    this.uG = { uT: { value: 0 }, uAan: { value: 0 }, uLicht: { value: 1 } };
    const gg = new THREE.CylinderGeometry(F.schaalR + 0.03, F.schaalR + 0.13, 1, 48, 1, true).translate(0, -0.5, 0);
    this.gordijn = new THREE.Mesh(gg, new THREE.ShaderMaterial({ uniforms: this.uG, vertexShader: GORDIJN_VS, fragmentShader: GORDIJN_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.gordijn.position.y = F.schaalY + 0.01; this.gordijn.renderOrder = 3; groep.add(this.gordijn);
    // de stralen: druppels langs parabolen (één instanced mesh)
    this.stralen = [];
    const boog = (p0, p1, hoog, n, v, soort) => this.stralen.push({ p0, p1, hoog, n, v, soort, f: r() });
    // de top: één rechte straal en een paraplu van acht bogen naar de grote schaal
    boog(new THREE.Vector3(0, F.topY, 0), new THREE.Vector3(0, F.topY + 0.01, 0), 0.75, 24, 0.9, 'top');
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.2; boog(new THREE.Vector3(Math.cos(a) * 0.05, F.topY, Math.sin(a) * 0.05), new THREE.Vector3(Math.cos(a) * 0.74, F.schaalY - 0.02, Math.sin(a) * 0.74), 0.42, 22, 0.75, 'top'); }
    // de leeuwen: van de muil naar binnen, voor het gordijn neerkomend
    this.inslagen = [];
    for (let k = 0; k < 4; k++) {
      const a = k * TAU / 4 + TAU / 8, c = Math.cos(a), s = Math.sin(a), rm = F.R * 0.93 - 0.27;
      const p1 = new THREE.Vector3(c * 1.3, F.vol, s * 1.3);
      boog(new THREE.Vector3(c * rm, F.leeuwY + 0.06, s * rm), p1, 0.32, 28, 0.7, 'leeuw');
      this.inslagen.push(p1);
    }
    // de kleine waterspuwers onder de schaal: korte straaltjes in het gordijn
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8, c = Math.cos(a), s = Math.sin(a); boog(new THREE.Vector3(c * (F.schaalR + 0.02), F.schaalY - 0.2, s * (F.schaalR + 0.02)), new THREE.Vector3(c * 1.42, F.vol, s * 1.42), 0.05, 10, 0.8, 'spuwer'); }
    const nDr = this.stralen.reduce((s, x) => s + x.n, 0);
    const dMat = new THREE.MeshLambertMaterial({ color: '#cfe9fb', emissive: '#4f7896', transparent: true, opacity: 0.78, depthWrite: false });
    this.druppels = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), dMat, nDr);
    this.druppels.count = 0; this.druppels.renderOrder = 4; this.druppels.frustumCulled = false; groep.add(this.druppels);
    // spatkringen: waar de leeuwen en de spuwers neerkomen, en rond de straal in de kleine schaal
    this.kringPunten = [...this.inslagen.map(p => ({ p, s: 0.32 })), ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * TAU / 8 + 0.2; return { p: new THREE.Vector3(Math.cos(a) * 0.74, F.schaalY - 0.02, Math.sin(a) * 0.74), s: 0.16 }; })];
    const kGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    this.kringFase = new Float32Array(this.kringPunten.length * 2);
    kGeo.setAttribute('aFase', new THREE.InstancedBufferAttribute(this.kringFase, 1));
    this.uK = { uAan: { value: 0 }, uLicht: { value: 1 } };
    this.kringen = new THREE.InstancedMesh(kGeo, new THREE.ShaderMaterial({ uniforms: this.uK, vertexShader: KRING_VS.replace('vP = position.xy', 'vP = position.xz'), fragmentShader: KRING_FS, transparent: true, depthWrite: false }), this.kringPunten.length * 2);
    this.kringen.renderOrder = 3; this.kringen.frustumCulled = false; groep.add(this.kringen);
    // nevel: zachte puntjes die opwaaien waar het water neerkomt
    const nN = 48, np = new Float32Array(nN * 3);
    this.nevelData = Array.from({ length: nN }, () => ({ a: r() * TAU, r: 1.0 + r() * 0.5, f: r(), h: 0.2 + r() * 0.6 }));
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.BufferAttribute(np, 3));
    const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    this.nevel = new THREE.Points(ng, new THREE.PointsMaterial({ size: 0.55, map: tex, transparent: true, opacity: 0, depthWrite: false, color: '#eef7ff' }));
    this.nevel.renderOrder = 5; this.nevel.frustumCulled = false; groep.add(this.nevel);
    stad.scene.add(groep);
  }

  /** aan: 0..1 hoe hersteld de fontein is (0 = stil en troebel, 1 = spuit). */
  tick(dt, t, aan = 0) {
    const F = FONTEIN, doel = aan > 0.5 ? 1 : 0;
    // op gang komen duurt een paar seconden, stilvallen gaat sneller; de eerste keer meteen goed
    if (this.eerste) { this.k = doel; this.helder = doel; this.eerste = false; }
    this.k = clamp(this.k + (doel > this.k ? dt * 0.33 : -dt * 0.9), 0, 1);
    this.helder = lerp(this.helder, doel, 1 - Math.exp(-dt * (doel ? 0.5 : 1.5)));
    const k = this.k, kTop = clamp(k * 2.4, 0, 1), kGord = clamp((k - 0.25) / 0.45, 0, 1), kLeeuw = clamp((k - 0.5) / 0.4, 0, 1);
    const sputter = k < 1 && k > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 13.0) * Math.sin(t * 5.3)) : 1;
    const licht = 1 - 0.62 * (this.stad.nacht || 0);
    // water: peil, troebel of helder, kringen
    const peil = lerp(F.stil, F.vol, this.helder);
    this.bekken.position.y = peil;
    for (const u of [this.uW, this.uS]) { u.uT.value = t; u.uAan.value = k; u.uTroebel.value = 1 - this.helder; u.uLicht.value = licht; }
    this.uW.uGordijn.value = kGord > 0.05 ? F.schaalR + 0.12 : -5;
    this.schaal.visible = this.helder > 0.05 || k > 0.02;
    this.schaal.scale.setScalar(0.4 + 0.6 * clamp(k * 1.5, 0, 1));
    this.uG.uT.value = t; this.uG.uAan.value = kGord; this.uG.uLicht.value = licht;
    this.gordijn.visible = kGord > 0.01;
    this.gordijn.scale.y = Math.max(0.01, (F.schaalY - peil) * clamp(kGord * 1.4, 0, 1));
    // druppels
    let i = 0;
    if (k > 0.01) {
      for (const st of this.stralen) {
        const sterk = st.soort === 'top' ? kTop * sputter : st.soort === 'leeuw' ? kLeeuw : kGord;
        if (sterk < 0.02) continue;
        const bereik = st.soort === 'leeuw' ? clamp(kLeeuw * 1.3, 0, 1) : 1;
        for (let n = 0; n < st.n; n++) {
          const u = ((t * st.v + n / st.n + st.f) % 1);
          if (u > bereik) continue;
          let x, y, z, tx, ty, tz;
          if (st.p0.distanceTo(st.p1) < 0.05) {
            // de rechte straal: op en neer in het midden
            const hh = st.hoog * sterk, uu = u * 2, op = uu < 1 ? uu : 2 - uu;
            x = st.p0.x + Math.sin(n * 2.3 + t) * 0.02 * uu; z = st.p0.z + Math.cos(n * 1.7 + t) * 0.02 * uu; y = st.p0.y + hh * (1 - (1 - op) * (1 - op));
            tx = 0; ty = 1; tz = 0;
          } else {
            const h = st.hoog * (0.6 + 0.4 * sterk);
            x = st.p0.x + (st.p1.x - st.p0.x) * u; z = st.p0.z + (st.p1.z - st.p0.z) * u;
            y = st.p0.y + (st.p1.y - st.p0.y) * u + 4 * h * u * (1 - u);
            tx = st.p1.x - st.p0.x; tz = st.p1.z - st.p0.z; ty = (st.p1.y - st.p0.y) + 4 * h * (1 - 2 * u);
          }
          T3.set(tx, ty, tz).normalize(); Q.setFromUnitVectors(ZAS, T3);
          const dik = st.soort === 'leeuw' ? 0.042 : st.soort === 'spuwer' ? 0.026 : 0.034;
          M4.compose(V3.set(x, y, z), Q, S3.set(dik, dik, dik * 3.4));
          this.druppels.setMatrixAt(i++, M4);
        }
      }
    }
    this.druppels.count = i; this.druppels.instanceMatrix.needsUpdate = true;
    this.druppels.material.color.copy(DRUPPEL).multiplyScalar(0.55 + 0.45 * licht);
    // spatkringen: twee per inslag, verschoven in de tijd
    let j = 0;
    this.uK.uAan.value = Math.max(kLeeuw, kTop * 0.8); this.uK.uLicht.value = licht;
    for (let q = 0; q < this.kringPunten.length; q++) {
      const kp = this.kringPunten[q], y = q < 4 ? peil + 0.012 : F.schaalY - 0.01;
      for (let e = 0; e < 2; e++) {
        const fase = (t * 1.6 + e * 0.5 + q * 0.37) % 1;
        M4.compose(V3.set(kp.p.x, y, kp.p.z), Q.identity(), S3.setScalar(kp.s * (0.35 + fase)));
        this.kringen.setMatrixAt(j, M4); this.kringFase[j++] = fase;
      }
    }
    this.kringen.count = k > 0.02 ? j : 0;
    this.kringen.instanceMatrix.needsUpdate = true; this.kringen.geometry.attributes.aFase.needsUpdate = true;
    // nevel
    const pos = this.nevel.geometry.attributes.position.array;
    this.nevelData.forEach((d, n) => {
      const u = (t * 0.12 + d.f) % 1, a = d.a + u * 0.6;
      pos[n * 3] = Math.cos(a) * (d.r + u * 0.3); pos[n * 3 + 1] = peil + 0.05 + u * d.h; pos[n * 3 + 2] = Math.sin(a) * (d.r + u * 0.3);
    });
    this.nevel.geometry.attributes.position.needsUpdate = true;
    this.nevel.material.opacity = 0.16 * kGord * licht;
    this.nevel.visible = kGord > 0.02;
    void dt;
  }
  /** Voor de tests en het verhaal: hoe ver de fontein op gang is (0..1). */
  get stand() { return this.k; }
}
