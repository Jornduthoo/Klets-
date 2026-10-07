// Het water van Zwinvliet in 3D: de reien, het Minnewater, de haven en de Noordzee, met kaaimuren,
// bruggen, bootjes, zwanen en vissen. Elke zone heeft een eigen helderheid: 0 = dik slijk van de
// Slijkkraak, 1 = helder water waar het leven terug is. De helderheid komt uit js/city/water.js.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, clamp, lerp } from '../core/util.js';
import { WATERS, KADE, bruggen, polar } from './layout.js';
import { brugGeo, bootGeo, dierGeo, golfGeo, slijkvlekGeo } from './brugge.js';

const TAU = Math.PI * 2;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), K = new THREE.Color();
const YAS = new THREE.Vector3(0, 1, 0);
export const WATER_Y = -0.18;       // het wateroppervlak ligt net onder het straatniveau
const BODEM_Y = -0.75;

// Golven, slijk en kleur: één shader voor alle waterstukken. Per stuk zegt uHelder hoe proper het is.
const WATER_VS = `
uniform float uT; varying vec2 vXZ; varying vec3 vN;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  float g = sin(w.x * 1.7 + uT * 1.6) * 0.012 + sin(w.z * 2.3 - uT * 1.1) * 0.012;
  w.y += g;
  vXZ = w.xz;
  vN = normalize(vec3(-cos(w.x * 1.7 + uT * 1.6) * 0.05, 1.0, cos(w.z * 2.3 - uT * 1.1) * 0.05));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const WATER_FS = `
uniform float uT; uniform float uHelder; uniform float uNacht; uniform vec3 uZon;
varying vec2 vXZ; varying vec3 vN;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y); }
void main(){
  // kleuren in lineaire ruimte (de renderer zet ze zelf om naar sRGB)
  vec3 helder = vec3(0.025, 0.233, 0.478);
  vec3 slijk  = vec3(0.073, 0.089, 0.030);
  float n = vn(vXZ * 0.55 + vec2(uT * 0.05, -uT * 0.03));
  float vuil = 1.0 - uHelder;
  vec3 c = mix(helder, slijk, vuil * (0.55 + 0.5 * n));
  // schuim en glinstering
  float gl = pow(max(dot(normalize(vN), normalize(uZon)), 0.0), 24.0);
  c += vec3(1.0, 0.98, 0.9) * gl * (0.35 + 0.5 * uHelder) * (1.0 - uNacht * 0.75);
  c += vec3(0.05) * smoothstep(0.75, 0.95, n) * uHelder;
  c *= mix(1.0, 0.33, uNacht);
  gl_FragColor = vec4(c, mix(0.97, 0.88, uHelder));
  #include <colorspace_fragment>
}`;

/** Alle waterstukken, de kaaien, de bruggen en wat er leeft. */
export class Water3D {
  constructor(stad) {
    this.stad = stad;
    this.scene = stad.scene;
    this.r = rng('water');
    this.zoneHelder = {};      // zone -> 0..1 (gedempt naar het doel)
    this.doelHelder = {};
    this.uT = { value: 0 };
    this.stukken = [];
    this._bouwWater();
    this._bouwKaden();
    this._bouwBruggen();
    this._bouwLeven();
    this._bouwSlijk();
  }

  _mat(zone) {
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: this.uT, uHelder: { value: 0 }, uNacht: { value: 0 }, uZon: { value: new THREE.Vector3(0.4, 0.8, 0.3) } },
      vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: true,
    });
    this.stukken.push({ zone, mat: m });
    return m;
  }

  _bouwWater() {
    this.groep = new THREE.Group(); this.scene.add(this.groep);
    for (const w of WATERS) {
      const mat = this._mat(w.zone);
      let geo, pos;
      if (w.soort === 'strook') {
        const z0 = Math.min(w.z0, w.z1), z1 = Math.max(w.z0, w.z1);
        geo = new THREE.PlaneGeometry(w.halfB * 2, z1 - z0, Math.max(2, Math.round(w.halfB * 2)), Math.max(4, Math.round((z1 - z0) / 1.6))).rotateX(-Math.PI / 2);
        pos = [w.x, WATER_Y, (z0 + z1) / 2];
      } else {
        geo = new THREE.CircleGeometry(1, 36, 0, TAU).rotateX(-Math.PI / 2);
        pos = [w.x, WATER_Y, w.z];
      }
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      if (w.soort !== 'strook') m.scale.set(w.rx, 1, w.rz);
      m.userData.id = 'water:' + w.id;
      m.receiveShadow = false;
      this.groep.add(m);
      // bodem (zodat je nooit door het water heen kijkt)
      const bod = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: '#6d6a52' }));
      bod.position.set(pos[0], BODEM_Y, pos[2]);
      if (w.soort !== 'strook') bod.scale.set(w.rx * 1.02, 1, w.rz * 1.02);
      this.groep.add(bod);
      w._mesh = m;
    }
  }

  /** Kaaimuren langs de reien en rond de plassen: een bakstenen rand met een stoepje. */
  _bouwKaden() {
    // een gewone (witte) materiaal: de kleur komt per instantie uit setColorAt. Met vertexColors zou de
    // kaaimuur zwart worden, want een BoxGeometry heeft geen kleuren per hoekpunt.
    const mat = new THREE.MeshLambertMaterial({});
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0);
    const bruggenLijst = bruggen();
    const vrij = (x, z) => !bruggenLijst.some(b => Math.hypot(b.x - x, b.z - z) < b.breedte / 2 + 0.3);
    const plekken = [];
    for (const w of WATERS) {
      if (w.id === 'zee') continue;
      if (w.soort === 'strook') {
        const z0 = Math.min(w.z0, w.z1), z1 = Math.max(w.z0, w.z1);
        for (let z = z0; z < z1; z += 1.0) for (const s of [-1, 1]) {
          if (!vrij(w.x + s * (w.halfB + KADE / 2), z)) continue;
          plekken.push({ x: w.x + s * (w.halfB + KADE / 2), z: z + 0.5, rot: 0, w: KADE, d: 1.02 });
        }
      } else {
        const n = Math.max(16, Math.round((w.rx + w.rz) * 2.2));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU, a2 = ((i + 1) / n) * TAU;
          const p = { x: w.x + Math.cos(a) * (w.rx + KADE / 2), z: w.z + Math.sin(a) * (w.rz + KADE / 2) };
          const q = { x: w.x + Math.cos(a2) * (w.rx + KADE / 2), z: w.z + Math.sin(a2) * (w.rz + KADE / 2) };
          if (!vrij(p.x, p.z)) continue;
          const len = Math.hypot(q.x - p.x, q.z - p.z) * 1.1;
          plekken.push({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, rot: -Math.atan2(q.z - p.z, q.x - p.x), w: len, d: KADE });
        }
      }
    }
    const inst = new THREE.InstancedMesh(geo, mat, plekken.length);
    plekken.forEach((p, i) => {
      M4.compose(V3.set(p.x, 0.04, p.z), Q.setFromAxisAngle(YAS, p.rot), S3.set(p.w, 0.95, p.d));
      inst.setMatrixAt(i, M4);
      inst.setColorAt(i, K.set(i % 3 ? '#b07a5c' : '#a86a4e'));
    });
    inst.castShadow = true; inst.receiveShadow = true;
    this.scene.add(inst);
    this.kade = inst;
  }

  _bouwBruggen() {
    this.bruggen = [];
    for (const b of bruggen()) {
      const g = brugGeo(b.breedte + 0.6);
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
      m.position.set(b.x, 0.08, b.z);
      m.rotation.y = Math.PI / 2;     // de brug ligt in de rijrichting van de ringweg (oost-west hier)
      m.castShadow = true; m.receiveShadow = true;
      m.userData.id = 'brug';
      this.scene.add(m);
      this.bruggen.push(m);
    }
  }

  /** Bootjes die varen, en dieren die terugkomen als het water helder is. */
  _bouwLeven() {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    // rondvaartboten op de zuidelijke reie en een vrachtschip in de haven
    this.boten = [];
    const route = (z0, z1, zone) => ({ z0, z1, zone });
    const routes = [route(10.5, 29.0, 'reie-zuid'), route(-26.5, -9.0, 'reie-noord'), route(-45.5, -29.0, 'noordrei')];
    routes.forEach((rt, i) => {
      const m = new THREE.Mesh(bootGeo(i === 2 ? 'zeil' : 'rondvaart').body, mat);
      m.castShadow = true; m.userData.id = 'boot';
      this.scene.add(m);
      this.boten.push({ obj: m, rt, u: this.r(), v: 0.035 + this.r() * 0.02, richting: i % 2 ? 1 : -1 });
    });
    const vracht = new THREE.Mesh(bootGeo('vracht').body, mat);
    vracht.castShadow = true; vracht.userData.id = 'boot';
    this.scene.add(vracht);
    this.boten.push({ obj: vracht, rt: { z0: -68, z1: -56, zone: 'haven' }, u: 0.3, v: 0.012, richting: 1, groot: true });

    // dieren: per zone een paar, ze verschijnen als de zone helder wordt
    this.dieren = [];
    const zet = (soort, x, z, zone, lucht = false) => {
      const m = new THREE.Mesh(dierGeo(soort), mat);
      m.castShadow = true; m.visible = false;
      this.scene.add(m);
      this.dieren.push({ obj: m, soort, x, z, zone, lucht, f: this.r() * 10, a: this.r() * TAU, grond: lucht ? 0.0 : WATER_Y });
    };
    for (let i = 0; i < 4; i++) zet('zwaan', (this.r() - 0.5) * 9, 34 + (this.r() - 0.5) * 7, 'minnewater');
    for (let i = 0; i < 3; i++) zet('eend', (this.r() - 0.5) * 8, 36 + (this.r() - 0.5) * 6, 'minnewater');
    for (let i = 0; i < 3; i++) zet('vis', (this.r() - 0.5) * 1.6, 14 + this.r() * 12, 'reie-zuid');
    for (let i = 0; i < 2; i++) zet('zwaan', (this.r() - 0.5) * 1.6, 11 + this.r() * 14, 'reie-zuid');
    for (let i = 0; i < 3; i++) zet('meerkoet', (this.r() - 0.5) * 1.6, -12 - this.r() * 12, 'reie-noord');
    for (let i = 0; i < 2; i++) zet('vis', (this.r() - 0.5) * 1.6, -14 - this.r() * 10, 'reie-noord');
    zet('reiger', 1.9, -34.5, 'noordrei', true);
    zet('reiger', -1.9, -41.0, 'noordrei', true);
    for (let i = 0; i < 3; i++) zet('vis', (this.r() - 0.5) * 2.2, -31 - this.r() * 13, 'noordrei');
    for (let i = 0; i < 4; i++) zet('meeuw', (this.r() - 0.5) * 16, -60 - this.r() * 8, 'haven', true);
    for (let i = 0; i < 2; i++) zet('zeehond', (this.r() - 0.5) * 10, -66 - this.r() * 3, 'haven');
    for (let i = 0; i < 3; i++) zet('kikker', (this.r() - 0.5) * 11, 33 + (this.r() - 0.5) * 6, 'minnewater');
    // golfjes onder wat drijft
    this.golven = new THREE.InstancedMesh(golfGeo(), new THREE.MeshBasicMaterial({ color: '#dff2fb', transparent: true, opacity: 0.55, depthWrite: false }), 40);
    this.golven.count = 0; this.scene.add(this.golven);
  }

  /** Slijk van de Slijkkraak: vlekken op het water die verdwijnen als een zone helder wordt. */
  _bouwSlijk() {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    this.slijk = [];
    const perZone = {};
    for (const w of WATERS) {
      if (w.id === 'zee') continue;
      const n = w.soort === 'strook' ? Math.max(2, Math.round(Math.abs(w.z1 - w.z0) / 7)) : 3;
      for (let i = 0; i < n; i++) {
        const x = w.soort === 'strook' ? w.x + (this.r() - 0.5) * w.halfB : w.x + (this.r() - 0.5) * w.rx * 1.3;
        const z = w.soort === 'strook' ? Math.min(w.z0, w.z1) + this.r() * Math.abs(w.z1 - w.z0) : w.z + (this.r() - 0.5) * w.rz * 1.3;
        const m = new THREE.Mesh(slijkvlekGeo((perZone[w.zone] = (perZone[w.zone] || 0) + 1)), mat);
        m.position.set(x, WATER_Y + 0.04, z);
        m.rotation.y = this.r() * TAU;
        m.userData.id = 'slijk';
        this.scene.add(m);
        this.slijk.push({ obj: m, zone: w.zone, f: this.r() * 9 });
      }
    }
  }

  /** De waterstand van het thema overnemen: { zones: { zone: { helder } } }. */
  setStand(stand) {
    this.stand = stand;
    for (const [zone, z] of Object.entries(stand?.zones || {})) this.doelHelder[zone] = z.helder;
    // de Noordzee en de haven volgen de havenzone
    for (const s of this.stukken) if (this.doelHelder[s.zone] == null) this.doelHelder[s.zone] = 0;
  }

  tick(dt, t, { nacht = 0, zonDir, wind = 0, windRichting = 240 } = {}) {
    this.uT.value = t;
    const k = 1 - Math.exp(-dt * 0.9);
    for (const zone of Object.keys(this.doelHelder)) {
      this.zoneHelder[zone] = lerp(this.zoneHelder[zone] ?? 0, this.doelHelder[zone], k);
    }
    for (const s of this.stukken) {
      s.mat.uniforms.uHelder.value = this.zoneHelder[s.zone] ?? 0;
      s.mat.uniforms.uNacht.value = nacht;
      if (zonDir) s.mat.uniforms.uZon.value.copy(zonDir);
    }
    // slijk: zakt weg als de zone helder is
    for (const s of this.slijk) {
      const h = this.zoneHelder[s.zone] ?? 0;
      const sc = clamp(1 - h * 1.15, 0, 1);
      s.obj.visible = sc > 0.02;
      s.obj.scale.set(sc, sc * (0.9 + Math.sin(t * 0.7 + s.f) * 0.1), sc);
      s.obj.position.y = WATER_Y + 0.04 - (1 - sc) * 0.25;
    }
    // boten varen heen en terug, maar enkel in water dat al een beetje proper is
    let ng = 0;
    for (const b of this.boten) {
      const h = this.zoneHelder[b.rt.zone] ?? 0;
      b.obj.visible = h > 0.25;
      if (!b.obj.visible) continue;
      b.u += b.v * dt * b.richting;
      if (b.u > 1) { b.u = 1; b.richting = -1; }
      if (b.u < 0) { b.u = 0; b.richting = 1; }
      const z = lerp(b.rt.z0, b.rt.z1, b.u);
      const x = b.groot ? 0 : Math.sin(t * 0.3 + b.u * 6) * 0.18;
      b.obj.position.set(x, WATER_Y + 0.1 + Math.sin(t * 1.3 + b.u * 4) * 0.02, z);
      b.obj.rotation.y = b.richting > 0 ? 0 : Math.PI;
      b.obj.rotation.z = Math.sin(t * 1.1 + b.u * 3) * 0.035 * (1 + wind);
      if (ng < this.golven.count + 8) { M4.compose(V3.set(x, WATER_Y + 0.02, z), Q.identity(), S3.setScalar(b.groot ? 4 : 1.6)); this.golven.setMatrixAt(ng++, M4); }
    }
    // dieren: zichtbaar naar de helderheid, en ze bewegen zachtjes
    for (const d of this.dieren) {
      const h = this.zoneHelder[d.zone] ?? 0;
      const drempel = d.soort === 'vis' ? 0.5 : d.soort === 'zwaan' ? 0.6 : 0.4;
      d.obj.visible = h > drempel;
      if (!d.obj.visible) continue;
      const zwem = d.soort === 'vis' ? 0.55 : 0.3;
      const x = d.x + Math.sin(t * zwem + d.f) * (d.soort === 'vis' ? 0.5 : 0.9);
      const z = d.z + Math.cos(t * zwem * 0.8 + d.f) * (d.soort === 'vis' ? 1.6 : 0.9);
      const y = d.lucht ? 0.0 : WATER_Y + (d.soort === 'vis' ? -0.12 + Math.sin(t * 2 + d.f) * 0.05 : 0.02);
      d.obj.position.set(x, y, z);
      d.obj.rotation.y = Math.atan2(Math.cos(t * zwem + d.f), -Math.sin(t * zwem * 0.8 + d.f)) + (d.soort === 'vis' ? Math.PI / 2 : 0);
      if (!d.lucht && d.soort !== 'vis' && ng < this.golven.instanceMatrix.count) { M4.compose(V3.set(x, WATER_Y + 0.02, z), Q.identity(), S3.setScalar(0.8)); this.golven.setMatrixAt(ng++, M4); }
    }
    this.golven.count = ng; this.golven.instanceMatrix.needsUpdate = true;
    void windRichting;
  }

  /** Hoe helder is deze zone nu (gedempt)? */
  helder(zone) { return this.zoneHelder[zone] ?? 0; }
  /** De gemiddelde helderheid, voor de HUD. */
  get gemiddeld() { const v = Object.values(this.zoneHelder); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
}

/** De waterval naast het Minnewater: een hellend vlak met stromend water en nevel. */
export class Waterval {
  constructor(stad, { x = 9.2, z = 36.0, hoogte = 2.4, breedte = 3.2 } = {}) {
    this.stad = stad;
    const groep = this.groep = new THREE.Group();
    groep.position.set(x, 0, z);
    // rots
    const rots = new THREE.Mesh(new THREE.BoxGeometry(2.0, hoogte, breedte + 1.6), new THREE.MeshLambertMaterial({ color: '#9a9183' }));
    rots.position.set(0.9, hoogte / 2 - 0.2, 0); rots.castShadow = true; rots.receiveShadow = true;
    groep.add(rots);
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
    const val = new THREE.Mesh(new THREE.PlaneGeometry(breedte, hoogte + 0.3), mat);
    val.position.set(-0.1, (hoogte + 0.3) / 2 - 0.3, 0); val.rotation.y = -Math.PI / 2;
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
      M4.compose(V3.set(-0.5 - Math.cos(p.a) * p.r * 0.4, p.y + ((t * 0.5 + p.f) % 1) * 0.6, Math.sin(p.a) * p.r), Q.identity(), S3.set(s, s, s));
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
