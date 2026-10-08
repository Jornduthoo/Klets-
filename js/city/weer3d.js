// Het echte weer en het echte seizoen in de 3D-stad: regen, motregen, sneeuw (met sneeuwdek), mist,
// wolken, zon, wind (molens, bomen, vlaggen) en in december de kerstmarkt op de Markt.
// De gegevens komen uit js/city/weer.js; hier wordt er enkel mee getekend.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, clamp, lerp } from '../core/util.js';
import { sterktes } from './weer.js';

const TAU = Math.PI * 2;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();

// Regen en sneeuw als punten die in een blok rond de camera vallen (goedkoop, en je ziet het overal).
const DRUPPEL_VS = `
uniform float uT; uniform float uVal; uniform vec3 uMidden; uniform float uWindX; uniform float uWindZ;
uniform float uGrootte; uniform float uBlok; attribute float aFase;
varying float vA;
void main(){
  float h = uBlok;
  float y = mod(position.y - uT * uVal + aFase * h, h);
  vec3 p = vec3(position.x, y, position.z) + uMidden;
  p.x += (h - y) * uWindX * 0.08;
  p.z += (h - y) * uWindZ * 0.08;
  vA = smoothstep(0.0, 2.0, y);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uGrootte * (18.0 / max(1.0, -mv.z));
}`;
const DRUPPEL_FS = `
uniform vec3 uKleur; uniform float uDekking; varying float vA;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.1, length(d));
  gl_FragColor = vec4(uKleur, a * uDekking * vA);
  #include <colorspace_fragment>
}`;

function deeltjes(n, blok, kleur, grootte, snelheid, rekken) {
  const pos = new Float32Array(n * 3), fase = new Float32Array(n);
  const r = rng('drup' + n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (r() - 0.5) * blok * 2.2;
    pos[i * 3 + 1] = r() * blok;
    pos[i * 3 + 2] = (r() - 0.5) * blok * 2.2;
    fase[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 }, uVal: { value: snelheid }, uMidden: { value: new THREE.Vector3() },
      uWindX: { value: 0 }, uWindZ: { value: 0 }, uKleur: { value: new THREE.Color(kleur) },
      uDekking: { value: 0 }, uGrootte: { value: grootte }, uBlok: { value: blok },
    },
    vertexShader: DRUPPEL_VS, fragmentShader: DRUPPEL_FS, transparent: true, depthWrite: false, fog: false,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  void rekken;
  return p;
}

export class Weer3D {
  constructor(stad) {
    this.stad = stad;
    this.scene = stad.scene;
    this.weer = null;
    this.s = { regen: 0, sneeuw: 0, mist: 0, wolken: 0.5, wind: 0.2, zon: 0.6, onweer: 0, nacht: 0 };
    this.doel = { ...this.s };
    this.sneeuwdek = 0;
    const hoog = stad.kwaliteit === 'hoog';
    this.regen = deeltjes(hoog ? 2600 : 1100, 34, '#cfe6f6', 1.1, 26, 7);
    this.sneeuw = deeltjes(hoog ? 1600 : 700, 30, '#ffffff', 2.6, 3.2, 1);
    this.scene.add(this.regen, this.sneeuw);
    this.uSneeuw = { value: 0 };     // sneeuwdek op alles wat naar boven kijkt
    this.uDroog = { value: 1 };
    this._bouwKerstmarkt();
  }

  /** Sneeuwdek en natte glans aan de materialen van de stad hangen. */
  hangAan(materiaal) {
    if (!materiaal || materiaal.userData?.weerAan) return materiaal;
    const vorige = materiaal.onBeforeCompile;
    materiaal.userData = { ...(materiaal.userData || {}), weerAan: true };
    materiaal.onBeforeCompile = (sh, rend) => {
      vorige?.(sh, rend);
      sh.uniforms.uSneeuw = this.uSneeuw;
      sh.uniforms.uDroog = this.uDroog;
      sh.vertexShader = 'varying vec3 vWereldNormaal;\n' + sh.vertexShader.replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n vWereldNormaal = normalize(mat3(modelMatrix) * objectNormal);');
      if (!sh.vertexShader.includes('vWereldNormaal =')) {
        sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWereldNormaal = normalize(mat3(modelMatrix) * objectNormal);');
      }
      sh.fragmentShader = 'uniform float uSneeuw; uniform float uDroog; varying vec3 vWereldNormaal;\n' + sh.fragmentShader.replace('#include <color_fragment>',
        `#include <color_fragment>
         float omhoog = clamp(vWereldNormaal.y, 0.0, 1.0);
         float dek = smoothstep(0.55, 0.95, omhoog) * uSneeuw;
         diffuseColor.rgb = mix(diffuseColor.rgb * mix(1.0, 0.78, 1.0 - uDroog), vec3(0.96, 0.97, 1.0), dek);`);
    };
    materiaal.needsUpdate = true;
    return materiaal;
  }

  _bouwKerstmarkt() {
    this.kerst = new THREE.Group();
    this.kerst.visible = false;
    this.scene.add(this.kerst);
    this._kerstGebouwd = false;
  }
  async _vulKerstmarkt() {
    if (this._kerstGebouwd) return;
    this._kerstGebouwd = true;
    const { kraamGeo, kerstboomGeo } = await import('./brugge.js');
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const r = rng('kerst');
    // de kraampjes staan in een boog voor de gildehuizen (de terrasjes maken plaats)
    const hoeken = [-8, 8, 24, 40, 140, 156, 172, 188];
    hoeken.forEach((d, i) => {
      const a = d * Math.PI / 180;
      const m = new THREE.Mesh(kraamGeo(i), mat);
      m.position.set(Math.cos(a) * 4.6, 0, Math.sin(a) * 4.6);
      m.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      m.castShadow = true;
      this.kerst.add(m);
      void r;
    });
    const boom = new THREE.Mesh(kerstboomGeo(), mat);
    boom.position.set(0, 0, 4.6); boom.castShadow = true;
    this.kerst.add(boom);
  }

  /** Nieuw weer: alles beweegt zacht naar de nieuwe toestand. */
  setWeer(w) {
    this.weer = w;
    this.doel = sterktes(w);
    this.seizoen = w?.seizoen || 'lente';
    this.kerstmarkt = !!w?.kerstmarkt;
    if (this.kerstmarkt) this._vulKerstmarkt().then(() => { this.kerst.visible = true; for (const t of this.stad.terrassen || []) t.visible = false; });
    else { this.kerst.visible = false; for (const t of this.stad.terrassen || []) t.visible = true; }
    this.stad.zetSeizoen?.(this.seizoen, w);
    // Het eerste weer na het openen geldt meteen: geen tien seconden wachten op het sneeuwdek, de regen of de mist.
    if (!this._eersteWeer) {
      this._eersteWeer = true;
      this.s = { ...this.s, ...this.doel };
      this.sneeuwdek = this._wilSneeuwdek();
      this.uSneeuw.value = this.sneeuwdek;
      this.uDroog.value = 1 - clamp(this.s.regen * 0.9, 0, 0.8);
    }
  }
  /** Hoeveel sneeuwdek hoort er bij het huidige weer? (1 = alles wit) */
  _wilSneeuwdek() {
    const w = this.weer || {};
    const koud = (w.temp ?? 10) < 2.5;
    return this.s.sneeuw > 0.1 && koud ? 1 : (koud && this.seizoen === 'winter' ? this.sneeuwdek : 0);
  }

  tick(dt, t, cam) {
    const k = 1 - Math.exp(-dt * 0.7);
    for (const key of Object.keys(this.doel)) this.s[key] = lerp(this.s[key] ?? 0, this.doel[key], k);
    const w = this.weer || {};
    const windHoek = ((w.richting ?? 240) + 180) * Math.PI / 180;   // waar de wind naartoe blaast
    const wx = Math.sin(windHoek) * this.s.wind, wz = -Math.cos(windHoek) * this.s.wind;
    for (const [p, sterkte] of [[this.regen, this.s.regen], [this.sneeuw, this.s.sneeuw]]) {
      const u = p.material.uniforms;
      u.uT.value = t; u.uDekking.value = sterkte * 0.85;
      u.uWindX.value = wx * 5; u.uWindZ.value = wz * 5;
      if (cam) u.uMidden.value.set(Math.round(cam.position.x), -4, Math.round(cam.position.z));
      p.visible = sterkte > 0.02;
    }
    // sneeuwdek groeit zolang het sneeuwt en het koud is, en smelt daarna (bij het openen staat het er meteen, zie setWeer)
    const wil = this._wilSneeuwdek();
    this.sneeuwdek = lerp(this.sneeuwdek, wil, 1 - Math.exp(-dt * 0.12));
    this.uSneeuw.value = this.sneeuwdek;
    this.uDroog.value = 1 - clamp(this.s.regen * 0.9, 0, 0.8);
    return { ...this.s, sneeuwdek: this.sneeuwdek, windX: wx, windZ: wz, windHoek };
  }
}

/** Kleuren van de bomen per seizoen (gebruikt door de stad voor de instanties). */
export const SEIZOEN_BLAD = {
  lente: ['#8ed364', '#a6dd79', '#7cc457', '#f7c8de', '#ffe3ef', '#bfe59a'],
  zomer: ['#5cb84a', '#6cc552', '#4fa844', '#86cf55', '#3f9a48', '#9bd35a'],
  herfst: ['#e8a33c', '#d9772f', '#c85a2a', '#f2c94c', '#b8863a', '#e2643e'],
  winter: ['#9a8a76', '#8d7e6b', '#a89881', '#7f7566', '#9e9281', '#8a7d6c'],
};
/** Hoe vol staat de boom? (winter = kaal) */
export const SEIZOEN_BLADVOL = { lente: 0.92, zomer: 1, herfst: 0.85, winter: 0.3 };

/** Vallende blaadjes in de herfst. */
export class Blaadjes {
  constructor(stad, n = 90) {
    this.stad = stad;
    const r = rng('blad');
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshLambertMaterial({ color: '#e8a33c', side: THREE.DoubleSide, transparent: true, opacity: 0.95 }), n);
    this.mesh.count = 0;
    this.data = [];
    for (let i = 0; i < n; i++) this.data.push({ x: (r() - 0.5) * 70, z: (r() - 0.5) * 70, y: r() * 9, v: 0.5 + r() * 0.6, f: r() * 9, dr: r() * TAU });
    stad.scene.add(this.mesh);
  }
  tick(dt, t, sterkte = 0, wind = { x: 0, z: 0 }) {
    if (sterkte < 0.02) { this.mesh.count = 0; return; }
    let i = 0;
    for (const p of this.data) {
      p.y -= p.v * dt;
      p.x += wind.x * dt * 2 + Math.sin(t + p.f) * dt * 0.6;
      p.z += wind.z * dt * 2;
      if (p.y < 0) { p.y = 8 + Math.random() * 3; p.x = (Math.random() - 0.5) * 70; p.z = (Math.random() - 0.5) * 70; }
      Q.setFromEuler(new THREE.Euler(t * 1.6 + p.f, p.dr + t, t * 0.9));
      M4.compose(V3.set(p.x, p.y, p.z), Q, S3.setScalar(1));
      this.mesh.setMatrixAt(i++, M4);
    }
    this.mesh.count = Math.round(i * clamp(sterkte, 0, 1));
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
