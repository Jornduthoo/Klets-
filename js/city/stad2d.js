// Terugvalkaart zonder WebGL: dezelfde stad, isometrisch getekend op een 2D-canvas.
// Zelfde methodes als Stad3D (update, setOverlay, markers, focus ...), zodat de app niets merkt.
import { clamp, lerp, rng } from '../core/util.js';
import { MUUR_R, POORTEN, PLEIN_R, DAL_R, SPOOR_Z, SPOOR_X, SPOOR_HALF, SPOOR_SPOREN, WEG_HALF, RIJBAAN, WIJKEN, KLEUR, PLEIN, POORT, TUNNEL_WEST, PLEKKEN, MOLENS, WATERS, KADE, kavels, hqPositie, gidsPlek, polar, stadStraal, isVrijVoorBoom, waterVeelhoek, waterMidden, waterhuizen, MARKT_HUIZEN } from './layout.js';
import { sterktes } from './weer.js';
import { wegennet, takLijn, KRUIS, bruggen } from './wegen.js';
import { AVATAR_OPTIES, dakKleur } from '../figuren/uiterlijk.js';
import { plaatsMarkers } from './markers.js';
import { KOP_PLEKKEN, ARMEN } from './verhaal.js';
import { nuInBrugge, zonStand } from './tijd.js';

const TAU = Math.PI * 2;
const HOOGTE = [1.1, 2.3, 4.2, 7.5];
function sterkteKleur(s) { return s >= 0.75 ? '#35e08f' : s >= 0.5 ? '#c6ea3a' : s >= 0.25 ? '#ffc23a' : '#ff8a3d'; }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (sh) => clamp(Math.round(((n >> sh) & 255) * f), 0, 255);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

export class Stad2D {
  constructor(container, opts = {}) {
    this.c = container; this.o = opts; this.is2D = true;
    this.cv = document.createElement('canvas'); this.cv.className = 'stad-canvas2d'; this.cv.tabIndex = 0;
    this.cv.setAttribute('aria-label', 'De themastad (eenvoudige kaart). Sleep om te schuiven, scroll om te zoomen.');
    container.append(this.cv);
    this.markerLaag = document.createElement('div'); this.markerLaag.className = 'stad-markers'; container.append(this.markerLaag);
    this.g = this.cv.getContext('2d');
    this.cam = { x: 0, z: 6, zoom: 9, yaw: 0.62 }; this.doel = { ...this.cam };
    this.model = null; this.overlay = null; this.markers = new Map(); this.storm = 0; this.nacht = 0; this.tijdMode = 'live'; this.raid = null; this.vloed = 0; this.kraakOp = 0; this.t = 0;
    this.hits = []; this.pauze = false; this.kwaliteit = 'laag';
    this.weer = null; this.seizoen = 'lente'; this.bruggen = bruggen();
    this._invoer();
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(container); this._resize();
    this._last = performance.now();
    const loop = (now) => { this.raf = requestAnimationFrame(loop); const dt = Math.min(0.1, (now - this._last) / 1000); this._last = now; if (this.pauze) return; this.t += dt; this._stap(dt); this._teken(); };
    this.raf = requestAnimationFrame(loop);
  }
  _resize() { const r = this.c.getBoundingClientRect(); this.w = this.cv.width = Math.max(1, Math.round(r.width)); this.h = this.cv.height = Math.max(1, Math.round(r.height)); }
  /** wereld -> scherm */
  p(x, y, z) {
    const c = Math.cos(this.cam.yaw), s = Math.sin(this.cam.yaw);
    const dx = x - this.cam.x, dz = z - this.cam.z;
    const rx = dx * c - dz * s, rz = dx * s + dz * c;
    return { x: this.w / 2 + rx * this.cam.zoom, y: this.h / 2 + rz * this.cam.zoom * 0.55 - y * this.cam.zoom * 0.9, d: rz };
  }
  terug(sx, sy) {
    const rx = (sx - this.w / 2) / this.cam.zoom, rz = (sy - this.h / 2) / (this.cam.zoom * 0.55);
    const c = Math.cos(-this.cam.yaw), s = Math.sin(-this.cam.yaw);
    return { x: this.cam.x + rx * c - rz * s, z: this.cam.z + rx * s + rz * c };
  }
  update(model) {
    const vorige = this.bekend; this.model = model;
    const nieuw = [];
    this.bekend = new Map(model.gebouwen.filter(g => g.gebouwd).map(g => [g.id, g.niveau]));
    if (vorige) for (const g of model.gebouwen) if (g.gebouwd && (!vorige.has(g.id) || vorige.get(g.id) < g.niveau)) nieuw.push(g);
    this.groei = new Map(nieuw.map((g, i) => [g.id, this.t + i * 0.5]));
    return nieuw;
  }
  markeerNieuw() {}
  setOverlay(m) { this.overlay = m || null; }
  setTijd(m) { this.tijdMode = ['live', 'cyclus', 'dag', 'avond', 'nacht'].includes(m) ? m : 'live'; this._liveT = -1; }
  /** De raid van De Slijkkraak (status lobby|actief|gewonnen|gestopt). */
  setRaid(st) { this.raid = st || null; if (st?.status === 'gewonnen') this._gewonnenT = this.t; }
  /** 0 = dag, 0.8 = nacht, volgens de echte stand van de zon boven Brugge (elke minuut opnieuw). */
  _liveNacht() {
    if (this._liveT == null || this._liveT < 0 || this.t - this._liveT > 60) {
      this._liveT = this.t;
      const e = zonStand(nuInBrugge()).elev * 180 / Math.PI;
      const L = clamp((e + 7) / 11, 0, 1), dag = L * L * (3 - 2 * L);
      this._liveN = 0.8 * (1 - dag);
    }
    return this._liveN;
  }
  setStorm(n) { this.stormDoel = clamp(n, 0, 1); }
  setKwaliteit() {}
  /** Het echte weer van Brugge: de lucht, de regen en het seizoen van de kaart. */
  setWeer(w) { this.weer = w; this.sterk = sterktes(w || {}); if (w?.seizoen) this.zetSeizoen(w.seizoen); }
  zetSeizoen(seizoen) { this.seizoen = seizoen || 'lente'; }
  pause(on) { this.pauze = !!on; }
  draai(r) { this.doel.yaw += r * Math.PI / 4; }
  zoom(r) { this.doel.zoom = clamp(this.doel.zoom * (r > 0 ? 1 / 1.3 : 1.3), 4, 40); }
  thuis() { Object.assign(this.doel, { x: 0, z: 6, zoom: 9 }); }
  vliegNaar(x, z, dist = 34) { this.doel.x = x; this.doel.z = z; this.doel.zoom = clamp(560 / dist, 4, 40); }
  focus(id, dist = 30) { const p = this.positieVan(id); if (p) this.vliegNaar(p.x, p.z, dist); }
  selecteer(id) { this.selectie = id; }
  positieVan(id) {
    if (id === 'slijkkraak') { const k = this._kop(); return k ? { x: k.x, y: 1, z: k.z } : null; }
    if (!id) return null;
    if (id.startsWith('gids:')) { const w = WIJKEN.find(x => x.gids === id.slice(5)); if (!w) return null; const p = hqPositie(w); return { x: p.x, y: 3, z: p.z }; }
    if (id.startsWith('plek:')) { const pl = PLEKKEN[id.slice(5)]; return pl ? { x: pl.x, y: Math.min(4, (pl.labelY ?? 3) * 0.6), z: pl.z } : null; }
    if (id.startsWith('water:')) { const wz = WATERS.find(x => x.zone === id.slice(6) || x.id === id.slice(6)); if (!wz) return null; const m = waterMidden(wz); return { x: m.x, y: 0.4, z: m.z }; }
    if (id === 'station') return { x: 0, y: 3, z: -2 };
    if (PLEIN[id]) return { x: PLEIN[id].x, y: 2, z: PLEIN[id].z };
    if (id === 'poort') return { x: POORT.x, y: 6, z: POORT.z };
    if (id === 'trein') return { x: PLEKKEN.station.x, y: 2, z: PLEKKEN.station.z };
    const g = this.model?.gebouwen.find(x => x.id === id); if (g?.slot) return { x: g.slot.x, y: 2, z: g.slot.z };
    const h = this.model?.huizen.find(x => x.id === id); if (h) return { x: h.slot.x, y: 1.5, z: h.slot.z };
    return null;
  }
  zetMarker(key, el, pos) { if (!el.parentNode) this.markerLaag.append(el); this.markers.set(key, { el, pos }); }
  wisMarker(key) { const m = this.markers.get(key); if (m) { m.el.remove(); this.markers.delete(key); } }
  projecteer(p) { const q = this.p(p.x, p.y, p.z); return { x: q.x, y: q.y, zicht: true }; }
  get fps() { return 30; }
  get info() { return { modus: '2d' }; }
  dispose() { cancelAnimationFrame(this.raf); this._ro.disconnect(); this.cv.remove(); this.markerLaag.remove(); }

  _invoer() {
    const cv = this.cv; let sleep = null;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); sleep = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, draai: e.button === 2 || e.shiftKey }; });
    cv.addEventListener('pointermove', (e) => {
      if (!sleep) { const id = this._pick(e); cv.style.cursor = id ? 'pointer' : 'grab'; return; }
      const dx = e.clientX - sleep.x, dy = e.clientY - sleep.y; sleep.x = e.clientX; sleep.y = e.clientY;
      if (sleep.draai) { this.doel.yaw -= dx * 0.006; return; }
      const a = this.terug(this.w / 2, this.h / 2), b = this.terug(this.w / 2 + dx, this.h / 2 + dy);
      this.doel.x -= b.x - a.x; this.doel.z -= b.z - a.z; this.cam.x = this.doel.x; this.cam.z = this.doel.z;
    });
    cv.addEventListener('pointerup', (e) => {
      if (sleep && Math.hypot(e.clientX - sleep.sx, e.clientY - sleep.sy) < 6) { const id = this._pick(e); this.selecteer(id); this.o.onPick?.(id, e); }
      sleep = null;
    });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.doel.zoom = clamp(this.doel.zoom * Math.exp(-e.deltaY * 0.0012), 4, 40); }, { passive: false });
    cv.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase(), st = 30 / this.cam.zoom;
      if (k === 'arrowup' || k === 'w') this.doel.z -= st; else if (k === 'arrowdown' || k === 's') this.doel.z += st;
      else if (k === 'arrowleft' || k === 'a') this.doel.x -= st; else if (k === 'arrowright' || k === 'd') this.doel.x += st;
      else if (k === 'q') this.draai(-1); else if (k === 'e') this.draai(1); else return;
      e.preventDefault();
    });
  }
  _pick(e) {
    const r = this.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = this.hits.length - 1; i >= 0; i--) { const h = this.hits[i]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h.id; }
    return null;
  }
  _stap(dt) {
    const k = 1 - Math.exp(-dt * 6);
    for (const key of ['x', 'z', 'zoom', 'yaw']) this.cam[key] = lerp(this.cam[key], this.doel[key], k);
    if (this.o.digibord) this.doel.yaw += dt * 0.02;
    this.storm = lerp(this.storm, this.stormDoel || 0, k);
    const fase = this.tijdMode === 'nacht' ? 0.8 : this.tijdMode === 'avond' ? 0.5 : this.tijdMode === 'dag' ? 0 : this.tijdMode === 'live' ? this._liveNacht() : (Math.sin(this.t / 300 * TAU) < -0.6 ? 0.8 : 0);
    // het verhaal: hoogwater en De Slijkkraak (tijdens de raid komt de kop boven, na de overwinning zakt hij weg)
    const vh = this.model?.verhaal, raidAan = this.raid?.status === 'actief';
    const hp = raidAan ? clamp((this.raid.hp ?? 1) / Math.max(1, this.raid.maxHp ?? 1), 0, 1) : 0;
    this.vloed = lerp(this.vloed, Math.max(vh?.actief ? vh.vloed : 0, raidAan ? 0.35 + 0.35 * hp : 0), k * 0.3);
    const weg = this.raid?.status === 'gewonnen' || (vh?.baasWeg && !raidAan);
    this.kraakOp = lerp(this.kraakOp, !weg && (raidAan || (vh?.actief && vh.kop?.zicht)) ? 1 : 0, k * 0.4);
    this.nacht = lerp(this.nacht, fase, k * 0.3);
    const items = [];
    for (const m of this.markers.values()) {
      const { el, pos } = m;
      const p = typeof pos === 'string' ? this.positieVan(pos) : pos; if (!p) { el.style.display = 'none'; continue; }
      const q = this.p(p.x, p.y, p.z); el.style.display = ''; items.push({ m, x: q.x, y: q.y });
    }
    plaatsMarkers(items);
  }
  /** Waar de kop van De Slijkkraak nu is (of null als hij weg is). */
  _kop() {
    if (this.kraakOp < 0.03) return null;
    const vh = this.model?.verhaal, raidAan = this.raid?.status === 'actief';
    const plek = KOP_PLEKKEN[raidAan ? 'rozenhoedkaai' : vh?.kop?.plek] || KOP_PLEKKEN.rozenhoedkaai;
    const hp = raidAan ? clamp((this.raid.hp ?? 1) / Math.max(1, this.raid.maxHp ?? 1), 0, 1) : 0;
    const schaal = (raidAan ? 1.15 + 0.55 * hp : (vh?.kop?.schaal ?? 1)) * (1 - 0.45 * (raidAan ? 0 : vh?.kop?.diep ?? 0));
    return { x: plek.x, z: plek.z, r: 3.4 * schaal * this.kraakOp };
  }
  /** De kop als een bultige modderbol met grote ogen (geen eng monster). */
  _tekenKraak(k) {
    const g = this.g, q = this.p(k.x, k.r * 0.55, k.z), r = k.r * this.cam.zoom, adem = 1 + Math.sin(this.t * 1.6) * 0.03;
    g.save(); g.translate(q.x, q.y); g.scale(adem, 1 / adem);
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, '#a89a52'); gr.addColorStop(1, '#4a3c1c');
    g.fillStyle = gr; g.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = r * (1 + 0.06 * Math.sin(a * 5 + this.t)); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9); }
    g.fill();
    const knip = (this.t % 4.2) < 0.15;
    for (const sx of [-1, 1]) {
      g.fillStyle = '#f4f0dc'; g.beginPath(); g.ellipse(sx * r * 0.36, -r * 0.18, r * 0.27, knip ? r * 0.04 : r * 0.3, 0, 0, TAU); g.fill();
      if (!knip) { g.fillStyle = '#1b1a14'; g.beginPath(); g.arc(sx * r * 0.32, -r * 0.12, r * 0.13, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * r * 0.28, -r * 0.17, r * 0.045, 0, TAU); g.fill(); }
      g.strokeStyle = '#2a2210'; g.lineWidth = Math.max(2, r * 0.08); g.beginPath(); g.moveTo(sx * r * 0.14, -r * 0.5); g.lineTo(sx * r * 0.58, -r * 0.56); g.stroke();
    }
    g.strokeStyle = '#2a2210'; g.lineWidth = Math.max(1.5, r * 0.06); g.beginPath(); g.arc(0, r * 0.2, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.restore();
    const xs = [q.x - r, q.x + r], ys = [q.y - r, q.y + r];
    this.hits.push({ id: 'slijkkraak', x0: xs[0], x1: xs[1], y0: ys[0], y1: ys[1] });
  }
  _ellips(r, fill, stroke, lw) {
    const g = this.g; g.beginPath();
    for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; const q = this.p(Math.cos(a) * r, 0, Math.sin(a) * r); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  _blok(x, z, w, d, hgt, rot, kleur, dak, id) {
    const g = this.g, c = Math.cos(rot), s = Math.sin(rot);
    const hoek = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => ({ x: x + a * c + b * s, z: z - a * s + b * c }));
    const onder = hoek.map(q => this.p(q.x, 0, q.z)), boven = hoek.map(q => this.p(q.x, hgt, q.z));
    // zijkanten (achterste eerst)
    const zijden = [0, 1, 2, 3].map(i => ({ i, d: (onder[i].d + onder[(i + 1) % 4].d) / 2 })).sort((a, b) => a.d - b.d);
    for (const { i } of zijden) {
      const j = (i + 1) % 4;
      g.beginPath(); g.moveTo(onder[i].x, onder[i].y); g.lineTo(onder[j].x, onder[j].y); g.lineTo(boven[j].x, boven[j].y); g.lineTo(boven[i].x, boven[i].y); g.closePath();
      g.fillStyle = shade(kleur, i % 2 ? 0.82 : 0.95); g.fill();
    }
    g.beginPath(); boven.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); g.fillStyle = dak; g.fill();
    if (this.nacht > 0.4) { g.fillStyle = 'rgba(255,214,120,.8)'; const m = this.p(x, hgt * 0.5, z); for (let k = 0; k < Math.min(6, hgt * 2); k++) g.fillRect(m.x - 4 + (k % 2) * 6, m.y - k * 4, 2, 2); }
    if (id) { const xs = boven.concat(onder).map(q => q.x), ys = boven.concat(onder).map(q => q.y); this.hits.push({ id, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }); }
  }
  _teken() {
    const g = this.g, w = this.w, h = this.h, n = this.nacht;
    this.hits = [];
    const lucht = g.createLinearGradient(0, 0, 0, h);
    const grijs = this.sterk?.wolken ?? 0.3;
    lucht.addColorStop(0, n > 0.4 ? '#0f1640' : mengHex('#5aa9f0', '#8c93a4', grijs));
    lucht.addColorStop(1, n > 0.4 ? '#2a3466' : mengHex('#d6ecfb', '#c2c6cf', grijs));
    g.fillStyle = lucht; g.fillRect(0, 0, w, h);
    this._ellips(DAL_R + 8, n > 0.4 ? '#3c5a3a' : '#8fae6a');
    this._ellips(DAL_R, n > 0.4 ? '#3f6b3a' : '#86c95a');
    const vlak = (pts, kleur) => { g.fillStyle = kleur; g.beginPath(); pts.forEach((q, i) => { const s2 = this.p(q.x, 0, q.z); i ? g.lineTo(s2.x, s2.y) : g.moveTo(s2.x, s2.y); }); g.closePath(); g.fill(); };
    // de vesten, de reien, het Minnewater en de haven: hoe helderder de klas het water maakte, hoe blauwer
    const stand = this.model?.water;
    for (const w of WATERS) vlak(waterVeelhoek(w, KADE + 0.25, 1.2), '#cdc6b5');
    for (const w of WATERS) vlak(waterVeelhoek(w, KADE, 1.2), '#a65a40');
    for (const w of WATERS) {
      const hel = stand?.zones?.[w.zone]?.helder ?? 0;
      vlak(waterVeelhoek(w, 0, 1.2), mengHex('#46552e', '#2f8fd6', hel));
    }
    // de Markt (over de grond, onder de wegen)
    this._ellips(PLEIN_R, '#cdbd9f');
    // spoorbedding aan de zuidrand van de stad
    vlak([{ x: -SPOOR_X, z: SPOOR_Z - SPOOR_HALF + 0.6 }, { x: SPOOR_X, z: SPOOR_Z - SPOOR_HALF + 0.6 }, { x: SPOOR_X, z: SPOOR_Z + SPOOR_HALF - 0.6 }, { x: -SPOOR_X, z: SPOOR_Z + SPOOR_HALF - 0.6 }], '#a9a196');
    // wegennet: eerst stoepen, dan asfalt, dan kruispunten (zelfde graaf als de 3D-stad)
    const net = wegennet(this.model?.stadR ?? stadStraal(this.model?.gebouwen || []));
    const lint = (pts, half) => { const l = [], r = []; for (const q of pts) { l.push({ x: q.x - q.dz * half, z: q.z + q.dx * half }); r.push({ x: q.x + q.dz * half, z: q.z - q.dx * half }); } return l.concat(r.reverse()); };
    const lijnen = net.takken.map(t => takLijn(t, 1.2, KRUIS * 0.9, KRUIS * 0.9));
    for (const pts of lijnen) vlak(lint(pts, WEG_HALF), '#bcae95');
    for (const k of net.knopen) { const rx = Math.cos(k.hoek), rz = Math.sin(k.hoek), tx = -rz, tz = rx, h2 = KRUIS; vlak([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: k.x + tx * a * h2 + rx * b * h2, z: k.z + tz * a * h2 + rz * b * h2 })), '#bcae95'); }
    for (const pts of lijnen) vlak(lint(pts, RIJBAAN / 2), '#9c8f7c');
    for (const k of net.knopen) {
      const rx = Math.cos(k.hoek), rz = Math.sin(k.hoek), tx = -rz, tz = rx, h2 = KRUIS, a2 = RIJBAAN / 2;
      const rect = (t0, t1, r0, r1) => vlak([[t0, r0], [t1, r0], [t1, r1], [t0, r1]].map(([t, r]) => ({ x: k.x + tx * t + rx * r, z: k.z + tz * t + rz * r })), '#9c8f7c');
      rect(-h2, h2, -a2, a2);                                   // de ring loopt door
      const binnenT = k.soort === 'T' && !(k.buiten && k.ring > 0), buitenT = k.soort === 'T' && k.buiten && k.ring > 0;
      rect(-a2, a2, binnenT ? -a2 : -h2, buitenT ? a2 : h2);    // de laan
    }
    // sporen over alles heen (overwegen) en slagbomen
    g.strokeStyle = '#7d838e'; g.lineWidth = Math.max(1, this.cam.zoom * 0.08);
    for (const zz of SPOOR_SPOREN) for (const dz of [-0.26, 0.26]) { const a = this.p(-SPOOR_X, 0, SPOOR_Z + zz + dz), b = this.p(SPOOR_X, 0, SPOOR_Z + zz + dz); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    for (const o of net.overwegen) for (const zk of [-1, 1]) { const q = this.p(o.x - zk * 0.9, 0.5, o.z + zk * (SPOOR_HALF - 0.15)); g.fillStyle = '#e0453a'; g.fillRect(q.x - 2, q.y - 2, 4, 4); }
    // hoogwater: bruin slijkwater over de straten en de Markt
    if (this.vloed > 0.01) {
      const c = this.p(0, 0, 0), R = 27.5 * this.cam.zoom;
      g.save(); g.translate(c.x, c.y); g.scale(1, 0.55);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
      const a = (0.72 * this.vloed).toFixed(3);
      gr.addColorStop(0, `rgba(104,82,42,${a})`); gr.addColorStop(0.85, `rgba(110,90,46,${a})`); gr.addColorStop(1, 'rgba(110,90,46,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      g.strokeStyle = `rgba(230,220,180,${(0.35 * this.vloed).toFixed(3)})`; g.lineWidth = 1;
      for (let i = 0; i < 14; i++) { const rr = ((i * 0.37 + this.t * 0.05) % 1) * R; g.beginPath(); g.arc(Math.cos(i * 2.4) * R * 0.6, Math.sin(i * 2.4) * R * 0.6, rr * 0.08, 0, TAU); g.stroke(); }
      g.restore();
    }
    // de slijkarmen: hoe properder het water in die zone, hoe kleiner (tijdens de raid allemaal terug)
    if (this.kraakOp > 0.02) {
      const armen = this.model?.verhaal?.armen || {};
      for (const arm of ARMEN) {
        const sterk = (this.raid?.status === 'actief' ? 1 : (armen[arm.zone] ?? 0)) * this.kraakOp; if (sterk < 0.05) continue;
        const b = this.p(arm.b[0], 0, arm.b[1]), t = this.p(arm.b[0] + (arm.t[0] - arm.b[0]) * sterk, 0, arm.b[1] + (arm.t[1] - arm.b[1]) * sterk);
        const top = this.p((arm.b[0] + arm.t[0]) / 2, arm.h * sterk + Math.sin(this.t * 1.3 + arm.b[0]) * 0.2, (arm.b[1] + arm.t[1]) / 2);
        g.strokeStyle = arm.grijs ? '#7d7a6c' : '#6f6a2c'; g.lineCap = 'round'; g.lineWidth = Math.max(2, arm.r * 2.2 * this.cam.zoom * sterk);
        g.beginPath(); g.moveTo(b.x, b.y); g.quadraticCurveTo(top.x, top.y, t.x, t.y); g.stroke();
      }
    }
    // kaartlaag
    const m = this.model;
    if (m && this.overlay) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gloed = (x, z, r, k) => { const q = this.p(x, 0, z), rr = r * this.cam.zoom; const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, rr); gr.addColorStop(0, k); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(q.x, q.y, rr, rr * 0.55, 0, 0, TAU); g.fill(); };
      if (this.overlay === 'sterkte') for (const b of m.gebouwen) if (b.slot) gloed(b.slot.x, b.slot.z, 2.6, sterkteKleur(b.sterkte));
      if (this.overlay === 'wijken') for (const wk of m.wijken) { const p = polar(26, wk.hoek * Math.PI / 180); gloed(p.x, p.z, 14, wk.sterkte == null ? '#5a6478' : sterkteKleur(wk.sterkte)); }
      if (this.overlay === 'mijn') { for (const b of m.gebouwen) if (b.ik && b.slot) gloed(b.slot.x, b.slot.z, 2.8, '#4fd2ff'); for (const hh of m.huizen) if (hh.ik) gloed(hh.slot.x, hh.slot.z, 3, '#ffe066'); }
      g.restore();
    }
    // objecten, gesorteerd op diepte
    const obj = [];
    obj.push({ x: TUNNEL_WEST.x, z: TUNNEL_WEST.z, f: () => this._blok(TUNNEL_WEST.x, TUNNEL_WEST.z, 2.4, 5.4, 5, 0, '#b9b2a6', '#8f877b') });
    obj.push({ x: PLEIN.klasmeter.x, z: PLEIN.klasmeter.z, f: () => this._blok(PLEIN.klasmeter.x, PLEIN.klasmeter.z, 0.6, 0.6, 3.6, 0, '#f6eedd', '#f2c94c', 'klasmeter') });
    obj.push({ x: PLEIN.kluis.x, z: PLEIN.kluis.z, f: () => this._blok(PLEIN.kluis.x, PLEIN.kluis.z, 1.6, 1.3, 1.6, 0, '#dfe3ea', '#8d6ad6', 'kluis') });
    obj.push({ x: PLEIN.missiebord.x, z: PLEIN.missiebord.z, f: () => this._blok(PLEIN.missiebord.x, PLEIN.missiebord.z, 2.2, 0.3, 1.9, 0, '#a8743f', '#e9a23b', 'missiebord') });
    obj.push({ x: POORT.x, z: POORT.z, f: () => this._blok(POORT.x, POORT.z, 3, 6, 7, 0, '#b9ad94', '#7d7788', 'poort') });
    // de stadswal met de vier stadspoorten
    for (let i = 0; i < 120; i++) {
      const a = (i + 0.5) / 120 * TAU, x = Math.cos(a) * MUUR_R, z = Math.sin(a) * MUUR_R;
      if (POORTEN.some(p => Math.abs(Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a))) * MUUR_R < 2.2)) continue;
      if (WATERS.some(w => w.id === 'noordrei' && Math.abs(x) < w.halfB + 0.3 && z < 0)) continue;
      obj.push({ x, z, f: () => this._blok(x, z, TAU * MUUR_R / 120 + 0.05, 0.35, i % 10 === 0 ? 1.5 : 0.8, -a - Math.PI / 2, '#a85a40', i % 10 === 0 ? '#7d7788' : '#c9b48e') });
    }
    for (const p of POORTEN) obj.push({ x: p.x, z: p.z, f: () => this._blok(p.x, p.z, 3.2, 1.5, 2.6, -p.rot, '#c9b48e', '#7d7788') });
    for (const [id, pl] of Object.entries(PLEKKEN)) {
      const hoog = id === 'belfort' ? 8.4 : id === 'olvkerk' ? 7.6 : id === 'vuurtoren' ? 6.2 : id === 'station' ? 2.4 : id === 'waterval' ? 2.4 : 3.2;
      const kl = id === 'waterval' ? '#9a9183' : id === 'station' ? '#a84e36' : '#d9c9a8', dak = id === 'station' ? '#7d7788' : id === 'waterval' ? '#8fd8f6' : '#a2503a';
      obj.push({ x: pl.x, z: pl.z, f: () => this._blok(pl.x, pl.z, pl.w, pl.d, hoog, -pl.rot, kl, dak, id === 'station' ? 'trein' : id === 'waterval' ? null : 'plek:' + id) });
    }
    // de huizen aan het water en de gildehuizen op de Markt
    const gevels = ['#b4553c', '#efe6d2', '#c46a48', '#d9b26f', '#9c4a36', '#e7dcc4'];
    for (const hw of waterhuizen()) obj.push({ x: hw.x, z: hw.z, f: () => this._blok(hw.x, hw.z, hw.w, hw.d, hw.h, -hw.rot, gevels[hw.variant], '#6f4a44') });
    for (const hm of MARKT_HUIZEN) obj.push({ x: hm.x, z: hm.z, f: () => this._blok(hm.x, hm.z, hm.w, hm.d, hm.h, -hm.rot, gevels[(hm.variant + 1) % 6], '#6f4a44') });
    for (const mo of MOLENS) obj.push({ x: mo.x, z: mo.z, f: () => this._blok(mo.x, mo.z, 1.6, 1.6, 4.2, -mo.rot, '#8a6a44', '#5d4a33') });
    for (const br of this.bruggen) if (br.R <= net.stadR + 1e-6) obj.push({ x: br.x, z: br.z, f: () => this._blok(br.x, br.z, WEG_HALF * 2 + 0.5, br.lengte + 1.2, 0.08, -Math.atan2(br.dx, br.dz), '#b5634a', '#cfc6b4') });
    for (const wk of WIJKEN) {
      const p = hqPositie(wk); obj.push({ x: p.x, z: p.z, f: () => this._blok(p.x, p.z, 3, 3.6, 2.6, -p.rot, '#d9c9a8', mengHex('#7d7788', KLEUR[wk.macht], 0.5), 'gids:' + wk.gids) });
      const gp = gidsPlek(wk); obj.push({ x: gp.x, z: gp.z, f: () => { const q = this.p(gp.x, 0.9, gp.z), r0 = Math.max(3, this.cam.zoom * 0.42); g.fillStyle = KLEUR[wk.macht]; g.beginPath(); g.ellipse(q.x, q.y + r0 * 1.4, r0 * 0.8, r0 * 1.1, 0, 0, TAU); g.fill(); g.fillStyle = '#fbe3cf'; g.beginPath(); g.arc(q.x, q.y, r0, 0, TAU); g.fill(); g.fillStyle = '#2a2230'; g.fillRect(q.x - r0 * 0.4, q.y - r0 * 0.1, 2, 2); g.fillRect(q.x + r0 * 0.3, q.y - r0 * 0.1, 2, 2); } });
    }
    if (m) {
      for (const b of m.gebouwen) {
        if (!b.slot) continue; const s = b.slot;
        if (!b.gebouwd) { obj.push({ x: s.x, z: s.z, f: () => this._blok(s.x, s.z, 1.6, 1.4, 0.25, -s.rot, '#cfd2d8', '#f28c28', b.id) }); continue; }
        const t0 = this.groei?.get(b.id); const gr = t0 == null ? 1 : clamp((this.t - t0) / 1.2, 0, 1);
        obj.push({ x: s.x, z: s.z, f: () => this._blok(s.x, s.z, 1.7, 1.5, HOOGTE[b.niveau] * gr + 0.01, -s.rot, b.niveau % 2 ? '#efe4cc' : '#b4553c', mengHex('#7d7788', KLEUR[b.macht], 0.45), b.id) });
      }
      for (const hh of m.huizen) { const s = hh.slot; obj.push({ x: s.x, z: s.z, f: () => this._blok(s.x, s.z, 1.2, 1.0, 1.0, -s.rot, '#f6eedd', dakKleur(AVATAR_OPTIES.kleren[hh.look?.kleren ?? 3] || '#4c8fd6'), hh.id) }); }
      const r = rng('2dbomen');
      const sr = net.stadR;
      for (let i = 0; i < 160; i++) { const p = polar(sr + 2.5 + r() * Math.max(1, DAL_R - sr - 3), r() * TAU); if (!isVrijVoorBoom(p.x, p.z)) continue; obj.push({ x: p.x, z: p.z, f: () => { const q = this.p(p.x, 0.8, p.z); g.fillStyle = BLADKLEUR[this.seizoen] || '#4fa548'; g.beginPath(); g.arc(q.x, q.y, 0.55 * this.cam.zoom * (this.seizoen === 'winter' ? 0.6 : 1), 0, TAU); g.fill(); } }); }
    }
    const kop = this._kop();
    if (kop) obj.push({ x: kop.x, z: kop.z, f: () => this._tekenKraak(kop) });
    for (const o of obj) o.d = this.p(o.x, 0, o.z).d;
    obj.sort((a, b) => a.d - b.d).forEach(o => o.f());
    // mist
    if (m) {
      const c = this.p(0, 0, 0), R = m.mistRadius * this.cam.zoom, Rmax = (DAL_R + 12) * this.cam.zoom;
      g.save(); g.translate(c.x, c.y); g.scale(1, 0.55);
      const gr = g.createRadialGradient(0, 0, R * 0.92, 0, 0, Math.max(R + 1, R + 9 * this.cam.zoom));
      gr.addColorStop(0, 'rgba(220,222,236,0)'); gr.addColorStop(1, n > 0.4 ? 'rgba(90,96,130,.95)' : 'rgba(222,224,238,.95)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, Rmax, 0, TAU); g.fill(); g.restore();
    }
    if (this.storm > 0.02) {
      const c = this.p(0, 14, 0);
      g.fillStyle = `rgba(150,146,170,${0.85 * this.storm})`;
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + this.t * 0.3; g.beginPath(); g.arc(c.x + Math.cos(a) * 60 * this.storm, c.y + Math.sin(a) * 20, 36 * this.storm, 0, TAU); g.fill(); }
      g.fillStyle = '#ffe680'; g.fillRect(c.x - 20, c.y - 6, 8, 8); g.fillRect(c.x + 12, c.y - 6, 8, 8);
    }
    // regen, sneeuw en mist van het echte weer
    const sk = this.sterk;
    if (sk?.regen > 0.02) {
      g.strokeStyle = `rgba(190,214,236,${0.25 + sk.regen * 0.4})`; g.lineWidth = 1;
      const aantal = Math.round(60 + sk.regen * 160);
      for (let i = 0; i < aantal; i++) { const x = (i * 97 + this.t * 220) % w, y = (i * 53 + this.t * 900) % h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 12); g.stroke(); }
    }
    if (sk?.sneeuw > 0.02) {
      g.fillStyle = `rgba(255,255,255,${0.5 + sk.sneeuw * 0.4})`;
      const aantal = Math.round(50 + sk.sneeuw * 120);
      for (let i = 0; i < aantal; i++) { const x = (i * 73 + Math.sin(this.t + i) * 20 + this.t * 20) % w, y = (i * 41 + this.t * 120) % h; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
    }
    if (sk?.mist > 0.05) { g.fillStyle = `rgba(226,228,236,${sk.mist * 0.45})`; g.fillRect(0, 0, w, h); }
    if (n > 0.05) { g.fillStyle = `rgba(10,16,50,${n * 0.45})`; g.fillRect(0, 0, w, h); }
  }
}
void kavels;

const BLADKLEUR = { winter: '#6f7a62', lente: '#8fd06a', zomer: '#3f9c43', herfst: '#c98a3e' };
/** Twee hexkleuren mengen (0 = a, 1 = b). */
function mengHex(a, b, t = 0) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const k = clamp(t, 0, 1), c = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
