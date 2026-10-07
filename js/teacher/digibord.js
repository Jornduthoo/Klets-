// Digibordscherm: de klasstad op groot scherm (met kaartlagen) en de raid tegen de Grijze Mist.
// Tijdens een raid hangt de mist als een storm boven de stad. Toont enkel gezamenlijke cijfers: nooit namen, nooit foute antwoorden.
import { QUESTE1 } from '../../data/queste1.js';
import { createStore } from '../core/store.js';
import { createSync } from '../core/sync.js';
import { h, $, add, uid, clamp, blip } from '../core/util.js';
import { drawText, textWidth } from '../game/sprites.js';
import { maakStad } from '../city/stad.js';
import { stadModel, NIVEAU_NAAM } from '../city/stadmodel.js';
import { WIJK } from '../city/layout.js';

const store = createStore();
const sync = createSync('klas');
const VIEW = { soort: new URLSearchParams(location.search).get('view') === 'stad' ? 'stad' : 'raid', stad: null, laag: null, tijd: 'cyclus' };
const R = { raidId: null, naam: 'De Mist-golem (week 1)', status: 'klaar', hp: 0, maxHp: 0, juist: 0, joined: new Set(), seen: new Set(), autoHp: true, handHp: 60, shake: 0, flash: 0, parts: [], t: 0 };
window.__raid = R;

async function init() {
  await sync.connect();
  sync.subscribe('raid:join', ({ raidId, pid }) => {
    if (raidId !== R.raidId || !pid) return;
    R.joined.add(pid);
    if (R.status === 'lobby' && R.autoHp) { R.maxHp = R.hp = autoHp(); }
    broadcast(); ui();
  });
  sync.subscribe('raid:hit', ({ raidId, hid }) => {
    if (raidId !== R.raidId || R.status !== 'actief' || R.seen.has(hid)) return;
    R.seen.add(hid); R.hp = Math.max(0, R.hp - 1); R.juist++; R.shake = 0.35; R.flash = 0.15;
    zetStorm(true);
    for (let i = 0; i < 10; i++) R.parts.push({ x: 96 + (Math.random() - 0.5) * 30, y: 50 + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, t: 0, life: 0.9 });
    blip('hit');
    if (R.hp <= 0) win(); else broadcast();
    ui();
  });
  sync.subscribe('raid:vraag', () => { if (R.raidId) broadcast(); });
  sync.subscribe('klas:update', () => toonStad());
  store.onChange(() => toonStad());
  if (Number(localStorage.getItem('klets:v1:leerkrachtTot') || 0) > Date.now()) return build();
  pin();
}
function pin() {
  const inp = h('input', { type: 'password', class: 'invoer', id: 'pin', inputmode: 'numeric', placeholder: 'PIN', 'aria-label': 'PIN' });
  const fout = h('p', { class: 'fout' });
  const go = async () => { const s = await store.getSettings(); if (inp.value === s.pin) { localStorage.setItem('klets:v1:leerkrachtTot', String(Date.now() + 4 * 3600 * 1000)); build(); } else fout.textContent = 'Die PIN klopt niet.'; };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('#app').innerHTML = '';
  $('#app').append(h('main', { class: 'login' }, h('h1', { class: 'logo' }, 'Klets!'), h('section', { class: 'kaart-blok' }, h('label', { class: 'lbl', for: 'pin' }, 'PIN van de leerkracht'), inp, fout, h('button', { class: 'btn primair', type: 'button', id: 'pin-ok', onclick: go }, 'Open het digibord'))));
  inp.focus();
}
const autoHp = () => Math.max(20, R.joined.size * 8);
function broadcast() { sync.publish('raid:state', { raidId: R.raidId, naam: R.naam, status: R.status, hp: R.hp, maxHp: R.maxHp, deelnemers: R.joined.size }); }
let iv = null;

function build() {
  const app = $('#app'); app.innerHTML = '';
  const cv = h('canvas', { id: 'boss', width: 192, height: 108, 'aria-label': 'De Grijze Mist' });
  const stadBox = h('div', { class: 'bord-stad', id: 'b-stad', hidden: true });
  app.append(h('div', { class: 'bord' + (VIEW.soort === 'stad' ? ' stadmodus' : '') },
    h('div', { class: 'bord-scene' }, cv, stadBox,
      h('div', { class: 'bord-stadinfo', id: 'b-stadinfo', hidden: true }),
      h('div', { class: 'bord-lagen', id: 'b-lagen', hidden: true }),
      h('div', { class: 'bord-hp', id: 'b-hpbox' }, h('div', { class: 'bord-naam', id: 'b-naam' }), h('div', { class: 'balk hp groot' }, h('span', { id: 'b-hp' })), h('div', { class: 'bord-cijfers', id: 'b-cijfers' }))),
    h('div', { class: 'bord-info', id: 'b-info', 'aria-live': 'polite' }),
    h('div', { class: 'bord-knoppen', id: 'b-knoppen' })));
  ui();
  loop(cv);
  zetView(VIEW.soort);
}

// ---------- de stad op het digibord ----------
async function zetView(soort) {
  VIEW.soort = soort;
  $('.bord')?.classList.toggle('stadmodus', soort === 'stad');
  $('#boss').hidden = soort === 'stad';
  $('#b-stad').hidden = soort !== 'stad';
  $('#b-stadinfo').hidden = soort !== 'stad';
  $('#b-lagen').hidden = soort !== 'stad';
  if (soort === 'stad' && !VIEW.stad) {
    VIEW.stad = await maakStad($('#b-stad'), { digibord: true, onPick: (id) => toonKaartje(id) });
    window.__digibord = VIEW;
    bouwLagen();
  }
  VIEW.stad?.pause(soort !== 'stad');
  await toonStad();
  zetStorm(false);
  ui();
}
async function toonStad() {
  if (!VIEW.stad) return;
  const [settings, pupils, attempts] = await Promise.all([store.getSettings(), store.listPupils(), store.listAttempts()]);
  VIEW.model = stadModel({ pupils, attempts, settings, doelen: QUESTE1.doelen });
  VIEW.stad.update(VIEW.model);
  if (!VIEW.tijdGezet) { VIEW.tijdGezet = true; VIEW.tijd = settings.dagNacht === 'dag' ? 'dag' : settings.dagNacht === 'nacht' ? 'nacht' : 'cyclus'; VIEW.stad.setTijd(VIEW.tijd); bouwLagen(); }
  const m = VIEW.model, info = $('#b-stadinfo');
  info.innerHTML = '';
  add(info, h('b', { class: 'bs-naam' }, settings.klasNaam || 'Klets'),
    h('div', { class: 'bs-cijfers' },
      h('span', {}, h('b', {}, String(m.bevolking)), h('small', {}, 'reizigers')),
      h('span', {}, h('b', {}, String(m.aantalGebouwd)), h('small', {}, 'gebouwen')),
      h('span', {}, h('b', {}, String(m.xp)), h('small', {}, 'klas-XP')),
      h('span', {}, h('b', {}, Math.round(m.mist * 100) + ' %'), h('small', {}, 'mist'))),
    h('div', { class: 'balk klas groot' }, h('span', { style: { width: Math.round(clamp(m.xp / Math.max(1, m.doelXp), 0, 1) * 100) + '%' } })),
    h('div', { class: 'bs-wijken' }, ...m.wijken.map(w => h('span', { class: 'bs-wijk', style: { '--k': kleurVan(w.macht) } }, `${w.naam}: ${w.gebouwd}`))));
}
const KLEUREN = { Taal: '#e9a23b', Getal: '#e2643e', Wereld: '#3fa37a', Hart: '#d9577b', Maker: '#4c8fd6', Brein: '#9a6ad6' };
const kleurVan = (m) => KLEUREN[m] || '#888';
function bouwLagen() {
  const box = $('#b-lagen'); if (!box) return; box.innerHTML = '';
  const lagen = [[null, 'Stad'], ['sterkte', 'Sterk en zwak'], ['wijken', 'Wijken']];
  const tijden = [['cyclus', 'Dag en nacht'], ['dag', 'Dag'], ['avond', 'Avond'], ['nacht', 'Nacht']];
  add(box, h('div', { class: 'bl-groep', role: 'group', 'aria-label': 'Kaartlaag' }, ...lagen.map(([id, t]) => h('button', { type: 'button', class: 'btn klein' + (VIEW.laag === id ? ' primair' : ''), 'data-laag': id || 'geen', onclick: () => { VIEW.laag = id; VIEW.stad.setOverlay(id); bouwLagen(); } }, t))),
    h('div', { class: 'bl-groep', role: 'group', 'aria-label': 'Dag en nacht' }, ...tijden.map(([id, t]) => h('button', { type: 'button', class: 'btn klein' + (VIEW.tijd === id ? ' primair' : ''), onclick: () => { VIEW.tijd = id; VIEW.stad.setTijd(id); bouwLagen(); } }, t))),
    VIEW.laag ? h('p', { class: 'bl-uitleg' }, 'Groen = sterk, geel = goed op weg, oranje = hier oefenen we samen verder. Enkel aantallen, nooit namen.') : null);
}
function toonKaartje(id) {
  const oud = $('#b-kaartje'); if (oud) oud.remove();
  const g = VIEW.model?.gebouwen.find(x => x.id === id);
  if (!g) return;
  const el = h('div', { class: 'bord-kaartje', id: 'b-kaartje', style: { '--k': kleurVan(g.macht) } },
    h('small', {}, `${WIJK[g.macht].naam} - doel ${g.code}`), h('b', {}, g.gebouwd ? `${g.type} (${NIVEAU_NAAM[g.niveau].toLowerCase()})` : 'Bouwplaats'),
    h('p', {}, g.doel), h('p', { class: 'bk-tel' }, g.gebouwd ? `${g.aantal} reiziger${g.aantal === 1 ? '' : 's'} bouwden mee.` : 'Hier wordt nog geoefend.'));
  $('.bord-scene').append(el);
  setTimeout(() => el.remove(), 12000);
}
function zetStorm(flits) {
  if (!VIEW.stad) return;
  const actief = R.status === 'actief' || R.status === 'lobby';
  VIEW.stad.setStorm(actief ? 0.35 + 0.65 * (R.hp / Math.max(1, R.maxHp)) : 0, { flits });
}

function start(kind) {
  if (kind === 'lobby') {
    R.raidId = uid('raid'); R.status = 'lobby'; R.joined = new Set(); R.seen = new Set(); R.juist = 0;
    R.maxHp = R.hp = R.autoHp ? autoHp() : R.handHp;
    clearInterval(iv); iv = setInterval(broadcast, 2000);
  }
  if (kind === 'actief') { R.status = 'actief'; if (!R.autoHp) R.maxHp = R.hp = R.handHp; else { R.maxHp = R.hp = autoHp(); } }
  if (kind === 'gestopt') { R.status = 'gestopt'; setTimeout(() => clearInterval(iv), 6000); }
  broadcast(); ui(); zetStorm(false);
}
async function win() {
  R.status = 'gewonnen'; broadcast(); zetStorm(false);
  for (let i = 0; i < 80; i++) R.parts.push({ x: 96 + (Math.random() - 0.5) * 70, y: 50 + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, t: 0, life: 2 });
  blip('code');
  try { await store.addEvent({ id: uid('e'), type: 'raid', naam: R.naam, juist: R.juist, deelnemers: R.joined.size, ts: Date.now() }); } catch {}
  setTimeout(() => clearInterval(iv), 8000);
  ui();
}

function ui() {
  const k = $('#b-knoppen'); if (!k) return;
  $('#b-hpbox').hidden = VIEW.soort === 'stad' && !(R.status === 'actief' || R.status === 'lobby');
  $('#b-naam').textContent = R.naam;
  $('#b-hp').style.width = (R.maxHp ? Math.round((R.hp / R.maxHp) * 100) : 100) + '%';
  $('#b-cijfers').textContent = R.maxHp ? `${R.hp} / ${R.maxHp} HP` : '';
  const info = {
    klaar: VIEW.soort === 'stad' ? 'De klasstad. Elk gebouw is een doel dat de klas samen haalde. Open hier ook een raid: dan hangt de mist als een storm boven de stad.' : 'Kies de levenspunten en open de raid. Daarna klikken de leerlingen op hun laptop op "Doe mee".',
    lobby: `De raid staat open. Reizigers die meedoen: ${R.joined.size}. Klik op Start als iedereen klaar is.`,
    actief: `Samen al ${R.juist} juiste antwoorden! Reizigers: ${R.joined.size}.`,
    gewonnen: `De mist trekt op! ${R.juist} juiste antwoorden van de hele klas. Iedereen krijgt bonus-XP.`,
    gestopt: `De raid is gestopt na ${R.juist} juiste antwoorden.`,
  }[R.status];
  $('#b-info').textContent = info;
  k.innerHTML = '';
  if (R.status === 'klaar' || R.status === 'gewonnen' || R.status === 'gestopt') {
    add(k, 
      h('label', { class: 'schakel' }, h('input', { type: 'radio', name: 'hp', checked: R.autoHp, onchange: () => { R.autoHp = true; } }), ' HP automatisch (8 per reiziger)'),
      h('label', { class: 'schakel' }, h('input', { type: 'radio', name: 'hp', checked: !R.autoHp, onchange: () => { R.autoHp = false; } }), ' HP zelf kiezen: ', h('input', { type: 'number', class: 'invoer kort', min: 5, max: 999, value: R.handHp, onchange: (e) => { R.handHp = clamp(+e.target.value || 60, 5, 999); } })),
      h('button', { class: 'btn primair groot', type: 'button', id: 'b-lobby', onclick: () => start('lobby') }, R.status === 'klaar' ? 'Open de raid' : 'Nieuwe raid'));
  } else if (R.status === 'lobby') {
    add(k, h('button', { class: 'btn primair groot', type: 'button', id: 'b-start', onclick: () => start('actief') }, 'Start'), h('button', { class: 'btn', type: 'button', onclick: () => start('gestopt') }, 'Annuleer'));
  } else if (R.status === 'actief') {
    add(k, h('button', { class: 'btn', type: 'button', id: 'b-stop', onclick: () => start('gestopt') }, 'Stop de raid'));
  }
  add(k, VIEW.soort === 'stad' ? h('button', { class: 'btn', type: 'button', id: 'b-view', onclick: () => zetView('raid') }, 'Toon de Mist-golem')
    : h('button', { class: 'btn', type: 'button', id: 'b-view', onclick: () => zetView('stad') }, 'Toon de stad'));
  add(k, h('a', { class: 'btn zacht', href: 'leerkracht.html' }, 'Dashboard'));
}

// ---------- tekenen ----------
function loop(cv) {
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; R.t += dt;
    R.shake = Math.max(0, R.shake - dt); R.flash = Math.max(0, R.flash - dt);
    for (const p of R.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; }
    R.parts = R.parts.filter(p => p.t < p.life);
    if (VIEW.soort !== 'stad') draw(g);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
function draw(g) {
  const frac = R.maxHp ? R.hp / R.maxHp : 1;
  const won = R.status === 'gewonnen';
  const dawn = won ? 1 : 1 - frac; // lucht wordt lichter naarmate de mist zwakker wordt
  const sky = g.createLinearGradient(0, 0, 0, 108);
  sky.addColorStop(0, mix('#0d1030', '#7fb6e8', dawn)); sky.addColorStop(1, mix('#2a2550', '#f6c98a', dawn));
  g.fillStyle = sky; g.fillRect(0, 0, 192, 108);
  // sterren of zon
  if (dawn < 0.6) { g.fillStyle = `rgba(255,255,255,${0.8 - dawn})`; for (let i = 0; i < 30; i++) g.fillRect((i * 53) % 192, (i * 29) % 50, 1, 1); }
  if (dawn > 0.3) { g.fillStyle = '#ffe08a'; const sy = 90 - dawn * 60; circle(g, 160, sy, 9); }
  // station-silhouet
  g.fillStyle = mix('#151830', '#3b4a7a', dawn);
  g.fillRect(0, 86, 192, 22); g.fillRect(20, 70, 50, 16); g.fillRect(110, 74, 60, 12); g.fillRect(40, 62, 10, 8); g.fillRect(140, 66, 6, 8);
  for (let i = 0; i < 8; i++) { g.fillStyle = '#ffe08a'; g.fillRect(26 + i * 5, 76, 2, 3); }
  g.fillStyle = mix('#222222', '#555555', dawn); g.fillRect(0, 96, 192, 2);
  // golem
  if (!won || R.parts.length) {
    const s = won ? 0 : 0.45 + 0.55 * frac;
    if (s > 0) {
      const ox = R.shake ? Math.round((Math.random() - 0.5) * 6) : 0;
      const cx = 96 + ox, cy = 52 + Math.sin(R.t * 1.5) * 2;
      const puffs = [[0, 0, 26], [-20, 6, 16], [20, 6, 16], [-12, -14, 14], [12, -14, 14], [0, -20, 12], [-30, 16, 10], [30, 16, 10], [0, 18, 18]];
      for (const [dx, dy, r] of puffs) { g.fillStyle = R.flash ? '#ffffff' : '#7d7a8c'; circle(g, cx + dx * s, cy + dy * s, r * s + 1); }
      for (const [dx, dy, r] of puffs) { g.fillStyle = R.flash ? '#ffffff' : '#a9a6b8'; circle(g, cx + dx * s - 1, cy + dy * s - 2, r * s - 2); }
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(220,220,235,0.5)'; circle(g, cx + Math.sin(R.t + i) * 30 * s, cy + 20 * s + Math.cos(R.t * 1.3 + i) * 6, 4 * s); }
      // ogen (knipperen)
      const blink = Math.sin(R.t * 2.2) > 0.97;
      g.fillStyle = '#22192a'; g.fillRect(cx - 10 * s - 2, cy - 4 * s - 2, 6, blink ? 1 : 6); g.fillRect(cx + 10 * s - 3, cy - 4 * s - 2, 6, blink ? 1 : 6);
      if (!blink) { g.fillStyle = '#f2e27a'; g.fillRect(cx - 10 * s - 1, cy - 4 * s - 1, 2, 2); g.fillRect(cx + 10 * s - 2, cy - 4 * s - 1, 2, 2); }
      g.fillStyle = '#5a5668'; g.fillRect(cx - 6 * s, cy + 8 * s, 12 * s, 2);
    }
  }
  for (const p of R.parts) { g.fillStyle = `rgba(255,240,180,${1 - p.t / p.life})`; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
  if (won) { const t = 'DE MIST TREKT OP!'; drawText(g, t, 96 - textWidth(t) / 2, 20, '#22192a'); }
  if (R.status === 'lobby') { const t = 'DOE MEE OP JE LAPTOP'; drawText(g, t, 96 - textWidth(t) / 2, 8, '#f2e27a', 1, '#22192a'); }
}
function circle(g, cx, cy, r) { r = Math.max(1, Math.round(r)); for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); } }
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

init().catch(err => { console.error(err); $('#app').append(h('p', { class: 'fout' }, err.message)); });
