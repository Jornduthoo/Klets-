// Digibordscherm: de klasstad op groot scherm (met kaartlagen, het echte weer en de waterstand) en de
// eindbaas van het thema. Tijdens de eindbaas hangt er storm boven de stad en spuit elk juist antwoord van
// de klas een straal proper water op het monster. Het bord toont enkel gezamenlijke cijfers: nooit namen,
// nooit foute antwoorden.
import { createStore } from '../core/store.js';
import { createSync } from '../core/sync.js';
import { h, $, add, uid, clamp, blip } from '../core/util.js';
import { maakStad } from '../city/stad.js';
import { stadModel, NIVEAU_NAAM } from '../city/stadmodel.js';
import { WIJK, WIJKEN } from '../city/layout.js';
import { gidsBeeld } from '../figuren/portret.js';
import { GIDSEN, MACHT, METHODE } from '../config.js';
import { themaVoor } from '../../data/themas.js';
import { volgWeer, weerTekst } from '../city/weer.js';
import { waterTekst } from '../city/water.js';
import { leesKnop } from '../core/stem.js';

const store = createStore();
const sync = createSync('klas');
let THEMA = themaVoor();
const VIEW = { soort: new URLSearchParams(location.search).get('view') === 'stad' ? 'stad' : 'raid', stad: null, laag: null, tijd: 'live', weer: null };
const R = { raidId: null, naam: 'De eindbaas', status: 'klaar', hp: 0, maxHp: 0, juist: 0, joined: new Set(), seen: new Set(), autoHp: true, handHp: 60, shake: 0, flash: 0, parts: [], stralen: [], t: 0 };
window.__raid = R;

async function init() {
  const settings = await store.getSettings();
  THEMA = themaVoor(settings);
  R.naam = THEMA.eindbaas?.naam || 'De eindbaas';
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
    // een straal proper water uit de stad naar het monster
    R.stralen.push({ x0: 20 + Math.random() * 152, y0: 96, t: 0, life: 0.8 });
    for (let i = 0; i < 10; i++) R.parts.push({ x: 96 + (Math.random() - 0.5) * 30, y: 50 + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, t: 0, life: 0.9, kleur: '160,220,250' });
    blip('hit');
    if (R.hp <= 0) win(); else broadcast();
    ui();
  });
  sync.subscribe('raid:vraag', () => { if (R.raidId) broadcast(); });
  sync.subscribe('klas:update', () => toonStad());
  store.onChange(() => toonStad());
  volgWeer((w) => { VIEW.weer = w; VIEW.stad?.setWeer(w); ui(); });
  if (Number(localStorage.getItem('klets:v1:leerkrachtTot') || 0) > Date.now()) return build();
  pin();
}
function pin() {
  const inp = h('input', { type: 'password', class: 'invoer', id: 'pin', inputmode: 'numeric', placeholder: 'PIN', 'aria-label': 'PIN' });
  const fout = h('p', { class: 'fout' });
  const go = async () => { const s = await store.getSettings(); if (inp.value === s.pin) { localStorage.setItem('klets:v1:leerkrachtTot', String(Date.now() + 4 * 3600 * 1000)); build(); } else fout.textContent = 'Die PIN klopt niet.'; };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('#app').innerHTML = '';
  $('#app').append(h('main', { class: 'login' }, h('h1', { class: 'logo' }, METHODE), h('section', { class: 'kaart-blok' }, h('label', { class: 'lbl', for: 'pin' }, 'PIN van de leerkracht'), inp, fout, h('button', { class: 'btn primair', type: 'button', id: 'pin-ok', onclick: go }, 'Open het digibord'))));
  inp.focus();
}
const autoHp = () => Math.max(20, R.joined.size * 8);
function broadcast() { sync.publish('raid:state', { raidId: R.raidId, naam: R.naam, status: R.status, hp: R.hp, maxHp: R.maxHp, deelnemers: R.joined.size, thema: THEMA.id }); }
let iv = null;

function build() {
  const app = $('#app'); app.innerHTML = '';
  const cv = h('canvas', { id: 'boss', width: 1152, height: 648, 'aria-label': R.naam });
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
  $('#b-hpbox').hidden = soort === 'stad';   // de HP-balk van de eindbaas hoort niet over de stad
  if (soort === 'stad' && !VIEW.stad) {
    VIEW.stad = await maakStad($('#b-stad'), { digibord: true, onPick: (id) => toonKaartje(id) });
    window.__digibord = VIEW;
    for (const w of WIJKEN) VIEW.stad.zetMarker('gids:' + w.gids, h('div', { class: 'marker hq bord-gids', style: { '--k': kleurVan(w.macht) } },
      h('span', { class: 'marker-rond' }, gidsBeeld(w.gids, { px: 40 })), h('span', { class: 'marker-naam' }, `${GIDSEN[w.gids].naam} - ${w.hq}`)), 'gids:' + w.gids);
    if (VIEW.weer) VIEW.stad.setWeer(VIEW.weer);
    bouwLagen();
  }
  VIEW.stad?.pause(soort !== 'stad');
  await toonStad();
  zetStorm(false);
  ui();
}
async function toonStad() {
  const [settings, pupils, attempts, events] = await Promise.all([store.getSettings(), store.listPupils(), store.listAttempts(), store.listEvents()]);
  THEMA = themaVoor(settings);
  if (R.status === 'klaar') R.naam = THEMA.eindbaas?.naam || R.naam;
  VIEW.model = stadModel({ pupils, attempts, events, settings, thema: THEMA, doelen: THEMA.doelen });
  VIEW.settings = settings;
  if (!VIEW.stad) { ui(); return; }
  VIEW.stad.update(VIEW.model);
  if (!VIEW.tijdGezet) { VIEW.tijdGezet = true; VIEW.tijd = settings.dagNacht === 'dag' ? 'dag' : settings.dagNacht === 'nacht' ? 'nacht' : 'live'; VIEW.stad.setTijd(VIEW.tijd); bouwLagen(); }
  const m = VIEW.model, info = $('#b-stadinfo');
  info.innerHTML = '';
  add(info, h('b', { class: 'bs-naam' }, settings.klasNaam || THEMA.stad),
    h('small', { class: 'bs-thema' }, `Thema ${THEMA.nr}: ${THEMA.naam} - week ${settings.huidigeWeek}`),
    h('div', { class: 'bs-cijfers' },
      h('span', {}, h('b', {}, String(m.bevolking)), h('small', {}, 'reizigers')),
      h('span', {}, h('b', {}, String(m.aantalGebouwd)), h('small', {}, 'gebouwen')),
      h('span', {}, h('b', {}, String(m.xp)), h('small', {}, 'klas-XP')),
      h('span', {}, h('b', {}, Math.round((m.water?.helder || 0) * 100) + ' %'), h('small', {}, 'proper water'))),
    h('div', { class: 'balk klas groot', title: waterTekst(m.water) }, h('span', { style: { width: Math.round((m.water?.helder || 0) * 100) + '%' } })),
    h('div', { class: 'bs-zones' }, ...Object.values(m.water?.zones || {}).map(z => h('span', { class: 'bs-zone' + (z.helder >= 1 ? ' ok' : '') },
      h('b', {}, Math.round(z.helder * 100) + ' %'), h('small', {}, z.naam)))),
    h('div', { class: 'bs-wijken' }, ...m.wijken.map(w => h('span', { class: 'bs-wijk', style: { '--k': kleurVan(w.macht) } }, gidsBeeld(w.gids, { px: 26 }), `${w.naam}: ${w.gebouwd}`))),
    m.verhaal?.actief ? h('div', { class: 'bs-verhaal' }, h('small', {}, m.verhaal.preview ? 'Voorbeeld: ' + (m.verhaal.stapNaam || m.verhaal.stap) : `Wat gebeurt er in ${settings.klasNaam || THEMA.stad}?`),
      h('b', {}, m.verhaal.tekst.titel), h('p', {}, m.verhaal.tekst.zin), m.verhaal.tekst.extra ? h('p', { class: 'bs-extra' }, m.verhaal.tekst.extra) : null,
      h('div', { class: 'bs-lees' }, leesKnop([m.verhaal.tekst.titel, m.verhaal.tekst.zin, m.verhaal.tekst.extra].filter(Boolean), { label: 'Lees voor' }),
        weekVerhaal(settings) ? leesKnop(() => weekVerhaal(settings), { label: 'Lees het weekverhaal voor', titel: 'Het verhaal van de week (Vonk)' }) : null)) : null,
    VIEW.weer ? h('p', { class: 'bs-weer' }, VIEW.weer.bron === 'terugval' ? 'Geen live weer: de weerdienst is niet bereikbaar.' : 'Het echte weer in Brugge: ' + weerTekst(VIEW.weer)) : null);
}
const kleurVan = (m) => MACHT[m]?.kleur || '#888';
/** Het verhaal van de huidige week (voor de Vonk-les op het digibord). */
function weekVerhaal(settings) {
  const w = (THEMA.weken || []).find(x => x.week === settings.huidigeWeek);
  return w?.verhaal ? [`Week ${w.week}: ${w.titel}`, w.verhaal] : null;
}
function bouwLagen() {
  const box = $('#b-lagen'); if (!box) return; box.innerHTML = '';
  const lagen = [[null, 'Stad'], ['sterkte', 'Sterk en zwak'], ['wijken', 'Wijken']];
  const tijden = [['live', 'Echte tijd'], ['dag', 'Dag'], ['avond', 'Avond'], ['nacht', 'Nacht']];
  add(box, h('div', { class: 'bl-groep', role: 'group', 'aria-label': 'Kaartlaag' }, ...lagen.map(([id, t]) => h('button', { type: 'button', class: 'btn klein' + (VIEW.laag === id ? ' primair' : ''), 'data-laag': id || 'geen', onclick: () => { VIEW.laag = id; VIEW.stad.setOverlay(id); bouwLagen(); } }, t))),
    h('div', { class: 'bl-groep', role: 'group', 'aria-label': 'Dag en nacht' }, ...tijden.map(([id, t]) => h('button', { type: 'button', class: 'btn klein' + (VIEW.tijd === id ? ' primair' : ''), onclick: () => { VIEW.tijd = id; VIEW.stad.setTijd(id); bouwLagen(); } }, t))),
    VIEW.laag ? h('p', { class: 'bl-uitleg' }, 'Groen = sterk, geel = goed op weg, oranje = hier oefenen we samen verder. Enkel aantallen, nooit namen.') : null);
}
function toonKaartje(id) {
  const oud = $('#b-kaartje'); if (oud) oud.remove();
  const g = VIEW.model?.gebouwen.find(x => x.id === id);
  const p = (VIEW.model?.themaGebouwen || []).find(x => x.id === id);
  let el = null;
  if (g) el = h('div', { class: 'bord-kaartje', id: 'b-kaartje', style: { '--k': kleurVan(g.macht) } },
    h('div', { class: 'bk-gids' }, gidsBeeld(WIJK[g.macht].gids, { px: 56 })),
    h('small', {}, `${WIJK[g.macht].naam} - doel ${g.code}`), h('b', {}, g.gebouwd ? `${g.type} (${NIVEAU_NAAM[g.niveau].toLowerCase()})` : 'Bouwplaats'),
    h('p', {}, g.doel), h('p', { class: 'bk-tel' }, g.gebouwd ? `${g.aantal} reiziger${g.aantal === 1 ? '' : 's'} bouwden mee.` : 'Hier wordt nog geoefend.'));
  else if (p) el = h('div', { class: 'bord-kaartje', id: 'b-kaartje', style: { '--k': THEMA.kleur } },
    h('div', { class: 'bk-gids' }, gidsBeeld(p.gids, { px: 56 })),
    h('small', {}, `Week ${p.week}`), h('b', {}, p.naam), h('p', {}, p.uitleg),
    h('p', { class: 'bk-tel' }, p.klaar ? 'De klas haalde alle labo\'s van dit gebouw.' : 'Hier wordt nog geoefend.'));
  if (!el) return;
  $('.bord-scene').append(el);
  setTimeout(() => el.remove(), 12000);
}
function zetStorm(flits) {
  if (!VIEW.stad) return;
  const actief = R.status === 'actief' || R.status === 'lobby';
  VIEW.stad.setStorm(actief ? 0.35 + 0.65 * (R.hp / Math.max(1, R.maxHp)) : 0, { flits });
  // De Slijkkraak in de stad: hij rijst op bij de Markt en krimpt bij elke treffer
  VIEW.stad.setRaid?.({ status: R.status, hp: R.hp, maxHp: R.maxHp });
}

function start(kind) {
  if (kind === 'lobby') {
    R.raidId = uid('raid'); R.status = 'lobby'; R.joined = new Set(); R.seen = new Set(); R.juist = 0;
    R.naam = THEMA.eindbaas?.naam || R.naam;
    R.maxHp = R.hp = R.autoHp ? autoHp() : R.handHp;
    clearInterval(iv); iv = setInterval(broadcast, 2000);
  }
  if (kind === 'actief') { R.status = 'actief'; if (!R.autoHp) R.maxHp = R.hp = R.handHp; else { R.maxHp = R.hp = autoHp(); } }
  if (kind === 'gestopt') { R.status = 'gestopt'; setTimeout(() => clearInterval(iv), 6000); }
  broadcast(); ui(); zetStorm(false);
}
async function win() {
  R.status = 'gewonnen'; broadcast(); zetStorm(false);
  for (let i = 0; i < 90; i++) R.parts.push({ x: 96 + (Math.random() - 0.5) * 80, y: 50 + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, t: 0, life: 2.2, kleur: '255,240,180' });
  blip('code');
  // het hele thema is gewonnen: in de stad wordt al het water helder
  try {
    await store.addEvent({ id: uid('e'), soort: 'eindbaas', type: 'raid', thema: THEMA.id, baas: THEMA.eindbaas?.id, gewonnen: true, naam: R.naam, juist: R.juist, deelnemers: R.joined.size, ts: Date.now() });
    sync.publish('klas:update', {});
    await toonStad();
  } catch { /* opslag vol: de raid blijft gewoon gewonnen op het bord */ }
  setTimeout(() => clearInterval(iv), 8000);
  ui();
}

function ui() {
  const k = $('#b-knoppen'); if (!k) return;
  $('#b-hpbox').hidden = VIEW.soort === 'stad' && !(R.status === 'actief' || R.status === 'lobby');
  $('#b-naam').textContent = R.naam;
  $('#b-hp').style.width = (R.maxHp ? Math.round((R.hp / R.maxHp) * 100) : 100) + '%';
  $('#b-cijfers').textContent = R.maxHp ? `${R.hp} / ${R.maxHp} HP` : '';
  const stad = VIEW.settings?.klasNaam || THEMA.stad;
  const info = {
    klaar: VIEW.soort === 'stad' ? `De klasstad ${stad}. Elk gebouw is een doel dat de klas samen haalde. Hier start u ook de eindbaas.` : `Kies de levenspunten en open de eindbaas. Daarna klikken de reizigers op hun laptop op "Doe mee".`,
    lobby: `${R.naam} komt uit het water. Reizigers die meedoen: ${R.joined.size}. Klik op Start als iedereen klaar is.`,
    actief: `Samen al ${R.juist} juiste antwoorden! Elke juiste antwoord spuit proper water. Reizigers: ${R.joined.size}.`,
    gewonnen: THEMA.eindbaas?.eind || `Gewonnen! ${R.juist} juiste antwoorden van de hele klas.`,
    gestopt: `De eindbaas is gestopt na ${R.juist} juiste antwoorden.`,
  }[R.status];
  $('#b-info').textContent = info;
  k.innerHTML = '';
  if (R.status === 'klaar' || R.status === 'gewonnen' || R.status === 'gestopt') {
    add(k,
      h('label', { class: 'schakel' }, h('input', { type: 'radio', name: 'hp', checked: R.autoHp, onchange: () => { R.autoHp = true; } }), ' HP automatisch (8 per reiziger)'),
      h('label', { class: 'schakel' }, h('input', { type: 'radio', name: 'hp', checked: !R.autoHp, onchange: () => { R.autoHp = false; } }), ' HP zelf kiezen: ', h('input', { type: 'number', class: 'invoer kort', min: 5, max: 999, value: R.handHp, onchange: (e) => { R.handHp = clamp(+e.target.value || 60, 5, 999); } })),
      h('button', { class: 'btn primair groot', type: 'button', id: 'b-lobby', onclick: () => start('lobby') }, R.status === 'klaar' ? 'Open de eindbaas' : 'Nieuwe ronde'));
  } else if (R.status === 'lobby') {
    add(k, h('button', { class: 'btn primair groot', type: 'button', id: 'b-start', onclick: () => start('actief') }, 'Start'), h('button', { class: 'btn', type: 'button', onclick: () => start('gestopt') }, 'Annuleer'));
  } else if (R.status === 'actief') {
    add(k, h('button', { class: 'btn', type: 'button', id: 'b-stop', onclick: () => start('gestopt') }, 'Stop de eindbaas'));
  }
  add(k, VIEW.soort === 'stad' ? h('button', { class: 'btn', type: 'button', id: 'b-view', onclick: () => zetView('raid') }, 'Toon ' + R.naam)
    : h('button', { class: 'btn', type: 'button', id: 'b-view', onclick: () => zetView('stad') }, 'Toon de stad'));
  add(k, h('a', { class: 'btn zacht', href: 'leerkracht.html' }, 'Dashboard'));
}

// ---------- tekenen ----------
function loop(cv) {
  const g = cv.getContext('2d');
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; R.t += dt;
    R.shake = Math.max(0, R.shake - dt); R.flash = Math.max(0, R.flash - dt);
    for (const p of R.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; }
    R.parts = R.parts.filter(p => p.t < p.life);
    for (const s of R.stralen) s.t += dt;
    R.stralen = R.stralen.filter(s => s.t < s.life);
    if (VIEW.soort !== 'stad') draw(g);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
/** De Slijkkraak: een slijmmonster met tentakels dat uit de reien van de stad kruipt. */
function draw(g) {
  // logisch 192 x 108, getekend op 6x
  g.setTransform(6, 0, 0, 6, 0, 0);
  const frac = R.maxHp ? R.hp / R.maxHp : 1;
  const won = R.status === 'gewonnen';
  const helder = won ? 1 : 1 - frac;   // hoe helderder, hoe meer het monster verslagen is
  const sky = g.createLinearGradient(0, 0, 0, 108);
  sky.addColorStop(0, mix('#2b2a1e', '#6fb2f0', helder)); sky.addColorStop(1, mix('#4a4430', '#d9f0ff', helder));
  g.fillStyle = sky; g.fillRect(0, 0, 192, 108);
  if (helder > 0.35) { const sy = 86 - helder * 58, gr = g.createRadialGradient(160, sy, 2, 160, sy, 22); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(1, 'rgba(255,224,138,0)'); g.fillStyle = gr; g.fillRect(130, sy - 30, 60, 60); }
  // de skyline van de stad: Belfort, trapgevels en een molen
  const st = mix('#2a2a22', '#8aa2c8', helder);
  g.fillStyle = st;
  rr(g, 70, 44, 14, 46, 1.5); rr(g, 72, 38, 10, 8, 1.5);           // het Belfort
  for (let i = 0; i < 6; i++) trapgevel(g, 20 + i * 8, 90, 7, 16 + (i % 3) * 4);
  for (let i = 0; i < 7; i++) trapgevel(g, 96 + i * 9, 90, 8, 14 + (i % 4) * 5);
  g.fillStyle = mix('#ffd27a', '#fff1c4', helder);
  for (let i = 0; i < 12; i++) rr(g, 22 + i * 7, 80, 2.2, 3, 0.5);
  // het water van de reien (vooraan)
  const water = mix('#5d5433', '#2f8fd6', helder);
  g.fillStyle = water; g.fillRect(0, 90, 192, 18);
  g.fillStyle = `rgba(255,255,255,${0.1 + helder * 0.25})`;
  for (let i = 0; i < 16; i++) { const y = 93 + (i % 4) * 4; rr(g, ((i * 23 + R.t * 8) % 200) - 8, y, 10, 1.1, 0.5); }
  // stralen proper water uit de stad naar het monster
  for (const s of R.stralen) {
    const p = s.t / s.life;
    g.strokeStyle = `rgba(150,220,255,${1 - p})`; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(s.x0, s.y0); g.quadraticCurveTo((s.x0 + 96) / 2, 30 - p * 10, 96 + (Math.random() - 0.5) * 8, 52); g.stroke();
  }
  // het monster
  if (!won || R.parts.length) {
    const s = won ? 0 : 0.45 + 0.55 * frac;
    if (s > 0) {
      const ox = R.shake ? (Math.random() - 0.5) * 6 : 0;
      const cx = 96 + ox, cy = 52 + Math.sin(R.t * 1.2) * 2;
      // tentakels uit het water
      for (let i = 0; i < 6; i++) {
        const k = i % 2 ? 1 : -1, d = (Math.floor(i / 2) + 1);
        const x0 = cx + k * (14 + d * 9) * s, y0 = 96;
        g.strokeStyle = R.flash ? '#cfe8a8' : mix('#6b6a3a', '#8aa06a', 0.2);
        g.lineWidth = (4 - d * 0.7) * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x0, y0);
        g.quadraticCurveTo(x0 + k * 10 * s, 76 + Math.sin(R.t * 1.6 + i) * 5, cx + k * (6 + d * 3) * s, cy + 10 * s);
        g.stroke();
      }
      // de kop: bulten slijk
      const bulten = [[0, 0, 24], [-18, 8, 15], [18, 8, 15], [-11, -12, 13], [11, -12, 13], [0, -18, 11], [0, 16, 17]];
      for (const [dx, dy, r] of bulten) {
        const x = cx + dx * s, y = cy + dy * s, rad = r * s;
        const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.45, rad * 0.1, x, y, rad * 1.05);
        gr.addColorStop(0, R.flash ? '#e8ffd0' : '#9aa55c'); gr.addColorStop(1, R.flash ? '#cfe8a8' : '#4e4a28');
        g.fillStyle = gr; bol(g, x, y, rad);
      }
      // druipend slijk
      for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(120,128,60,0.5)'; bol(g, cx + Math.sin(R.t * 0.8 + i) * 26 * s, cy + 22 * s + ((R.t * 10 + i * 7) % 16), 1.6 * s); }
      // ogen
      const knip = Math.sin(R.t * 2.2) > 0.97;
      for (const k of [-1, 1]) {
        const ex = cx + k * 10 * s, ey = cy - 4 * s;
        g.fillStyle = '#231f16'; g.beginPath(); g.ellipse(ex, ey, 3.4, knip ? 0.5 : 3.8, 0, 0, Math.PI * 2); g.fill();
        if (!knip) { g.fillStyle = '#ffe066'; g.beginPath(); g.ellipse(ex, ey + 0.3, 2.2, 2.6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; bol(g, ex - 0.8, ey - 1, 0.7); }
      }
      g.strokeStyle = '#2e2a1c'; g.lineWidth = 1.3; g.lineCap = 'round';
      g.beginPath(); g.arc(cx, cy + 7 * s, 5.5 * s, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    }
  }
  // na de overwinning: zwanen op het heldere water
  if (won) for (let i = 0; i < 3; i++) zwaan(g, 50 + i * 42 + Math.sin(R.t * 0.5 + i) * 3, 97 + (i % 2) * 3);
  for (const p of R.parts) { g.fillStyle = `rgba(${p.kleur || '255,240,180'},${1 - p.t / p.life})`; bol(g, p.x, p.y, 1.1); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 9px system-ui, -apple-system, Segoe UI, sans-serif';
  const tekst = (t, y, kleur) => { g.lineWidth = 2.4; g.strokeStyle = 'rgba(20,24,48,.55)'; g.lineJoin = 'round'; g.strokeText(t, 96, y); g.fillStyle = kleur; g.fillText(t, 96, y); };
  if (won) tekst('Het water is helder!', 32, '#ffffff');
  if (R.status === 'lobby') tekst('Doe mee op je laptop', 32, '#ffe066');
  if (R.status === 'actief') tekst(`${R.juist} juiste antwoorden`, 32, '#ffffff');
}
function bol(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.2, r), 0, Math.PI * 2); g.fill(); }
function rr(g, x, y, w, hh, r) { g.beginPath(); g.roundRect(x, y, w, hh, r); g.fill(); }
function trapgevel(g, x, bodem, b, hoog) {
  g.beginPath(); g.moveTo(x, bodem); g.lineTo(x, bodem - hoog);
  const treden = 3, tb = b / (treden * 2);
  for (let i = 0; i < treden; i++) { g.lineTo(x + tb * (i * 2 + 1), bodem - hoog); g.lineTo(x + tb * (i * 2 + 1), bodem - hoog - (i + 1) * 1.4); }
  g.lineTo(x + b / 2, bodem - hoog - treden * 1.4 - 1.5);
  for (let i = treden - 1; i >= 0; i--) { g.lineTo(x + b - tb * (i * 2 + 1), bodem - hoog - (i + 1) * 1.4); g.lineTo(x + b - tb * (i * 2 + 1), bodem - hoog); }
  g.lineTo(x + b, bodem - hoog); g.lineTo(x + b, bodem); g.closePath(); g.fill();
}
function zwaan(g, x, y) {
  g.fillStyle = '#f6f6f2'; g.beginPath(); g.ellipse(x, y, 3.2, 1.6, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f6f6f2'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x + 1.6, y - 1); g.quadraticCurveTo(x + 3.4, y - 4, x + 2.2, y - 5.2); g.stroke();
  g.fillStyle = '#e2643e'; bol(g, x + 1.9, y - 5.4, 0.5);
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

init().catch(err => { console.error(err); $('#app').append(h('p', { class: 'fout' }, err.message)); });
