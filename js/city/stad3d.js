// De 3D-stad Klets (three.js, WebGL). Een levende low-poly stad in een dal tussen de bergen:
// wijken per macht, gebouwen die groeien met de klas, de Grijze Mist aan de rand, auto's, een trein,
// wolken, dag en nacht, kaartlagen en een tilt-shift-look. Gemaakt om vlot te draaien op gewone schoollaptops.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, clamp, lerp } from '../core/util.js';
import {
  RINGEN, PLEIN_R, DAL_R, BERG_R, SPOOR_HALF, SPOOR_SPOREN, SPOOR_X, LAAN_HOEKEN, WEG_HALF, VOORTUIN, MIST_MAX, POORT, TUNNEL_WEST,
  WIJKEN, KLEUR, PLEIN, kavels, huisKavels, polar, isVrijVoorBoom, hqPositie, stadStraal, lokaalNaarWereld,
} from './layout.js';
import { Wegen3D } from './wegen3d.js';
import {
  doelGebouw, hqGebouw, huisGebouw, stationGebouw, klasmeterGebouw, kluisGebouw, missiebordGebouw, poortGebouw, tunnelGebouw,
  boomGeo, treinGeo, steigerGeo, bouwplaatsGeo, kraanArmGeo, wolkGeo, vlamGeo, KLEUREN, tint,
} from './modellen.js';
import { AVATAR_OPTIES, dakKleur } from '../figuren/uiterlijk.js';
import { Figuren3D } from './figuren3d.js';

const TAU = Math.PI * 2;
const V3 = new THREE.Vector3(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), E = new THREE.Euler(), K = new THREE.Color();
const YAS = new THREE.Vector3(0, 1, 0);
const ease = { uit: t => 1 - Math.pow(1 - t, 3), terug: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }, inUit: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Is WebGL beschikbaar op dit toestel? */
export function heeftWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Hoogte van het terrein (bergen rond het dal). */
export function terreinHoogte(x, z) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x);
  if (r < BERG_R - 1) return 0;
  const n = Math.sin(a * 5 + 1.3) * 0.5 + Math.sin(a * 11 + r * 0.13) * 0.3 + Math.sin(a * 23 - r * 0.21) * 0.2 + Math.sin(a * 3 - 0.7) * 0.4;
  let h = smooth(BERG_R - 1, BERG_R + 14, r) * (13 + n * 7) + smooth(BERG_R + 14, BERG_R + 60, r) * (16 + n * 10);
  return h;
}

// ---------- textures in code ----------
function canvasTex(w, h, teken, { herhaal = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  teken(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (herhaal) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}
function gloedTex() {
  return canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }, { srgb: false });
}
function schaduwTex() {
  return canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }, { srgb: false });
}
function kavelTex() {
  return canvasTex(64, 64, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(4, 4, w - 8, w - 8);
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 3; g.setLineDash([7, 5]); g.strokeRect(5, 5, w - 10, w - 10);
  }, { srgb: false });
}
function wegTex() {
  return canvasTex(128, 96, (g, w, h) => {
    const stoep = 18;
    g.fillStyle = '#dcd8cf'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9c4ba'; for (let x = 0; x < w; x += 16) { g.fillRect(x, 0, 1, stoep); g.fillRect(x, h - stoep, 1, stoep); }
    g.fillStyle = '#b9b4aa'; g.fillRect(0, stoep - 2, w, 2); g.fillRect(0, h - stoep, w, 2);
    g.fillStyle = '#5d6676'; g.fillRect(0, stoep, w, h - stoep * 2);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},0.06)`; g.fillRect(Math.random() * w, stoep + Math.random() * (h - stoep * 2), 2, 2); }
    g.fillStyle = '#eef1f5'; g.fillRect(0, stoep + 3, w, 2); g.fillRect(0, h - stoep - 5, w, 2);
    g.fillStyle = '#f7e2a0'; g.fillRect(0, h / 2 - 1.5, w * 0.55, 3);
  }, { herhaal: true });
}

// ---------- shaders ----------
const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const SKY_FS = `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uZonKleur; uniform vec3 uZon; varying vec3 vDir;
void main(){ float h = clamp(vDir.y, -0.2, 1.0); vec3 c = mix(uHor, uTop, smoothstep(-0.02, 0.55, h));
 float s = max(dot(normalize(vDir), normalize(uZon)), 0.0); c += uZonKleur * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.25);
 gl_FragColor = vec4(c, 1.0);
 #include <colorspace_fragment>
}`;
const NOISE = `
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
 return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*vnoise(p); p *= 2.03; a *= 0.5; } return s; }`;
const MIST_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const MIST_FS = `uniform float uR; uniform float uT; uniform float uA; uniform vec3 uKleur; uniform float uLaag; varying vec3 vW; ${NOISE}
void main(){ float r = length(vW.xz); float n = fbm(vW.xz*0.07 + vec2(uT*0.02, -uT*0.015) + uLaag*3.1);
 float a = smoothstep(uR - 3.0, uR + 6.0, r + (n - 0.5) * 9.0) * uA * (0.55 + 0.6 * n);
 a *= 1.0 - smoothstep(92.0, 110.0, r);
 gl_FragColor = vec4(uKleur * (0.9 + 0.2*n), a);
 #include <colorspace_fragment>
}`;
const POST_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FS = `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uBlur; uniform float uFocus; uniform float uBand; uniform float uSat; varying vec2 vUv;
void main(){
 vec3 c = texture2D(tDiffuse, vUv).rgb;
 float d = abs(vUv.y - uFocus);
 float amt = smoothstep(uBand * 0.45, uBand * 1.25, d) * uBlur;
 if (amt > 0.35) {
   vec3 acc = c; float w = 1.0;
   for (int i = 1; i < 14; i++) { float fi = float(i); float a = fi * 2.39996; float rr = sqrt(fi / 13.0) * amt;
     acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * rr / uRes).rgb; w += 1.0; }
   c = acc / w;
 }
 float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
 c = mix(vec3(l), c, uSat);
 vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.42;
 gl_FragColor = vec4(c, 1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

// ---------- de stad ----------
export class Stad3D {
  /**
   * opts: { onPick(id), onHover(id), kwaliteit: 'auto'|'hoog'|'laag', onKwaliteit(q), digibord: bool }
   */
  constructor(container, opts = {}) {
    this.c = container; this.o = opts;
    this.kwaliteit = opts.kwaliteit === 'laag' ? 'laag' : 'hoog';
    this.autoKwaliteit = !opts.kwaliteit || opts.kwaliteit === 'auto';
    this.t = 0; this.tijdMode = 'cyclus'; this.dagFase = 0.13; this.overlay = null; this.pauze = false;
    this.storm = 0; this.stormDoel = 0; this.flits = 0; this.anims = []; this.stof = []; this.bekend = null;
    this.model = null; this.markers = new Map(); this.selectie = null;
    this.r = rng('klets-stad');

    const R = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    R.setPixelRatio(this._dpr());
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 1.05;
    R.domElement.className = 'stad-canvas3d';
    R.domElement.setAttribute('tabindex', '0');
    R.domElement.setAttribute('aria-label', 'De stad Klets. Sleep om te schuiven, scroll om te zoomen, rechtermuisknop om te draaien.');
    container.append(R.domElement);
    this.markerLaag = document.createElement('div'); this.markerLaag.className = 'stad-markers'; container.append(this.markerLaag);

    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(32, 1, 2, 900);
    this.cs = { tx: 0, tz: 4, dist: 62, yaw: 0.62, pitchExtra: 0 };
    this.cd = { ...this.cs };
    if (opts.digibord) { this.cd.dist = this.cs.dist = 100; }

    this._bouwLicht();
    this._bouwLucht();
    this._bouwGrond();
    this._bouwBergen();
    this.gloedTex = gloedTex();
    this._bouwSpoor();
    this.wegNet = new Wegen3D(this);
    this._bouwPlein();
    this._bouwHQs();
    this._bouwBomen();
    this._bouwDynamisch();
    this._bouwVerkeer();
    this.figuren = new Figuren3D(this);
    this._bouwMist();
    this._bouwWolken();
    this._bouwStorm();
    this._bouwPost();
    this._bedieningen();

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(container);
    this._resize();
    this._fps = { n: 0, t: 0, laag: 0, waarde: 60 };
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  _dpr() { return Math.min(window.devicePixelRatio || 1, this.kwaliteit === 'hoog' ? 1.5 : 1); }

  // ---------- licht en lucht ----------
  _bouwLicht() {
    this.hemi = new THREE.HemisphereLight('#cfe8ff', '#8fb36a', 1.15);
    this.scene.add(this.hemi);
    const zon = this.zon = new THREE.DirectionalLight('#fff2dc', 2.6);
    zon.castShadow = true;
    const sz = this.kwaliteit === 'hoog' ? 2048 : 1024;
    zon.shadow.mapSize.set(sz, sz);
    zon.shadow.bias = -0.0004; zon.shadow.normalBias = 0.03;
    zon.shadow.camera.near = 1; zon.shadow.camera.far = 260;
    this.scene.add(zon, zon.target);
    this.scene.fog = new THREE.Fog('#d8eefc', 140, 380);
  }
  _bouwLucht() {
    this.luchtMat = new THREE.ShaderMaterial({
      uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uZonKleur: { value: new THREE.Color() }, uZon: { value: new THREE.Vector3(0, 1, 0) } },
      vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const lucht = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 12), this.luchtMat);
    lucht.renderOrder = -10; lucht.frustumCulled = false;
    this.scene.add(lucht);
    // sterren
    const n = 500, pos = new Float32Array(n * 3), rr = rng('sterren');
    for (let i = 0; i < n; i++) { const a = rr() * TAU, e = 0.12 + rr() * 1.3; pos.set([Math.cos(a) * Math.cos(e) * 560, Math.sin(e) * 560, Math.sin(a) * Math.cos(e) * 560], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.sterMat = new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.sterren = new THREE.Points(g, this.sterMat); this.sterren.frustumCulled = false;
    this.scene.add(this.sterren);
  }

  // ---------- grond ----------
  _bouwGrond() {
    const RAD = BERG_R + 0.5, S = this.kwaliteit === 'hoog' ? 3072 : 2048;
    const toPx = (x) => (x / (2 * RAD) + 0.5) * S, sc = S / (2 * RAD);
    const rr = rng('grond');
    const tex = canvasTex(S, S, (g) => {
      // gras met vlekken
      g.fillStyle = '#86c95a'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 2600; i++) {
        const x = rr() * S, y = rr() * S, r = (0.6 + rr() * 2.8) * sc;
        g.fillStyle = rr() < 0.5 ? 'rgba(120,190,80,.35)' : 'rgba(160,214,96,.3)';
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      // wijken: zachte tint
      for (const w of WIJKEN) {
        const a = w.hoek * Math.PI / 180;
        g.save(); g.globalAlpha = 0.11; g.fillStyle = KLEUR[w.macht];
        g.beginPath(); g.arc(toPx(0), toPx(0), RINGEN[RINGEN.length - 1] * sc, a - Math.PI / 6, a + Math.PI / 6); g.arc(toPx(0), toPx(0), RINGEN[1] * sc, a + Math.PI / 6, a - Math.PI / 6, true); g.closePath(); g.fill();
        g.restore();
      }
      // velden in de buitenrand
      for (let i = 0; i < 26; i++) {
        const a = rr() * TAU, r0 = RINGEN[RINGEN.length - 1] + 2.5 + rr() * 3, r1 = r0 + 3 + rr() * 3, da = 0.05 + rr() * 0.07;
        if (Math.abs(Math.sin(a)) * r0 < 4) continue;
        const kl = ['#e7cf6a', '#c9df6a', '#a4d35c', '#e3b75a', '#b8d873'][Math.floor(rr() * 5)];
        g.save(); g.fillStyle = kl; g.beginPath(); g.arc(toPx(0), toPx(0), r1 * sc, a, a + da); g.arc(toPx(0), toPx(0), r0 * sc, a + da, a, true); g.closePath(); g.fill();
        g.clip(); g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = sc * 0.18;
        for (let k = r0; k < r1; k += 0.45) { g.beginPath(); g.arc(toPx(0), toPx(0), k * sc, a, a + da); g.stroke(); }
        g.restore();
      }
      // vijver
      const vp = polar(49, 250 * Math.PI / 180); this.vijver = vp;
      g.fillStyle = '#e9dcb2'; g.beginPath(); g.ellipse(toPx(vp.x), toPx(vp.z), 5.0 * sc, 3.6 * sc, 0.4, 0, TAU); g.fill();
      // plein
      g.fillStyle = '#efe6d6'; g.beginPath(); g.arc(toPx(0), toPx(0), PLEIN_R * sc, 0, TAU); g.fill();
      g.strokeStyle = '#e0d3bd'; g.lineWidth = sc * 0.2;
      for (let r = 1.5; r < PLEIN_R; r += 1.4) { g.beginPath(); g.arc(toPx(0), toPx(4.3), r * sc, 0, TAU); g.stroke(); }
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(toPx(Math.cos(a) * 1.8), toPx(4.3 + Math.sin(a) * 1.8)); g.lineTo(toPx(Math.cos(a) * PLEIN_R), toPx(4.3 + Math.sin(a) * PLEIN_R)); g.stroke(); }
      // spoorbedding
      g.fillStyle = '#a9a196'; g.fillRect(0, toPx(-SPOOR_HALF + 0.55), S, (SPOOR_HALF * 2 - 1.1) * sc);
      for (let i = 0; i < 4000; i++) { g.fillStyle = rr() < .5 ? 'rgba(80,70,60,.25)' : 'rgba(255,255,255,.2)'; g.fillRect(rr() * S, toPx(-SPOOR_HALF + 0.6) + rr() * (SPOOR_HALF * 2 - 1.2) * sc, 2, 2); }
    });
    this.grondMat = new THREE.MeshLambertMaterial({ map: tex });
    const grond = new THREE.Mesh(new THREE.CircleGeometry(RAD, 96), this.grondMat);
    grond.rotation.x = -Math.PI / 2; grond.receiveShadow = true;
    this.scene.add(grond);
    this.grond = grond;
    // vijver
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshPhongMaterial({ color: '#4fb0e6', shininess: 90, specular: '#ffffff', transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2; water.rotation.z = -0.4; water.scale.set(4.4, 3.0, 1); water.position.set(this.vijver.x, 0.03, this.vijver.z);
    water.receiveShadow = true; this.scene.add(water); this.water = water;
    // schaduwvlekken onder gebouwen
    this.ctTex = schaduwTex();
  }
  _bouwBergen() {
    const segA = 160, segR = 30, r0 = BERG_R - 1.5, r1 = 190;
    const pos = [], kl = [];
    const kleurVoor = (h, steil) => {
      if (h > 21) return '#f4f6fb';
      if (h > 15) return steil > 0.9 ? '#9a9187' : '#b7b3a8';
      if (h > 6) return steil > 1.0 ? '#8f8b7f' : '#5f9e4c';
      return '#7dbb57';
    };
    const pt = (i, j) => { const a = i / segA * TAU, t = j / segR, r = r0 + (r1 - r0) * Math.pow(t, 1.6); const x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, terreinHoogte(x, z) - (j === 0 ? 0.08 : 0), z]; };
    for (let i = 0; i < segA; i++) for (let j = 0; j < segR; j++) {
      const p00 = pt(i, j), p10 = pt(i + 1, j), p01 = pt(i, j + 1), p11 = pt(i + 1, j + 1);
      for (const tri of [[p00, p01, p10], [p10, p01, p11]]) {
        const hmid = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const d = Math.max(Math.hypot(tri[1][0] - tri[0][0], tri[1][2] - tri[0][2]), 0.1);
        const steil = Math.abs(tri[1][1] - tri[0][1]) / d;
        K.set(kleurVoor(hmid + (this.r() - 0.5) * 2, steil)).convertSRGBToLinear();
        const f = 0.92 + this.r() * 0.12;
        for (const q of tri) { pos.push(...q); kl.push(K.r * f, K.g * f, K.b * f); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(kl, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    m.receiveShadow = true;
    this.scene.add(m);
    this.bergen = m;
  }
  _bouwSpoor() {
    const metaal = new THREE.MeshLambertMaterial({ color: '#8d939e' });
    const L = 2 * (BERG_R + 6);
    for (const tz of SPOOR_SPOREN) for (const dz of [-0.26, 0.26]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.07, 0.06), metaal); r.position.set(0, 0.1, tz + dz); r.receiveShadow = true; this.scene.add(r);
    }
    // tunnels: De Poort (oost) en het westportaal
    const poort = this._mesh(poortGebouw(), 'poort');
    poort.position.set(POORT.x, 0, POORT.z); poort.rotation.y = -Math.PI / 2; this.scene.add(poort);
    const tw = this._mesh(tunnelGebouw(), 'tunnel');
    tw.position.set(TUNNEL_WEST.x, 0, TUNNEL_WEST.z); tw.rotation.y = Math.PI / 2; this.scene.add(tw);
    this.poortObj = poort;
  }

  /** Mesh van een {body, ramen}-model met gedeelde materialen. */
  _mesh(model, id) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(model.body, this._lijfMat());
    b.castShadow = true; b.receiveShadow = true; g.add(b);
    if (model.ramen) { const r = new THREE.Mesh(model.ramen, this._raamMat()); g.add(r); }
    if (id) { g.userData.id = id; g.traverse(o => { o.userData.id = id; }); this.kiesbaar = this.kiesbaar || []; this.kiesbaar.push(g); }
    return g;
  }
  _lijfMat() {
    if (!this.matLijf) {
      this.matLijf = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.matData = new THREE.MeshLambertMaterial({ color: '#e9eef6' });
    }
    return this.matLijf;
  }
  _raamMat() {
    if (!this.matRaam) {
      const u = this.raamU = { uNacht: { value: 0 }, uDag: { value: new THREE.Color('#8fb5d8') } };
      const m = new THREE.MeshBasicMaterial({ vertexColors: true });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uNacht = u.uNacht; sh.uniforms.uDag = u.uDag;
        sh.fragmentShader = 'uniform float uNacht; uniform vec3 uDag;\n' + sh.fragmentShader.replace('#include <color_fragment>',
          `#if defined( USE_COLOR )
            float aan = step(0.3, vColor.r);
            diffuseColor.rgb = mix(uDag * (0.82 + 0.3 * vColor.b), vColor * (aan * 2.2 + 0.25), uNacht);
          #endif`);
      };
      this.matRaam = m;
    }
    return this.matRaam;
  }

  _bouwPlein() {
    const st = this._mesh(stationGebouw(), 'station');
    st.position.set(PLEIN.station.x, 0, 0); this.scene.add(st);
    const km = this._mesh(klasmeterGebouw(), 'klasmeter');
    km.position.set(PLEIN.klasmeter.x, 0, PLEIN.klasmeter.z); this.scene.add(km);
    // klasmeter-ring: hoogte = voortgang van de klas
    this.meterRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 8, 24), new THREE.MeshBasicMaterial({ color: '#ffd166' }));
    this.meterRing.rotation.x = Math.PI / 2; this.meterRing.position.set(PLEIN.klasmeter.x, 0.8, PLEIN.klasmeter.z);
    this.meterRing.userData.id = 'klasmeter'; this.scene.add(this.meterRing);
    const kl = this._mesh(kluisGebouw(), 'kluis');
    kl.position.set(PLEIN.kluis.x, 0, PLEIN.kluis.z); kl.rotation.y = PLEIN.kluis.rot; this.scene.add(kl);
    const mb = this._mesh(missiebordGebouw(), 'missiebord');
    mb.position.set(PLEIN.missiebord.x, 0, PLEIN.missiebord.z); mb.rotation.y = PLEIN.missiebord.rot; this.scene.add(mb);
  }
  _bouwHQs() {
    this.hqs = {};
    for (const w of WIJKEN) {
      const p = hqPositie(w);
      const m = this._mesh(hqGebouw(w.gids, w.macht), 'gids:' + w.gids);
      m.position.set(p.x, 0, p.z); m.rotation.y = p.rot; this.scene.add(m);
      this.hqs[w.gids] = { obj: m, p };
      if (w.gids === 'bram') {
        const v = new THREE.Mesh(vlamGeo(), new THREE.MeshBasicMaterial({ vertexColors: true }));
        v.position.copy(new THREE.Vector3(0, 0.25, -0.2).applyAxisAngle(YAS, p.rot).add(m.position));
        this.vlam = v; this.scene.add(v);
        this.vlamLicht = new THREE.PointLight('#ff9a3c', 0, 9, 1.6); this.vlamLicht.position.copy(v.position).add(new THREE.Vector3(0, 0.8, 0));
        this.scene.add(this.vlamLicht);
      }
    }
  }

  // ---------- bomen ----------
  _bouwBomen() {
    const loof = boomGeo('loof'), den = boomGeo('den');
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.boomU = { uT: { value: 0 } };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = this.boomU.uT;
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
          float sw = smoothstep(0.35, 1.4, position.y);
          transformed.x += sin(uT * 1.6 + ph) * 0.06 * sw;
          transformed.z += cos(uT * 1.3 + ph * 1.3) * 0.045 * sw;
        #endif`);
    };
    this.boomMat = mat;
    const max = this.kwaliteit === 'hoog' ? 2600 : 1400;
    this.loof = new THREE.InstancedMesh(loof, mat, max); this.den = new THREE.InstancedMesh(den, mat, max);
    for (const b of [this.loof, this.den]) { b.castShadow = true; b.receiveShadow = true; b.count = 0; this.scene.add(b); }
    // vaste bomen
    const rr = rng('bomen');
    this.vasteBomen = [];
    const plant = (x, z, s, soort) => this.vasteBomen.push({ x, z, s, soort, y: terreinHoogte(x, z) });
    // plein: een paar bomen
    for (const [x, z] of [[-6.2, 2.6], [6.2, 2.6], [-5.2, 5.2], [5.2, 5.2], [-3.1, 6.5], [3.1, 6.5]]) plant(x, z, 0.75, 'loof');
    // buitenrand: bosjes
    const nBos = this.kwaliteit === 'hoog' ? 900 : 450;
    for (let i = 0; i < nBos; i++) {
      const cx = rr() * TAU, cr = RINGEN[RINGEN.length - 1] + 2 + rr() * 9.5;
      const p = polar(cr, cx);
      if (!isVrijVoorBoom(p.x, p.z)) continue;
      if (Math.hypot(p.x - this.vijver.x, p.z - this.vijver.z) < 6) continue;
      if (rr() < 0.35 && cr < 50) continue;
      plant(p.x, p.z, 0.7 + rr() * 0.6, rr() < 0.3 ? 'den' : 'loof');
    }
    // bergen
    const nBerg = this.kwaliteit === 'hoog' ? 1300 : 650;
    for (let i = 0; i < nBerg; i++) {
      const a = rr() * TAU, r = BERG_R + 1 + Math.pow(rr(), 1.4) * 45;
      const p = polar(r, a), y = terreinHoogte(p.x, p.z);
      if (y > 14 || Math.abs(p.z) < 4.5) continue;
      plant(p.x, p.z, 0.9 + rr() * 0.9, rr() < 0.75 ? 'den' : 'loof');
    }
    this._boomKleuren = ['#5cb84a', '#6cc552', '#4fa844', '#86cf55', '#3f9a48', '#9bd35a', '#e8a33c', '#f2c94c'];
  }
  _zetBomen(extra = []) {
    const alle = this.vasteBomen.concat(extra);
    let nl = 0, nd = 0; const rr = rng('boomkleur');
    for (const b of alle) {
      const mesh = b.soort === 'den' ? this.den : this.loof;
      const i = b.soort === 'den' ? nd++ : nl++;
      if (i >= mesh.instanceMatrix.count) continue;
      E.set(0, rr() * TAU, 0); Q.setFromEuler(E);
      M4.compose(V3.set(b.x, b.y || 0, b.z), Q, S3.set(b.s, b.s * (0.9 + rr() * 0.25), b.s));
      mesh.setMatrixAt(i, M4);
      const kk = b.soort === 'den' ? '#ffffff' : this._boomKleuren[rr() < 0.06 ? 6 + Math.floor(rr() * 2) : Math.floor(rr() * 6)];
      mesh.setColorAt(i, K.set(kk));
    }
    this.loof.count = Math.min(nl, this.loof.instanceMatrix.count); this.den.count = Math.min(nd, this.den.instanceMatrix.count);
    for (const m of [this.loof, this.den]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
  }

  // ---------- gebouwen die met de klas meegroeien ----------
  _bouwDynamisch() {
    const K_ = kavels();
    this.typeMesh = {};
    for (const w of WIJKEN) {
      const cap = K_[w.macht].length + 4;
      for (let n = 0; n < 4; n++) {
        const mod = doelGebouw(w.macht, n);
        const body = new THREE.InstancedMesh(mod.body, this._lijfMat(), cap);
        body.castShadow = true; body.receiveShadow = true; body.count = 0; body.userData.ids = [];
        const ramen = mod.ramen ? new THREE.InstancedMesh(mod.ramen, this._raamMat(), cap) : null;
        if (ramen) ramen.count = 0;
        this.scene.add(body); if (ramen) this.scene.add(ramen);
        this.typeMesh[w.macht + n] = { body, ramen, hoogte: mod.body.userData.hoogte || 1 };
      }
    }
    // opritten: van de voorgevel tot aan de stoep
    this.oprit = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 1).translate(0, 0.02, 0), new THREE.MeshLambertMaterial({ color: '#e6e1d6', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), 800);
    this.oprit.count = 0; this.oprit.receiveShadow = true; this.scene.add(this.oprit);
    // contactschaduw onder gebouwen
    this.ctMat = new THREE.MeshBasicMaterial({ map: this.ctTex, transparent: true, depthWrite: false, opacity: 0.9 });
    this.contact = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.ctMat, 700);
    this.contact.count = 0; this.contact.renderOrder = 1; this.scene.add(this.contact);
    // bouwplaatsen (geoefend, nog niet behaald) met kraan
    this.werf = new THREE.InstancedMesh(bouwplaatsGeo(), this._lijfMat(), 600); this.werf.count = 0; this.werf.castShadow = true; this.werf.receiveShadow = true; this.werf.userData.ids = [];
    this.kraan = new THREE.InstancedMesh(kraanArmGeo(), this._lijfMat(), 600); this.kraan.count = 0; this.kraan.castShadow = true;
    this.scene.add(this.werf, this.kraan);
    // lege kavels: stippellijn in de kleur van de wijk
    this.kavelMat = new THREE.MeshBasicMaterial({ map: kavelTex(), transparent: true, depthWrite: false, opacity: 0.6 });
    this.leeg = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.1, 2.1).rotateX(-Math.PI / 2), this.kavelMat, 700); this.leeg.count = 0; this.leeg.renderOrder = 1;
    this.scene.add(this.leeg);
    // steigers, stofwolkjes
    this.steiger = new THREE.InstancedMesh(steigerGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), 24); this.steiger.count = 0; this.scene.add(this.steiger);
    this.stofMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#efe4cc', transparent: true, opacity: 0.85, depthWrite: false }), 220);
    this.stofMesh.count = 0; this.scene.add(this.stofMesh);
    // huizen
    this.huisGroep = new THREE.Group(); this.scene.add(this.huisGroep); this.huisCache = new Map();
    // kaartlagen
    this.gloedMat = new THREE.MeshBasicMaterial({ map: gloedTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 });
    this.gloed = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.gloedMat, 800);
    this.gloed.count = 0; this.gloed.renderOrder = 3; this.scene.add(this.gloed);
    // kaartlaag wijken: een gloeiende taartpunt per wijk
    this.wijkVlakken = WIJKEN.map(w => {
      const a = w.hoek * Math.PI / 180;
      const m = new THREE.Mesh(new THREE.RingGeometry(RINGEN[1] - 0.5, RINGEN[RINGEN.length - 1] + 0.5, 24, 1, -(a + Math.PI / 6) + 0.03, Math.PI / 3 - 0.06).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.position.y = 0.1; m.visible = false; m.renderOrder = 3; this.scene.add(m);
      return { macht: w.macht, m };
    });
    // selectiering
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.75, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }));
    this.selRing.visible = false; this.selRing.renderOrder = 4; this.scene.add(this.selRing);
  }

  /** Nieuwe toestand van de klas tonen. opts: { animeer, vlieg } */
  update(model, { animeer = true, vlieg = false } = {}) {
    const vorige = this.bekend; this.model = model;
    const nieuw = [];
    const bekend = new Map();
    for (const g of model.gebouwen) if (g.gebouwd) bekend.set(g.id, g.niveau);
    if (vorige && animeer) for (const g of model.gebouwen) if (g.gebouwd && (!vorige.has(g.id) || vorige.get(g.id) < g.niveau)) nieuw.push(g);
    if (this._extraNieuw) { for (const id of this._extraNieuw) { const g = model.gebouwen.find(x => x.id === id); if (g && !nieuw.includes(g)) nieuw.push(g); } this._extraNieuw = null; }
    this.bekend = bekend;

    // instanties per type
    for (const tm of Object.values(this.typeMesh)) { tm.body.count = 0; tm.body.userData.ids = []; if (tm.ramen) tm.ramen.count = 0; }
    this.plaats = new Map();
    let nc = 0, nw = 0, nl = 0;
    const rr = rng('tint');
    const animIds = new Set(nieuw.map(g => g.id));
    for (const g of model.gebouwen) {
      const s = g.slot; if (!s) continue;
      if (g.gebouwd) {
        const tm = this.typeMesh[g.macht + g.niveau]; const i = tm.body.count++;
        if (tm.ramen) tm.ramen.count = tm.body.count;
        tm.body.userData.ids[i] = g.id;
        const tintF = 0.93 + rr() * 0.1;
        tm.body.setColorAt(i, K.setRGB(tintF, tintF, tintF * (0.97 + rr() * 0.05)));
        const sy = 1 + (g.extraVerdieping || 0) * 0.35;
        this.plaats.set(g.id, { tm, i, s, sy });
        this._zetInstantie(tm, i, s, animIds.has(g.id) ? 0.0001 : sy);
        const fp = 2.9 + Math.min(1.4, tm.hoogte * 0.12);
        M4.compose(V3.set(s.x, 0.075, s.z), Q.setFromAxisAngle(YAS, s.rot), S3.set(fp, 1, fp)); this.contact.setMatrixAt(nc++, M4);
      } else {
        const i = nw++;
        M4.compose(V3.set(s.x, 0, s.z), Q.setFromAxisAngle(YAS, s.rot), S3.set(1, 1, 1));
        this.werf.setMatrixAt(i, M4); this.werf.userData.ids[i] = g.id;
        this.kraan.setMatrixAt(i, M4);
      }
    }
    // de stad groeit: enkel de ringwegen die in gebruik zijn, liggen er al
    const stadR = model.stadR ?? stadStraal(model.gebouwen);
    this.stadR = stadR;
    this.wegNet.zet(stadR);
    // lege kavels: in de stad een parkje (en de eerste paar kavels gemarkeerd), erbuiten bos
    const bezet = new Set(model.gebouwen.map(g => g.slot));
    const extraBomen = [];
    const rb = rng('lotbomen');
    for (const w of WIJKEN) {
      let volgende = 0;
      for (const s of kavels()[w.macht]) {
        if (bezet.has(s)) continue;
        if (s.r < stadR) {
          if (volgende++ < 4 && nl < this.leeg.instanceMatrix.count) {
            M4.compose(V3.set(s.x, 0.035, s.z), Q.setFromAxisAngle(YAS, s.rot), S3.set(1, 1, 1)); this.leeg.setMatrixAt(nl, M4);
            this.leeg.setColorAt(nl, K.set(KLEUR[w.macht]).lerp(new THREE.Color('#ffffff'), 0.2)); nl++;
            if (rb() < 0.5) { const o = polar(0.75, rb() * TAU); extraBomen.push({ x: s.x + o.x, z: s.z + o.z, s: 0.45 + rb() * 0.2, soort: 'loof' }); }
          } else for (let k = 0; k < 2; k++) { const o = polar(0.3 + rb() * 0.6, rb() * TAU); extraBomen.push({ x: s.x + o.x, z: s.z + o.z, s: 0.55 + rb() * 0.35, soort: 'loof' }); }
        } else {
          const n = 2 + Math.floor(rb() * 3);
          for (let k = 0; k < n; k++) { const o = polar(rb() * 1.3, rb() * TAU); extraBomen.push({ x: s.x + o.x, z: s.z + o.z, s: 0.7 + rb() * 0.6, soort: rb() < 0.3 ? 'den' : 'loof' }); }
        }
      }
    }
    // lege huiskavels: tuintjes
    const huisBezet = new Set(model.huizen.map(h => h.slot));
    for (const s of huisKavels()) if (!huisBezet.has(s)) { const o = polar(0.4, rb() * TAU); extraBomen.push({ x: s.x + o.x, z: s.z + o.z, s: 0.55 + rb() * 0.3, soort: 'loof' }); }
    // opritten voor elk bezet perceel (gebouw, bouwplaats, huis, gidsgebouw)
    let no = 0;
    const oprit = (s, voor, breed) => {
      if (no >= this.oprit.instanceMatrix.count) return;
      const tot = s.d / 2 + VOORTUIN + 0.08, lang = tot - voor, p = lokaalNaarWereld(s, 0, voor + lang / 2);
      M4.compose(V3.set(p.x, 0, p.z), Q.setFromAxisAngle(YAS, s.rot), S3.set(breed, 1, lang)); this.oprit.setMatrixAt(no++, M4);
    };
    for (const g of model.gebouwen) if (g.slot) oprit(g.slot, 1.15, 0.6);
    for (const h of model.huizen) oprit(h.slot, 0.97, 0.38);
    for (const w of WIJKEN) oprit(hqPositie(w), 2.4, 1.3);
    this.oprit.count = no; this.oprit.instanceMatrix.needsUpdate = true; this.oprit.computeBoundingSphere();
    this.contact.count = nc; this.werf.count = nw; this.kraan.count = nw; this.leeg.count = nl;
    for (const m of [this.contact, this.werf, this.kraan, this.leeg]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
    for (const tm of Object.values(this.typeMesh)) {
      tm.body.instanceMatrix.needsUpdate = true; if (tm.body.instanceColor) tm.body.instanceColor.needsUpdate = true;
      tm.body.visible = tm.body.count > 0; tm.body.computeBoundingSphere();
      if (tm.ramen) { tm.ramen.instanceMatrix.needsUpdate = true; tm.ramen.visible = tm.ramen.count > 0; tm.ramen.computeBoundingSphere(); }
    }
    this.kraanBasis = [];
    for (let i = 0; i < nw; i++) { this.werf.getMatrixAt(i, M4); this.kraanBasis.push(M4.clone()); }
    this._zetBomen(extraBomen);
    this._zetHuizen(model.huizen);
    this.figuren.zet(model, { inwoners: this.kwaliteit === 'hoog' ? 12 : 6 });
    this.mistDoelR = model.mistRadius;
    if (this.mistR == null) this.mistR = model.mistRadius;
    this.meterDoel = clamp(model.xp / Math.max(1, model.doelXp), 0, 1);
    this._zetOverlay();

    // bouwanimaties
    const start = this.t + 0.4;
    nieuw.slice(0, 14).forEach((g, k) => this.anims.push({ id: g.id, t0: start + k * 0.9, duur: 2.6 }));
    for (const g of nieuw.slice(14)) { const p = this.plaats.get(g.id); if (p) this._zetInstantie(p.tm, p.i, p.s, p.sy); }
    if (vlieg && nieuw.length) { const s = nieuw[0].slot; this.vliegNaar(s.x, s.z, 34); }
    return nieuw;
  }
  /** Laat bepaalde gebouwen opnieuw de bouwanimatie spelen bij de volgende update. */
  markeerNieuw(ids) { this._extraNieuw = ids; }

  _zetInstantie(tm, i, s, sy, sxz = 1) {
    Q.setFromAxisAngle(YAS, s.rot);
    M4.compose(V3.set(s.x, 0, s.z), Q, S3.set(sxz, Math.max(0.0001, sy), sxz));
    tm.body.setMatrixAt(i, M4); tm.body.instanceMatrix.needsUpdate = true;
    if (tm.ramen) { tm.ramen.setMatrixAt(i, M4); tm.ramen.instanceMatrix.needsUpdate = true; }
  }

  _zetHuizen(huizen) {
    const keep = new Set();
    for (const h of huizen) {
      const deco = Object.keys(h.huis?.deco || {}).filter(k => h.huis.deco[k]);
      const dak = AVATAR_OPTIES.kleren[h.look?.kleren ?? 3] || '#4c8fd6';
      const key = h.pid + '|' + dak + '|' + deco.sort().join(',') + '|' + h.slot.x.toFixed(2);
      keep.add(key);
      if (!this.huisCache.has(key)) {
        const m = this._mesh(huisGebouw(dakKleur(dak), deco, h.pid), h.id);
        m.position.set(h.slot.x, 0, h.slot.z); m.rotation.y = h.slot.rot;
        this.huisGroep.add(m); this.huisCache.set(key, m);
      }
      this.huisCache.get(key).userData.huis = h;
    }
    for (const [key, m] of this.huisCache) if (!keep.has(key)) { this.huisGroep.remove(m); this.kiesbaar = this.kiesbaar.filter(x => x !== m); this.huisCache.delete(key); }
  }

  // ---------- verkeer ----------
  _bouwVerkeer() {
    // trein
    const tm = treinGeo();
    this.trein = new THREE.Group();
    const tb = new THREE.Mesh(tm.body, this._lijfMat()); tb.castShadow = true; this.trein.add(tb);
    if (tm.ramen) this.trein.add(new THREE.Mesh(tm.ramen, this._raamMat()));
    this.trein.userData.id = 'trein'; this.trein.traverse(o => o.userData.id = 'trein');
    this.kiesbaar = this.kiesbaar || []; this.kiesbaar.push(this.trein);
    this.scene.add(this.trein);
  }
  _updateVerkeer(dt) {
    // trein: 70 s per rondje, heen op het noordspoor, terug op het zuidspoor
    const T = this.t % 70, rit = (t0, van, naar, versn) => { const u = clamp((T - t0) / 11, 0, 1); return van + (naar - van) * (versn ? u * u : 1 - (1 - u) * (1 - u)); };
    let x, z, rot, zicht = true;
    if (T < 11) { x = rit(0, -78, 0, false); z = -0.55; rot = 0; }
    else if (T < 20) { x = 0; z = -0.55; rot = 0; }
    else if (T < 31) { x = rit(20, 0, 78, true); z = -0.55; rot = 0; }
    else if (T < 35) { zicht = false; x = 78; z = 0.55; rot = Math.PI; }
    else if (T < 46) { x = rit(35, 78, 0, false); z = 0.55; rot = Math.PI; }
    else if (T < 55) { x = 0; z = 0.55; rot = Math.PI; }
    else if (T < 66) { x = rit(55, 0, -78, true); z = 0.55; rot = Math.PI; }
    else { zicht = false; x = -78; z = -0.55; rot = 0; }
    this.trein.visible = zicht; this.trein.position.set(x, 0.1, z); this.trein.rotation.y = rot;
    this.treinStaat = (T >= 11 && T < 20) || (T >= 46 && T < 55) ? 'staat' : zicht ? 'rijdt' : 'weg';
    this.wegNet.tick(dt, this.t, { x, zicht, rijdt: this.treinStaat === 'rijdt', half: 5.6 + (this.treinStaat === 'rijdt' ? 6 : 0) });
  }

  // ---------- de Grijze Mist ----------
  _bouwMist() {
    this.mistLagen = [];
    const geo = new THREE.CircleGeometry(115, 72).rotateX(-Math.PI / 2);
    const lagen = this.kwaliteit === 'hoog' ? [[0.25, 0.92], [1.3, 0.7], [2.6, 0.5], [4.2, 0.32]] : [[0.3, 0.92], [2.2, 0.6]];
    lagen.forEach(([y, a], i) => {
      const m = new THREE.ShaderMaterial({
        uniforms: { uR: { value: 30 }, uT: { value: 0 }, uA: { value: a }, uKleur: { value: new THREE.Color('#d9dbea') }, uLaag: { value: i } },
        vertexShader: MIST_VS, fragmentShader: MIST_FS, transparent: true, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, m); mesh.position.y = y; mesh.renderOrder = 5 + i;
      this.scene.add(mesh); this.mistLagen.push(m);
    });
    const n = this.kwaliteit === 'hoog' ? 220 : 110;
    this.puffMat = new THREE.MeshLambertMaterial({ color: '#e3e4f0', transparent: true, opacity: 0.82, depthWrite: true, flatShading: false });
    this.puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), this.puffMat, n);
    this.puffData = [];
    const rr = rng('mist');
    for (let i = 0; i < n; i++) this.puffData.push({ a: rr() * TAU, dr: 0.8 + rr() * 7, y: rr() * 0.9, s: 0.9 + rr() * 1.9, v: (rr() - 0.5) * 0.02, f: rr() * 10 });
    this.puffs.castShadow = false; this.puffs.renderOrder = 4;
    this.scene.add(this.puffs);
  }
  _updateMist(dt) {
    if (this.mistDoelR != null) this.mistR = lerp(this.mistR ?? this.mistDoelR, this.mistDoelR, 1 - Math.exp(-dt * 0.8));
    const R = this.mistR ?? 30;
    for (const m of this.mistLagen) { m.uniforms.uR.value = R; m.uniforms.uT.value = this.t; }
    let i = 0;
    const zicht = R < MIST_MAX - 0.5;
    for (const p of this.puffData) {
      p.a += p.v * dt;
      const r = R + p.dr + Math.sin(this.t * 0.3 + p.f) * 0.6;
      const x = Math.cos(p.a) * r, z = Math.sin(p.a) * r;
      const s = zicht ? p.s * (1 + Math.sin(this.t * 0.5 + p.f) * 0.08) : 0.0001;
      M4.compose(V3.set(x, p.y + terreinHoogte(x, z) * 0.6, z), Q.identity(), S3.set(s, s * 0.62, s));
      this.puffs.setMatrixAt(i++, M4);
    }
    this.puffs.instanceMatrix.needsUpdate = true;
  }

  // ---------- wolken en storm ----------
  _bouwWolken() {
    this.wolken = [];
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.94, flatShading: true });
    this.wolkMat = mat;
    const rr = rng('wolken');
    const n = this.kwaliteit === 'hoog' ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const w = new THREE.Mesh(wolkGeo(i % 4), mat);
      w.castShadow = this.kwaliteit === 'hoog';
      const d = { a: rr() * TAU, r: 62 + rr() * 34, y: 26 + rr() * 10, v: 0.006 + rr() * 0.008, s: 1.0 + rr() * 0.9 };
      w.scale.setScalar(d.s); w.userData.d = d;
      this.scene.add(w); this.wolken.push(w);
    }
  }
  _bouwStorm() {
    const g = this.stormGroep = new THREE.Group();
    this.stormMat = new THREE.MeshLambertMaterial({ color: '#b3afc9', emissive: '#000000', transparent: true, opacity: 0.86 });
    const n = 64;
    this.stormPuffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), this.stormMat, n);
    this.stormData = [];
    const rr = rng('storm');
    for (let i = 0; i < n; i++) {
      const kern = i < 10;
      this.stormData.push(kern ? { a: rr() * TAU, r: rr() * 2.6, y: 17 + rr() * 1.5, s: 2.2 + rr() * 1.2, v: 0.15, kern }
        : { a: rr() * TAU, r: 5 + rr() * 10, y: 16 + rr() * 2.5 - (rr() * 2), s: 1.0 + rr() * 1.6, v: 0.3 + rr() * 0.35, kern });
    }
    g.add(this.stormPuffs);
    const oogMat = new THREE.MeshBasicMaterial({ color: '#ffe680' });
    this.ogen = [new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), oogMat), new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), oogMat)];
    g.add(...this.ogen);
    g.visible = false;
    this.scene.add(g);
  }
  /** Raid-storm boven de stad: niveau 0..1 (aandeel resterende HP). flits = korte witte flits bij een treffer. */
  setStorm(niveau, { flits = false } = {}) { this.stormDoel = clamp(niveau, 0, 1); if (flits) this.flits = 0.25; }
  _updateStorm(dt) {
    this.storm = lerp(this.storm, this.stormDoel, 1 - Math.exp(-dt * 1.5));
    this.flits = Math.max(0, this.flits - dt);
    const s = this.storm, g = this.stormGroep;
    g.visible = s > 0.02;
    if (!g.visible) return;
    this.stormMat.emissive.setScalar(this.flits > 0 ? this.flits * 3 : 0);
    let i = 0;
    for (const p of this.stormData) {
      p.a += p.v * dt * (p.kern ? 0.4 : 1);
      const r = p.r * (0.6 + 0.4 * s);
      const sc = p.s * (0.5 + 0.5 * s);
      M4.compose(V3.set(Math.cos(p.a) * r, p.y + Math.sin(this.t + p.a) * 0.4, Math.sin(p.a) * r), Q.identity(), S3.set(sc, sc * 0.7, sc));
      this.stormPuffs.setMatrixAt(i++, M4);
    }
    this.stormPuffs.instanceMatrix.needsUpdate = true;
    // vriendelijke ogen, altijd naar de camera
    const dir = new THREE.Vector3(this.cam.position.x, 0, this.cam.position.z).normalize();
    const zij = new THREE.Vector3(-dir.z, 0, dir.x);
    const knip = Math.sin(this.t * 2.2) > 0.97 ? 0.15 : 1;
    this.ogen.forEach((o, k) => { o.position.copy(dir).multiplyScalar(6.8 * (0.6 + 0.4 * s)).addScaledVector(zij, (k ? 1.25 : -1.25)).setY(17.6); o.scale.set(1, knip, 1); });
  }

  // ---------- kaartlagen ----------
  /** null | 'sterkte' | 'wijken' | 'mijn' */
  setOverlay(mode) { this.overlay = mode || null; this._zetOverlay(); }
  _zetOverlay() {
    const data = !!this.overlay;
    for (const tm of Object.values(this.typeMesh)) tm.body.material = data ? this.matData : this.matLijf;
    for (const o of this.kiesbaar || []) o.traverse(m => { if (m.isMesh && (m.material === this.matLijf || m.material === this.matData)) m.material = data ? this.matData : this.matLijf; });
    this.grondMat.color.set(data ? '#4f5d7c' : '#ffffff');
    this.boomMat.color.set(data ? '#7d8aa6' : '#ffffff');
    this.wegNet.setData(data); this.figuren.setData(data);
    this.bergen.material.color.set(data ? '#7d8aa6' : '#ffffff');
    let n = 0;
    const m = this.model;
    const zet = (x, z, s, kleur) => { if (n >= this.gloed.instanceMatrix.count) return; M4.compose(V3.set(x, 0.12, z), Q.identity(), S3.set(s, 1, s)); this.gloed.setMatrixAt(n, M4); this.gloed.setColorAt(n, K.set(kleur)); n++; };
    if (m && this.overlay === 'sterkte') for (const g of m.gebouwen) if (g.slot) zet(g.slot.x, g.slot.z, 7.5, sterkteKleur(g.sterkte));
    for (const v of this.wijkVlakken) {
      const w = m?.wijken.find(x => x.macht === v.macht);
      v.m.visible = this.overlay === 'wijken';
      if (w) { v.m.material.color.set(w.sterkte == null ? '#46506a' : sterkteKleur(w.sterkte)); v.m.material.opacity = w.sterkte == null ? 0.25 : 0.42; }
    }
    if (m && this.overlay === 'wijken') for (const g of m.gebouwen) if (g.slot && g.gebouwd) zet(g.slot.x, g.slot.z, 4.5, sterkteKleur(m.wijken.find(x => x.macht === g.macht)?.sterkte ?? 0));
    if (m && this.overlay === 'mijn') {
      for (const g of m.gebouwen) if (g.ik && g.slot) zet(g.slot.x, g.slot.z, 5.5, '#4fd2ff');
      for (const h of m.huizen) if (h.ik) zet(h.slot.x, h.slot.z, 6, '#ffe066');
    }
    this.gloed.count = n; this.gloed.instanceMatrix.needsUpdate = true; if (this.gloed.instanceColor) this.gloed.instanceColor.needsUpdate = true;
    this.gloed.visible = n > 0;
  }

  // ---------- dag en nacht ----------
  /** 'cyclus' | 'dag' | 'avond' | 'nacht' */
  setTijd(mode) { this.tijdMode = mode || 'cyclus'; }
  _licht(fase) {
    // fase 0..1: 0-0.55 dag, 0.55-0.66 avond, 0.66-0.9 nacht, 0.9-1 ochtend
    const L = fase < 0.55 ? 1 : fase < 0.66 ? 1 - smooth(0.55, 0.66, fase) : fase < 0.9 ? 0 : smooth(0.9, 1.0, fase);
    const goud = fase < 0.08 ? 1 - fase / 0.08 : fase < 0.47 ? 0 : fase < 0.62 ? Math.sin((fase - 0.47) / 0.15 * Math.PI / 2) * (fase < 0.6 ? 1 : 1) : fase < 0.7 ? 1 - (fase - 0.62) / 0.08 : fase > 0.92 ? (fase - 0.92) / 0.08 : 0;
    const dagT = fase < 0.6 ? fase / 0.6 : fase > 0.9 ? (fase - 1) / 0.6 : 1;
    const elev = 0.2 + Math.sin(clamp(dagT, 0, 1) * Math.PI) * 0.55;
    const az = -0.6 + dagT * 1.6;
    return { L, goud: clamp(goud, 0, 1), elev, az };
  }
  _updateLicht(dt) {
    if (this.tijdMode === 'cyclus') this.dagFase = (this.dagFase + dt / 300) % 1;
    else { const doel = { dag: 0.3, avond: 0.585, nacht: 0.78 }[this.tijdMode] ?? 0.3; this.dagFase = lerp(this.dagFase, doel, 1 - Math.exp(-dt * 2)); }
    const { L, goud, elev, az } = this._licht(this.dagFase);
    this.nacht = 1 - L;
    const c = (a, b, t) => K.set(a).lerp(new THREE.Color(b), t);
    // zon of maan
    const dir = L > 0.15 ? new THREE.Vector3(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev)) : new THREE.Vector3(-0.5, 0.75, -0.45);
    dir.normalize();
    const zonKleur = c('#fff3df', '#ffb47a', goud).clone();
    this.zon.color.copy(L > 0.15 ? zonKleur : K.set('#a9bcff'));
    this.zon.intensity = L > 0.15 ? lerp(0.6, 2.7, L) * (1 - goud * 0.3) : 0.95;
    const st = this.stormDim = lerp(1, 0.6, this.storm);
    this.zon.intensity *= st;
    this.hemi.color.copy(c('#4a5f9e', '#cfe8ff', L)).lerp(new THREE.Color('#ffd0a8'), goud * 0.35);
    this.hemi.groundColor.copy(c('#28324e', '#8fb36a', L));
    this.hemi.intensity = lerp(1.05, 1.2, L) * st;
    const top = c('#0b1236', '#4ea3ee', L).clone().lerp(new THREE.Color('#5b5fa8'), goud * 0.5);
    const hor = c('#26305e', '#d6ecfb', L).clone().lerp(new THREE.Color('#ffb98a'), goud * 0.75);
    if (this.storm > 0.02) { top.lerp(new THREE.Color('#57536a'), this.storm * 0.6); hor.lerp(new THREE.Color('#9894a8'), this.storm * 0.6); }
    this.luchtMat.uniforms.uTop.value.copy(top); this.luchtMat.uniforms.uHor.value.copy(hor);
    this.luchtMat.uniforms.uZon.value.copy(dir); this.luchtMat.uniforms.uZonKleur.value.copy(L > 0.15 ? zonKleur : K.set('#000000'));
    this.scene.fog.color.copy(hor);
    this.sterMat.opacity = clamp(1 - L * 1.6, 0, 1) * 0.9;
    // ramen, lampen, vuur
    this.raamU.uNacht.value = clamp((1 - L) * 1.15 + goud * 0.15, 0, 1);
    this.raamU.uDag.value.copy(c('#7fa6cc', '#a9cdec', 0.5)).lerp(new THREE.Color('#f0b98a'), goud * 0.4);
    this.wegNet.setNacht(L);
    this.kavelMat.color.copy(c('#6f7c99', '#ffffff', L));
    for (const m of this.mistLagen) m.uniforms.uKleur.value.copy(c('#5c628a', '#dfe0ee', L)).lerp(new THREE.Color('#f2c6b3'), goud * 0.3);
    this.puffMat.color.copy(c('#6b7096', '#e6e7f2', L));
    this.wolkMat.color.copy(c('#4a5278', '#ffffff', L)).lerp(new THREE.Color('#ffc59e'), goud * 0.5);
    if (this.vlamLicht) { this.vlamLicht.intensity = (0.5 + this.nacht * 6) * (0.85 + Math.sin(this.t * 13) * 0.15); }
    // schaduwcamera volgt het beeld
    const t = new THREE.Vector3(this.cs.tx, 0, this.cs.tz);
    const span = clamp(this.cs.dist * 0.55, 26, 70);
    const sc = this.zon.shadow.camera;
    if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
    this.zon.position.copy(t).addScaledVector(dir, 120); this.zon.target.position.copy(t);
  }

  // ---------- post-processing: tilt-shift ----------
  _bouwPost() {
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uBlur: { value: 7 }, uFocus: { value: 0.47 }, uBand: { value: 0.3 }, uSat: { value: 1.12 } },
      vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false,
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat); q.frustumCulled = false;
    this.postScene.add(q);
    this._maakRT();
  }
  _maakRT() {
    this.rt?.dispose();
    if (this.kwaliteit !== 'hoog') { this.rt = null; return; }
    const sz = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const isGL2 = this.renderer.capabilities.isWebGL2;
    this.rt = new THREE.WebGLRenderTarget(Math.max(1, sz.x), Math.max(1, sz.y), { samples: isGL2 ? 4 : 0, type: isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType });
    this.postMat.uniforms.tDiffuse.value = this.rt.texture;
    this.postMat.uniforms.uRes.value.set(sz.x, sz.y);
  }

  setKwaliteit(q) {
    if (q === this.kwaliteit) return;
    this.kwaliteit = q === 'laag' ? 'laag' : 'hoog';
    this.renderer.setPixelRatio(this._dpr());
    const sz = this.kwaliteit === 'hoog' ? 2048 : 1024;
    this.zon.shadow.mapSize.set(sz, sz); this.zon.shadow.map?.dispose(); this.zon.shadow.map = null;
    for (const w of this.wolken) w.castShadow = this.kwaliteit === 'hoog';
    this._resize();
  }

  // ---------- camera en bediening ----------
  _bedieningen() {
    const el = this.renderer.domElement;
    const ptrs = new Map();
    let sleep = null, klik = null;
    const grondPunt = (cx, cy) => {
      const r = el.getBoundingClientRect();
      const nd = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      this._ray = this._ray || new THREE.Raycaster();
      this._ray.setFromCamera(nd, this.cam);
      const d = this._ray.ray.direction, o = this._ray.ray.origin;
      if (Math.abs(d.y) < 1e-4) return null;
      const t = -o.y / d.y; if (t < 0) return null;
      return new THREE.Vector3(o.x + d.x * t, 0, o.z + d.z * t);
    };
    this._grondPunt = grondPunt;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._vlucht = null;
      if (ptrs.size === 1) {
        klik = { x: e.clientX, y: e.clientY, t: performance.now() };
        const draai = e.button === 2 || e.shiftKey || e.ctrlKey;
        sleep = { soort: draai ? 'draai' : 'schuif', x: e.clientX, y: e.clientY, p: grondPunt(e.clientX, e.clientY) };
      } else { klik = null; sleep = { soort: 'twee', ...this._tweeInfo(ptrs) }; }
    });
    el.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) { this._hover(e); return; }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!sleep) return;
      if (klik && Math.hypot(e.clientX - klik.x, e.clientY - klik.y) > 6) klik = null;
      if (sleep.soort === 'schuif' && sleep.p) {
        const p = grondPunt(e.clientX, e.clientY);
        if (p) { this.cd.tx += sleep.p.x - p.x; this.cd.tz += sleep.p.z - p.z; this._klemDoel(); this.cs.tx = this.cd.tx; this.cs.tz = this.cd.tz; this._camZet(); }
      } else if (sleep.soort === 'draai') {
        this.cd.yaw -= (e.clientX - sleep.x) * 0.006;
        this.cd.pitchExtra = clamp(this.cd.pitchExtra + (e.clientY - sleep.y) * 0.003, -0.25, 0.35);
        sleep.x = e.clientX; sleep.y = e.clientY;
      } else if (sleep.soort === 'twee' && ptrs.size >= 2) {
        const nu = this._tweeInfo(ptrs);
        this.cd.dist = clamp(this.cd.dist * sleep.d / Math.max(10, nu.d), 14, 150);
        this.cd.yaw -= hoekD(nu.a, sleep.a);
        const p0 = grondPunt(sleep.mx, sleep.my), p1 = grondPunt(nu.mx, nu.my);
        if (p0 && p1) { this.cd.tx += p0.x - p1.x; this.cd.tz += p0.z - p1.z; this._klemDoel(); }
        Object.assign(sleep, nu);
      }
    });
    const eind = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (klik && performance.now() - klik.t < 600 && ptrs.size === 0) this._klik(e);
      klik = null;
      sleep = ptrs.size === 1 ? (() => { const [p] = ptrs.values(); return { soort: 'schuif', x: p.x, y: p.y, p: grondPunt(p.x, p.y) }; })() : null;
    };
    el.addEventListener('pointerup', eind); el.addEventListener('pointercancel', eind);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const voor = this.cd.dist;
      this.cd.dist = clamp(this.cd.dist * Math.exp(e.deltaY * 0.0011), 14, 150);
      const p = grondPunt(e.clientX, e.clientY);
      if (p) { const f = 1 - this.cd.dist / voor; this.cd.tx += (p.x - this.cd.tx) * f; this.cd.tz += (p.z - this.cd.tz) * f; this._klemDoel(); }
      this._vlucht = null;
    }, { passive: false });
    el.addEventListener('keydown', (e) => {
      const st = 4 * this.cd.dist / 60, f = new THREE.Vector3(-Math.sin(this.cd.yaw), 0, -Math.cos(this.cd.yaw)), r = new THREE.Vector3(-f.z, 0, f.x);
      const k = e.key.toLowerCase();
      if (['arrowup', 'w', 'z'].includes(k)) { this.cd.tx += f.x * st; this.cd.tz += f.z * st; }
      else if (['arrowdown', 's'].includes(k)) { this.cd.tx -= f.x * st; this.cd.tz -= f.z * st; }
      else if (['arrowleft', 'a'].includes(k)) { this.cd.tx += r.x * st; this.cd.tz += r.z * st; }
      else if (['arrowright', 'd'].includes(k)) { this.cd.tx -= r.x * st; this.cd.tz -= r.z * st; }
      else if (k === 'q') this.draai(-1); else if (k === 'e') this.draai(1);
      else if (k === '+' || k === '=') this.zoom(-1); else if (k === '-') this.zoom(1);
      else return;
      e.preventDefault(); this._klemDoel();
    });
  }
  _tweeInfo(ptrs) { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
  _klemDoel() { const r = Math.hypot(this.cd.tx, this.cd.tz), max = 50; if (r > max) { this.cd.tx *= max / r; this.cd.tz *= max / r; } }
  draai(richting) { this.cd.yaw += richting * Math.PI / 4; }
  zoom(richting) { this.cd.dist = clamp(this.cd.dist * (richting > 0 ? 1.35 : 1 / 1.35), 14, 150); }
  thuis() { this.vliegNaar(0, 4, 62); }
  vliegNaar(x, z, dist = 34, yaw) { this.cd.tx = x; this.cd.tz = z; this.cd.dist = dist; if (yaw != null) this.cd.yaw = yaw; this._klemDoel(); }
  /** Vlieg naar een gebouw, HQ of huis op id. */
  focus(id, dist = 30) { const p = this.positieVan(id); if (p) this.vliegNaar(p.x, p.z, dist); }
  positieVan(id) {
    if (!id) return null;
    if (id.startsWith('gids:')) { const h = this.hqs[id.slice(5)]; return h ? { x: h.p.x, y: 3, z: h.p.z } : null; }
    if (id === 'station') return { x: 0, y: 3, z: -2 };
    if (id === 'klasmeter') return { x: PLEIN.klasmeter.x, y: 3, z: PLEIN.klasmeter.z };
    if (id === 'kluis') return { x: PLEIN.kluis.x, y: 2, z: PLEIN.kluis.z };
    if (id === 'missiebord') return { x: PLEIN.missiebord.x, y: 2, z: PLEIN.missiebord.z };
    if (id === 'poort') return { x: POORT.x, y: 8, z: POORT.z };
    const g = this.model?.gebouwen.find(x => x.id === id); if (g?.slot) return { x: g.slot.x, y: 2, z: g.slot.z };
    const h = this.model?.huizen.find(x => x.id === id); if (h) return { x: h.slot.x, y: 1.5, z: h.slot.z };
    return null;
  }
  _camZet() {
    const c = this.cs;
    const t = clamp((c.dist - 14) / (150 - 14), 0, 1);
    const pitch = clamp(lerp(0.5, 0.98, Math.sqrt(t)) + c.pitchExtra, 0.3, 1.35);
    this.cam.position.set(c.tx + Math.sin(c.yaw) * Math.cos(pitch) * c.dist, Math.sin(pitch) * c.dist, c.tz + Math.cos(c.yaw) * Math.cos(pitch) * c.dist);
    this.cam.lookAt(c.tx, 0, c.tz);
  }
  _pick(e) {
    const el = this.renderer.domElement, r = el.getBoundingClientRect();
    this._ray = this._ray || new THREE.Raycaster();
    this._ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.cam);
    const doelen = [...(this.kiesbaar || []), this.werf, this.meterRing, ...Object.values(this.typeMesh).map(t => t.body).filter(b => b.count > 0)];
    const hits = this._ray.intersectObjects(doelen, true);
    for (const h of hits) {
      if (h.object.isInstancedMesh && h.object.userData.ids) { const id = h.object.userData.ids[h.instanceId]; if (id) return id; continue; }
      let o = h.object; while (o && !o.userData.id) o = o.parent;
      if (o?.userData.id) return o.userData.id;
    }
    return null;
  }
  _klik(e) { const id = this._pick(e); this.selecteer(id); this.o.onPick?.(id, e); }
  _hover(e) {
    const nu = performance.now(); if (nu - (this._hoverT || 0) < 90) return; this._hoverT = nu;
    const id = this._pick(e);
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    if (id !== this._hoverId) { this._hoverId = id; this.o.onHover?.(id, e); }
  }
  selecteer(id) {
    this.selectie = id;
    const p = this.positieVan(id);
    this.selRing.visible = !!p && !id?.startsWith('gids:') && id !== 'poort';
    if (p) { this.selRing.position.set(p.x, 0.1, p.z); const s = id === 'station' ? 4.2 : id?.startsWith('huis:') ? 0.75 : 1; this.selRing.scale.setScalar(s); }
  }

  // ---------- DOM-markers boven gebouwen ----------
  /** Hang een DOM-element boven een plek. pos: {x,y,z} of id. */
  zetMarker(key, el, pos) { if (!el.parentNode) this.markerLaag.append(el); this.markers.set(key, { el, pos }); }
  wisMarker(key) { const m = this.markers.get(key); if (m) { m.el.remove(); this.markers.delete(key); } }
  _updateMarkers() {
    const r = this.renderer.domElement.getBoundingClientRect();
    for (const { el, pos } of this.markers.values()) {
      const p = typeof pos === 'string' ? this.positieVan(pos) : pos;
      if (!p) { el.style.display = 'none'; continue; }
      V3.set(p.x, p.y, p.z).project(this.cam);
      if (V3.z > 1 || Math.abs(V3.x) > 1.15 || Math.abs(V3.y) > 1.15) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.transform = `translate(${((V3.x + 1) / 2) * r.width}px, ${((1 - V3.y) / 2) * r.height}px)`;
    }
  }
  /** Schermpositie (px, binnen de container) van een wereldpunt. */
  projecteer(p) { const r = this.renderer.domElement.getBoundingClientRect(); V3.set(p.x, p.y, p.z).project(this.cam); return { x: ((V3.x + 1) / 2) * r.width, y: ((1 - V3.y) / 2) * r.height, zicht: V3.z < 1 }; }

  // ---------- animatie ----------
  _updateAnims(dt) {
    let ns = 0;
    const blijf = [];
    for (const a of this.anims) {
      const p = this.plaats?.get(a.id); if (!p) continue;
      const u = (this.t - a.t0) / a.duur;
      if (u < 0) { this._zetInstantie(p.tm, p.i, p.s, 0.0001); blijf.push(a); continue; }
      if (u >= 1) { this._zetInstantie(p.tm, p.i, p.s, p.sy); continue; }
      // 0-0.35 steiger rijst, 0.35-0.85 gebouw groeit (met veer), 0.85-1 steiger weg
      const hoog = p.tm.hoogte * p.sy;
      const steigerH = u < 0.35 ? ease.uit(u / 0.35) : u < 0.85 ? 1 : 1 - ease.uit((u - 0.85) / 0.15);
      if (ns < this.steiger.instanceMatrix.count) {
        M4.compose(V3.set(p.s.x, 0, p.s.z), Q.setFromAxisAngle(YAS, p.s.rot), S3.set(1.12, Math.max(0.001, steigerH * (hoog + 0.4)), 1.12));
        this.steiger.setMatrixAt(ns++, M4);
      }
      const g = u < 0.35 ? 0.0001 : u < 0.85 ? ease.terug((u - 0.35) / 0.5) : 1;
      const pop = u > 0.8 && u < 0.92 ? 1 + Math.sin((u - 0.8) / 0.12 * Math.PI) * 0.06 : 1;
      this._zetInstantie(p.tm, p.i, p.s, g * p.sy, pop);
      if (!a.stof && u > 0.35) { a.stof = true; this._stofwolk(p.s.x, p.s.z); this.o.onBouw?.(a.id); }
      if (!a.pof && u > 0.82) { a.pof = true; this._stofwolk(p.s.x, p.s.z, 0.6); }
      blijf.push(a);
    }
    this.anims = blijf;
    this.steiger.count = ns; this.steiger.instanceMatrix.needsUpdate = true;
    // stof
    let i = 0;
    this.stof = this.stof.filter(s => (s.t += dt) < s.life);
    for (const s of this.stof) {
      if (i >= this.stofMesh.instanceMatrix.count) break;
      s.x += s.vx * dt; s.z += s.vz * dt; s.y += s.vy * dt; s.vy *= 0.96; s.vx *= 0.95; s.vz *= 0.95;
      const k = s.t / s.life, sc = s.s * (0.6 + k * 1.2) * (1 - k * k);
      M4.compose(V3.set(s.x, s.y, s.z), Q.identity(), S3.set(sc, sc, sc)); this.stofMesh.setMatrixAt(i++, M4);
    }
    this.stofMesh.count = i; this.stofMesh.instanceMatrix.needsUpdate = true;
    // kranen draaien
    if (this.werf.count && this.kraanBasis) {
      for (let k = 0; k < this.werf.count; k++) {
        const b = this.kraanBasis[k]; if (!b) continue;
        V3.setFromMatrixPosition(b);
        const off = new THREE.Vector3(-0.75, 3.06, -0.75).applyMatrix4(new THREE.Matrix4().extractRotation(b));
        M4.compose(V3.clone().add(off), Q.setFromAxisAngle(YAS, this.t * 0.25 + k * 1.7), S3.set(1, 1, 1));
        this.kraan.setMatrixAt(k, M4);
      }
      this.kraan.instanceMatrix.needsUpdate = true;
    }
  }
  _stofwolk(x, z, f = 1) {
    for (let i = 0; i < 16 * f; i++) {
      const a = this.r() * TAU, v = 1.2 + this.r() * 2.2;
      this.stof.push({ x: x + Math.cos(a) * 0.6, z: z + Math.sin(a) * 0.6, y: 0.2, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 0.6 + this.r() * 1.2, s: 0.3 + this.r() * 0.4, t: 0, life: 1.1 + this.r() * 0.6 });
    }
  }

  pause(on) { this.pauze = !!on; if (!on) this._last = performance.now(); }

  _resize() {
    const w = Math.max(1, this.c.clientWidth), h = Math.max(1, this.c.clientHeight);
    this.renderer.setPixelRatio(this._dpr());
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    this._maakRT();
  }

  _loop(now) {
    this.raf = requestAnimationFrame(this._loop);
    // lichte stand: hoogstens 30 beelden per seconde (spaart de batterij van schoollaptops)
    if (this.kwaliteit === 'laag' && now - this._last < 30) return;
    const dt = Math.min(0.25, Math.max(0, (now - this._last) / 1000)); this._last = now;
    if (document.hidden) return;
    // gepauzeerd (venster open): af en toe een beeld, zodat de stad achter het venster zichtbaar blijft
    if (this.pauze) { if (this._gerenderd && now - this._pauzeBeeld < 1000) return; this._pauzeBeeld = now; }
    this._gerenderd = true;
    this.t += this.pauze ? 0 : dt;
    // camera dempen
    const k = 1 - Math.exp(-dt * 7);
    for (const key of ['tx', 'tz', 'dist', 'pitchExtra']) this.cs[key] = lerp(this.cs[key], this.cd[key], k);
    this.cs.yaw += hoekD(this.cd.yaw, this.cs.yaw) * k;
    if (this.o.digibord && this.o.autoDraai !== false) this.cd.yaw += dt * 0.025;
    this._camZet();
    this.scene.fog.near = this.cs.dist + 30; this.scene.fog.far = this.cs.dist + 240;
    this.boomU.uT.value = this.t;
    this._updateLicht(dt);
    this._updateVerkeer(dt);
    this.figuren.tick(dt, this.t);
    this._updateMist(dt);
    this._updateStorm(dt);
    this._updateAnims(dt);
    for (const w of this.wolken) { const d = w.userData.d; d.a += d.v * dt; w.position.set(Math.cos(d.a) * d.r, d.y, Math.sin(d.a) * d.r); }
    if (this.meterDoel != null) { this.meterNu = lerp(this.meterNu ?? 0, this.meterDoel, 1 - Math.exp(-dt * 1.5)); this.meterRing.position.y = 0.7 + this.meterNu * 3.0; this.meterRing.rotation.z = this.t; }
    if (this.vlam) { this.vlam.scale.set(1, 0.85 + Math.sin(this.t * 11) * 0.12 + Math.sin(this.t * 17) * 0.06, 1); this.vlam.rotation.y = this.t * 2; }
    if (this.selRing.visible) this.selRing.material.opacity = 0.6 + Math.sin(this.t * 4) * 0.3;
    this.water.material.color.setHSL(0.56, 0.7, 0.55 - this.nacht * 0.3);
    this._updateMarkers();
    // tekenen
    if (this.rt) {
      this.renderer.setRenderTarget(this.rt); this.renderer.render(this.scene, this.cam);
      this._ri = { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles };
      this.renderer.setRenderTarget(null);
      this.postMat.uniforms.uBlur.value = this.o.digibord ? 4.5 * this._dpr() : 6.5 * this._dpr();
      this.renderer.render(this.postScene, this.postCam);
    } else { this.renderer.render(this.scene, this.cam); this._ri = { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }; }
    // fps bewaken: te traag -> lichtere stand
    const f = this._fps; f.n++; f.t += dt;
    if (f.t > 2) {
      f.waarde = f.n / f.t; f.n = 0; f.t = 0;
      if (this.autoKwaliteit && this.kwaliteit === 'hoog' && this.t > 4) {
        f.laag = f.waarde < 24 ? f.laag + 1 : 0;
        if (f.laag >= 2) { this.setKwaliteit('laag'); this.o.onKwaliteit?.('laag', true); }
      }
    }
  }
  get fps() { return this._fps.waarde; }
  get info() { return { ...(this._ri || {}), kwaliteit: this.kwaliteit, fps: Math.round(this.fps), pixelRatio: this.renderer.getPixelRatio() }; }

  dispose() {
    cancelAnimationFrame(this.raf); this._ro.disconnect();
    this.renderer.dispose(); this.renderer.domElement.remove(); this.markerLaag.remove();
  }
}

function hoekD(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
export function sterkteKleur(s) { return s >= 0.75 ? '#35e08f' : s >= 0.5 ? '#c6ea3a' : s >= 0.25 ? '#ffc23a' : '#ff8a3d'; }
void KLEUREN;
