// Leerlingenapp: aanmelden, wandelwereld, gidsen, missies, codekluis, klasstad en raid.
import { QUESTE1 } from '../../data/queste1.js';
import { WEEK1 } from '../missions/week1.js';
import { createStore } from '../core/store.js';
import { createSync } from '../core/sync.js';
import { h, $, add, uid, clamp, speak, blip, toast, rng } from '../core/util.js';
import { MACHTEN, ROUTE, ROUTES, GIDSEN, RANGEN, XP, DAGEN } from '../config.js';
import { buildCatalog, kiesSet, routeVoor, isOpen, rangVoor, klasXP, mistDichtheid, doelStats, doelStatus, codeIndex, beloningVoor, normCode, KOSMETIEK, klasstadGebouwen } from '../core/model.js';
import { World } from '../game/world.js';
import { drawPerson, AVATAR_OPTIES, DEFAULT_LOOK } from '../game/pixel.js';
import { runMission, gidsPortret } from '../missions/engine.js';
import { renderItem } from '../missions/types.js';
import { raidItem } from '../missions/raidbank.js';
import { drawKlasstad } from '../game/klasstad.js';

const store = createStore();
const sync = createSync('klas');
const CATALOG = buildCatalog(QUESTE1, WEEK1);
const CODES = codeIndex(QUESTE1);
const S = { settings: null, pupil: null, pupils: [], world: null, week: 1, raid: null, preview: false };
window.__klets = S; // voor testen en foutopsporing

// ---------- opstart ----------
async function init() {
  S.settings = await store.getSettings();
  S.week = S.settings.huidigeWeek;
  await sync.connect();
  sync.subscribe('raid:state', onRaidState);
  sync.subscribe('klas:update', () => refresh());
  store.onChange(() => refresh());
  const qs = new URLSearchParams(location.search);
  const teacherOk = isTeacher();
  if (qs.get('preview') && teacherOk) return previewMission(qs.get('preview'), qs.get('route') || 'kompas');
  if (qs.get('leerkracht') && teacherOk) {
    S.preview = true;
    S.pupil = { id: 'leerkracht', naam: 'Leerkracht', leerkracht: true, xp: 0, routes: Object.fromEntries(MACHTEN.map(m => [m.id, 'kompas'])), look: { ...DEFAULT_LOOK, haar: 'pet', kleren: 6, uitrusting: { hand: 'lantaarn', rug: 'cape' } }, codes: [], kosmetiek: Object.keys(KOSMETIEK) };
    return enterWorld();
  }
  const pid = sessionStorage.getItem('klets-pid');
  if (pid) { const p = await store.getPupil(pid); if (p) { S.pupil = p; return enterWorld(); } }
  showLogin();
}
function isTeacher() { try { return Number(localStorage.getItem('klets:v1:leerkrachtTot') || 0) > Date.now(); } catch { return false; } }

async function refresh() {
  S.settings = await store.getSettings();
  S.pupils = await store.listPupils();
  if (S.pupil && !S.pupil.leerkracht) { const p = await store.getPupil(S.pupil.id); if (p) S.pupil = p; else { logout(); return; } }
  if (S.world) updateHud();
}

// ---------- aanmelden ----------
async function showLogin() {
  S.pupils = await store.listPupils();
  const app = $('#app'); app.innerHTML = '';
  const kaarten = S.pupils.map(p => h('button', { class: 'reiziger-kaart', type: 'button', onclick: () => login(p) }, avatarCanvas(p.look, 4), h('span', {}, p.naam)));
  app.append(h('main', { class: 'login' },
    h('div', { class: 'login-kop' }, h('h1', { class: 'logo' }, 'Klets!'), h('p', {}, 'Queste 1: Aankomst in Station Klets')),
    h('section', { class: 'kaart-blok' },
      h('h2', {}, 'Wie stapt er uit de nachttrein?'),
      kaarten.length ? h('div', { class: 'reizigers' }, ...kaarten) : h('p', { class: 'tip' }, 'Nog geen reizigers op dit toestel. Maak je eigen reiziger.'),
      h('button', { class: 'btn groot primair', type: 'button', onclick: showCreator }, 'Ik ben een nieuwe reiziger')),
    h('p', { class: 'login-voet' }, h('a', { href: 'leerkracht.html' }, 'Leerkracht'), ' - ', h('a', { href: 'digibord.html' }, 'Digibord'))));
}
async function login(p) { sessionStorage.setItem('klets-pid', p.id); S.pupil = p; enterWorld(); }
function logout() { sessionStorage.removeItem('klets-pid'); location.href = location.pathname; }

function avatarCanvas(look, scale = 4, dir = 'down') {
  const c = h('canvas', { width: 16 * scale, height: 20 * scale, class: 'avatar', 'aria-hidden': 'true' });
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(scale, scale);
  drawPerson(g, 0, 4, look || DEFAULT_LOOK, dir, 0);
  return c;
}

function showCreator() {
  const look = { ...DEFAULT_LOOK, huid: Math.floor(Math.random() * 6), kleren: Math.floor(Math.random() * 8), uitrusting: {} };
  const app = $('#app'); app.innerHTML = '';
  const prev = h('div', { class: 'creator-prev' });
  let dirI = 0; const dirs = ['down', 'right', 'up', 'left'];
  const paint = () => { prev.innerHTML = ''; prev.append(avatarCanvas(look, 9, dirs[dirI])); };
  const naam = h('input', { type: 'text', class: 'invoer', maxlength: 16, autocomplete: 'off', placeholder: 'Voornaam of bijnaam', 'aria-label': 'Voornaam of bijnaam', id: 'naam' });
  const fout = h('p', { class: 'fout', 'aria-live': 'polite' });
  const rij = (label, key, opties, render) => h('div', { class: 'keuze-rij' }, h('span', { class: 'rij-lbl' }, label),
    h('div', { class: 'stalen' }, ...opties.map((o, i) => {
      const val = typeof o === 'string' && key === 'haar' ? o : i;
      const b = h('button', { type: 'button', class: 'staal' + (look[key] === val ? ' sel' : ''), 'aria-label': `${label} ${i + 1}`, onclick: () => { look[key] = val; b.parentElement.querySelectorAll('.staal').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); paint(); } }, render(o, i));
      return b;
    })));
  const sw = (c) => h('span', { class: 'kleur', style: { background: c } });
  const hairPrev = (style) => avatarCanvas({ ...look, haar: style, uitrusting: {} }, 2);
  app.append(h('main', { class: 'creator' },
    h('h1', { class: 'logo klein' }, 'Klets!'),
    h('div', { class: 'creator-grid' },
      h('div', { class: 'creator-links' }, prev, h('button', { type: 'button', class: 'btn klein', onclick: () => { dirI = (dirI + 1) % 4; paint(); } }, 'Draai')),
      h('div', { class: 'creator-rechts' },
        h('label', { class: 'lbl', for: 'naam' }, 'Hoe heet je in Station Klets?'), naam,
        h('p', { class: 'tip' }, 'Gebruik je voornaam of een bijnaam. Geen achternaam.'),
        rij('Huid', 'huid', AVATAR_OPTIES.huid, sw),
        rij('Haar', 'haar', AVATAR_OPTIES.haar, (o) => hairPrev(o)),
        rij('Haarkleur', 'haarKleur', AVATAR_OPTIES.haarKleur, sw),
        rij('Jas', 'kleren', AVATAR_OPTIES.kleren, sw),
        rij('Broek', 'broek', AVATAR_OPTIES.broek, sw),
        fout,
        h('div', { class: 'knoppen' },
          h('button', { type: 'button', class: 'btn', onclick: showLogin }, 'Terug'),
          h('button', { type: 'button', class: 'btn groot primair', id: 'start-reis', onclick: maak }, 'Stap uit de trein'))))));
  paint(); naam.focus();
  async function maak() {
    const n = naam.value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { fout.textContent = 'Typ een naam van minstens 2 letters.'; return; }
    if (/@|\d{3,}/.test(n)) { fout.textContent = 'Gebruik enkel een voornaam of bijnaam.'; return; }
    const all = await store.listPupils();
    const bestaat = all.find(p => p.naam.toLowerCase() === n.toLowerCase());
    if (bestaat) { fout.textContent = `${bestaat.naam} bestaat al. Ga terug en klik op je kaartje.`; return; }
    const p = { id: uid('ll'), naam: n, look, xp: 0, routes: Object.fromEntries(MACHTEN.map(m => [m.id, 'kompas'])), codes: [], kosmetiek: [], gemaakt: Date.now() };
    await store.savePupil(p);
    sync.publish('klas:update', {});
    login(p);
  }
}

// ---------- de wereld ----------
async function enterWorld() {
  S.pupils = await store.listPupils();
  const app = $('#app'); app.innerHTML = '';
  const canvas = h('canvas', { id: 'wereld', tabindex: 0, 'aria-label': 'Station Klets. Wandel met de pijltjestoetsen of klik op een plek.' });
  const hud = h('div', { class: 'hud' });
  const voet = h('div', { class: 'hud-voet' }, h('span', { id: 'hint' }, 'Wandel met de pijltjes, WASD of klik. Loop tegen een gids om te praten.'));
  app.append(h('div', { class: 'wereld-wrap' }, canvas, hud, voet, h('div', { id: 'raid-banner', class: 'raid-banner', hidden: true })));
  S.world = new World(canvas, { onPoi: openPoi, onHint: (poi) => { $('#hint').textContent = poi ? `Druk op spatie of klik: ${poiNaam(poi)}` : 'Wandel met de pijltjes, WASD of klik. Loop tegen een gids om te praten.'; } });
  S.world.setPlayer(S.pupil.look, S.pupil.naam);
  S.world.setNpcs(S.pupils.filter(p => p.id !== S.pupil.id).map(p => ({ naam: p.naam, look: p.look })));
  buildHud(hud);
  updateHud();
  S.world.start();
  canvas.focus();
  if (!S.pupil.leerkracht && !(S.pupil.gezien || []).includes('intro')) showIntro();
  sync.publish('raid:vraag', {});
}
function poiNaam(poi) { if (poi.id.startsWith('gids:')) return GIDSEN[poi.label].naam; return { missiebord: 'Missiebord', kluis: 'Codekluis', poort: 'De Poort', klasstad: 'Klasstad', trein: 'Nachttrein' }[poi.id] || poi.label; }

function buildHud(hud) {
  hud.append(
    h('div', { class: 'hud-ik' }, h('div', { id: 'hud-avatar' }), h('div', {}, h('b', { id: 'hud-naam' }), h('small', { id: 'hud-rang' }), h('div', { class: 'balk' }, h('span', { id: 'hud-xp' })))),
    h('div', { class: 'hud-klas', title: 'Klasmeter: alle XP van de klas samen' }, h('small', {}, 'Klasmeter'), h('div', { class: 'balk klas' }, h('span', { id: 'hud-klas' })), h('small', { id: 'hud-mist' })),
    h('nav', { class: 'hud-knoppen', 'aria-label': 'Menu' },
      h('button', { class: 'btn hud-btn', type: 'button', id: 'btn-missies', onclick: () => openMissiebord() }, 'Missies'),
      h('button', { class: 'btn hud-btn', type: 'button', onclick: () => openKluis() }, 'Codekluis'),
      h('button', { class: 'btn hud-btn', type: 'button', onclick: () => openKlasstad() }, 'Klasstad'),
      h('button', { class: 'btn hud-btn', type: 'button', onclick: () => openGidsenLijst() }, 'Gidsen'),
      h('button', { class: 'btn hud-btn zacht', type: 'button', onclick: logout }, S.pupil.leerkracht ? 'Stop' : 'Afmelden')));
}
function updateHud() {
  const p = S.pupil, rang = rangVoor(p.xp || 0);
  const av = $('#hud-avatar'); if (av) { av.innerHTML = ''; av.append(avatarCanvas(p.look, 3)); }
  $('#hud-naam').textContent = p.naam;
  $('#hud-rang').textContent = `${rang.naam} - ${p.xp || 0} XP` + (rang.volgende ? ` (nog ${rang.volgende.xp - (p.xp || 0)} tot ${rang.volgende.naam})` : '');
  $('#hud-xp').style.width = Math.round(rang.pct * 100) + '%';
  const leerlingen = S.pupils.filter(x => !x.leerkracht);
  const totaal = klasXP(leerlingen), doel = Math.max(1, leerlingen.length) * (S.settings.mistDoel || 1200);
  const mist = mistDichtheid(S.settings, leerlingen);
  $('#hud-klas').style.width = Math.round(clamp(totaal / doel, 0, 1) * 100) + '%';
  $('#hud-mist').textContent = `${totaal} XP samen - mist ${Math.round(mist * 100)} %`;
  const dn = S.settings.dagNacht;
  S.world.setAtmosphere({ mist, nacht: dn === 'dag' ? 0 : dn === 'nacht' ? 0.85 : clamp(0.1 + mist * 0.75, 0, 0.85) });
  updateBadges();
}
async function updateBadges() {
  const attempts = S.pupil.leerkracht ? [] : await store.listAttempts({ pid: S.pupil.id });
  const gedaan = new Set(attempts.map(a => a.missie));
  const b = {};
  for (const m of CATALOG) if (m.week === S.settings.huidigeWeek && m.sets && !gedaan.has(m.id)) b[m.gids] = (b[m.gids] || 0) + 1;
  S.world.setBadges(b);
}

function showIntro() {
  const w = QUESTE1.weken[S.settings.huidigeWeek - 1];
  const pan = panel('Welkom in Station Klets', 'trein');
  add(pan.body, 
    h('div', { class: 'gids-zegt groot' }, gidsPortret('atlas', 4), h('p', {}, `Welkom, ${S.pupil.naam}. Ik ben Atlas. De Grijze Mist heeft de kaart van de wereld uitgewist. Samen tekenen we hem opnieuw. Elke missie die je doet, duwt de mist een beetje weg.`)),
    h('ul', { class: 'uitleg-lijst' },
      h('li', {}, 'Wandel met de pijltjes, met W A S D, of klik waar je heen wil.'),
      h('li', {}, 'Loop tegen een gids of een gebouw om het te openen. Alles is bereikbaar.'),
      h('li', {}, "De knop 'Missies' toont alle missies van de week."),
      h('li', {}, 'Geheime codes uit je Logboek typ je in de Codekluis.')),
    h('p', { class: 'tip' }, `Deze week: ${w.titel}.`));
  add(pan.foot, h('button', { class: 'btn groot primair', type: 'button', onclick: async () => { pan.close(); const p = await store.getPupil(S.pupil.id); if (p) { p.gezien = [...(p.gezien || []), 'intro']; await store.savePupil(p); S.pupil = p; } } }, 'Op reis!'));
}

// ---------- panelen ----------
function panel(titel, soort = '', { breed = false } = {}) {
  S.world?.pause(true);
  const body = h('div', { class: 'p-body' }), foot = h('footer', { class: 'p-foot' });
  const sluit = h('button', { class: 'btn sluit', type: 'button', 'aria-label': 'Sluiten' }, 'Sluiten');
  const pan = h('div', { class: 'paneel ' + soort + (breed ? ' breed' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titel }, h('header', { class: 'p-head' }, h('h2', {}, titel), sluit), body, foot);
  const ov = h('div', { class: 'overlay' }, pan);
  document.body.append(ov);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  function close() { ov.remove(); document.removeEventListener('keydown', onKey); if (!document.querySelector('.overlay')) { S.world?.pause(false); $('#wereld')?.focus(); } }
  sluit.onclick = close;
  ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(); });
  return { body, foot, close, el: pan };
}

function openPoi(id) {
  if (id.startsWith('gids:')) return openGids(id.slice(5));
  if (id === 'missiebord') return openMissiebord();
  if (id === 'kluis') return openKluis();
  if (id === 'klasstad') return openKlasstad();
  if (id === 'poort') return openPoort();
  if (id === 'trein') return openTrein();
}

function weekTabs(cur, onPick) {
  return h('div', { class: 'week-tabs', role: 'tablist' }, ...QUESTE1.weken.map(w => {
    const open = S.settings.allesOpen || S.pupil.leerkracht || w.week <= S.settings.huidigeWeek;
    return h('button', { type: 'button', role: 'tab', 'aria-selected': String(w.week === cur), class: 'tab' + (w.week === cur ? ' sel' : '') + (open ? '' : ' later'), onclick: () => onPick(w.week) }, `Week ${w.week}`);
  }));
}

async function missieRij(m, { metGids = false } = {}) {
  const pupil = S.pupil;
  const open = isOpen(m, S.settings, pupil);
  const attempts = pupil.leerkracht ? [] : (await store.listAttempts({ pid: pupil.id })).filter(a => a.missie === m.id && a.bron === 'missie');
  const best = attempts.reduce((b, a) => (!b || a.goed / Math.max(1, a.totaal) > b.goed / Math.max(1, b.totaal) ? a : b), null);
  const route = routeVoor(pupil, m.macht);
  const status = !m.sets && !['overzicht', 'klasmeter', 'raid'].includes(m.kind) ? h('span', { class: 'status klas' }, 'In de klas')
    : best ? h('span', { class: 'status gedaan' }, `Gedaan: ${best.goed}/${best.totaal}`) : h('span', { class: 'status nieuw' }, 'Nieuw');
  const knop = open
    ? h('button', { class: 'btn primair', type: 'button', onclick: () => startMissie(m) }, best ? 'Opnieuw' : 'Start')
    : h('span', { class: 'later-uitleg' }, `Opent in week ${m.week}. Je leerkracht kan ze nu al openzetten.`);
  const routeKeuze = pupil.leerkracht && m.sets ? h('select', { class: 'route-select', 'aria-label': 'Route', onchange: (e) => { pupil.routes[m.macht] = e.target.value; } }, ...ROUTES.map(r => h('option', { value: r.id, selected: r.id === route }, r.naam))) : null;
  return h('li', { class: 'missie-rij' + (open ? '' : ' later') },
    metGids ? gidsPortret(m.gids, 2) : null,
    h('div', { class: 'mr-tekst' }, h('b', {}, m.naam), h('small', {}, `${cap(m.dag)} - ${m.les.titel}`)),
    h('span', { class: 'macht-chip', style: { '--k': (MACHTEN.find(x => x.id === m.macht) || {}).kleur } }, m.macht),
    routeKeuze || (m.sets ? h('span', { class: 'route-badge r-' + kiesSet(m, route).route }, ROUTE[kiesSet(m, route).route]?.naam) : null),
    status, knop);
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

async function openGids(gid) {
  const g = GIDSEN[gid];
  const pan = panel(`${g.naam} de ${g.dier}`, 'gids');
  let week = S.settings.huidigeWeek;
  async function draw() {
    pan.body.innerHTML = '';
    const lijst = CATALOG.filter(m => m.gids === gid && m.week === week);
    const groet = lijst.length ? GROET[gid] : `Deze week heb ik geen digitale missie voor jou. Kijk op het Missiebord in de stationshal.`;
    add(pan.body, h('div', { class: 'gids-zegt groot' }, gidsPortret(gid, 4), h('div', {}, h('p', {}, groet), h('button', { class: 'btn klein', type: 'button', onclick: () => speak(groet) }, 'Lees voor'))),
      weekTabs(week, (w) => { week = w; draw(); }),
      h('p', { class: 'week-titel' }, `Week ${week}: ${QUESTE1.weken[week - 1].titel}`));
    const ul = h('ul', { class: 'missie-lijst' });
    for (const m of lijst) ul.append(await missieRij(m));
    if (!lijst.length) ul.append(h('li', { class: 'leeg' }, 'Geen missies bij deze gids in deze week.'));
    add(pan.body, ul);
  }
  draw();
}
const GROET = {
  tella: 'Hallo reiziger! Ik ben Tella. Getallen zijn mijn sterren. Kies een missie.',
  woordje: 'Woorden zijn sleutels! Ik ben Woordje. Welke deur openen we vandaag?',
  atlas: 'Ik ben Atlas, de kaartenmaker. Elke missie tekent een stukje kaart terug.',
  kroniek: 'Oehoe. Ik ben Kroniek. Ik bewaar wat we beleefden. Kijk met mij terug.',
  bram: 'Welkom bij mijn kampvuur. Ik ben Bram. Hier mag je zeggen hoe je je voelt. Je moet niet.',
  byte: 'Biep! Ik ben Byte. Ik help je met je laptop, muziek en beeld.',
};

function openGidsenLijst() {
  const pan = panel('De gidsen van Station Klets');
  const ul = h('ul', { class: 'gidsen-lijst' });
  for (const [id, g] of Object.entries(GIDSEN)) {
    ul.append(h('li', {}, gidsPortret(id, 3), h('div', {}, h('b', {}, `${g.naam} de ${g.dier}`), h('small', {}, `${g.plek} - ${g.rol}`)),
      h('button', { class: 'btn', type: 'button', onclick: () => { pan.close(); S.world.goTo('gids:' + id); } }, 'Wandel erheen'),
      h('button', { class: 'btn primair', type: 'button', onclick: () => { pan.close(); openGids(id); } }, 'Open')));
  }
  add(pan.body, h('p', { class: 'tip' }, 'Je kan ook gewoon naar een gids wandelen.'), ul);
}

async function openMissiebord() {
  const pan = panel('Missiebord', 'bord', { breed: true });
  let week = S.settings.huidigeWeek;
  async function draw() {
    pan.body.innerHTML = '';
    const w = QUESTE1.weken[week - 1];
    add(pan.body, weekTabs(week, (x) => { week = x; draw(); }), h('p', { class: 'week-titel' }, `Week ${week}: ${w.titel}`));
    if (!(S.settings.allesOpen || S.pupil.leerkracht || week <= S.settings.huidigeWeek)) add(pan.body, h('p', { class: 'info-blok' }, `Deze week opent later in het jaar. Je kan alvast kijken wat er komt. Je leerkracht kan alles openzetten in het dashboard.`));
    for (const dag of DAGEN) {
      const lijst = CATALOG.filter(m => m.week === week && m.dag === dag);
      if (!lijst.length) continue;
      const ul = h('ul', { class: 'missie-lijst' });
      for (const m of lijst) ul.append(await missieRij(m, { metGids: true }));
      add(pan.body, h('h3', { class: 'dag' }, cap(dag)), ul);
    }
  }
  draw();
}

async function startMissie(m) {
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  S.world.pause(true);
  if (m.kind === 'overzicht') return openWeekoverzicht(m.week);
  if (m.kind === 'klasmeter') return openKlasstad();
  const routeWens = routeVoor(S.pupil, m.macht);
  await runMission({ missie: m, pupil: S.pupil, routeWens, store, mode: S.pupil.leerkracht ? 'voorbeeld' : 'missie', doelen: QUESTE1.doelen });
  if (!S.pupil.leerkracht) sync.publish('klas:update', {});
  await refresh();
  S.world.pause(false);
  $('#wereld')?.focus();
}

async function previewMission(id, route) {
  const m = CATALOG.find(x => x.id === id);
  const app = $('#app'); app.innerHTML = '';
  app.append(h('main', { class: 'login' }, h('h1', { class: 'logo' }, 'Klets!'), h('p', {}, 'Voorbeeldmodus voor de leerkracht. Er wordt niets bewaard.'),
    h('a', { class: 'btn', href: 'leerkracht.html' }, 'Terug naar het dashboard')));
  if (!m) return toast('Missie niet gevonden.');
  if (m.kind === 'overzicht' || m.kind === 'klasmeter') return toast('Dit is een overzichtsscherm, geen oefenreeks.');
  await runMission({ missie: m, pupil: { id: 'voorbeeld', naam: 'Leerkracht', routes: {} }, routeWens: route, mode: 'voorbeeld', doelen: QUESTE1.doelen });
}

// ---------- codekluis en garderobe ----------
async function openKluis() {
  const pan = panel('Codekluis', 'kluis');
  async function draw(msg) {
    const p = S.pupil;
    pan.body.innerHTML = '';
    const inp = h('input', { type: 'text', class: 'invoer code', id: 'code-invoer', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'GEHEIME-CODE', 'aria-label': 'Geheime code' });
    const res = h('p', { class: 'code-res', 'aria-live': 'polite' }, msg || '');
    const probeer = async () => {
      const code = normCode(inp.value);
      if (!code) return;
      if (!CODES[code]) { res.textContent = 'Die code ken ik niet. Kijk nog eens goed in je Logboek.'; res.className = 'code-res mis'; blip('nee'); return; }
      if ((p.codes || []).includes(code)) { res.textContent = 'Die code had je al gevonden.'; res.className = 'code-res'; return; }
      const bel = beloningVoor(code);
      if (!p.leerkracht) {
        const fresh = (await store.getPupil(p.id)) || p;
        fresh.codes = [...(fresh.codes || []), code];
        if (bel.soort === 'kosmetiek' && !(fresh.kosmetiek || []).includes(bel.id)) fresh.kosmetiek = [...(fresh.kosmetiek || []), bel.id];
        if (bel.soort === 'kaartstuk') fresh.kaartstukken = [...new Set([...(fresh.kaartstukken || []), bel.id])];
        fresh.xp = (fresh.xp || 0) + XP.code;
        await store.savePupil(fresh); S.pupil = fresh;
        sync.publish('klas:update', {});
      } else { p.codes = [...(p.codes || []), code]; }
      blip('code');
      await refresh();
      draw(`De kluis klikt open! Je krijgt: ${bel.naam} (+${XP.code} XP).`);
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') probeer(); });
    add(pan.body, h('p', {}, 'Elke bladzijde in je Logboek kan een geheime code hebben. Codes geven extraatjes: kleding, sporen en stukken van de wereldkaart. Missies zijn altijd open, ook zonder code.'),
      h('div', { class: 'code-rij' }, inp, h('button', { class: 'btn primair', type: 'button', id: 'code-knop', onclick: probeer }, 'Open')), res);
    // overzicht per week
    const wk = S.settings.huidigeWeek;
    const weekCodes = Object.values(CODES).filter(c => c.week === wk);
    const gevonden = weekCodes.filter(c => (p.codes || []).includes(c.code));
    add(pan.body, h('h3', {}, `Week ${wk}: ${gevonden.length} van ${weekCodes.length} codes gevonden`),
      h('ul', { class: 'code-lijst' }, ...weekCodes.map(c => {
        const les = QUESTE1.lessen.find(l => l.id === c.lessen[0]);
        const ok = (p.codes || []).includes(c.code);
        return h('li', { class: ok ? 'ok' : '' }, h('span', { class: 'slotje' + (ok ? ' open' : ''), 'aria-hidden': 'true' }), ok ? h('b', {}, c.code) : h('span', {}, 'Nog te vinden'), h('small', {}, ` ${cap(les.dag)}: ${les.titel}`));
      })));
    // garderobe
    const mine = p.leerkracht ? Object.keys(KOSMETIEK) : (p.kosmetiek || []);
    const prevBox = h('div', { class: 'garderobe-prev' }, avatarCanvas(p.look, 6));
    const slots = {};
    for (const id of mine) { const k = KOSMETIEK[id]; if (k) (slots[k.slot] = slots[k.slot] || []).push(id); }
    const SLOTNAMEN = { hoofd: 'Hoofd', nek: 'Nek', gezicht: 'Gezicht', rug: 'Rug', hand: 'Hand', spoor: 'Spoor', kleur: 'Jas' };
    const gar = h('div', { class: 'garderobe' }, prevBox, h('div', { class: 'gar-slots' }, ...Object.entries(slots).map(([slot, ids]) => h('div', { class: 'keuze-rij' }, h('span', { class: 'rij-lbl' }, SLOTNAMEN[slot]),
      h('div', { class: 'stalen' }, h('button', { type: 'button', class: 'staal tekst' + (!p.look.uitrusting?.[slot] ? ' sel' : ''), onclick: () => equip(slot, null) }, 'Geen'),
        ...ids.map(id => h('button', { type: 'button', class: 'staal tekst' + (p.look.uitrusting?.[slot] === id ? ' sel' : ''), onclick: () => equip(slot, id) }, KOSMETIEK[id].naam)))))));
    add(pan.body, h('h3', {}, 'Garderobe'), mine.length ? gar : h('p', { class: 'tip' }, 'Nog leeg. Vind codes in je Logboek om kleding en sporen te verdienen.'));
    if ((p.kaartstukken || []).length) add(pan.body, h('p', { class: 'tip' }, `Stukken van de wereldkaart: ${(p.kaartstukken || []).length}. Ze hangen in het stadhuis van de Klasstad.`));
    setTimeout(() => inp.focus(), 30);
  }
  async function equip(slot, id) {
    const p = S.pupil;
    p.look = { ...p.look, uitrusting: { ...(p.look.uitrusting || {}), [slot]: id || undefined } };
    if (!id) delete p.look.uitrusting[slot];
    if (!p.leerkracht) { const fresh = (await store.getPupil(p.id)) || p; fresh.look = p.look; await store.savePupil(fresh); S.pupil = fresh; }
    S.world.setPlayer(S.pupil.look, S.pupil.naam); updateHud(); draw();
  }
  draw();
}

// ---------- klasstad ----------
async function openKlasstad() {
  const pan = panel('De Klasstad', 'klasstad', { breed: true });
  const pupils = (await store.listPupils()).filter(p => !p.leerkracht);
  const stats = doelStats(await store.listAttempts());
  const gebouwen = klasstadGebouwen(stats, QUESTE1.doelen);
  const kaartstukken = new Set(pupils.flatMap(p => p.kaartstukken || []));
  const totaal = klasXP(pupils), doel = Math.max(1, pupils.length) * (S.settings.mistDoel || 1200);
  const cv = h('canvas', { class: 'stad-canvas', 'aria-label': `Klasstad met ${gebouwen.length} gebouwen` });
  const tip = h('div', { class: 'stad-tip', hidden: true });
  add(pan.body, 
    h('div', { class: 'klasmeter-groot' }, h('b', {}, `Klasmeter: ${totaal} XP`), h('div', { class: 'balk klas groot' }, h('span', { style: { width: Math.round(clamp(totaal / doel, 0, 1) * 100) + '%' } })),
      h('small', {}, `Doel: ${doel} XP. Hoe meer XP, hoe minder mist boven Station Klets.`)),
    h('p', {}, 'Elk doel dat iemand in de klas behaalt, wordt een gebouw. Hoe meer reizigers het doel halen, hoe hoger het gebouw.'),
    h('div', { class: 'stad-wrap' }, cv, tip));
  const hits = drawKlasstad(cv, gebouwen, { kaartstukken: kaartstukken.size, nacht: 0 });
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) * (cv.width / r.width), y = (e.clientY - r.top) * (cv.height / r.height);
    const hit = hits.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (hit) { tip.hidden = false; tip.textContent = hit.tekst; tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px'; } else tip.hidden = true;
  });
  const lijst = h('ul', { class: 'gebouwen-lijst' }, ...gebouwen.map(g => h('li', {}, h('span', { class: 'macht-chip', style: { '--k': (MACHTEN.find(x => x.id === g.macht) || {}).kleur } }, g.type), h('b', {}, g.code), h('small', {}, ` ${g.aantal} reiziger${g.aantal > 1 ? 's' : ''} - ${g.doel}`))));
  add(pan.body, h('h3', {}, `Gebouwen (${gebouwen.length})`), gebouwen.length ? lijst : h('p', { class: 'tip' }, 'Nog geen gebouwen. Doe een missie: elk behaald doel bouwt mee.'));
  const gal = await store.listGallery();
  if (gal.length) add(pan.body, h('h3', {}, 'Galerij'), h('div', { class: 'galerij' }, ...gal.slice(-24).reverse().map(g => h('figure', {}, h('img', { src: g.data, alt: g.titel }), h('figcaption', {}, `${g.titel} - ${g.naam}`)))));
}

// ---------- de poort en de trein ----------
function openPoort() {
  const pan = panel('De Poort', 'poort');
  const p = S.pupil, rang = rangVoor(p.xp || 0);
  const questes = ['Aankomst', 'Queste 2', 'Queste 3', 'Queste 4', 'Queste 5', 'Queste 6'];
  add(pan.body, 
    h('p', {}, 'Achter De Poort ligt de middelbare school. Elke queste brengt je een stuk dichter. Dit is jouw reis.'),
    h('ol', { class: 'reis' }, ...questes.map((q, i) => h('li', { class: i === 0 ? 'nu' : '' }, h('b', {}, `Queste ${i + 1}`), h('small', {}, i === 0 ? 'Aankomst: nu bezig' : 'later dit schooljaar')))),
    h('h3', {}, 'Rangen'),
    h('ol', { class: 'rangen' }, ...RANGEN.map((r, i) => h('li', { class: i === rang.index ? 'nu' : i < rang.index ? 'gehaald' : '' }, h('b', {}, r.naam), h('small', {}, `${r.xp} XP`)))));
}
function openTrein() {
  const w = QUESTE1.weken[S.settings.huidigeWeek - 1];
  const pan = panel('De nachttrein', 'trein');
  add(pan.body, h('p', { class: 'week-titel' }, `Week ${w.week}: ${w.titel}`), h('div', { class: 'verhaal' }, h('p', {}, w.verhaal)));
  add(pan.foot, h('button', { class: 'btn', type: 'button', onclick: () => speak(w.verhaal) }, 'Lees voor'));
}

// ---------- weekoverzicht ----------
async function openWeekoverzicht(week) {
  const pan = panel(`Mijn week ${week}`, 'overzicht', { breed: true });
  const p = S.pupil;
  const att = p.leerkracht ? [] : (await store.listAttempts({ pid: p.id })).filter(a => a.week === week);
  const stats = doelStats(att)[p.id] || {};
  const xpWeek = att.reduce((s, a) => s + (a.xp || 0), 0);
  const missies = CATALOG.filter(m => m.week === week && m.sets);
  const gedaan = new Set(att.map(a => a.missie));
  const weekCodes = Object.values(CODES).filter(c => c.week === week);
  add(pan.body, 
    h('div', { class: 'gids-zegt groot' }, gidsPortret('kroniek', 4), h('p', {}, `Oehoe, ${p.naam}. Dit beleefde je deze week. Wat ging goed? Wat oefen je nog?`)),
    h('div', { class: 'tegels' },
      h('div', { class: 'tegel-stat' }, h('b', {}, String(xpWeek)), h('small', {}, 'XP deze week')),
      h('div', { class: 'tegel-stat' }, h('b', {}, `${missies.filter(m => gedaan.has(m.id)).length}/${missies.length}`), h('small', {}, 'missies gedaan')),
      h('div', { class: 'tegel-stat' }, h('b', {}, String(Object.values(stats).filter(s => doelStatus(s) === 'behaald').length)), h('small', {}, 'schilden gekleurd')),
      h('div', { class: 'tegel-stat' }, h('b', {}, `${weekCodes.filter(c => (p.codes || []).includes(c.code)).length}/${weekCodes.length}`), h('small', {}, 'codes gevonden'))),
    h('h3', {}, 'Mijn schilden'),
    Object.keys(stats).length ? h('div', { class: 'schilden' }, ...Object.entries(stats).map(([code, st]) => {
      const s = doelStatus(st);
      return h('div', { class: 'schild ' + s, title: QUESTE1.doelen[code]?.doel || '' }, h('span', { class: 'schild-ico', 'aria-hidden': 'true' }), h('b', {}, code), h('small', {}, s === 'behaald' ? 'Schild gekleurd' : 'Revanche: nog oefenen'));
    })) : h('p', { class: 'tip' }, 'Nog geen resultaten deze week.'),
    h('h3', {}, 'Nog te doen'),
    h('ul', { class: 'missie-lijst' }, ...await Promise.all(missies.filter(m => !gedaan.has(m.id)).map(m => missieRij(m, { metGids: true })))));
  add(pan.foot, h('button', { class: 'btn primair', type: 'button', onclick: () => { pan.close(); openKluis(); } }, 'Code van de week invullen'));
}

// ---------- raid (leerlingkant) ----------
function onRaidState(st) {
  S.raid = st;
  const ban = $('#raid-banner'); if (!ban) return;
  if (st.status === 'actief' || st.status === 'lobby') {
    ban.hidden = false; ban.innerHTML = '';
    ban.append(h('b', {}, st.status === 'lobby' ? 'Raid op komst: ' : 'RAID! '), `${st.naam}. `, h('button', { class: 'btn primair', type: 'button', id: 'raid-mee', onclick: openRaid }, 'Doe mee'));
  } else ban.hidden = true;
  if (S.raidPanel) S.raidPanel.update(st);
}

async function openRaid() {
  if (S.raidPanel) return;
  const st = S.raid; if (!st) return;
  const pan = panel(st.naam, 'raid', { breed: true });
  const route = routeVoor(S.pupil, 'Getal') === 'telescoop' ? 'telescoop' : 'kompas';
  const r = rng(S.pupil.id + st.raidId);
  const results = []; let n = 0, current = null, checked = false, saved = false;
  const hp = h('div', { class: 'balk hp' }, h('span', {}));
  const status = h('p', { class: 'raid-status' });
  const zone = h('div', { class: 'raid-zone' });
  const fb = h('div', { class: 'm-feedback', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn groot primair', type: 'button' }, 'Controleer');
  sync.publish('raid:join', { raidId: st.raidId, pid: S.pupil.id });
  add(pan.body, h('div', { class: 'raid-kop' }, h('b', {}, 'Mist-golem'), hp), status, zone, fb);
  add(pan.foot, btn);
  const update = (s) => {
    hp.firstChild.style.width = Math.round((s.hp / Math.max(1, s.maxHp)) * 100) + '%';
    status.textContent = s.status === 'gewonnen' ? 'De mist trekt op! De klas heeft gewonnen.' : s.status === 'gestopt' ? 'De raid is gestopt.' : s.status === 'lobby' ? 'Wacht tot de leerkracht start ... je mag al oefenen.' : `Elke juiste klik doet de golem pijn. Samen staan we sterk.`;
    if (s.status === 'gewonnen' || s.status === 'gestopt') { btn.textContent = 'Terug naar het station'; btn.onclick = () => pan.close(); zone.innerHTML = ''; save(s.status === 'gewonnen'); }
  };
  S.raidPanel = { update };
  update(st);
  const origClose = pan.close;
  pan.close = () => { save(false); S.raidPanel = null; origClose(); };
  pan.el.querySelector('.sluit').onclick = pan.close;
  function next() {
    checked = false; fb.textContent = ''; fb.className = 'm-feedback';
    const item = raidItem(route, r, n++);
    current = renderItem(item, { rand: r });
    current.item = item;
    zone.innerHTML = '';
    zone.append(h('h3', { class: 'vraag' }, item.vraag), current.el);
    btn.textContent = 'Controleer'; btn.onclick = check;
    setTimeout(() => current.focus?.(), 30);
  }
  async function check() {
    if (checked) return next();
    if (current.ready && !current.ready()) { fb.textContent = 'Maak eerst je keuze.'; return; }
    const res = await current.check(); checked = true; current.reveal(res);
    results.push({ id: current.item.id, goals: current.item.goals, goed: res.goed, totaal: res.totaal, type: current.item.type });
    if (res.goed) { sync.publish('raid:hit', { raidId: st.raidId, hid: uid('h'), pid: S.pupil.id }); fb.className = 'm-feedback goed'; fb.textContent = 'Raak! De golem wankelt.'; blip('hit'); }
    else { fb.className = 'm-feedback mis'; fb.textContent = `Nog niet. Juist was: ${res.juist}. Probeer de volgende!`; }
    btn.textContent = 'Volgende vraag';
  }
  async function save(won) {
    if (saved || S.pupil.leerkracht || !results.length) return; saved = true;
    const goed = results.reduce((s, x) => s + x.goed, 0), totaal = results.reduce((s, x) => s + x.totaal, 0);
    const xp = goed * XP.raidJuist + (won ? XP.raidOverwinning : 0);
    await store.addAttempt({ id: uid('p'), pid: S.pupil.id, missie: 'raid:' + st.raidId, week: S.settings.huidigeWeek, route, items: results, goed, totaal, xp, ts: Date.now(), bron: 'raid' });
    const fresh = (await store.getPupil(S.pupil.id)) || S.pupil; fresh.xp = (fresh.xp || 0) + xp; await store.savePupil(fresh); S.pupil = fresh;
    toast(`Raid: +${xp} XP`);
    sync.publish('klas:update', {});
    refresh();
  }
  next();
}

init().catch(err => { console.error(err); $('#app').append(h('p', { class: 'fout' }, 'Er ging iets mis bij het starten: ' + err.message)); });
