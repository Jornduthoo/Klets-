// De wandelwereld van Station Klets: canvas, top-down, pixelscherp.
// Pijltjes/WASD of klikken om te wandelen. Tegen een gids of gebouw lopen = openen.
import { buildMap, T } from './map.js';
import { TILE, drawText, drawLabel, textWidth, drawSprite, drawPerson, GIDS_SPRITES, paintGrass, paintFlowers, paintPath, paintRail, paintPlatform, paintTreeTop, paintTrunk } from './pixel.js';
import { rng, clamp, lerp } from '../core/util.js';

const K = '#22192a';
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', z: 'up', q: 'left' };
const PRAATJES = ['Goeiemorgen!', 'Waar is de Rekenkiosk?', 'Ik ben ook nieuw.', 'Samen lukt het.', 'Heb jij Tella gezien?', 'De mist wordt dunner!', 'Welkom in Station Klets.', 'Ik zoek de Wachtzaal.', 'Wat een lange nacht.', 'Hallo, reiziger!'];
const NPC_LOOKS = [
  { huid: 1, haar: 'krul', haarKleur: 1, kleren: 1, broek: 1 }, { huid: 4, haar: 'hoofddoek', haarKleur: 0, kleren: 2, broek: 0 },
  { huid: 3, haar: 'kort', haarKleur: 0, kleren: 5, broek: 2 }, { huid: 0, haar: 'staart', haarKleur: 3, kleren: 4, broek: 3 },
  { huid: 5, haar: 'pet', haarKleur: 0, kleren: 7, broek: 1 }, { huid: 2, haar: 'lang', haarKleur: 4, kleren: 0, broek: 0 },
];

export class World {
  constructor(canvas, { onPoi = () => {}, onHint = () => {} } = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.map = buildMap();
    this.onPoi = onPoi; this.onHint = onHint;
    const sp = this.map.spawn;
    this.player = { x: sp.x, y: sp.y, fx: sp.x * TILE, fy: sp.y * TILE, dir: 'down', moving: false, t: 0, from: null, to: null, path: [], look: null, naam: '', frame: 0, goal: null };
    this.keys = new Set(); this.keyOrder = [];
    this.paused = false; this.lastTrigger = 0;
    this.nacht = 0.8; this.mist = 1; this.badges = {}; this.npcs = []; this.time = 0;
    this.particles = []; this.mistPuffs = []; this.clickFx = null; this.hint = null;
    this.r = rng('wereld');
    this._prerender();
    this._initMist();
    this._bind();
    this.setNpcs([]);
    this._resize();
    this.ro = new ResizeObserver(() => this._resize()); this.ro.observe(canvas.parentElement || canvas);
  }

  // ---------- publieke API ----------
  setPlayer(look, naam) { this.player.look = look; this.player.naam = naam || ''; }
  setAtmosphere({ nacht, mist }) { if (nacht != null) this.nacht = clamp(nacht, 0, 1); if (mist != null) { this.mist = clamp(mist, 0, 1); this._initMist(); } }
  setBadges(b) { this.badges = b || {}; }
  setNpcs(list) {
    const rr = rng('npcs');
    const walk = this._walkableTiles();
    const people = list.length ? list.slice(0, 8) : [];
    while (people.length < 6) people.push({ naam: '', look: NPC_LOOKS[people.length % NPC_LOOKS.length] });
    this.npcs = people.map((p, i) => {
      const [x, y] = walk[Math.floor(rr() * walk.length)];
      return { x, y, fx: x * TILE, fy: y * TILE, dir: 'down', moving: false, t: 0, path: [], look: p.look, naam: p.naam, wait: 1 + rr() * 4, bubble: null, frame: 0, id: i };
    });
  }
  pause(on = true) { this.paused = on; this.keys.clear(); this.keyOrder = []; if (!on) this.lastTrigger = performance.now(); }
  start() { if (this.raf) return; let last = performance.now(); const loop = (now) => { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; this._update(dt); this._draw(); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { cancelAnimationFrame(this.raf); this.raf = null; }
  /** Wandel automatisch naar een gids/gebouw en open het daar. */
  goTo(poiId) {
    const poi = this.map.pois.find(p => p.id === poiId); if (!poi) return false;
    const path = this._pathToPoi(poi);
    if (path) { this.player.path = path; this.player.goal = poi; return true; }
    this._trigger(poi); return false;
  }

  // ---------- invoer ----------
  _bind() {
    this._kd = (e) => {
      if (this.paused) return;
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(tag) && e.key !== 'Escape') return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (KEYMAP[k]) { e.preventDefault(); if (!this.keys.has(k)) this.keyOrder.push(k); this.keys.add(k); this.player.path = []; this.player.goal = null; }
      if (k === ' ' || k === 'Enter' || k === 'e') { e.preventDefault(); this._interact(); }
    };
    this._ku = (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; this.keys.delete(k); this.keyOrder = this.keyOrder.filter(x => x !== k); };
    window.addEventListener('keydown', this._kd); window.addEventListener('keyup', this._ku);
    window.addEventListener('blur', () => { this.keys.clear(); this.keyOrder = []; });
    this.cv.addEventListener('pointerdown', (e) => {
      if (this.paused) return;
      const rect = this.cv.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (this.cv.width / rect.width), sy = (e.clientY - rect.top) * (this.cv.height / rect.height);
      const wx = sx / this.S + this.cam.x, wy = sy / this.S + this.cam.y;
      this.clickAt(Math.floor(wx / TILE), Math.floor(wy / TILE));
    });
    this.cv.addEventListener('pointermove', (e) => {
      const rect = this.cv.getBoundingClientRect();
      const wx = (e.clientX - rect.left) * (this.cv.width / rect.width) / this.S + this.cam.x;
      const wy = (e.clientY - rect.top) * (this.cv.height / rect.height) / this.S + this.cam.y;
      const poi = this.map.poiAt.get(this.map.at(clamp(Math.floor(wx / TILE), 0, this.map.W - 1), clamp(Math.floor(wy / TILE), 0, this.map.H - 1)));
      this.cv.style.cursor = poi ? 'pointer' : 'default';
    });
  }
  clickAt(tx, ty) {
    const M = this.map; if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) return;
    const poi = M.poiAt.get(M.at(tx, ty));
    this.clickFx = { x: tx, y: ty, t: 0 };
    if (poi) { const path = this._pathToPoi(poi); if (path) { this.player.path = path; this.player.goal = poi; } return; }
    if (M.solid[M.at(tx, ty)]) return;
    const path = this._bfs(this.player.x, this.player.y, (x, y) => x === tx && y === ty);
    if (path) { this.player.path = path; this.player.goal = null; }
  }
  _interact() {
    const p = this.player, M = this.map;
    const [dx, dy] = DIRS[p.dir];
    let poi = M.poiAt.get(M.at(p.x + dx, p.y + dy));
    if (!poi) for (const [ddx, ddy] of Object.values(DIRS)) { poi = M.poiAt.get(M.at(p.x + ddx, p.y + ddy)); if (poi) break; }
    if (poi) this._trigger(poi, true);
  }
  _trigger(poi, force = false) {
    const now = performance.now();
    if (!force && now - this.lastTrigger < 700) return;
    this.lastTrigger = now;
    this.keys.clear(); this.keyOrder = [];
    this.onPoi(poi.id, poi);
  }

  // ---------- pad zoeken ----------
  _walk(x, y) { const M = this.map; return x >= 0 && y >= 0 && x < M.W && y < M.H && !M.solid[M.at(x, y)]; }
  _walkableTiles() { const out = []; for (let y = 0; y < this.map.H; y++) for (let x = 0; x < this.map.W; x++) if (this._walk(x, y) && this.map.tiles[this.map.at(x, y)] !== T.SPOOR) out.push([x, y]); return out; }
  _bfs(sx, sy, isGoal, maxLen = 4000) {
    const M = this.map, prev = new Int32Array(M.W * M.H).fill(-1), start = M.at(sx, sy);
    const q = [start]; prev[start] = start; let n = 0;
    while (q.length && n++ < maxLen) {
      const cur = q.shift(); const cx = cur % M.W, cy = (cur / M.W) | 0;
      if (isGoal(cx, cy) && cur !== start) {
        const path = []; let c = cur; while (c !== start) { path.unshift([c % M.W, (c / M.W) | 0]); c = prev[c]; } return path;
      }
      if (isGoal(cx, cy) && cur === start) return [];
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = cx + dx, ny = cy + dy; if (!this._walk(nx, ny)) continue;
        const ni = M.at(nx, ny); if (prev[ni] !== -1) continue; prev[ni] = cur; q.push(ni);
      }
    }
    return null;
  }
  _pathToPoi(poi) {
    const foot = new Set(poi.foot.map(([x, y]) => this.map.at(x, y)));
    const M = this.map;
    return this._bfs(this.player.x, this.player.y, (x, y) => Object.values(DIRS).some(([dx, dy]) => foot.has(M.at(x + dx, y + dy)) && x + dx >= 0 && x + dx < M.W));
  }

  // ---------- update ----------
  _update(dt) {
    this.time += dt;
    const p = this.player;
    if (!this.paused) this._updateMover(p, dt, true);
    for (const n of this.npcs) this._updateNpc(n, dt);
    this._updateParticles(dt);
    if (this.clickFx) { this.clickFx.t += dt; if (this.clickFx.t > 0.5) this.clickFx = null; }
    // hint
    const [dx, dy] = DIRS[p.dir];
    const poi = this.map.poiAt.get(this.map.at(p.x + dx, p.y + dy));
    const hint = poi && !p.moving ? poi.id : null;
    if (hint !== this.hint) { this.hint = hint; this.onHint(hint ? this.map.pois.find(q => q.id === hint) : null); }
  }
  _updateMover(m, dt, isPlayer) {
    const speed = isPlayer ? 5.5 : 2.2; // tegels per seconde
    if (m.moving) {
      m.t += dt * speed;
      if (m.t >= 1) { m.x = m.to[0]; m.y = m.to[1]; m.moving = false; m.t = 0; }
      m.fx = lerp(m.from[0], m.to[0], Math.min(1, m.t)) * TILE; m.fy = lerp(m.from[1], m.to[1], Math.min(1, m.t)) * TILE;
      m.frame = Math.floor(this.time * 8) % 4;
      if (isPlayer && m.look?.uitrusting?.spoor && Math.random() < dt * 14) this._trail(m);
      if (m.moving) return;
    }
    m.fx = m.x * TILE; m.fy = m.y * TILE; m.frame = 0;
    let dir = null, target = null;
    if (isPlayer && this.keyOrder.length) {
      dir = KEYMAP[this.keyOrder[this.keyOrder.length - 1]];
      target = [m.x + DIRS[dir][0], m.y + DIRS[dir][1]];
    } else if (m.path.length) {
      target = m.path.shift();
      const ddx = target[0] - m.x, ddy = target[1] - m.y;
      dir = ddx > 0 ? 'right' : ddx < 0 ? 'left' : ddy > 0 ? 'down' : 'up';
    } else if (isPlayer && m.goal) {
      const goal = m.goal; m.goal = null;
      const M = this.map;
      for (const [d, [ddx, ddy]] of Object.entries(DIRS)) if (goal.foot.some(([x, y]) => x === m.x + ddx && y === m.y + ddy)) { m.dir = d; break; }
      this._trigger(goal, true);
      return;
    }
    if (!dir) return;
    m.dir = dir;
    if (this._walk(target[0], target[1])) { m.moving = true; m.from = [m.x, m.y]; m.to = target; m.t = 0; }
    else if (isPlayer) {
      const poi = this.map.poiAt.get(this.map.at(target[0], target[1]));
      if (poi) this._trigger(poi);
      m.path = [];
    } else m.path = [];
  }
  _updateNpc(n, dt) {
    if (!n.moving && !n.path.length) {
      n.wait -= dt;
      if (n.wait <= 0) {
        n.wait = 2 + this.r() * 5;
        const tx = clamp(n.x + Math.round((this.r() - 0.5) * 14), 1, this.map.W - 2), ty = clamp(n.y + Math.round((this.r() - 0.5) * 10), 5, this.map.H - 2);
        if (this._walk(tx, ty) && this.map.tiles[this.map.at(tx, ty)] !== T.SPOOR) {
          const path = this._bfs(n.x, n.y, (x, y) => x === tx && y === ty, 900);
          if (path && path.length < 24) n.path = path;
        }
        if (this.r() < 0.35 && !n.bubble) n.bubble = { text: PRAATJES[Math.floor(this.r() * PRAATJES.length)], t: 3.2 };
      }
    }
    if (n.bubble) { n.bubble.t -= dt; if (n.bubble.t <= 0) n.bubble = null; }
    this._updateMover(n, dt, false);
  }
  _trail(m) {
    const kind = m.look.uitrusting.spoor;
    this.particles.push({ kind, x: m.fx + 8 + (Math.random() - 0.5) * 6, y: m.fy + 13, vx: (Math.random() - 0.5) * 6, vy: -8 - Math.random() * 6, life: 0.9, t: 0, ch: 'KLETS'[Math.floor(Math.random() * 5)] });
  }
  _updateParticles(dt) {
    // stoom van de trein, vonken van het vuur, vuurvliegjes
    if (Math.random() < dt * 3) this.particles.push({ kind: 'stoom', x: (this.map.trein.x + this.map.trein.w - 2) * TILE + 6, y: 3 * TILE - 4, vx: -6 - Math.random() * 6, vy: -10, life: 2.4, t: 0, r: 2 });
    if (Math.random() < dt * 6) this.particles.push({ kind: 'vonk', x: 12 * TILE + 6 + Math.random() * 4, y: 24 * TILE + 4, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, life: 1.1, t: 0 });
    if (this.nacht > 0.4 && Math.random() < dt * 2) { const tr = this.map.trees[Math.floor(Math.random() * this.map.trees.length)]; this.particles.push({ kind: 'vlieg', x: tr.x * TILE + 8, y: tr.y * TILE, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 3, t: 0 }); }
    for (const p of this.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'stoom') p.r += dt * 3; }
    this.particles = this.particles.filter(p => p.t < p.life);
    for (const m of this.mistPuffs) {
      m.x += (m.vx + Math.sin(this.time * 0.3 + m.ph) * 3) * dt; m.y += Math.cos(this.time * 0.2 + m.ph) * 1.5 * dt;
      if (m.x > this.map.W * TILE + 40) m.x = -40;
    }
  }
  _initMist() {
    const n = Math.round(14 + 150 * this.mist);
    if (this.mistPuffs.length === n) return;
    const r = rng('mist');
    this.mistPuffs = Array.from({ length: n }, () => ({ x: r() * this.map.W * TILE, y: r() * this.map.H * TILE, s: 0.8 + r() * 1.8, vx: 3 + r() * 6, ph: r() * 6.28, a: 0.5 + r() * 0.5 }));
  }

  // ---------- tekenen ----------
  _resize() {
    const box = this.cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.floor(box.width)), h = Math.max(240, Math.floor(box.height));
    this.cv.width = Math.floor(w * dpr); this.cv.height = Math.floor(h * dpr);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    const target = w < 700 ? 13 : 22; // tegels in beeld (breedte)
    this.S = Math.max(2, Math.round((w * dpr) / (TILE * target)));
    this.ctx.imageSmoothingEnabled = false;
    this.light = this.light || document.createElement('canvas');
  }
  _prerender() {
    const M = this.map;
    this.ground = [0, 1].map(frame => {
      const c = document.createElement('canvas'); c.width = M.W * TILE; c.height = M.H * TILE;
      const g = c.getContext('2d');
      for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) {
        const r = rng((x * 73856093) ^ (y * 19349663)); const t = M.tiles[M.at(x, y)]; const px = x * TILE, py = y * TILE;
        if (t === T.GRAS) paintGrass(g, px, py, r);
        else if (t === T.BLOEM) paintFlowers(g, px, py, r, frame);
        else if (t === T.PAD) paintPath(g, px, py, r);
        else if (t === T.PLEIN) { paintPath(g, px, py, r); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(px, py, 16, 16); }
        else if (t === T.SPOOR) paintRail(g, px, py);
        else if (t === T.PERRON) paintPlatform(g, px, py, r);
        else if (t === T.RAND) paintPlatform(g, px, py, r, true);
      }
      for (const b of M.buildings) this._building(g, b);
      this._gates(g);
      return c;
    });
    // boomsprites
    const tc = document.createElement('canvas'); tc.width = 16; tc.height = 32;
    const tg = tc.getContext('2d'); paintTreeTop(tg, 0, 0, rng(1)); paintTrunk(tg, 0, 16);
    this.treeImg = tc;
    // mistwolkje
    const mc = document.createElement('canvas'); mc.width = mc.height = 32;
    const mg = mc.getContext('2d'); const grd = mg.createRadialGradient(16, 16, 2, 16, 16, 16);
    grd.addColorStop(0, 'rgba(214,214,232,0.55)'); grd.addColorStop(1, 'rgba(214,214,232,0)');
    mg.fillStyle = grd; mg.fillRect(0, 0, 32, 32); this.puff = mc;
  }
  _building(g, b) {
    const px = b.x * TILE, py = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
    const roofH = Math.round(h * (b.toren ? 0.32 : 0.48));
    // schaduw
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(px + 3, py + h - 2, w, 4);
    // muur
    g.fillStyle = K; g.fillRect(px, py + roofH - 1, w, h - roofH + 1);
    g.fillStyle = b.muur; g.fillRect(px + 1, py + roofH, w - 2, h - roofH - 1);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let yy = py + roofH + 3; yy < py + h - 2; yy += 4) for (let xx = px + 2 + ((yy / 4) % 2) * 3; xx < px + w - 3; xx += 6) g.fillRect(xx, yy, 4, 1);
    // dak
    for (let i = 0; i < roofH; i++) {
      const inset = Math.max(0, Math.round((roofH - i) * 0.12));
      g.fillStyle = K; g.fillRect(px - 2 + inset, py + i, w + 4 - inset * 2, 1);
      g.fillStyle = i % 4 === 3 ? shadeHex(b.dak, 0.78) : b.dak; g.fillRect(px - 1 + inset, py + i, w + 2 - inset * 2, 1);
    }
    g.fillStyle = shadeHex(b.dak, 1.25); g.fillRect(px + 2, py + 1, w - 4, 1);
    // ramen
    const wy = py + roofH + 4;
    const wallH = h - roofH;
    const doorX = (b.deur.x - b.x) * TILE, doorW = b.deur.w * TILE;
    b.ramen = [];
    for (let xx = px + 5; xx < px + w - 10; xx += 14) {
      if (xx + 8 > px + doorX - 2 && xx < px + doorX + doorW + 2 && b.deur.kant === 'onder') continue;
      if (wallH < 22) break;
      g.fillStyle = K; g.fillRect(xx - 1, wy - 1, 10, 9);
      g.fillStyle = '#9fd3f0'; g.fillRect(xx, wy, 8, 7);
      g.fillStyle = '#d8f0fb'; g.fillRect(xx + 1, wy + 1, 2, 2);
      g.fillStyle = K; g.fillRect(xx + 4, wy, 1, 7);
      b.ramen.push([xx + 4, wy + 3]);
    }
    // deur
    if (b.deur.kant === 'onder') {
      const dw = Math.min(doorW - 4, 22), dx = px + doorX + (doorW - dw) / 2, dh = Math.min(14, wallH - 4);
      g.fillStyle = K; g.fillRect(dx - 1, py + h - dh - 1, dw + 2, dh + 1);
      g.fillStyle = '#7a5230'; g.fillRect(dx, py + h - dh, dw, dh);
      g.fillStyle = '#f2c230'; g.fillRect(dx + dw - 3, py + h - dh / 2, 1, 1);
      b.ramen.push([dx + dw / 2, py + h - dh]);
    } else {
      // luifel aan de bovenkant (ingang langs de straatkant)
      const dx = px + doorX + 1, dw = doorW - 2;
      for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#f4efe2' : shadeHex(b.dak, 0.9); g.fillRect(dx + (i * dw) / 5, py - 2, dw / 5, 5); }
      g.fillStyle = K; g.fillRect(dx, py + 3, dw, 1);
    }
    // klok op de stationshal
    if (b.klok) {
      const cx = px + w / 2, cy = py + roofH / 2 + 1;
      for (let dy = -6; dy <= 6; dy++) { const ww = Math.round(Math.sqrt(36 - dy * dy)); g.fillStyle = K; g.fillRect(cx - ww - 1, cy + dy, ww * 2 + 2, 1); }
      for (let dy = -5; dy <= 5; dy++) { const ww = Math.round(Math.sqrt(25 - dy * dy)); g.fillStyle = '#f4efe2'; g.fillRect(cx - ww, cy + dy, ww * 2, 1); }
      b.klokPos = [cx, cy];
    }
    if (b.toren) { g.fillStyle = K; g.fillRect(px + w / 2 - 3, py - 6, 6, 7); g.fillStyle = '#e04a3a'; g.fillRect(px + w / 2 - 2, py - 5, 4, 3); b.sein = [px + w / 2, py - 3]; }
    // naambord
    const label = b.naam, tw = textWidth(label);
    const sy = b.deur.kant === 'onder' ? py + roofH - 4 : py + roofH + 2;
    const sx = Math.round(px + w / 2 - tw / 2 - 2);
    if (!b.klok) { g.fillStyle = K; g.fillRect(sx - 1, sy - 1, tw + 6, 10); g.fillStyle = '#3b2a1e'; g.fillRect(sx, sy, tw + 4, 8); drawText(g, label, sx + 2, sy + 2, '#f6e7c8'); }
    else { g.fillStyle = K; g.fillRect(sx - 1, py + h - 26, tw + 6, 10); g.fillStyle = '#24305e'; g.fillRect(sx, py + h - 25, tw + 4, 8); drawText(g, label, sx + 2, py + h - 23, '#f2e27a'); }
  }
  _gates(g) {
    // De Poort (oost): open boog met licht
    const P = this.map.poort, px = P.x * TILE, py = P.y * TILE;
    g.fillStyle = K; g.fillRect(px - 1, py - 1, 34, 82);
    g.fillStyle = '#8e8a99'; g.fillRect(px, py, 32, 80);
    g.fillStyle = '#a9a6b6'; for (let y = py + 2; y < py + 78; y += 6) g.fillRect(px + ((y / 6) % 2) * 4 + 1, y, 12, 1);
    const grd = g.createLinearGradient(px, 0, px + 32, 0); grd.addColorStop(0, '#fff3c4'); grd.addColorStop(1, '#ffd36b');
    g.fillStyle = K; g.fillRect(px + 2, py + 25, 30, 38); g.fillStyle = grd; g.fillRect(px + 3, py + 26, 29, 36);
    drawText(g, 'DE', px + 11, py + 6, '#22192a'); drawText(g, 'POORT', px + 4, py + 13, '#22192a');
    // Klasstad-poort (zuid)
    const S = this.map.stadpoort, sx = S.x * TILE, sy = S.y * TILE;
    g.fillStyle = K; g.fillRect(sx - 1, sy - 1, 66, 34);
    g.fillStyle = '#b07a3a'; g.fillRect(sx, sy, 16, 32); g.fillRect(sx + 48, sy, 16, 32); g.fillRect(sx, sy, 64, 9);
    g.fillStyle = '#5a9e4b'; g.fillRect(sx + 16, sy + 9, 32, 23);
    for (let i = 0; i < 4; i++) { g.fillStyle = ['#e2643e', '#4c8fd6', '#e9a23b', '#3fa37a'][i]; g.fillRect(sx + 18 + i * 7, sy + 18 - (i % 2) * 3, 6, 10 + (i % 2) * 3); g.fillStyle = K; g.fillRect(sx + 18 + i * 7, sy + 18 - (i % 2) * 3, 6, 1); }
    drawText(g, 'KLASSTAD', sx + 16, sy + 2, '#fff4d6');
  }

  _draw() {
    const ctx = this.ctx, S = this.S, M = this.map, p = this.player;
    const vw = this.cv.width / S, vh = this.cv.height / S;
    const maxX = M.W * TILE - vw, maxY = M.H * TILE - vh;
    this.cam = { x: Math.round(maxX < 0 ? maxX / 2 : clamp(p.fx + 8 - vw / 2, 0, maxX)), y: Math.round(maxY < 0 ? maxY / 2 : clamp(p.fy + 8 - vh / 2, 0, maxY)) };
    const cam = this.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b2a1e'; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(S, 0, 0, S, -cam.x * S, -cam.y * S);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.ground[Math.abs(Math.floor(this.time * 1.6)) % 2], 0, 0);

    this._drawTrain(ctx);
    // klok-wijzers
    const hal = M.buildings[0];
    if (hal.klokPos) { const d = new Date(); this._hand(ctx, hal.klokPos, (d.getHours() % 12 + d.getMinutes() / 60) / 12, 3); this._hand(ctx, hal.klokPos, d.getMinutes() / 60, 5); }

    // klik-aanduiding
    if (this.clickFx) { const c = this.clickFx, a = 1 - c.t / 0.5; ctx.fillStyle = `rgba(255,255,255,${a})`; const s = 2 + c.t * 10; ctx.fillRect(c.x * TILE + 8 - s, c.y * TILE + 8, s * 2, 1); ctx.fillRect(c.x * TILE + 8, c.y * TILE + 8 - s, 1, s * 2); }

    // objecten, bomen, gidsen, mensen: gesorteerd op y
    const ents = [];
    for (const t of M.trees) ents.push({ y: t.y * TILE + 15, draw: () => ctx.drawImage(this.treeImg, t.x * TILE, (t.y - 1) * TILE) });
    for (const o of M.objects) ents.push({ y: o.y * TILE + 14, draw: () => this._object(ctx, o) });
    for (const n of this.npcs) ents.push({ y: n.fy + 15, draw: () => { this._shadow(ctx, n.fx, n.fy); drawPerson(ctx, n.fx, n.fy, n.look, n.dir, n.frame); } });
    if (p.look) ents.push({ y: p.fy + 15.5, draw: () => { this._shadow(ctx, p.fx, p.fy); drawPerson(ctx, p.fx, p.fy, p.look, p.dir, p.frame); } });
    ents.sort((a, b) => a.y - b.y);
    const vy0 = cam.y - 48, vy1 = cam.y + vh + 48;
    for (const e of ents) if (e.y > vy0 && e.y < vy1) e.draw();

    // deeltjes
    for (const q of this.particles) this._particle(ctx, q);
    // mist
    const mistA = 0.25 + 0.75 * this.mist;
    for (const m of this.mistPuffs) {
      if (m.x < cam.x - 64 || m.x > cam.x + vw + 64 || m.y < cam.y - 64 || m.y > cam.y + vh + 64) continue;
      ctx.globalAlpha = m.a * mistA * 0.9; ctx.drawImage(this.puff, m.x - 16 * m.s, m.y - 16 * m.s, 32 * m.s, 32 * m.s);
    }
    ctx.globalAlpha = 1;
    // gidsen boven de mist: wat bereikbaar is, blijft altijd zichtbaar
    for (const g of M.gidsen) this._guide(ctx, g);
    this._lighting(ctx, cam, vw, vh);

    // labels bovenop (na het licht, zodat ze leesbaar blijven)
    for (const g of M.gidsen) {
      const bob = Math.floor(this.time * 2 + g.x) % 2;
      drawLabel(ctx, g.id.toUpperCase(), g.x * TILE + 8, g.y * TILE - 12 - bob, { fg: '#fff4d6' });
      const n = this.badges[g.id];
      if (n) { const bx = g.x * TILE + 12, by = g.y * TILE - 22 - bob; ctx.fillStyle = K; ctx.fillRect(bx - 1, by - 1, 9, 9); ctx.fillStyle = '#e2643e'; ctx.fillRect(bx, by, 7, 7); drawText(ctx, String(Math.min(9, n)), bx + 2, by + 1, '#fff'); }
    }
    for (const n of this.npcs) {
      if (n.naam) drawLabel(ctx, n.naam.slice(0, 10), n.fx + 8, n.fy - 10, { fg: '#e8e8f8', bg: 'rgba(20,18,40,0.55)' });
      if (n.bubble) this._bubble(ctx, n.bubble.text, n.fx + 8, n.fy - (n.naam ? 22 : 12));
    }
    if (p.look && p.naam) drawLabel(ctx, p.naam.slice(0, 12), p.fx + 8, p.fy - 11, { fg: '#f2e27a' });
    if (this.hint && !this.paused) {
      const poi = M.pois.find(q => q.id === this.hint);
      const name = poi.id.startsWith('gids:') ? poi.label.toUpperCase() : poi.label;
      this._bubble(ctx, 'SPATIE: ' + name, p.fx + 8, p.fy - 24);
    }
  }
  _hand(ctx, [cx, cy], frac, len) {
    const a = frac * Math.PI * 2 - Math.PI / 2; ctx.fillStyle = K;
    for (let i = 0; i <= len; i++) ctx.fillRect(Math.round(cx + Math.cos(a) * i) - 0.5, Math.round(cy + Math.sin(a) * i), 1, 1);
  }
  _shadow(ctx, x, y) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 4, y + 14, 8, 2); ctx.fillRect(x + 3, y + 15, 10, 1); }
  _bubble(ctx, text, cx, y) {
    const w = textWidth(text) + 6, x = Math.round(cx - w / 2);
    ctx.fillStyle = K; ctx.fillRect(x - 1, y - 1, w + 2, 11); ctx.fillStyle = '#fffaf0'; ctx.fillRect(x, y, w, 9);
    ctx.fillStyle = K; ctx.fillRect(Math.round(cx) - 1, y + 10, 3, 1); ctx.fillRect(Math.round(cx), y + 11, 1, 1);
    drawText(ctx, text, x + 3, y + 2, K);
  }
  _guide(ctx, g) {
    const bob = Math.floor(this.time * 2 + g.x) % 2;
    this._shadow(ctx, g.x * TILE, g.y * TILE);
    drawSprite(ctx, GIDS_SPRITES[g.id], g.x * TILE, g.y * TILE - bob - 1, { flip: this.player.fx < g.x * TILE && g.id !== 'atlas' });
  }
  _object(ctx, o) {
    const x = o.x * TILE, y = o.y * TILE;
    if (o.type === 'lantaarn') {
      ctx.fillStyle = K; ctx.fillRect(x + 7, y - 6, 3, 21); ctx.fillRect(x + 4, y - 11, 9, 7);
      ctx.fillStyle = '#4a4a58'; ctx.fillRect(x + 8, y - 5, 1, 19);
      const on = this.nacht > 0.25; ctx.fillStyle = on ? (Math.sin(this.time * 9 + o.x) > -0.8 ? '#ffe08a' : '#ffd060') : '#cfd8dc'; ctx.fillRect(x + 5, y - 10, 7, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 5, y + 14, 7, 2);
    } else if (o.type === 'vuur') {
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(x + 2, y + 11, 12, 3); ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 3, y + 10, 10, 2);
      const f = Math.floor(this.time * 10) % 3;
      ctx.fillStyle = '#e2643e'; ctx.fillRect(x + 4, y + 4 + f, 8, 7 - f);
      ctx.fillStyle = '#f2a530'; ctx.fillRect(x + 5 + (f % 2), y + 6, 5, 5);
      ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 7, y + 8 - f, 2, 3 + f);
    } else if (o.type === 'boomstam') {
      ctx.fillStyle = K; ctx.fillRect(x + 1, y + 6, 14, 8); ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 2, y + 7, 12, 6); ctx.fillStyle = '#c9a26b'; ctx.fillRect(x + 12, y + 8, 2, 4);
    } else if (o.type === 'bank') {
      ctx.fillStyle = K; ctx.fillRect(x + 1, y + 5, 14, 7); ctx.fillStyle = '#9a6b43'; ctx.fillRect(x + 2, y + 6, 12, 2); ctx.fillRect(x + 2, y + 9, 12, 2); ctx.fillStyle = K; ctx.fillRect(x + 2, y + 12, 2, 3); ctx.fillRect(x + 12, y + 12, 2, 3);
    } else if (o.type === 'bloembak') {
      ctx.fillStyle = K; ctx.fillRect(x + 1, y + 7, 14, 8); ctx.fillStyle = '#9a6b43'; ctx.fillRect(x + 2, y + 9, 12, 5);
      const c = ['#f08aa8', '#f2e27a', '#b9a0ff', '#ffffff']; for (let i = 0; i < 4; i++) { ctx.fillStyle = '#3d7a34'; ctx.fillRect(x + 3 + i * 3, y + 5, 1, 4); ctx.fillStyle = c[i]; ctx.fillRect(x + 2 + i * 3 + (Math.floor(this.time + i) % 2), y + 3, 3, 3); }
    } else if (o.type === 'klok') {
      ctx.fillStyle = K; ctx.fillRect(x + 7, y - 4, 2, 19); ctx.fillRect(x + 2, y - 15, 12, 12);
      ctx.fillStyle = '#f4efe2'; ctx.fillRect(x + 3, y - 14, 10, 10);
      const d = new Date(); this._hand(ctx, [x + 8, y - 9], (d.getHours() % 12) / 12, 3); this._hand(ctx, [x + 8, y - 9], d.getMinutes() / 60, 4);
    }
  }
  _drawTrain(ctx) {
    const T0 = this.map.trein, x0 = T0.x * TILE, y0 = T0.y * TILE + 4;
    const wagons = 4, ww = 64;
    this.trainLights = [];
    for (let i = 0; i < wagons; i++) {
      const x = x0 + i * (ww + 4);
      ctx.fillStyle = K; ctx.fillRect(x - 1, y0 - 1, ww + 2, 24);
      ctx.fillStyle = '#24305e'; ctx.fillRect(x, y0, ww, 22);
      ctx.fillStyle = '#e9c547'; ctx.fillRect(x, y0 + 15, ww, 2);
      ctx.fillStyle = '#1a2246'; ctx.fillRect(x, y0, ww, 2);
      for (let wi = 0; wi < 5; wi++) { const wx = x + 4 + wi * 12; ctx.fillStyle = this.nacht > 0.25 ? '#ffe08a' : '#9fd3f0'; ctx.fillRect(wx, y0 + 5, 8, 7); this.trainLights.push([wx + 4, y0 + 8]); }
      ctx.fillStyle = K; for (const wx of [x + 8, x + ww - 14]) { ctx.fillRect(wx, y0 + 21, 6, 5); }
      if (i < wagons - 1) { ctx.fillStyle = K; ctx.fillRect(x + ww, y0 + 14, 4, 2); }
    }
    // locomotief
    const lx = x0 + wagons * (ww + 4);
    ctx.fillStyle = K; ctx.fillRect(lx - 1, y0 - 1, 70, 24); ctx.fillStyle = '#2e5a46'; ctx.fillRect(lx, y0, 68, 22);
    ctx.fillStyle = '#1f3f31'; ctx.fillRect(lx, y0, 20, 22); ctx.fillStyle = '#ffe08a'; ctx.fillRect(lx + 5, y0 + 4, 10, 7);
    ctx.fillStyle = K; ctx.fillRect(lx + 52, y0 - 8, 7, 9); ctx.fillStyle = '#e9c547'; ctx.fillRect(lx, y0 + 15, 68, 2);
    ctx.fillStyle = '#fff4c4'; ctx.fillRect(lx + 66, y0 + 8, 3, 4); this.trainLights.push([lx + 10, y0 + 7], [lx + 70, y0 + 10]);
    ctx.fillStyle = K; for (const wx of [lx + 6, lx + 26, lx + 46]) ctx.fillRect(wx, y0 + 21, 8, 5);
    drawText(ctx, 'NACHTTREIN', lx + 22, y0 + 6, '#f2e27a');
    this.map.trein.lx = lx;
  }
  _particle(ctx, q) {
    const a = 1 - q.t / q.life;
    if (q.kind === 'stoom') { ctx.fillStyle = `rgba(230,230,240,${0.5 * a})`; ctx.fillRect(Math.round(q.x - q.r), Math.round(q.y - q.r), Math.round(q.r * 2), Math.round(q.r * 2)); return; }
    if (q.kind === 'vonk') { ctx.fillStyle = `rgba(255,${150 + Math.floor(a * 90)},80,${a})`; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); return; }
    if (q.kind === 'vlieg') { if (Math.sin(q.t * 8) > 0) { ctx.fillStyle = `rgba(240,255,140,${a})`; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); } return; }
    ctx.globalAlpha = a;
    const x = Math.round(q.x), y = Math.round(q.y);
    if (q.kind === 'spoor-sterren') { ctx.fillStyle = '#f2e27a'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    else if (q.kind === 'spoor-blaadjes') { ctx.fillStyle = '#6bc35a'; ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + 1, y + 1, 1, 1); }
    else if (q.kind === 'spoor-noten') { ctx.fillStyle = '#b9a0ff'; ctx.fillRect(x, y, 2, 2); ctx.fillRect(x + 1, y - 3, 1, 3); }
    else if (q.kind === 'spoor-letters') drawText(ctx, q.ch, x, y, '#ffd36b');
    else if (q.kind === 'spoor-licht') { ctx.fillStyle = '#fff4c4'; ctx.fillRect(x, y, 2, 2); }
    ctx.globalAlpha = 1;
  }
  _lighting(ctx, cam, vw, vh) {
    const n = this.nacht; if (n < 0.03) return;
    const L = this.light; const w = Math.ceil(vw), h = Math.ceil(vh);
    if (L.width !== w || L.height !== h) { L.width = w; L.height = h; }
    const g = L.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
    // nacht = diep blauw, schemer = warm paars
    const col = n > 0.5 ? `rgba(10,12,42,${0.78 * n})` : `rgba(${Math.round(lerp(120, 40, n * 2))},${Math.round(lerp(60, 30, n * 2))},${Math.round(lerp(90, 80, n * 2))},${0.7 * n})`;
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, s = 1) => {
      x -= cam.x; y -= cam.y; if (x < -r || y < -r || x > w + r || y > h + r) return;
      const grd = g.createRadialGradient(x, y, 1, x, y, r); grd.addColorStop(0, `rgba(0,0,0,${s})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const M = this.map;
    for (const l of M.lanterns) hole(l.x * TILE + 8, l.y * TILE - 8, 46, 0.95);
    for (const b of M.buildings) for (const [x, y] of b.ramen || []) hole(x, y, 18, 0.7);
    for (const b of M.buildings) if (b.sein) hole(b.sein[0], b.sein[1], 14, 0.8);
    for (const [x, y] of this.trainLights || []) hole(x, y, 16, 0.6);
    hole(12 * TILE + 8, 24 * TILE + 6, 70 + Math.sin(this.time * 7) * 4, 1);
    hole(M.poort.x * TILE + 16, M.poort.y * TILE + 44, 60, 0.9);
    const p = this.player;
    hole(p.fx + 8, p.fy + 8, p.look?.uitrusting?.hand === 'lantaarn' ? 60 : 30, p.look?.uitrusting?.hand === 'lantaarn' ? 1 : 0.5);
    for (const q of this.particles) if (q.kind === 'vonk' || q.kind === 'spoor-licht') hole(q.x, q.y, 6, 0.6);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(L, cam.x, cam.y, w, h); ctx.restore();
    // warme gloed
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, c) => { const grd = ctx.createRadialGradient(x, y, 0, x, y, r); grd.addColorStop(0, c); grd.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = grd; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(12 * TILE + 8, 24 * TILE + 6, 40, `rgba(255,120,40,${0.22 * n})`);
    for (const l of M.lanterns) if (Math.abs(l.x * TILE - cam.x - vw / 2) < vw) glow(l.x * TILE + 8, l.y * TILE - 8, 22, `rgba(255,200,90,${0.12 * n})`);
    ctx.restore();
  }
}

function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.min(255, Math.max(0, Math.round(v * f)));
  return '#' + ((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1);
}
