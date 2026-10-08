// De Slijkkraak in de 3D-stad: een groot, grappig slijkmonster uit de Noordzee (een prentenboekmonster, geen eng beest).
// Zijn kop met grote ogen steekt elke week ergens anders uit het water (de Dijver, de Groenerei, het Minnewater,
// de haven, de Rozenhoedkaai); uit elke vuile zone steekt een slijkarm die over een brug, een kaai of de sluis grijpt.
// Hij ademt, knippert, zijn armen wiegen, er druipt slijk en er borrelen bellen. Een arm trekt zich terug als het water
// van zijn zone helder wordt en verdampt na de mini-raid van die week. Tijdens de eindbaas rijst hij hoog op bij de
// Markt en krimpt hij bij elke treffer; na de overwinning zakt hij weg en blijft er een zandbankje met een slikgarnaal.
//
// Goedkoop: de kop is één geometrie, het gezicht één, de oogleden twee; alle armen samen zijn één instanced mesh,
// net als de druppels, de bellen en de slijkvlekken rond elke arm.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, clamp, lerp } from '../core/util.js';
import { Bouwer } from './modellen.js';
import { WATER_Y } from './layout.js';

const TAU = Math.PI * 2;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), K = new THREE.Color();
const V_A = new THREE.Vector3(), V_B = new THREE.Vector3(), Z_AS = new THREE.Vector3(0, 0, 1);

// waar de kop opduikt en waar de armen liggen staat in verhaal.js (ook de 2D-kaart gebruikt het)
import { KOP_PLEKKEN, ARMEN } from './verhaal.js';
export { KOP_PLEKKEN, ARMEN };
const N_SEG = 18;

// zachte ruis voor de bultige kop
function ruis3(x, y, z) { return Math.sin(x * 3.1 + y * 1.7) * 0.5 + Math.sin(y * 4.3 - z * 2.2) * 0.3 + Math.sin(z * 5.1 + x * 2.9) * 0.2; }

function kopGeo() {
  const g = new THREE.SphereGeometry(1, 44, 30);
  const p = g.attributes.position, kl = new Float32Array(p.count * 3);
  const onder = new THREE.Color('#4a3c1c').convertSRGBToLinear(), boven = new THREE.Color('#9a8a46').convertSRGBToLinear();
  const slijm = new THREE.Color('#8fb03c').convertSRGBToLinear(), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = ruis3(x, y, z), bult = Math.max(0, Math.sin(x * 7.0 + z * 3.0) * Math.sin(y * 6.0 + x * 2.0)) * 0.06;
    const r = 1 + n * 0.055 + bult;
    x *= r; y *= r; z *= r;
    p.setXYZ(i, x, y, z);
    c.copy(onder).lerp(boven, clamp((y + 0.6) / 1.5, 0, 1));
    const vlek = clamp((Math.sin(x * 5.3 + z * 4.1) + Math.sin(y * 6.7 - x * 3.3) - 0.9) * 1.4, 0, 1);
    c.lerp(slijm, vlek * 0.55);
    kl[i * 3] = c.r; kl[i * 3 + 1] = c.g; kl[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(kl, 3));
  g.computeVertexNormals();
  return g;
}

/** Het gezicht en de rommel op de kop (in eenheden van de kop: straal 1, voorkant = +z). */
function gezichtGeo() {
  const b = new Bouwer('slijkkraak-gezicht'); b.ao = false;
  for (const k of [-1, 1]) {
    const x = k * 0.4, y = 0.56, z = 0.66;
    b.ellips(0.34, 0.37, 0.3, x, y, z, '#fbf6e6', 16);                  // grote ogen
    b.ellips(0.16, 0.18, 0.08, x - k * 0.04, y + 0.02, z + 0.25, '#1d1710', 12);   // pupil
    b.bol(0.055, x - k * 0.09, y + 0.09, z + 0.32, '#ffffff', 8);        // lichtje in het oog
    b.blok(0.36, 0.08, 0.1, x + k * 0.02, y + 0.43, z + 0.06, '#2a2112', [0.25, 0, -k * 0.3]);   // stoute wenkbrauw
  }
  // een brede, ondeugende grijns met twee tanden
  b.torus(0.4, 0.07, 0, 0.22, 0.86, '#2a1d10', [0.45, 0, Math.PI], 20, Math.PI);
  b.box(0.11, 0.12, 0.05, -0.16, 0.08, 0.86, '#f4efd8').box(0.11, 0.12, 0.05, 0.16, 0.08, 0.86, '#f4efd8');
  // afval op zijn kop: een plastic fles, een blikje en wat zeewier
  b.cil(0.09, 0.09, 0.42, 0.42, 0.78, -0.18, '#9fd6e8', 10, [0.4, 0, -0.5]);
  b.cil(0.04, 0.05, 0.12, 0.62, 1.12, -0.04, '#3d8fe0', 8, [0.4, 0, -0.5]);
  b.cil(0.11, 0.11, 0.2, -0.5, 0.82, -0.25, '#c9ced6', 12, [0.2, 0, 0.6]);
  for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; b.cil(0.002, 0.05, 0.55, Math.sin(a) * 0.9, 0.55, Math.cos(a) * 0.35 - 0.45, i % 2 ? '#3f6a2a' : '#557f33', 5, [Math.PI + 0.3, 0, a * 0.4]); }
  return b.bouw().body;
}

/** Een ronde vlek slijk op het water (canvas-textuur met zachte rand). */
function vlekTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = rng('slijkvlek');
  for (let i = 0; i < 14; i++) {
    const x = 64 + (r() - 0.5) * 50, y = 64 + (r() - 0.5) * 50, rad = 18 + r() * 26;
    const gr = g.createRadialGradient(x, y, 2, x, y, rad);
    gr.addColorStop(0, 'rgba(62,48,22,0.9)'); gr.addColorStop(0.7, 'rgba(78,64,30,0.55)'); gr.addColorStop(1, 'rgba(90,76,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(220,214,170,${0.25 + r() * 0.35})`; g.beginPath(); g.arc(64 + (r() - 0.5) * 80, 64 + (r() - 0.5) * 80, 1 + r() * 2.5, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Slijkkraak3D {
  constructor(stad) {
    this.stad = stad; this.scene = stad.scene; this.r = rng('slijkkraak');
    this.peil = WATER_Y;
    // de kop
    this.groep = new THREE.Group(); this.groep.visible = false;
    this.kop = new THREE.Group(); this.groep.add(this.kop);
    this.kopMat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 55, specular: new THREE.Color('#5f5a3c'), emissive: new THREE.Color('#000000') });
    this.hoofd = new THREE.Mesh(kopGeo(), this.kopMat); this.hoofd.castShadow = true;
    this.gezicht = new THREE.Mesh(gezichtGeo(), new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80, specular: new THREE.Color('#444444') }));
    this.kop.add(this.hoofd, this.gezicht);
    // oogleden: een halve bol die naar voren klapt om te knipperen
    const lidGeo = new THREE.SphereGeometry(0.365, 16, 8, 0, TAU, 0, Math.PI / 2);
    this.leden = [-1, 1].map(k => {
      const m = new THREE.Mesh(lidGeo, new THREE.MeshPhongMaterial({ color: '#7d6c36', shininess: 40 }));
      m.position.set(k * 0.4, 0.56, 0.66); m.scale.set(1.04, 1.06, 1.12);
      this.kop.add(m); return m;
    });
    for (const o of [this.hoofd, this.gezicht, ...this.leden]) o.userData.id = 'slijkkraak';
    this.groep.userData.id = 'slijkkraak';
    this.scene.add(this.groep);
    // de modderkring rond de kop en rond elke arm
    this.vlekMat = new THREE.MeshBasicMaterial({ map: vlekTex(), transparent: true, depthWrite: false, opacity: 0.9 });
    this.vlekken = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.vlekMat, ARMEN.length + 1);
    this.vlekken.renderOrder = 2; this.vlekken.frustumCulled = false; this.vlekken.count = 0;
    this.scene.add(this.vlekken);
    // de armen: één instanced mesh met gerekte bollen
    this.armMat = new THREE.MeshPhongMaterial({ color: '#ffffff', shininess: 50, specular: new THREE.Color('#4d4a33') });
    this.armMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), this.armMat, ARMEN.length * N_SEG);
    this.armMesh.castShadow = true; this.armMesh.count = 0; this.armMesh.frustumCulled = false;
    const bruin = ['#7a6834', '#6a5a2a', '#857440'], grijs = ['#6f6d62', '#5f5d54', '#7c7a6e'];
    ARMEN.forEach((a, i) => {
      a.f = this.r() * TAU; a.s = 0; a.doel = 0; a.i = i;
      for (let k = 0; k < N_SEG; k++) {
        const pal = a.grijs ? grijs : bruin;
        K.set(k > N_SEG - 4 ? (a.grijs ? '#8c8a7a' : '#7b8a3a') : pal[k % 3]);
        this.armMesh.setColorAt(i * N_SEG + k, K);
      }
    });
    this.scene.add(this.armMesh);
    // plastic flessen en zakjes aan de grijze armen
    this.armAfval = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 8), new THREE.MeshLambertMaterial({ color: '#ffffff' }), 12);
    this.armAfval.count = 0; this.armAfval.frustumCulled = false; this.scene.add(this.armAfval);
    ['#9fd6e8', '#f2f2ee', '#7fbf6a', '#9fd6e8', '#e9578a', '#f2f2ee', '#9fd6e8', '#f2c94c', '#f2f2ee', '#7fbf6a', '#9fd6e8', '#f2f2ee'].forEach((k, i) => this.armAfval.setColorAt(i, K.set(k)));
    // druppels en bellen
    const druppelMat = new THREE.MeshPhongMaterial({ color: '#6b6a2e', shininess: 90, transparent: true, opacity: 0.85 });
    this.druppels = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), druppelMat, 48);
    this.druppels.count = 0; this.druppels.frustumCulled = false; this.scene.add(this.druppels);
    this.druppelData = Array.from({ length: 48 }, () => ({ t: -this.r() * 3, arm: null, x: 0, y: 0, z: 0, vy: 0 }));
    const belMat = new THREE.MeshPhongMaterial({ color: '#b6b48a', shininess: 120, transparent: true, opacity: 0.75, depthWrite: false });
    this.bellen = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), belMat, 40);
    this.bellen.count = 0; this.bellen.frustumCulled = false; this.bellen.renderOrder = 3; this.scene.add(this.bellen);
    this.belData = Array.from({ length: 40 }, () => ({ t: this.r() * 3, x: 0, z: 0, s: 0.1 }));

    // toestand
    this.nu = { x: 0, z: 0, schaal: 1, diep: 1, op: 0, yaw: 0 };   // op: 0 = onder water, 1 = boven
    this.doel = { plek: null, schaal: 1, diep: 0, zicht: false };
    this.raid = null; this.flits = 0; this.knipper = 0; this.volgendeKnip = 2;
    this.verslagen = null;        // de animatie van de overwinning (eenmalig)
    this.weg = false;
  }

  /** Nieuwe toestand uit het verhaal: { kop: { zicht, plek, schaal, diep }, armen: { zone: 0..1 } } */
  zet(stand) {
    if (!stand?.actief) { this.doel.zicht = false; for (const a of ARMEN) a.doel = 0; return; }
    const k = stand.kop || {};
    const p = KOP_PLEKKEN[k.plek] || KOP_PLEKKEN.dijver;
    const nieuwePlek = !this.doel.plek || this.doel.plek !== k.plek;
    this.doel = { plek: k.plek, x: p.x, z: p.z, schaal: k.schaal ?? 1, diep: k.diep ?? 0, zicht: !!k.zicht };
    if (nieuwePlek && !this._gezet) { this.nu.x = p.x; this.nu.z = p.z; }
    // de eerste keer meteen goed (niet uit het water laten komen bij het openen van de stad)
    if (!this._gezet) { this.nu.op = k.zicht ? 1 : 0; this.nu.schaal = this.doel.schaal; this.nu.diep = this.doel.diep; }
    const eerst = !this._gezet;
    for (const a of ARMEN) {
      a.doel = stand.armen?.[a.zone] ?? 0;
      if (eerst) a.s = a.doel;
    }
    // een zone wordt helder of een arm verdampt: een wolkje damp waar de arm uit het water kwam
    if (!eerst) for (const a of ARMEN) if (a.s - a.doel > 0.25) this.stad._stofwolk?.(a.b[0], a.b[1], 0.5);
    if (stand.baasWeg && this.nu.op > 0.3 && !this.verslagen && this._gezet) this.verslaan();
    this._gezet = true;
  }

  /** De eindbaas: { status: 'lobby'|'actief'|'gewonnen'|'gestopt', hp, maxHp } */
  setRaid(st) {
    const vorige = this.raid;
    this.raid = st && (st.status === 'lobby' || st.status === 'actief') ? { ...st } : null;
    if (this.raid && vorige && st.hp < vorige.hp) this.flits = 0.35;
    if (st?.status === 'gewonnen' && (vorige || this.nu.op > 0.3) && !this.verslagen) this.verslaan();
  }

  /** De overwinning: hij zakt wiebelend weg en verdampt. */
  verslaan() {
    this.verslagen = { t: 0 };
    for (const a of ARMEN) a.doel = 0;
    this.stad.verhaal3d?.feest?.(true);
  }

  get zichtbaar() { return this.groep.visible; }
  /** Midden van de kop in de wereld (voor de camera en het kaartje). */
  positie() { return { x: this.nu.x, y: this.peil + 2.2 * this.nu.schaal * 0.9, z: this.nu.z }; }

  tick(dt, t, peil, cam) {
    this.peil = peil;
    const raid = this.raid;
    // doel van de kop
    let doelX = this.doel.x ?? 0, doelZ = this.doel.z ?? 0, doelS = this.doel.schaal, doelD = this.doel.diep, doelOp = this.doel.zicht ? 1 : 0;
    if (raid) {
      const p = KOP_PLEKKEN.rozenhoedkaai, frac = raid.maxHp ? raid.hp / raid.maxHp : 1;
      doelX = p.x; doelZ = p.z; doelS = 1.15 + 0.55 * frac; doelD = -0.35; doelOp = 1;
    }
    if (this.verslagen) { doelOp = 0; }
    const k = 1 - Math.exp(-dt * 1.2);
    // verhuizen: eerst onderduiken, dan op de nieuwe plek weer bovenkomen
    const ver = Math.hypot(doelX - this.nu.x, doelZ - this.nu.z);
    if (ver > 0.5) { this.nu.op = Math.max(0, this.nu.op - dt * 0.8); if (this.nu.op <= 0.01) { this.nu.x = doelX; this.nu.z = doelZ; } }
    else { this.nu.x = lerp(this.nu.x, doelX, k); this.nu.z = lerp(this.nu.z, doelZ, k); this.nu.op = lerp(this.nu.op, doelOp, 1 - Math.exp(-dt * (this.verslagen ? 0.5 : 0.9))); }
    this.nu.schaal = lerp(this.nu.schaal, doelS, k); this.nu.diep = lerp(this.nu.diep, doelD, k);
    // armen groeien of trekken zich terug (tijdens de raid grijpen de armen rond de Markt)
    for (const a of ARMEN) {
      let d = a.doel;
      if (raid && (a.zone === 'markt' || a.zone === 'fontein')) d = 1;
      if (this.verslagen) d = 0;
      a.s = lerp(a.s, d, 1 - Math.exp(-dt * 0.7));
      if (a.s < 0.004) a.s = 0;
    }
    if (this.verslagen) {
      this.verslagen.t += dt;
      if (this.verslagen.t > 6) { this.verslagen = null; this.weg = true; }
    }
    this.flits = Math.max(0, this.flits - dt);

    // ---- de kop ----
    const R = 2.1 * this.nu.schaal;
    const zicht = this.nu.op > 0.02;
    this.groep.visible = zicht;
    if (zicht) {
      const adem = Math.sin(t * 1.3) * 0.035;
      const wieg = this.verslagen ? Math.sin(this.verslagen.t * 9) * 0.25 * (1 - this.verslagen.t / 6) : 0;
      const yMidden = peil + R * (0.42 - 0.95 * this.nu.diep) - (1 - this.nu.op) * R * 1.6 + Math.sin(t * 0.8) * 0.06;
      this.groep.position.set(this.nu.x, yMidden, this.nu.z);
      this.groep.scale.set(R * (1 - adem * 0.5), R * (0.86 + adem), R * (1 - adem * 0.5));
      // hij kijkt je aan
      if (cam) { const wil = Math.atan2(cam.position.x - this.nu.x, cam.position.z - this.nu.z); let d = wil - this.nu.yaw; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; this.nu.yaw += d * (1 - Math.exp(-dt * 1.5)); }
      this.kop.rotation.set(Math.sin(t * 0.7) * 0.04 + wieg * 0.3, this.nu.yaw + Math.sin(t * 0.45) * 0.12, Math.sin(t * 0.6) * 0.05 + wieg);
      // knipperen
      this.volgendeKnip -= dt;
      if (this.volgendeKnip <= 0) { this.knipper = 0.18; this.volgendeKnip = 2.5 + this.r() * 3.5; }
      this.knipper = Math.max(0, this.knipper - dt);
      const dicht = this.verslagen ? 1 : this.knipper > 0 ? Math.sin(this.knipper / 0.18 * Math.PI) : 0;
      for (const l of this.leden) l.rotation.x = -0.75 + dicht * 2.35;
      this.kopMat.emissive.setRGB(this.flits * 1.6, this.flits * 1.8, this.flits * 1.4);
    }

    // ---- armen ----
    let n = 0, na = 0, nv = 0;
    const flessen = [];
    for (const a of ARMEN) {
      if (a.s <= 0) continue;
      const s = a.s, bx = a.b[0], bz = a.b[1], tx = a.t[0], tz = a.t[1];
      const dx = tx - bx, dz = tz - bz, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
      const yB = (a.fontein ? 0.3 : peil) - 0.5 - (1 - s) * 0.6, yT = a.fontein ? 0.42 : 0.38;
      const H = a.h * (raid && a.zone === 'markt' ? 1.3 : 1);
      const punt = (v, uit) => {
        const sw = Math.sin(t * 1.15 + v * 3.2 + a.f) * 0.32 * v, op = Math.sin(t * 0.9 + v * 2.1 + a.f) * 0.14 * v;
        return uit.set(bx + dx * v + nx * sw, lerp(yB, yT, v) + H * Math.sin(Math.PI * v) * (1 - 0.1 * v) + op - (1 - s) * 0.5, bz + dz * v + nz * sw);
      };
      const vmax = s;
      for (let k = 0; k < N_SEG; k++) {
        const u = k / (N_SEG - 1), v = u * vmax;
        punt(v, V_A); punt(Math.min(1, v + 0.03), V_B);
        const r = a.r * 1.3 * (1 - 0.7 * u) * (0.55 + 0.45 * s) * (raid && a.zone === 'markt' ? 1.25 : 1);
        const ds = (vmax / (N_SEG - 1)) * Math.hypot(L, H * 2);
        V_B.sub(V_A).normalize();
        Q.setFromUnitVectors(Z_AS, V_B);
        M4.compose(V_A, Q, S3.set(r, r, Math.max(r, ds * 0.62)));
        this.armMesh.setMatrixAt(a.i * N_SEG + k, M4);
      }
      n = Math.max(n, a.i * N_SEG + N_SEG);
      // de slijkvlek waar de arm uit het water komt
      if (nv < this.vlekken.instanceMatrix.count) { M4.compose(V3.set(bx, (a.fontein ? 0.39 : peil) + 0.03, bz), Q.identity(), S3.setScalar((a.fontein ? 1.1 : 2.4) * (0.4 + 0.6 * s))); this.vlekken.setMatrixAt(nv++, M4); }
      if (a.grijs) for (const v of [0.45, 0.72]) flessen.push({ a, v: v * vmax, punt });
    }
    // alle instanties van armen die weg zijn: op nul
    for (const a of ARMEN) if (a.s <= 0) for (let k = 0; k < N_SEG; k++) { M4.makeScale(0, 0, 0); this.armMesh.setMatrixAt(a.i * N_SEG + k, M4); }
    this.armMesh.count = n; this.armMesh.instanceMatrix.needsUpdate = true;
    for (const f of flessen) {
      if (na >= this.armAfval.instanceMatrix.count) break;
      f.punt(f.v, V_A); V_A.y += f.a.r * 0.75;
      M4.compose(V_A, Q.setFromAxisAngle(V3.set(0.3, 0.2, 0.9).normalize(), 1.2 + na), S3.setScalar(1)); this.armAfval.setMatrixAt(na++, M4);
    }
    this.armAfval.count = na; this.armAfval.instanceMatrix.needsUpdate = true;
    if (zicht && nv < this.vlekken.instanceMatrix.count) { M4.compose(V3.set(this.nu.x, peil + 0.04, this.nu.z), Q.identity(), S3.setScalar(R * 3.4 * this.nu.op)); this.vlekken.setMatrixAt(nv++, M4); }
    this.vlekken.count = nv; this.vlekken.instanceMatrix.needsUpdate = true;

    // ---- druppels: van de kop en de armen naar het water ----
    const levend = ARMEN.filter(a => a.s > 0.2);
    let nd = 0;
    for (const d of this.druppelData) {
      d.t -= dt;
      if (d.t <= 0 && d.y <= peil) {
        // nieuwe druppel
        if (zicht && this.r() < 0.4) { const a = this.r() * TAU; d.x = this.nu.x + Math.cos(a) * R * 0.75; d.z = this.nu.z + Math.sin(a) * R * 0.75; d.y = this.groep.position.y + R * 0.2; }
        else if (levend.length) { const a = levend[Math.floor(this.r() * levend.length)], v = 0.25 + this.r() * 0.5 * a.s; d.x = a.b[0] + (a.t[0] - a.b[0]) * v; d.z = a.b[1] + (a.t[1] - a.b[1]) * v; d.y = 0.2 + a.h * Math.sin(Math.PI * v) * 0.8; }
        else continue;
        d.vy = 0; d.t = 0.2 + this.r() * 1.6;
      }
      if (d.y > peil) { d.vy -= 9 * dt; d.y += d.vy * dt; }
      if (d.y <= peil) continue;
      M4.compose(V3.set(d.x, d.y, d.z), Q.identity(), S3.set(0.06, 0.06 + Math.min(0.12, -d.vy * 0.02), 0.06));
      this.druppels.setMatrixAt(nd++, M4);
    }
    this.druppels.count = nd; this.druppels.instanceMatrix.needsUpdate = true;

    // ---- bellen: borrelen rond de kop en de armen ----
    let nb = 0;
    const bronnen = [];
    if (zicht) bronnen.push({ x: this.nu.x, z: this.nu.z, r: R * 1.1 });
    for (const a of levend) bronnen.push({ x: a.b[0], z: a.b[1], r: 0.9, y: a.fontein ? 0.39 : null });
    if (bronnen.length) for (const b of this.belData) {
      b.t += dt * 0.6;
      if (b.t >= 1 || !b.bron) { b.t = b.t % 1; b.bron = bronnen[Math.floor(this.r() * bronnen.length)]; const a = this.r() * TAU, rr = b.bron.r * (0.7 + this.r() * 0.5); b.x = b.bron.x + Math.cos(a) * rr; b.z = b.bron.z + Math.sin(a) * rr; b.s = 0.06 + this.r() * 0.12; }
      const s = b.s * Math.sin(Math.min(1, b.t) * Math.PI);
      M4.compose(V3.set(b.x, (b.bron.y ?? peil) + 0.02 + s * 0.3, b.z), Q.identity(), S3.set(s, s * 0.7, s));
      this.bellen.setMatrixAt(nb++, M4);
    }
    this.bellen.count = nb; this.bellen.instanceMatrix.needsUpdate = true;
  }
}
